/**
 * 🔧 PRODUCTION DATA FIX ENDPOINT
 * 
 * This is a one-time endpoint to fix constraint policies on production.
 * It should be called after deployment to migrate any malformed data.
 * 
 * Usage: GET /api/admin/fix-constraint-policies?secret=YOUR_ADMIN_SECRET
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DEFAULT_CONSTRAINT_RULES } from "@/lib/constraint-rules-config";

export const dynamic = 'force-dynamic';

// Mapping from custom keys to RULE IDs
const KEY_TO_RULE_MAPPING: Record<string, string> = {
    "maxConsecutiveDays": "RULE011",
    "maxConsecutive": "RULE011",
    "minNoticePeriod": "RULE006",
    "noticePeriod": "RULE006",
    "maxLeavePerMonth": "RULE012",
    "teamCoverageRequired": "RULE003",
    "blackoutPeriods": "RULE005",
    "blackoutDates": "RULE005",
    "balanceRequired": "RULE002",
    "documentRequired": "RULE009",
    "maxDuration": "RULE001",
    "maxConcurrent": "RULE004",
    "probationRestriction": "RULE008",
    "autoEscalation": "RULE010",
    "weekendCalculation": "RULE007",
    "leaveTypeRestrictions": "RULE014",
    "quarterlyReview": "RULE013",
};

export async function GET(req: NextRequest) {
    // Verify admin secret
    const secret = req.nextUrl.searchParams.get('secret');
    if (secret !== process.env.CRON_SECRET && secret !== process.env.ADMIN_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const policies = await prisma.constraintPolicy.findMany();
        const results: Array<{ orgId: string; status: string; details?: string }> = [];

        for (const policy of policies) {
            const rules = policy.rules as Record<string, any> | null;
            if (!rules) {
                results.push({ orgId: policy.org_id, status: 'skipped', details: 'No rules' });
                continue;
            }

            const keys = Object.keys(rules).filter(k => k !== '_auto_approve_config');
            const hasRulePrefix = keys.some(k => k.startsWith('RULE'));

            if (hasRulePrefix) {
                results.push({ orgId: policy.org_id, status: 'ok', details: 'Already correct format' });
                continue;
            }

            // Need to migrate
            const nowIso = new Date().toISOString();
            const newRules: Record<string, any> = {};

            for (const [ruleId, ruleDef] of Object.entries(DEFAULT_CONSTRAINT_RULES)) {
                let isActive = true;

                // Try to find matching custom key
                for (const [customKey, mappedRuleId] of Object.entries(KEY_TO_RULE_MAPPING)) {
                    if (mappedRuleId === ruleId && customKey in rules) {
                        const oldValue = rules[customKey];
                        isActive = typeof oldValue === 'boolean' ? oldValue : oldValue?.is_active !== false;
                        break;
                    }
                }

                if (ruleId in rules) {
                    const oldValue = rules[ruleId];
                    isActive = typeof oldValue === 'boolean' ? oldValue : oldValue?.is_active !== false;
                }

                newRules[ruleId] = {
                    ...ruleDef,
                    is_active: isActive,
                    is_custom: false,
                    created_at: nowIso,
                    updated_at: nowIso
                };
            }

            if (rules._auto_approve_config) {
                newRules._auto_approve_config = rules._auto_approve_config;
            }

            await prisma.constraintPolicy.update({
                where: { id: policy.id },
                data: { rules: newRules }
            });

            results.push({ 
                orgId: policy.org_id, 
                status: 'migrated', 
                details: `Converted ${keys.length} custom keys to ${Object.keys(newRules).filter(k => k.startsWith('RULE')).length} rules` 
            });
        }

        const migrated = results.filter(r => r.status === 'migrated').length;
        const alreadyOk = results.filter(r => r.status === 'ok').length;

        return NextResponse.json({
            success: true,
            summary: {
                total: policies.length,
                migrated,
                alreadyCorrect: alreadyOk,
                skipped: results.filter(r => r.status === 'skipped').length
            },
            details: results
        });

    } catch (error: any) {
        console.error('Fix constraint policies error:', error);
        return NextResponse.json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
}

