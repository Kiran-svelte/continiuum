import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { logAudit, AuditAction } from "@/lib/audit";
import { checkApiRateLimit, rateLimitedResponse } from "@/lib/api-rate-limit";
import { apiLogger } from "@/lib/logger";
import { DEFAULT_CONSTRAINT_RULES } from "@/lib/constraint-rules-config";

const POLICY_EDIT_ROLES = new Set(["hr", "hr_manager", "admin", "super_admin"]);

function canEditPolicies(role?: string | null) {
    return POLICY_EDIT_ROLES.has((role || "").toLowerCase());
}

function parseBoolean(value: string): boolean {
    const normalized = value.trim().toLowerCase();
    return ["true", "yes", "y", "1", "enabled"].includes(normalized);
}

function normalizeRules(rules: any): Record<string, any> {
    if (!rules) return {};
    if (typeof rules === "string") {
        try {
            return JSON.parse(rules);
        } catch {
            return {};
        }
    }
    return rules;
}

async function ensureConstraintPolicy(orgId: string) {
    let policy = await prisma.constraintPolicy.findFirst({
        where: { org_id: orgId, is_active: true }
    });

    if (policy) return policy;

    const now = new Date().toISOString();
    const seededRules = Object.entries(DEFAULT_CONSTRAINT_RULES).reduce(
        (acc, [ruleId, rule]) => {
            acc[ruleId] = {
                ...rule,
                is_active: true,
                is_custom: false,
                created_at: now,
                updated_at: now
            };
            return acc;
        },
        {} as Record<string, any>
    );

    policy = await prisma.constraintPolicy.create({
        data: {
            org_id: orgId,
            name: "Default Leave Policy",
            rules: seededRules,
            is_active: true
        }
    });

    return policy;
}

export async function GET(req: NextRequest) {
    // Rate limiting
    const rateLimit = await checkApiRateLimit(req, 'policies');
    if (!rateLimit.allowed) {
        return rateLimitedResponse(rateLimit);
    }
    
    try {
        const user = await getUser();
        const userId = user?.id;
        if (!userId) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        // Get employee's organization
        const employee = await prisma.employee.findUnique({
            where: { clerk_id: userId },
            select: { org_id: true, role: true }
        });

        if (!employee) {
            return NextResponse.json({ success: false, error: "Employee not found" }, { status: 404 });
        }

        const company = await prisma.company.findUnique({
            where: { id: employee.org_id }
        });

        const policy = await ensureConstraintPolicy(employee.org_id);
        const rules = normalizeRules(policy.rules);
        const autoApproveConfig = rules["_auto_approve_config"]?.auto_approve || {};

        const formattedPolicies = [
            {
                id: "company.work_start_time",
                name: "Work Start Time",
                value: company?.work_start_time || "09:00",
                description: "Standard start time for the work day",
                category: "schedule",
                is_editable: canEditPolicies(employee.role)
            },
            {
                id: "company.work_end_time",
                name: "Work End Time",
                value: company?.work_end_time || "18:00",
                description: "Standard end time for the work day",
                category: "schedule",
                is_editable: canEditPolicies(employee.role)
            },
            {
                id: "company.grace_period_mins",
                name: "Grace Period (mins)",
                value: String(company?.grace_period_mins ?? 15),
                description: "Allowed late minutes before marked late",
                category: "schedule",
                is_editable: canEditPolicies(employee.role)
            },
            {
                id: "company.leave_year_start",
                name: "Leave Year Start",
                value: company?.leave_year_start || "01-01",
                description: "Start date for leave year (MM-DD)",
                category: "leave",
                is_editable: canEditPolicies(employee.role)
            },
            {
                id: "company.carry_forward_max",
                name: "Carry Forward Max",
                value: String(company?.carry_forward_max ?? 5),
                description: "Max days that can be carried forward",
                category: "leave",
                is_editable: canEditPolicies(employee.role)
            },
            {
                id: "company.probation_leave",
                name: "Allow Leave During Probation",
                value: company?.probation_leave ? "Yes" : "No",
                description: "Whether probation employees can take leave",
                category: "leave",
                is_editable: canEditPolicies(employee.role)
            },
            {
                id: "company.negative_balance",
                name: "Allow Negative Balance",
                value: company?.negative_balance ? "Yes" : "No",
                description: "Allow leave balance to go negative",
                category: "leave",
                is_editable: canEditPolicies(employee.role)
            },
            {
                id: "constraint.RULE004.max_concurrent",
                name: "Max Concurrent Leaves",
                value: String(rules?.RULE004?.config?.max_concurrent ?? 2),
                description: "Maximum employees on leave at the same time",
                category: "constraints",
                is_editable: canEditPolicies(employee.role)
            },
            {
                id: "constraint.RULE003.min_coverage_percent",
                name: "Min Team Coverage (%)",
                value: String(rules?.RULE003?.config?.min_coverage_percent ?? 60),
                description: "Minimum team coverage required",
                category: "constraints",
                is_editable: canEditPolicies(employee.role)
            },
            {
                id: "constraint.RULE006.default_notice_days",
                name: "Default Notice Days",
                value: String(rules?.RULE006?.config?.default_notice_days ?? 1),
                description: "Minimum notice days for leave requests",
                category: "constraints",
                is_editable: canEditPolicies(employee.role)
            },
            {
                id: "constraint.RULE005.blackout_dates",
                name: "Blackout Dates",
                value: (rules?.RULE005?.config?.blackout_dates || []).length
                    ? (rules?.RULE005?.config?.blackout_dates || []).join(", ")
                    : "None",
                description: "Dates where leave is not allowed",
                category: "constraints",
                is_editable: canEditPolicies(employee.role)
            },
            {
                id: "constraint.auto_approve.max_days",
                name: "Auto-Approve Max Days",
                value: String(autoApproveConfig?.max_days ?? 3),
                description: "Auto-approve leaves up to this number of days",
                category: "automation",
                is_editable: canEditPolicies(employee.role)
            },
            {
                id: "constraint.auto_approve.min_notice_days",
                name: "Auto-Approve Min Notice",
                value: String(autoApproveConfig?.min_notice_days ?? 1),
                description: "Minimum notice days for auto-approval",
                category: "automation",
                is_editable: canEditPolicies(employee.role)
            }
        ];

        return NextResponse.json({
            success: true,
            policies: formattedPolicies
        });

    } catch (error) {
        apiLogger.error("Policies GET Error", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch policies" },
            { status: 500 }
        );
    }
}

export async function PUT(request: NextRequest) {
    try {
        const user = await getUser();
        const userId = user?.id;
        if (!userId) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        // Get employee and verify HR role
        const employee = await prisma.employee.findUnique({
            where: { clerk_id: userId },
            select: { emp_id: true, org_id: true, role: true, full_name: true }
        });

        if (!employee) {
            return NextResponse.json({ success: false, error: "Employee not found" }, { status: 404 });
        }

        if (!canEditPolicies(employee.role)) {
            return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 });
        }

        const { policyId, value } = await request.json();

        if (!policyId || value === undefined) {
            return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
        }

        let previousValue: string | null = null;

        if (policyId.startsWith("company.")) {
            const field = policyId.replace("company.", "");
            const company = await prisma.company.findUnique({ where: { id: employee.org_id! } });
            if (!company) {
                return NextResponse.json({ success: false, error: "Company not found" }, { status: 404 });
            }

            const updateData: Record<string, any> = {};

            if (["grace_period_mins", "carry_forward_max"].includes(field)) {
                updateData[field] = Number.parseInt(value, 10);
            } else if (["probation_leave", "negative_balance"].includes(field)) {
                updateData[field] = parseBoolean(value);
            } else {
                updateData[field] = value;
            }

            previousValue = (company as any)[field]?.toString?.() ?? null;

            try {
                await prisma.company.update({
                    where: { id: employee.org_id! },
                    data: updateData
                });
            } catch (updateErr) {
                apiLogger.error("Error updating company setting", updateErr);
                return NextResponse.json({ success: false, error: "Failed to update policy" }, { status: 500 });
            }
        } else if (policyId.startsWith("constraint.")) {
            const policy = await ensureConstraintPolicy(employee.org_id!);
            const rules = normalizeRules(policy.rules);

            const parts = policyId.split(".");
            const ruleId = parts[1];
            const field = parts.slice(2).join(".");

            if (ruleId === "auto_approve") {
                rules["_auto_approve_config"] = rules["_auto_approve_config"] || { auto_approve: {}, escalation: {} };
                rules["_auto_approve_config"].auto_approve = rules["_auto_approve_config"].auto_approve || {};

                if (field === "max_days") {
                    previousValue = String(rules["_auto_approve_config"].auto_approve.max_days ?? "");
                    rules["_auto_approve_config"].auto_approve.max_days = Number.parseInt(value, 10);
                } else if (field === "min_notice_days") {
                    previousValue = String(rules["_auto_approve_config"].auto_approve.min_notice_days ?? "");
                    rules["_auto_approve_config"].auto_approve.min_notice_days = Number.parseInt(value, 10);
                } else {
                    return NextResponse.json({ success: false, error: "Unsupported policy update" }, { status: 400 });
                }
            } else {
                rules[ruleId] = rules[ruleId] || { config: {} };
                rules[ruleId].config = rules[ruleId].config || {};

                if (ruleId === "RULE004" && field === "max_concurrent") {
                    previousValue = String(rules[ruleId].config.max_concurrent ?? "");
                    rules[ruleId].config.max_concurrent = Number.parseInt(value, 10);
                } else if (ruleId === "RULE003" && field === "min_coverage_percent") {
                    previousValue = String(rules[ruleId].config.min_coverage_percent ?? "");
                    rules[ruleId].config.min_coverage_percent = Number.parseInt(value, 10);
                } else if (ruleId === "RULE006" && field === "default_notice_days") {
                    previousValue = String(rules[ruleId].config.default_notice_days ?? "");
                    rules[ruleId].config.default_notice_days = Number.parseInt(value, 10);
                } else if (ruleId === "RULE005" && field === "blackout_dates") {
                    previousValue = (rules[ruleId].config.blackout_dates || []).join(", ");
                    rules[ruleId].config.blackout_dates = value
                        .split(",")
                        .map((entry) => entry.trim())
                        .filter(Boolean);
                } else {
                    return NextResponse.json({ success: false, error: "Unsupported policy update" }, { status: 400 });
                }
            }

            try {
                await prisma.constraintPolicy.update({
                    where: { id: policy.id },
                    data: { rules, updated_at: new Date() }
                });
            } catch (updateErr) {
                apiLogger.error("Error updating constraint policy", updateErr);
                return NextResponse.json({ success: false, error: "Failed to update policy" }, { status: 500 });
            }
        } else {
            return NextResponse.json({ success: false, error: "Invalid policy ID" }, { status: 400 });
        }

        // Log the policy update
        await logAudit({
            actorId: employee.emp_id,
            actorType: "user",
            action: AuditAction.POLICY_UPDATED,
            entityType: "Policy",
            entityId: policyId,
            details: {
                previousValue,
                newValue: value,
                updatedBy: employee.full_name
            },
            orgId: employee.org_id!
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        apiLogger.error("Policies PUT Error", error);
        return NextResponse.json(
            { success: false, error: "Failed to update policy" },
            { status: 500 }
        );
    }
}
