import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { DEFAULT_CONSTRAINT_RULES } from '@/lib/constraint-rules-config';

export const dynamic = 'force-dynamic';

// This endpoint simulates what the constraint rules page does
// but uses a clerk_id passed as param instead of currentUser()
export async function GET(req: NextRequest) {
    const clerk_id = req.nextUrl.searchParams.get('clerk_id');
    
    if (!clerk_id) {
        return NextResponse.json({
            error: 'clerk_id required',
            usage: '/api/debug/simulate-constraint-page?clerk_id=user_xxx'
        });
    }

    const steps: any[] = [];

    try {
        // Step 1: Find employee
        const employee = await prisma.employee.findUnique({
            where: { clerk_id },
            include: { company: true }
        });
        steps.push({ step: 'findEmployee', result: employee ? 'found' : 'not_found', data: employee ? { emp_id: employee.emp_id, org_id: employee.org_id } : null });

        if (!employee) {
            return NextResponse.json({ steps, finalError: 'Employee profile not found' });
        }

        if (!employee.org_id) {
            return NextResponse.json({ steps, finalError: 'No organization found' });
        }

        // Step 2: Get policy
        const policy = await prisma.constraintPolicy.findFirst({
            where: { org_id: employee.org_id, is_active: true }
        });
        steps.push({ step: 'findPolicy', result: policy ? 'found' : 'not_found', policyId: policy?.id });

        if (!policy || !policy.rules) {
            // No policy - return defaults
            const defaultRules = Object.entries(DEFAULT_CONSTRAINT_RULES).map(([ruleId, rule]) => ({
                id: ruleId,
                rule_id: ruleId,
                name: rule.name,
                is_active: true
            }));
            steps.push({ step: 'useDefaults', count: defaultRules.length });
            return NextResponse.json({ 
                success: true, 
                steps, 
                rulesCount: defaultRules.length,
                sampleRules: defaultRules.slice(0, 3)
            });
        }

        // Step 3: Process policy rules
        const customRules = policy.rules as Record<string, any>;
        const ruleKeys = Object.keys(customRules).filter(k => k !== '_auto_approve_config');
        const hasRulePrefixRules = ruleKeys.some((key) => key.startsWith('RULE'));
        steps.push({ step: 'processRules', ruleKeysCount: ruleKeys.length, hasRulePrefixRules });

        if (hasRulePrefixRules) {
            const rules = Object.entries(customRules)
                .filter(([key]) => key.startsWith('RULE'))
                .map(([ruleId, ruleData]: [string, any]) => ({
                    id: ruleId,
                    rule_id: ruleId,
                    name: ruleData.name || ruleId,
                    is_active: ruleData.is_active !== false
                }));
            steps.push({ step: 'mapRules', count: rules.length });
            return NextResponse.json({ 
                success: true, 
                steps, 
                rulesCount: rules.length,
                sampleRules: rules.slice(0, 3)
            });
        }

        return NextResponse.json({ steps, error: 'No RULE### keys found' });

    } catch (error: any) {
        return NextResponse.json({ 
            steps, 
            error: error.message, 
            stack: error.stack?.split('\\n').slice(0, 5) 
        });
    }
}
