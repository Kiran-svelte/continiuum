import { NextRequest, NextResponse } from 'next/server';
import { getCompanyConstraintRules, initializeCompanyRules } from '@/app/actions/constraint-rules';

export const dynamic = 'force-dynamic';

// This endpoint simulates exactly what the constraint rules page does
export async function GET(req: NextRequest) {
    try {
        // Step 1: Initialize (same as page does)
        console.log('[DEBUG] Calling initializeCompanyRules...');
        const initResult = await initializeCompanyRules();
        console.log('[DEBUG] initResult:', initResult);

        // Step 2: Get rules (same as page does)
        console.log('[DEBUG] Calling getCompanyConstraintRules...');
        const rulesResult = await getCompanyConstraintRules();
        console.log('[DEBUG] rulesResult:', rulesResult);

        return NextResponse.json({
            init: initResult,
            rules: {
                success: rulesResult.success,
                error: rulesResult.error,
                rulesCount: rulesResult.rules?.length,
                sampleRules: rulesResult.rules?.slice(0, 2).map(r => ({ id: r.rule_id, name: r.name }))
            }
        });
    } catch (error: any) {
        console.error('[DEBUG] Error:', error);
        return NextResponse.json({
            error: error.message,
            stack: error.stack?.split('\n').slice(0, 10)
        });
    }
}
