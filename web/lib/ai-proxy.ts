import { fetchWithTimeout, ApiTimeoutError } from './safe-fetch';

export type LeaveRequestInput = {
    leave_type: string;
    start_date: string;
    end_date: string;
    days_requested: number;
    original_text: string;
};

export type RuleViolation = {
    rule_id: string;
    rule_name: string;
    message: string;
    details: any;
};

export type EvaluationResult = {
    approved: boolean;
    status: string;
    violations: RuleViolation[];
    processing_time_ms: number;
    // ... other fields from python response
};

const DEFAULT_ENGINE_URL = "http://localhost:8001";

function resolveConstraintEngineUrl() {
    const envUrl = process.env.CONSTRAINT_ENGINE_URL || process.env.NEXT_PUBLIC_CONSTRAINT_ENGINE_URL;
    if (envUrl) {
        return envUrl.replace(/\/+$/, "");
    }
    if (process.env.VERCEL_URL) {
        return `https://${process.env.VERCEL_URL}/api/constraint-engine`;
    }
    return DEFAULT_ENGINE_URL;
}

// Timeout for constraint engine (30 seconds for AI processing)
const CONSTRAINT_ENGINE_TIMEOUT = 30000;

export async function checkConstraints(
    empId: string,
    leaveInfo: LeaveRequestInput,
    orgId: string
): Promise<EvaluationResult> {

    // Fetch Organization Policies (Custom Rules) from database
    let customRules: Record<string, any> = {};
    
    try {
        // Try to fetch organization-specific constraint policies
        const { prisma } = await import('@/lib/prisma');
        const policy = await (prisma as any).constraintPolicy?.findFirst?.({ 
            where: { org_id: orgId, is_active: true } 
        });
        
        if (policy?.rules) {
            customRules = typeof policy.rules === 'string' 
                ? JSON.parse(policy.rules) 
                : policy.rules;
        }
    } catch (dbError) {
        // If policy table doesn't exist or query fails, continue with empty rules (defaults)
        console.log("No custom constraint policies found, using defaults");
    }

    try {
        const engineUrl = resolveConstraintEngineUrl();
        const response = await fetchWithTimeout(
            `${engineUrl}/evaluate`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    emp_id: empId,
                    leave_info: leaveInfo,
                    rules: customRules,
                }),
            },
            CONSTRAINT_ENGINE_TIMEOUT
        );

        if (!response.ok) {
            throw new Error(`Constraint Engine Error: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error("AI Proxy Error:", error);
        
        // Return a fallback result if the engine is unavailable
        if (error instanceof ApiTimeoutError) {
            console.warn("Constraint Engine timed out, returning fallback approval");
            return {
                approved: true,
                status: "auto_approved_timeout",
                violations: [],
                processing_time_ms: 0,
                message: "Request auto-approved due to system timeout. Manual review recommended."
            } as EvaluationResult;
        }
        
        // For other errors, return a safe fallback instead of throwing
        return {
            approved: true,
            status: "auto_approved_error",
            violations: [],
            processing_time_ms: 0,
            message: "Request auto-approved due to constraint engine error. Manual review recommended."
        } as EvaluationResult;
    }
}
