/**
 * 🔍 DIAGNOSTIC ENDPOINT FOR CONSTRAINT RULES
 * 
 * Usage: GET /api/debug/constraint-rules?userId=CLERK_USER_ID
 * 
 * This endpoint helps diagnose why constraint rules are failing to load.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DEFAULT_CONSTRAINT_RULES } from "@/lib/constraint-rules-config";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const userId = req.nextUrl.searchParams.get('userId');
    
    if (!userId) {
        return NextResponse.json({ error: 'userId query param required' }, { status: 400 });
    }

    try {
        // Step 1: Find employee
        const employee = await prisma.employee.findUnique({
            where: { clerk_id: userId },
            select: {
                id: true,
                first_name: true,
                last_name: true,
                role: true,
                org_id: true,
                company_id: true,
                company: {
                    select: {
                        id: true,
                        name: true,
                        org_id: true
                    }
                }
            }
        });

        if (!employee) {
            return NextResponse.json({
                success: false,
                step: 'find_employee',
                error: 'Employee not found for clerk_id',
                userId
            });
        }

        // Step 2: Check org_id
        if (!employee.org_id) {
            return NextResponse.json({
                success: false,
                step: 'check_org_id',
                error: 'Employee has no org_id',
                employee: {
                    id: employee.id,
                    name: `${employee.first_name} ${employee.last_name}`,
                    company: employee.company?.name
                }
            });
        }

        // Step 3: Find constraint policy
        const policy = await prisma.constraintPolicy.findFirst({
            where: { org_id: employee.org_id, is_active: true }
        });

        // Step 4: Analyze rules format
        let rulesAnalysis: any = {
            hasPolicy: !!policy,
            hasRules: false,
            rulesFormat: 'none',
            keyCount: 0,
            sampleKeys: [],
            hasRulePrefix: false,
            hasCustomKeys: false
        };

        if (policy && policy.rules) {
            const rules = policy.rules as Record<string, any>;
            const keys = Object.keys(rules).filter(k => k !== '_auto_approve_config');
            
            rulesAnalysis = {
                ...rulesAnalysis,
                policyId: policy.id,
                hasRules: keys.length > 0,
                keyCount: keys.length,
                sampleKeys: keys.slice(0, 5),
                hasRulePrefix: keys.some(k => k.startsWith('RULE')),
                hasCustomKeys: keys.some(k => !k.startsWith('RULE')),
                allKeys: keys
            };

            // Determine format
            if (keys.some(k => k.startsWith('RULE'))) {
                rulesAnalysis.rulesFormat = 'RULE### (correct)';
            } else if (keys.length > 0) {
                rulesAnalysis.rulesFormat = 'custom keys (needs migration)';
            }
        }

        // Step 5: Test rule processing
        let processedRules: any[] = [];
        let processingError: string | null = null;

        try {
            if (policy && policy.rules) {
                const customRules = policy.rules as Record<string, any>;
                const ruleKeys = Object.keys(customRules).filter(k => k !== '_auto_approve_config');
                const hasRulePrefixRules = ruleKeys.some(k => k.startsWith('RULE'));

                if (hasRulePrefixRules) {
                    processedRules = Object.entries(customRules)
                        .filter(([key]) => key.startsWith('RULE'))
                        .map(([ruleId, ruleData]: [string, any]) => ({
                            id: ruleId,
                            name: ruleData.name || ruleId,
                            is_active: ruleData.is_active !== false
                        }));
                } else {
                    processedRules = Object.entries(DEFAULT_CONSTRAINT_RULES).map(
                        ([ruleId, rule]) => ({
                            id: ruleId,
                            name: rule.name,
                            is_active: true,
                            source: 'default (custom keys detected but mapped to defaults)'
                        })
                    );
                }
            } else {
                processedRules = Object.entries(DEFAULT_CONSTRAINT_RULES).map(
                    ([ruleId, rule]) => ({
                        id: ruleId,
                        name: rule.name,
                        is_active: true,
                        source: 'default (no policy)'
                    })
                );
            }
        } catch (err: any) {
            processingError = err.message;
        }

        return NextResponse.json({
            success: true,
            diagnosis: {
                employee: {
                    id: employee.id,
                    name: `${employee.first_name} ${employee.last_name}`,
                    role: employee.role,
                    org_id: employee.org_id,
                    company: employee.company?.name
                },
                rulesAnalysis,
                processedRulesCount: processedRules.length,
                processedRules: processedRules.slice(0, 5),
                processingError,
                recommendation: rulesAnalysis.hasCustomKeys && !rulesAnalysis.hasRulePrefix
                    ? 'Run /api/admin/fix-constraint-policies?secret=YOUR_SECRET to migrate'
                    : 'Policy format looks correct'
            }
        });

    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { status: 500 });
    }
}
