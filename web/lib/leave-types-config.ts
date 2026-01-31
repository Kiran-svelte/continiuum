// =========================================================================
// PREDEFINED LEAVE TYPES - All standard leave types that companies can select
// This ensures consistency and prevents spelling/case issues
// =========================================================================

export interface PredefinedLeaveType {
    code: string;
    name: string;
    description: string;
    color: string;
    annual_quota: number;
    max_consecutive: number;
    min_notice_days: number;
    requires_document: boolean;
    requires_approval: boolean;
    half_day_allowed: boolean;
    gender_specific: 'M' | 'F' | 'O' | null;
    carry_forward: boolean;
    max_carry_forward: number;
    is_paid: boolean;
    category: 'common' | 'statutory' | 'special' | 'unpaid';
}

// All available leave types that companies can choose from
export const PREDEFINED_LEAVE_TYPES: PredefinedLeaveType[] = [
    // Common Leave Types
    {
        code: "CL",
        name: "Casual Leave",
        description: "For personal matters, emergencies, and short absences",
        color: "#6366f1",
        annual_quota: 12,
        max_consecutive: 3,
        min_notice_days: 1,
        requires_document: false,
        requires_approval: true,
        half_day_allowed: true,
        gender_specific: null,
        carry_forward: false,
        max_carry_forward: 0,
        is_paid: true,
        category: 'common',
    },
    {
        code: "SL",
        name: "Sick Leave",
        description: "For health-related absences and medical appointments",
        color: "#ef4444",
        annual_quota: 12,
        max_consecutive: 7,
        min_notice_days: 0,
        requires_document: true,
        requires_approval: true,
        half_day_allowed: true,
        gender_specific: null,
        carry_forward: false,
        max_carry_forward: 0,
        is_paid: true,
        category: 'common',
    },
    {
        code: "PL",
        name: "Privilege Leave",
        description: "Earned leave for planned vacations and extended time off",
        color: "#10b981",
        annual_quota: 15,
        max_consecutive: 15,
        min_notice_days: 7,
        requires_document: false,
        requires_approval: true,
        half_day_allowed: false,
        gender_specific: null,
        carry_forward: true,
        max_carry_forward: 30,
        is_paid: true,
        category: 'common',
    },
    {
        code: "EL",
        name: "Earned Leave",
        description: "Leave earned based on working days, usable for any purpose",
        color: "#22c55e",
        annual_quota: 15,
        max_consecutive: 15,
        min_notice_days: 7,
        requires_document: false,
        requires_approval: true,
        half_day_allowed: false,
        gender_specific: null,
        carry_forward: true,
        max_carry_forward: 30,
        is_paid: true,
        category: 'common',
    },
    {
        code: "AL",
        name: "Annual Leave",
        description: "Yearly leave allocation for personal time and vacations",
        color: "#3b82f6",
        annual_quota: 20,
        max_consecutive: 20,
        min_notice_days: 7,
        requires_document: false,
        requires_approval: true,
        half_day_allowed: true,
        gender_specific: null,
        carry_forward: true,
        max_carry_forward: 5,
        is_paid: true,
        category: 'common',
    },

    // Statutory Leave Types
    {
        code: "ML",
        name: "Maternity Leave",
        description: "For expecting mothers before and after childbirth",
        color: "#f472b6",
        annual_quota: 182,
        max_consecutive: 182,
        min_notice_days: 30,
        requires_document: true,
        requires_approval: true,
        half_day_allowed: false,
        gender_specific: 'F',
        carry_forward: false,
        max_carry_forward: 0,
        is_paid: true,
        category: 'statutory',
    },
    {
        code: "PTL",
        name: "Paternity Leave",
        description: "For new fathers to support their partner and newborn",
        color: "#3b82f6",
        annual_quota: 15,
        max_consecutive: 15,
        min_notice_days: 7,
        requires_document: true,
        requires_approval: true,
        half_day_allowed: false,
        gender_specific: 'M',
        carry_forward: false,
        max_carry_forward: 0,
        is_paid: true,
        category: 'statutory',
    },
    {
        code: "BL",
        name: "Bereavement Leave",
        description: "For the loss of immediate family members",
        color: "#64748b",
        annual_quota: 5,
        max_consecutive: 5,
        min_notice_days: 0,
        requires_document: true,
        requires_approval: true,
        half_day_allowed: false,
        gender_specific: null,
        carry_forward: false,
        max_carry_forward: 0,
        is_paid: true,
        category: 'statutory',
    },

    // Special Leave Types
    {
        code: "MRL",
        name: "Marriage Leave",
        description: "Leave for employee's own wedding",
        color: "#ec4899",
        annual_quota: 5,
        max_consecutive: 5,
        min_notice_days: 15,
        requires_document: true,
        requires_approval: true,
        half_day_allowed: false,
        gender_specific: null,
        carry_forward: false,
        max_carry_forward: 0,
        is_paid: true,
        category: 'special',
    },
    {
        code: "STL",
        name: "Study Leave",
        description: "For exams, certifications, or educational pursuits",
        color: "#8b5cf6",
        annual_quota: 5,
        max_consecutive: 3,
        min_notice_days: 7,
        requires_document: true,
        requires_approval: true,
        half_day_allowed: true,
        gender_specific: null,
        carry_forward: false,
        max_carry_forward: 0,
        is_paid: true,
        category: 'special',
    },
    {
        code: "CMP",
        name: "Compensatory Off",
        description: "Time off in lieu of overtime or weekend work",
        color: "#f59e0b",
        annual_quota: 0,
        max_consecutive: 2,
        min_notice_days: 1,
        requires_document: false,
        requires_approval: true,
        half_day_allowed: true,
        gender_specific: null,
        carry_forward: false,
        max_carry_forward: 0,
        is_paid: true,
        category: 'special',
    },
    {
        code: "WFH",
        name: "Work From Home",
        description: "Remote working arrangement",
        color: "#06b6d4",
        annual_quota: 52,
        max_consecutive: 5,
        min_notice_days: 1,
        requires_document: false,
        requires_approval: true,
        half_day_allowed: false,
        gender_specific: null,
        carry_forward: false,
        max_carry_forward: 0,
        is_paid: true,
        category: 'special',
    },
    {
        code: "OD",
        name: "On Duty",
        description: "Working outside office premises on official duty",
        color: "#14b8a6",
        annual_quota: 30,
        max_consecutive: 10,
        min_notice_days: 1,
        requires_document: false,
        requires_approval: true,
        half_day_allowed: true,
        gender_specific: null,
        carry_forward: false,
        max_carry_forward: 0,
        is_paid: true,
        category: 'special',
    },
    {
        code: "VOL",
        name: "Volunteer Leave",
        description: "For volunteering and community service activities",
        color: "#84cc16",
        annual_quota: 3,
        max_consecutive: 2,
        min_notice_days: 7,
        requires_document: false,
        requires_approval: true,
        half_day_allowed: true,
        gender_specific: null,
        carry_forward: false,
        max_carry_forward: 0,
        is_paid: true,
        category: 'special',
    },

    // Unpaid Leave Types
    {
        code: "LWP",
        name: "Leave Without Pay",
        description: "Unpaid leave when all other leave balances are exhausted",
        color: "#94a3b8",
        annual_quota: 365,
        max_consecutive: 30,
        min_notice_days: 3,
        requires_document: false,
        requires_approval: true,
        half_day_allowed: true,
        gender_specific: null,
        carry_forward: false,
        max_carry_forward: 0,
        is_paid: false,
        category: 'unpaid',
    },
    {
        code: "SAB",
        name: "Sabbatical",
        description: "Extended unpaid leave for personal development or rest",
        color: "#78716c",
        annual_quota: 365,
        max_consecutive: 180,
        min_notice_days: 30,
        requires_document: true,
        requires_approval: true,
        half_day_allowed: false,
        gender_specific: null,
        carry_forward: false,
        max_carry_forward: 0,
        is_paid: false,
        category: 'unpaid',
    },
];

// Get leave types by category
export const getLeaveTypesByCategory = () => {
    return PREDEFINED_LEAVE_TYPES.reduce((acc, lt) => {
        if (!acc[lt.category]) {
            acc[lt.category] = [];
        }
        acc[lt.category].push(lt);
        return acc;
    }, {} as Record<string, PredefinedLeaveType[]>);
};

// Get a single leave type by code
export const getLeaveTypeByCode = (code: string): PredefinedLeaveType | undefined => {
    return PREDEFINED_LEAVE_TYPES.find(lt => lt.code === code.toUpperCase());
};

// Search leave types by name or code (for autocomplete)
export const searchLeaveTypes = (query: string): PredefinedLeaveType[] => {
    const q = query.toLowerCase();
    return PREDEFINED_LEAVE_TYPES.filter(lt => 
        lt.code.toLowerCase().includes(q) || 
        lt.name.toLowerCase().includes(q)
    );
};

// Category display names
export const LEAVE_CATEGORY_LABELS: Record<string, string> = {
    common: "Common Leaves",
    statutory: "Statutory Leaves",
    special: "Special Leaves",
    unpaid: "Unpaid Leaves",
};

// Default leave types for new companies (common set)
export const DEFAULT_LEAVE_TYPE_CODES = ["CL", "SL", "PL", "ML", "PTL", "LWP"];

// Get default leave types for onboarding
export const getDefaultLeaveTypes = (): PredefinedLeaveType[] => {
    return DEFAULT_LEAVE_TYPE_CODES.map(code => 
        PREDEFINED_LEAVE_TYPES.find(lt => lt.code === code)!
    ).filter(Boolean);
};
