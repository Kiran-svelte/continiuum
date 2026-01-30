/**
 * 🤖 CONTINUUM ZERO-DECISION BURDEN ENGINE
 * 
 * Smart defaults and AI-assisted decision making:
 * - Context-aware smart defaults
 * - Predictive form filling
 * - Intelligent recommendations
 * - Progressive disclosure
 * - Auto-actions
 */

// ============================================================
// SMART DEFAULTS
// ============================================================

export interface SmartDefaultContext {
  userId?: string;
  role?: 'employee' | 'manager' | 'hr' | 'admin';
  department?: string;
  previousValues?: Record<string, unknown>;
  currentDate?: Date;
  companySettings?: Record<string, unknown>;
}

/**
 * Smart defaults for leave request forms
 */
export function getLeaveRequestDefaults(context: SmartDefaultContext) {
  const now = context.currentDate || new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  // Skip weekends for start date
  while (tomorrow.getDay() === 0 || tomorrow.getDay() === 6) {
    tomorrow.setDate(tomorrow.getDate() + 1);
  }
  
  const endDate = new Date(tomorrow);
  
  // Get most common leave type from history
  const defaultType = getMostFrequentValue(
    context.previousValues?.leaveTypes as string[],
    'annual'
  );
  
  return {
    type: defaultType,
    startDate: tomorrow.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
    isHalfDay: false,
    reason: '',
    // Suggested reason templates based on leave type
    reasonTemplates: getReasonTemplates(defaultType),
  };
}

/**
 * Get reason templates for leave types
 */
function getReasonTemplates(leaveType: string): string[] {
  const templates: Record<string, string[]> = {
    annual: [
      'Personal time off for vacation',
      'Family vacation',
      'Taking a break to recharge',
    ],
    sick: [
      'Not feeling well, need rest',
      'Doctor\'s appointment',
      'Medical procedure',
    ],
    casual: [
      'Personal errands',
      'Family matter',
      'Home maintenance',
    ],
    bereavement: [
      'Family bereavement',
    ],
    maternity: [
      'Maternity leave',
    ],
    paternity: [
      'Paternity leave',
    ],
  };
  
  return templates[leaveType] || templates.annual;
}

/**
 * Smart defaults for employee creation
 */
export function getEmployeeDefaults(context: SmartDefaultContext) {
  return {
    role: 'employee' as const,
    department: context.department || '',
    // Default joining date to next Monday
    joiningDate: getNextMonday().toISOString().split('T')[0],
    // Suggest manager based on department
    suggestedManager: null, // Would query based on department
  };
}

/**
 * Get next Monday date
 */
function getNextMonday(): Date {
  const date = new Date();
  const day = date.getDay();
  const daysUntilMonday = day === 0 ? 1 : 8 - day;
  date.setDate(date.getDate() + daysUntilMonday);
  return date;
}

// ============================================================
// PREDICTIVE HELPERS
// ============================================================

/**
 * Get most frequent value from history
 */
function getMostFrequentValue<T>(values: T[] | undefined, defaultValue: T): T {
  if (!values || values.length === 0) return defaultValue;
  
  const frequency: Record<string, number> = {};
  for (const value of values) {
    const key = String(value);
    frequency[key] = (frequency[key] || 0) + 1;
  }
  
  let maxCount = 0;
  let mostFrequent = defaultValue;
  
  for (const [key, count] of Object.entries(frequency)) {
    if (count > maxCount) {
      maxCount = count;
      mostFrequent = key as unknown as T;
    }
  }
  
  return mostFrequent;
}

/**
 * Predict leave duration based on type and history
 */
export function predictLeaveDuration(
  leaveType: string,
  history?: { type: string; days: number }[]
): number {
  if (!history || history.length === 0) {
    // Default durations by type
    const defaults: Record<string, number> = {
      annual: 5,
      sick: 1,
      casual: 1,
      bereavement: 3,
      maternity: 180,
      paternity: 5,
    };
    return defaults[leaveType] || 1;
  }
  
  // Calculate average for this leave type
  const relevant = history.filter(h => h.type === leaveType);
  if (relevant.length === 0) {
    return predictLeaveDuration(leaveType); // Use default
  }
  
  const avg = relevant.reduce((sum, h) => sum + h.days, 0) / relevant.length;
  return Math.round(avg);
}

// ============================================================
// INTELLIGENT RECOMMENDATIONS
// ============================================================

export interface Recommendation {
  id: string;
  type: 'action' | 'info' | 'warning' | 'tip';
  title: string;
  description: string;
  action?: {
    label: string;
    href?: string;
    onClick?: string; // Function name to call
  };
  priority: 'low' | 'medium' | 'high';
  dismissible: boolean;
}

/**
 * Get personalized recommendations for dashboard
 */
export function getDashboardRecommendations(context: {
  leaveBalance: Record<string, number>;
  pendingRequests: number;
  upcomingHolidays: { date: Date; name: string }[];
  attendanceRate?: number;
  role: string;
}): Recommendation[] {
  const recommendations: Recommendation[] = [];
  const now = new Date();
  
  // Check leave balance
  for (const [type, balance] of Object.entries(context.leaveBalance)) {
    if (balance > 10 && type === 'annual') {
      recommendations.push({
        id: `leave-balance-${type}`,
        type: 'tip',
        title: 'Plan Your Time Off',
        description: `You have ${balance} ${type} leave days remaining. Consider planning some time off to recharge.`,
        action: {
          label: 'Request Leave',
          href: '/employee/request-leave',
        },
        priority: 'medium',
        dismissible: true,
      });
    }
    
    if (balance <= 2 && type !== 'unpaid') {
      recommendations.push({
        id: `low-balance-${type}`,
        type: 'warning',
        title: 'Low Leave Balance',
        description: `Your ${type} leave balance is running low (${balance} days remaining).`,
        priority: 'high',
        dismissible: false,
      });
    }
  }
  
  // Check for pending requests
  if (context.pendingRequests > 0) {
    recommendations.push({
      id: 'pending-requests',
      type: 'info',
      title: 'Pending Requests',
      description: `You have ${context.pendingRequests} leave request(s) awaiting approval.`,
      action: {
        label: 'View Status',
        href: '/employee/leave-history',
      },
      priority: 'medium',
      dismissible: true,
    });
  }
  
  // Check upcoming holidays for long weekend opportunities
  for (const holiday of context.upcomingHolidays) {
    const daysUntil = Math.ceil(
      (holiday.date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysUntil > 0 && daysUntil <= 30) {
      const dayOfWeek = holiday.date.getDay();
      
      // Thursday or Tuesday - suggest long weekend
      if (dayOfWeek === 4 || dayOfWeek === 2) {
        recommendations.push({
          id: `long-weekend-${holiday.name}`,
          type: 'tip',
          title: 'Long Weekend Opportunity',
          description: `${holiday.name} falls on a ${dayOfWeek === 4 ? 'Thursday' : 'Tuesday'}. Take ${dayOfWeek === 4 ? 'Friday' : 'Monday'} off for a 4-day weekend!`,
          action: {
            label: 'Plan Leave',
            href: '/employee/request-leave',
          },
          priority: 'low',
          dismissible: true,
        });
      }
    }
  }
  
  // HR-specific recommendations
  if (context.role === 'hr' || context.role === 'admin') {
    recommendations.push({
      id: 'hr-review-pending',
      type: 'action',
      title: 'Review Pending Approvals',
      description: 'Check for any pending leave requests that need your attention.',
      action: {
        label: 'Review',
        href: '/hr/approvals',
      },
      priority: 'high',
      dismissible: false,
    });
  }
  
  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  
  return recommendations;
}

// ============================================================
// PROGRESSIVE DISCLOSURE
// ============================================================

export interface DisclosureLevel {
  level: 'basic' | 'intermediate' | 'advanced';
  visibleFields: string[];
  hiddenFields: string[];
}

/**
 * Get field visibility based on user experience level
 */
export function getFieldDisclosure(
  formType: 'leaveRequest' | 'employee' | 'policy',
  userExperience: 'new' | 'regular' | 'power'
): DisclosureLevel {
  const disclosures: Record<string, Record<string, DisclosureLevel>> = {
    leaveRequest: {
      new: {
        level: 'basic',
        visibleFields: ['type', 'startDate', 'endDate', 'reason'],
        hiddenFields: ['isHalfDay', 'halfDayType', 'contactDuringLeave', 'handoverNotes'],
      },
      regular: {
        level: 'intermediate',
        visibleFields: ['type', 'startDate', 'endDate', 'reason', 'isHalfDay', 'halfDayType'],
        hiddenFields: ['contactDuringLeave', 'handoverNotes'],
      },
      power: {
        level: 'advanced',
        visibleFields: ['type', 'startDate', 'endDate', 'reason', 'isHalfDay', 'halfDayType', 'contactDuringLeave', 'handoverNotes'],
        hiddenFields: [],
      },
    },
    employee: {
      new: {
        level: 'basic',
        visibleFields: ['name', 'email', 'role', 'department'],
        hiddenFields: ['phone', 'managerId', 'joiningDate'],
      },
      regular: {
        level: 'intermediate',
        visibleFields: ['name', 'email', 'role', 'department', 'phone', 'managerId'],
        hiddenFields: ['joiningDate'],
      },
      power: {
        level: 'advanced',
        visibleFields: ['name', 'email', 'role', 'department', 'phone', 'managerId', 'joiningDate'],
        hiddenFields: [],
      },
    },
    policy: {
      new: {
        level: 'basic',
        visibleFields: ['name', 'description'],
        hiddenFields: ['leaveTypes', 'workWeek', 'holidays'],
      },
      regular: {
        level: 'intermediate',
        visibleFields: ['name', 'description', 'leaveTypes'],
        hiddenFields: ['workWeek', 'holidays'],
      },
      power: {
        level: 'advanced',
        visibleFields: ['name', 'description', 'leaveTypes', 'workWeek', 'holidays'],
        hiddenFields: [],
      },
    },
  };
  
  return disclosures[formType]?.[userExperience] || disclosures[formType]?.regular;
}

// ============================================================
// AUTO-ACTIONS
// ============================================================

export interface AutoAction {
  id: string;
  trigger: string;
  action: string;
  enabled: boolean;
  conditions?: Record<string, unknown>;
}

/**
 * Default auto-actions for new users
 */
export const DEFAULT_AUTO_ACTIONS: AutoAction[] = [
  {
    id: 'auto-checkout',
    trigger: 'time:18:00',
    action: 'checkout',
    enabled: false,
    conditions: { onlyIfCheckedIn: true },
  },
  {
    id: 'auto-reminder-pending',
    trigger: 'leave:pending:24h',
    action: 'sendReminder',
    enabled: true,
  },
  {
    id: 'auto-approve-casual',
    trigger: 'leave:request:casual',
    action: 'autoApprove',
    enabled: false,
    conditions: { maxDays: 1, hasBalance: true },
  },
];

/**
 * Check if auto-action should trigger
 */
export function shouldTriggerAutoAction(
  action: AutoAction,
  context: Record<string, unknown>
): boolean {
  if (!action.enabled) return false;
  
  // Check conditions
  if (action.conditions) {
    for (const [key, expected] of Object.entries(action.conditions)) {
      if (context[key] !== expected) {
        return false;
      }
    }
  }
  
  return true;
}
