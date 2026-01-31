import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    const url = new URL(req.url);
    const org_id = url.searchParams.get('org_id');
    
    try {
        if (org_id) {
            const policy = await prisma.constraintPolicy.findFirst({
                where: { org_id, is_active: true }
            });
            
            if (!policy) {
                return NextResponse.json({ 
                    error: 'No policy found',
                    org_id,
                    allPolicies: await prisma.constraintPolicy.findMany({ where: { org_id }, take: 5 })
                });
            }
            
            const rules = policy.rules as Record<string, any>;
            const ruleKeys = Object.keys(rules || {}).filter(k => k !== '_auto_approve_config');
            const hasRulePrefixRules = ruleKeys.some((key) => key.startsWith('RULE'));
            
            return NextResponse.json({
                policy_id: policy.id,
                policy_name: policy.name,
                is_active: policy.is_active,
                ruleKeysCount: ruleKeys.length,
                sampleKeys: ruleKeys.slice(0, 10),
                hasRulePrefixRules,
                rulesType: typeof policy.rules
            });
        }
        
        return NextResponse.json({ error: 'Missing org_id parameter' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message, stack: error.stack });
    }
}
