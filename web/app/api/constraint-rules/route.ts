import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { DEFAULT_CONSTRAINT_RULES } from "@/lib/constraint-rules-config";

// API endpoint for Python constraint engine to fetch active rules
// GET /api/constraint-rules?org_id=xxx

export async function GET(request: NextRequest) {
    try {
        // SECURITY: Verify authentication
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const searchParams = request.nextUrl.searchParams;
        const orgId = searchParams.get("org_id");

        if (!orgId) {
            return NextResponse.json(
                { error: "org_id is required" },
                { status: 400 }
            );
        }

        // SECURITY: Verify user belongs to this organization
        const employee = await prisma.employee.findUnique({
            where: { clerk_id: userId },
            select: { org_id: true, role: true }
        });

        if (!employee || employee.org_id !== orgId) {
            console.error(`[SECURITY] Cross-tenant constraint rules access attempt: User ${userId} tried to access org ${orgId}`);
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        // Get company's constraint policy
        const policy = await prisma.constraintPolicy.findFirst({
            where: { org_id: orgId, is_active: true }
        });

        if (!policy || !policy.rules) {
            // Return default rules if no custom policy exists
            return NextResponse.json({
                success: true,
                org_id: orgId,
                policy_name: "Default Leave Policy",
                rules: DEFAULT_CONSTRAINT_RULES,
                is_default: true
            });
        }

        const allRules = policy.rules as Record<string, any>;
        
        // Filter to only active rules for the constraint engine
        const activeRules: Record<string, any> = {};
        const inactiveRuleIds: string[] = [];

        for (const [ruleId, rule] of Object.entries(allRules)) {
            if (rule.is_active !== false) {
                activeRules[ruleId] = {
                    id: ruleId,
                    name: rule.name,
                    description: rule.description,
                    category: rule.category,
                    is_blocking: rule.is_blocking ?? true,
                    priority: rule.priority ?? 50,
                    config: rule.config || {},
                    is_custom: rule.is_custom ?? false
                };
            } else {
                inactiveRuleIds.push(ruleId);
            }
        }

        return NextResponse.json({
            success: true,
            org_id: orgId,
            policy_name: policy.name,
            rules: activeRules,
            inactive_rules: inactiveRuleIds,
            total_rules: Object.keys(allRules).length,
            active_count: Object.keys(activeRules).length,
            is_default: false
        });

    } catch (error) {
        console.error("Error fetching constraint rules:", error);
        return NextResponse.json(
            { error: "Failed to fetch constraint rules" },
            { status: 500 }
        );
    }
}

// POST endpoint to validate a leave request against all active rules
// POST /api/constraint-rules/validate
export async function POST(request: NextRequest) {
    try {
        // SECURITY: Verify authentication
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { org_id, employee_id, leave_type, start_date, end_date, days_requested } = body;

        if (!org_id || !employee_id || !leave_type || !start_date || !end_date) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        // SECURITY: Verify user belongs to this organization
        const callerEmployee = await prisma.employee.findUnique({
            where: { clerk_id: userId },
            select: { org_id: true }
        });

        if (!callerEmployee || callerEmployee.org_id !== org_id) {
            console.error(`[SECURITY] Cross-tenant constraint validation attempt: User ${userId} tried to validate for org ${org_id}`);
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        // Get active rules for this org
        const policy = await prisma.constraintPolicy.findFirst({
            where: { org_id, is_active: true }
        });

        const rules = policy?.rules as Record<string, any> || DEFAULT_CONSTRAINT_RULES;
        
        // Filter to active rules only
        const activeRules = Object.entries(rules)
            .filter(([_, rule]: [string, any]) => rule.is_active !== false)
            .sort(([_, a]: [string, any], [__, b]: [string, any]) => 
                (b.priority || 0) - (a.priority || 0)
            );

        const validationResults: Array<{
            rule_id: string;
            rule_name: string;
            passed: boolean;
            is_blocking: boolean;
            message: string;
        }> = [];

        let isApproved = true;
        const blockingViolations: string[] = [];
        const warnings: string[] = [];

        for (const [ruleId, rule] of activeRules) {
            const result = validateRule(ruleId, rule, {
                leave_type,
                start_date,
                end_date,
                days_requested: days_requested || 1
            });

            validationResults.push({
                rule_id: ruleId,
                rule_name: rule.name,
                passed: result.passed,
                is_blocking: rule.is_blocking,
                message: result.message
            });

            if (!result.passed) {
                if (rule.is_blocking) {
                    isApproved = false;
                    blockingViolations.push(`${rule.name}: ${result.message}`);
                } else {
                    warnings.push(`${rule.name}: ${result.message}`);
                }
            }
        }

        return NextResponse.json({
            success: true,
            is_approved: isApproved,
            blocking_violations: blockingViolations,
            warnings,
            validation_results: validationResults,
            rules_checked: activeRules.length
        });

    } catch (error) {
        console.error("Error validating leave request:", error);
        return NextResponse.json(
            { error: "Failed to validate request" },
            { status: 500 }
        );
    }
}

// Simple rule validation (basic checks - detailed validation in Python engine)
function validateRule(
    ruleId: string, 
    rule: any, 
    request: { leave_type: string; start_date: string; end_date: string; days_requested: number }
): { passed: boolean; message: string } {
    const config = rule.config || {};
    const { leave_type, days_requested } = request;

    switch (ruleId) {
        case "RULE001": // Maximum Leave Duration
            const maxDays = config.limits?.[leave_type] || 30;
            if (days_requested > maxDays) {
                return { 
                    passed: false, 
                    message: `${leave_type} maximum is ${maxDays} days, requested ${days_requested}` 
                };
            }
            break;

        case "RULE006": // Advance Notice
            const noticeDays = config.notice_days?.[leave_type] || 0;
            const startDate = new Date(request.start_date);
            const today = new Date();
            const daysDiff = Math.ceil((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            if (daysDiff < noticeDays) {
                return {
                    passed: false,
                    message: `${leave_type} requires ${noticeDays} days notice, only ${daysDiff} days given`
                };
            }
            break;

        case "RULE007": // Consecutive Leave Limit
            const maxConsecutive = config.max_consecutive?.[leave_type];
            if (maxConsecutive && days_requested > maxConsecutive) {
                return {
                    passed: false,
                    message: `Maximum ${maxConsecutive} consecutive days for ${leave_type}`
                };
            }
            break;

        case "RULE013": // Monthly Quota
            const maxPerMonth = config.max_per_month || 5;
            const exceptionTypes = config.exception_types || [];
            if (!exceptionTypes.includes(leave_type) && days_requested > maxPerMonth) {
                return {
                    passed: false,
                    message: `Monthly quota is ${maxPerMonth} days for non-emergency leaves`
                };
            }
            break;
    }

    return { passed: true, message: "Rule passed" };
}
