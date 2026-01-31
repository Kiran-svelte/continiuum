import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DEFAULT_CONSTRAINT_RULES } from "@/lib/constraint-rules-config";

export const dynamic = 'force-dynamic';

export async function GET() {
    const results: any = {
        step: "start",
        errors: []
    };
    
    try {
        // Step 1: Test prisma connection
        results.step = "prisma_test";
        const count = await prisma.employee.count();
        results.employeeCount = count;
        
        // Step 2: Test DEFAULT_CONSTRAINT_RULES
        results.step = "check_defaults";
        results.defaultRulesCount = Object.keys(DEFAULT_CONSTRAINT_RULES).length;
        results.sampleRule = Object.keys(DEFAULT_CONSTRAINT_RULES)[0];
        
        // Step 3: Get a sample employee with org_id
        results.step = "get_sample_employee";
        const employee = await prisma.employee.findFirst({
            where: { 
                org_id: { not: null },
                role: "hr"
            },
            select: {
                emp_id: true,
                clerk_id: true,
                org_id: true,
                full_name: true
            }
        });
        results.sampleEmployee = employee ? { emp_id: employee.emp_id, org_id: employee.org_id, clerk_id: employee.clerk_id } : null;
        
        if (employee?.org_id) {
            // Step 4: Get constraint policy
            results.step = "get_policy";
            const policy = await prisma.constraintPolicy.findFirst({
                where: { org_id: employee.org_id, is_active: true }
            });
            
            if (policy) {
                results.policyId = policy.id;
                results.policyRulesType = typeof policy.rules;
                const rules = policy.rules as Record<string, any>;
                results.policyRulesKeys = Object.keys(rules || {}).slice(0, 5);
                results.hasRulePrefix = Object.keys(rules || {}).some(k => k.startsWith("RULE"));
            } else {
                results.policyFound = false;
            }
        }
        
        results.step = "complete";
        results.success = true;
        
    } catch (error: any) {
        results.success = false;
        results.errorMessage = error.message;
        results.errorStack = error.stack?.split("\n").slice(0, 5);
    }
    
    return NextResponse.json(results);
}

