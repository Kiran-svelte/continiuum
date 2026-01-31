// ============================================================================
// CONSTRAINT RULES CONFIGURATION
// Shared constants for constraint rules - used by both server actions and API routes
// IMPORTANT: These are TEMPLATE rules. Actual values come from company's LeaveType table!
// ============================================================================

// Type for leave type from database
export type CompanyLeaveType = {
    id: string;
    name: string;
    code: string;
    annual_quota: number | string;
    notice_days?: number;
    max_consecutive?: number;
    requires_document?: boolean;
    is_active: boolean;
};

// Generate constraint rules dynamically based on company's leave types
export function generateConstraintRules(companyLeaveTypes: CompanyLeaveType[]) {
    // Build dynamic limits from company leave types
    const dynamicLimits: Record<string, number> = {};
    const dynamicNoticeDays: Record<string, number> = {};
    const dynamicMaxConsecutive: Record<string, number> = {};
    const documentRequiredTypes: string[] = [];
    
    companyLeaveTypes.forEach(lt => {
        dynamicLimits[lt.name] = Number(lt.annual_quota) || 20;
        dynamicNoticeDays[lt.name] = lt.notice_days ?? (lt.name.toLowerCase().includes('sick') || lt.name.toLowerCase().includes('emergency') ? 0 : 3);
        dynamicMaxConsecutive[lt.name] = lt.max_consecutive ?? Math.min(Number(lt.annual_quota) || 10, 15);
        if (lt.requires_document) {
            documentRequiredTypes.push(lt.name);
        }
    });

    return {
        "RULE001": {
            id: "RULE001",
            name: "Maximum Leave Duration",
            description: "Check if requested days exceed maximum allowed per leave type",
            category: "limits",
            is_blocking: true,
            priority: 100,
            config: {
                limits: dynamicLimits
            }
        },
        "RULE002": {
            id: "RULE002",
            name: "Leave Balance Check",
            description: "Verify sufficient leave balance available before approval",
            category: "balance",
            is_blocking: true,
            priority: 99,
            config: {
                allow_negative: false,
                negative_limit: 0
            }
        },
        "RULE003": {
            id: "RULE003",
            name: "Minimum Team Coverage",
            description: "Ensure minimum team members present during leave period",
            category: "coverage",
            is_blocking: true,
            priority: 90,
            config: {
                min_coverage_percent: 60,
                applies_to_departments: ["all"]
            }
        },
        "RULE004": {
            id: "RULE004",
            name: "Maximum Concurrent Leave",
            description: "Limit simultaneous leaves in a team/department",
            category: "coverage",
            is_blocking: true,
            priority: 89,
            config: {
                max_concurrent: 2,
                scope: "department"
            }
        },
        "RULE005": {
            id: "RULE005",
            name: "Blackout Period Check",
            description: "No leaves during specified blackout dates",
            category: "blackout",
            is_blocking: true,
            priority: 95,
            config: {
                blackout_dates: [],
                blackout_days_of_week: [],
                exception_leave_types: companyLeaveTypes
                    .filter(lt => lt.name.toLowerCase().includes('emergency') || lt.name.toLowerCase().includes('bereavement'))
                    .map(lt => lt.name)
            }
        },
        "RULE006": {
            id: "RULE006",
            name: "Advance Notice Requirement",
            description: "Minimum notice period required for leave requests",
            category: "notice",
            is_blocking: false,
            priority: 80,
            config: {
                notice_days: dynamicNoticeDays
            }
        },
        "RULE007": {
            id: "RULE007",
            name: "Consecutive Leave Limit",
            description: "Maximum consecutive days allowed for each leave type",
            category: "limits",
            is_blocking: true,
            priority: 85,
            config: {
                max_consecutive: dynamicMaxConsecutive
            }
        },
        "RULE008": {
            id: "RULE008",
            name: "Weekend/Holiday Sandwich Rule",
            description: "Count weekends/holidays between leave days as leave",
            category: "calculation",
            is_blocking: false,
            priority: 70,
            config: {
                enabled: true,
                min_gap_days: 1,
                applies_to: companyLeaveTypes
                    .filter(lt => lt.name.toLowerCase().includes('annual') || lt.name.toLowerCase().includes('personal') || lt.name.toLowerCase().includes('casual'))
                    .map(lt => lt.name)
            }
        },
        "RULE009": {
            id: "RULE009",
            name: "Minimum Gap Between Leaves",
            description: "Required gap between consecutive leave requests",
            category: "limits",
            is_blocking: false,
            priority: 75,
            config: {
                min_gap_days: 7,
                applies_to: companyLeaveTypes
                    .filter(lt => lt.name.toLowerCase().includes('annual') || lt.name.toLowerCase().includes('personal') || lt.name.toLowerCase().includes('casual'))
                    .map(lt => lt.name),
                exception_types: companyLeaveTypes
                    .filter(lt => lt.name.toLowerCase().includes('sick') || lt.name.toLowerCase().includes('emergency') || lt.name.toLowerCase().includes('bereavement'))
                    .map(lt => lt.name)
            }
        },
        "RULE010": {
            id: "RULE010",
            name: "Probation Period Restriction",
            description: "Limit leave types available during probation",
            category: "eligibility",
            is_blocking: true,
            priority: 98,
            config: {
                probation_months: 6,
                allowed_during_probation: companyLeaveTypes
                    .filter(lt => lt.name.toLowerCase().includes('sick') || lt.name.toLowerCase().includes('emergency') || lt.name.toLowerCase().includes('bereavement'))
                    .map(lt => lt.name),
                restricted_types: companyLeaveTypes
                    .filter(lt => lt.name.toLowerCase().includes('annual') || lt.name.toLowerCase().includes('personal') || lt.name.toLowerCase().includes('study') || lt.name.toLowerCase().includes('casual'))
                    .map(lt => lt.name)
            }
        },
        "RULE011": {
            id: "RULE011",
            name: "Critical Project Freeze",
            description: "Restrict leaves during critical project periods",
            category: "blackout",
            is_blocking: false,
            priority: 85,
            config: {
                enabled: false,
                freeze_periods: [],
                exception_types: companyLeaveTypes
                    .filter(lt => lt.name.toLowerCase().includes('sick') || lt.name.toLowerCase().includes('emergency') || lt.name.toLowerCase().includes('bereavement'))
                    .map(lt => lt.name)
            }
        },
        "RULE012": {
            id: "RULE012",
            name: "Document Requirement",
            description: "Require supporting documents for certain leave types/durations",
            category: "documentation",
            is_blocking: false,
            priority: 60,
            config: {
                require_document_above_days: 3,
                always_require_for: documentRequiredTypes.length > 0 
                    ? documentRequiredTypes 
                    : companyLeaveTypes.filter(lt => 
                        lt.name.toLowerCase().includes('sick') || 
                        lt.name.toLowerCase().includes('study') || 
                        lt.name.toLowerCase().includes('maternity') || 
                        lt.name.toLowerCase().includes('paternity')
                    ).map(lt => lt.name),
                document_types: ["medical_certificate", "proof_of_event", "other"]
            }
        },
        "RULE013": {
            id: "RULE013",
            name: "Monthly Leave Quota",
            description: "Maximum leaves per month per employee",
            category: "limits",
            is_blocking: false,
            priority: 65,
            config: {
                max_per_month: 5,
                exception_types: companyLeaveTypes
                    .filter(lt => lt.name.toLowerCase().includes('sick') || lt.name.toLowerCase().includes('emergency') || lt.name.toLowerCase().includes('bereavement'))
                    .map(lt => lt.name)
            }
        },
        "RULE014": {
            id: "RULE014",
            name: "Half-Day Leave Escalation",
            description: "Half-day leaves require HR approval - never auto-approved",
            category: "escalation",
            is_blocking: false,
            priority: 50,
            config: {
                always_escalate: true,
                escalate_to: "hr"
            }
        }
    };
}

// Legacy: DEFAULT_CONSTRAINT_RULES for backward compatibility 
// Use generateConstraintRules() with company leave types instead!
export const DEFAULT_CONSTRAINT_RULES = generateConstraintRules([
    { id: "1", name: "Annual Leave", code: "AL", annual_quota: 20, notice_days: 7, max_consecutive: 10, is_active: true },
    { id: "2", name: "Sick Leave", code: "SL", annual_quota: 15, notice_days: 0, max_consecutive: 5, is_active: true },
    { id: "3", name: "Emergency Leave", code: "EL", annual_quota: 5, notice_days: 0, max_consecutive: 3, is_active: true },
    { id: "4", name: "Personal Leave", code: "PL", annual_quota: 5, notice_days: 3, max_consecutive: 3, is_active: true },
    { id: "5", name: "Maternity Leave", code: "ML", annual_quota: 180, notice_days: 30, is_active: true },
    { id: "6", name: "Paternity Leave", code: "PAT", annual_quota: 15, notice_days: 14, is_active: true },
    { id: "7", name: "Bereavement Leave", code: "BL", annual_quota: 5, notice_days: 0, is_active: true },
    { id: "8", name: "Study Leave", code: "STL", annual_quota: 10, notice_days: 14, max_consecutive: 5, is_active: true },
    { id: "9", name: "LWP", code: "LWP", annual_quota: 30, notice_days: 7, max_consecutive: 15, is_active: true },
    { id: "10", name: "Comp Off", code: "CO", annual_quota: 5, notice_days: 1, max_consecutive: 2, is_active: true }
]);

// Rule categories for UI grouping
export const RULE_CATEGORIES = {
    limits: { name: "Leave Limits", color: "blue", icon: "Gauge" },
    balance: { name: "Balance Checks", color: "green", icon: "Calculator" },
    coverage: { name: "Team Coverage", color: "purple", icon: "Users" },
    blackout: { name: "Blackout Periods", color: "red", icon: "CalendarX" },
    notice: { name: "Notice Requirements", color: "yellow", icon: "Clock" },
    calculation: { name: "Calculation Rules", color: "cyan", icon: "Binary" },
    eligibility: { name: "Eligibility", color: "orange", icon: "Shield" },
    documentation: { name: "Documentation", color: "pink", icon: "FileText" },
    escalation: { name: "Escalation", color: "amber", icon: "AlertTriangle" }
};

// Type for constraint rule
export type ConstraintRuleConfig = {
    id: string;
    name: string;
    description: string;
    category: string;
    is_blocking: boolean;
    priority: number;
    config: Record<string, any>;
};

export type ConstraintRule = ConstraintRuleConfig & {
    rule_id: string;
    is_active: boolean;
    is_custom: boolean;
    created_at: Date;
    updated_at: Date;
};
