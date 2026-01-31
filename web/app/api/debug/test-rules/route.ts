import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DEFAULT_CONSTRAINT_RULES } from "@/lib/constraint-rules-config";

export const dynamic = 'force-dynamic';

// Test using actual prisma query same as the action
export async function GET(req: NextRequest) {
    const clerkId = req.nextUrl.searchParams.get('clerk_id');
    
    if (!clerkId) {
        return NextResponse.json({ 
            error: "clerk_id query param required",
            usage: "/api/debug/test-rules?clerk_id=YOUR_CLERK_USER_ID"
        });
    }
    
    try {
        // Step 1: Find employee exactly as constraint-rules does
        const employee = await prisma.employee.findUnique({
            where: { clerk_id: clerkId },
            include: { company: true }
        });

        if (!employee) {
            return NextResponse.json({ 
                success: false, 
                step: "find_employee",
                error: "Employee not found for clerk_id: " + clerkId 
            });
        }

        if (!employee.org_id) {
            return NextResponse.json({ 
                success: false, 
                step: "check_org_id",
                error: "Employee has no org_id",
                employee: { emp_id: employee.emp_id, full_name: employee.full_name }
            });
        }

        // Step 2: Get constraint policy
        const policy = await prisma.constraintPolicy.findFirst({
            where: { org_id: employee.org_id, is_active: true }
        });

        if (!policy) {
            return NextResponse.json({
                success: true,
                step: "no_policy",
                message: "No policy found, would use default rules",
                defaultRulesCount: Object.keys(DEFAULT_CONSTRAINT_RULES).length
            });
        }

        // Step 3: Process rules
        const customRules = policy.rules as Record<string, any>;
        const ruleKeys = Object.keys(customRules).filter(k => k !== '_auto_approve_config');
        const hasRulePrefixRules = ruleKeys.some((key) => key.startsWith("RULE"));

        return NextResponse.json({
            success: true,
            employee: {
                emp_id: employee.emp_id,
                full_name: employee.full_name,
                org_id: employee.org_id,
                role: employee.role
            },
            policy: {
                id: policy.id,
                name: policy.name,
                ruleKeysCount: ruleKeys.length,
                sampleKeys: ruleKeys.slice(0, 5),
                hasRulePrefixRules
            }
        });

    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: error.message,
            stack: error.stack?.split("\n").slice(0, 8)
        });
    }
}
