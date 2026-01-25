// ============================================================================
// CONSTRAINT RULES CONFIGURATION
// Shared constants for constraint rules - used by both server actions and API routes
// ============================================================================

// Default constraint rules with full configuration
export const DEFAULT_CONSTRAINT_RULES = {
    "RULE001": {
        id: "RULE001",
        name: "Maximum Leave Duration",
        description: "Check if requested days exceed maximum allowed per leave type",
        category: "limits",
        is_blocking: true,
        priority: 100,
        config: {
            limits: {
                "Annual Leave": 20,
                "Sick Leave": 15,
                "Emergency Leave": 5,
                "Personal Leave": 5,
                "Maternity Leave": 180,
                "Paternity Leave": 15,
                "Bereavement Leave": 5,
                "Study Leave": 10,
                "LWP": 30,
                "Comp Off": 5
            }
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
            exception_leave_types: ["Emergency Leave", "Bereavement Leave"]
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
            notice_days: {
                "Annual Leave": 7,
                "Sick Leave": 0,
                "Emergency Leave": 0,
                "Personal Leave": 3,
                "Maternity Leave": 30,
                "Paternity Leave": 14,
                "Bereavement Leave": 0,
                "Study Leave": 14,
                "LWP": 7,
                "Comp Off": 1
            }
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
            max_consecutive: {
                "Annual Leave": 10,
                "Sick Leave": 5,
                "Emergency Leave": 3,
                "Personal Leave": 3,
                "Study Leave": 5,
                "LWP": 15,
                "Comp Off": 2
            }
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
            applies_to: ["Annual Leave", "Personal Leave"]
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
            applies_to: ["Annual Leave", "Personal Leave"],
            exception_types: ["Sick Leave", "Emergency Leave", "Bereavement Leave"]
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
            allowed_during_probation: ["Sick Leave", "Emergency Leave", "Bereavement Leave"],
            restricted_types: ["Annual Leave", "Personal Leave", "Study Leave"]
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
            exception_types: ["Sick Leave", "Emergency Leave", "Bereavement Leave"]
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
            always_require_for: ["Sick Leave", "Study Leave", "Maternity Leave", "Paternity Leave"],
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
            exception_types: ["Sick Leave", "Emergency Leave", "Bereavement Leave"]
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
