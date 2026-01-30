import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { DEFAULT_CONSTRAINT_RULES } from "@/lib/constraint-rules-config";

/**
 * Direct test of constraint rules functionality
 * GET /api/test/constraint-rules
 */

export async function GET() {
    const results: Record<string, any> = {
        timestamp: new Date().toISOString(),
        steps: [],
        defaultRulesCount: Object.keys(DEFAULT_CONSTRAINT_RULES).length
    };

    try {
        // Step 1: Check auth
        const user = await currentUser();
        if (!user) {
            return NextResponse.json({ 
                error: "Not authenticated",
                hint: "Please login first" 
            }, { status: 401 });
        }
        results.steps.push({ step: 1, name: "Auth check", status: "PASS", clerk_id: user.id });

        // Step 2: Get employee
        const employee = await prisma.employee.findUnique({
            where: { clerk_id: user.id },
            include: { company: true }
        });

        if (!employee) {
            results.steps.push({ step: 2, name: "Employee lookup", status: "FAIL", error: "No employee found" });
            return NextResponse.json(results, { status: 404 });
        }
        results.steps.push({ 
            step: 2, 
            name: "Employee lookup", 
            status: "PASS",
            emp_id: employee.emp_id,
            org_id: employee.org_id,
            role: employee.role
        });

        // Step 3: Check org_id
        if (!employee.org_id) {
            results.steps.push({ step: 3, name: "Org check", status: "FAIL", error: "No org_id on employee" });
            return NextResponse.json(results, { status: 400 });
        }
        results.steps.push({ step: 3, name: "Org check", status: "PASS", org_id: employee.org_id });

        // Step 4: Get constraint policy
        const policy = await prisma.constraintPolicy.findFirst({
            where: { org_id: employee.org_id, is_active: true }
        });

        if (policy) {
            const rules = policy.rules as Record<string, any>;
            const ruleCount = Object.keys(rules || {}).length;
            const ruleIds = Object.keys(rules || {}).slice(0, 5);
            
            results.steps.push({
                step: 4,
                name: "Policy lookup",
                status: "PASS",
                policy_id: policy.id,
                policy_name: policy.name,
                rule_count: ruleCount,
                sample_rules: ruleIds,
                is_active: policy.is_active
            });
            
            // Parse one rule as example
            if (ruleCount > 0) {
                const firstRuleId = Object.keys(rules)[0];
                const firstRule = rules[firstRuleId];
                results.sampleRule = {
                    id: firstRuleId,
                    name: firstRule.name,
                    category: firstRule.category,
                    is_active: firstRule.is_active,
                    config: firstRule.config
                };
            }
        } else {
            results.steps.push({
                step: 4,
                name: "Policy lookup", 
                status: "NOT_FOUND",
                message: "No active policy, will use defaults"
            });
            
            // Show what defaults will be used
            results.defaultsWillBeUsed = {
                count: Object.keys(DEFAULT_CONSTRAINT_RULES).length,
                rules: Object.keys(DEFAULT_CONSTRAINT_RULES).map(id => ({
                    id,
                    name: (DEFAULT_CONSTRAINT_RULES as any)[id].name
                }))
            };
        }

        // Step 5: Test initializing policy (dry run)
        results.steps.push({
            step: 5,
            name: "Initialization ready",
            status: "PASS",
            message: policy ? "Policy exists, no init needed" : "Policy will be created on first access to /hr/constraint-rules"
        });

        results.status = "SUCCESS";
        results.nextSteps = [
            "Visit /hr/constraint-rules to view and manage rules",
            "The page will auto-initialize default rules if none exist"
        ];

        return NextResponse.json(results, { status: 200 });

    } catch (error: any) {
        console.error("[Constraint Rules Test Error]:", error);
        results.steps.push({
            step: "ERROR",
            name: "Exception caught",
            error: error.message,
            stack: process.env.NODE_ENV === "development" ? error.stack : undefined
        });
        return NextResponse.json(results, { status: 500 });
    }
}

/**
 * POST - Initialize constraint rules for the company
 */
export async function POST() {
    try {
        const user = await currentUser();
        if (!user) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

        const employee = await prisma.employee.findUnique({
            where: { clerk_id: user.id }
        });

        if (!employee?.org_id) {
            return NextResponse.json({ error: "No org_id found" }, { status: 400 });
        }

        // Check if policy already exists
        const existing = await prisma.constraintPolicy.findFirst({
            where: { org_id: employee.org_id }
        });

        if (existing) {
            return NextResponse.json({
                status: "EXISTS",
                policy_id: existing.id,
                message: "Policy already exists"
            });
        }

        // Create new policy with all default rules
        const rulesWithMetadata = Object.entries(DEFAULT_CONSTRAINT_RULES).reduce(
            (acc, [ruleId, rule]) => {
                acc[ruleId] = {
                    ...rule,
                    is_active: true,
                    is_custom: false,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };
                return acc;
            },
            {} as Record<string, any>
        );

        const newPolicy = await prisma.constraintPolicy.create({
            data: {
                org_id: employee.org_id,
                name: "Default Leave Policy",
                rules: rulesWithMetadata,
                is_active: true
            }
        });

        return NextResponse.json({
            status: "CREATED",
            policy_id: newPolicy.id,
            rule_count: Object.keys(rulesWithMetadata).length,
            message: "Default rules initialized successfully"
        });

    } catch (error: any) {
        console.error("[Initialize Rules Error]:", error);
        return NextResponse.json({
            error: "Failed to initialize rules",
            message: error.message
        }, { status: 500 });
    }
}
