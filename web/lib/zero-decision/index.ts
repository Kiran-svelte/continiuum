/**
 * 🤖 CONTINUUM ZERO-DECISION BURDEN ENGINE - INDEX
 * 
 * Exports all zero-decision utilities
 */

export {
  getLeaveRequestDefaults,
  getEmployeeDefaults,
  predictLeaveDuration,
  getDashboardRecommendations,
  getFieldDisclosure,
  DEFAULT_AUTO_ACTIONS,
  shouldTriggerAutoAction,
  type SmartDefaultContext,
  type Recommendation,
  type DisclosureLevel,
  type AutoAction,
} from './smart-defaults';

/**
 * Contextual help content for progressive disclosure
 */
export const CONTEXTUAL_HELP: Record<string, {
  title: string;
  description: string;
  tips: string[];
}> = {
  leaveRequest: {
    title: 'Requesting Leave',
    description: 'Submit a leave request for approval by your manager or HR.',
    tips: [
      'Submit requests at least 2 weeks in advance for better approval chances',
      'Check the calendar for team availability before requesting',
      'Half-day leaves can be used for appointments',
    ],
  },
  attendance: {
    title: 'Attendance Tracking',
    description: 'Record your daily check-in and check-out times.',
    tips: [
      'Check in when you start working, even from home',
      'Forgot to check out? HR can correct your record',
      'Regular attendance improves your reliability score',
    ],
  },
  dashboard: {
    title: 'Your Dashboard',
    description: 'A quick overview of your leave balance, attendance, and pending items.',
    tips: [
      'Click on any card to see more details',
      'The AI assistant can help you plan your leave',
      'Check notifications regularly for updates',
    ],
  },
};

/**
 * Quick action definitions for different roles
 */
export const QUICK_ACTIONS: Record<string, Array<{
  id: string;
  label: string;
  icon: string;
  href: string;
  shortcut?: string;
}>> = {
  employee: [
    { id: 'request-leave', label: 'Request Leave', icon: 'Calendar', href: '/employee/request-leave', shortcut: 'l' },
    { id: 'check-in', label: 'Check In', icon: 'Clock', href: '/employee/attendance', shortcut: 'c' },
    { id: 'view-balance', label: 'Leave Balance', icon: 'PieChart', href: '/employee/leave-balance', shortcut: 'b' },
  ],
  manager: [
    { id: 'approve-leaves', label: 'Pending Approvals', icon: 'CheckCircle', href: '/manager/approvals', shortcut: 'a' },
    { id: 'team-calendar', label: 'Team Calendar', icon: 'Users', href: '/manager/team-calendar', shortcut: 't' },
    { id: 'reports', label: 'Reports', icon: 'BarChart', href: '/manager/reports', shortcut: 'r' },
  ],
  hr: [
    { id: 'all-requests', label: 'All Requests', icon: 'Inbox', href: '/hr/requests', shortcut: 'r' },
    { id: 'employees', label: 'Employees', icon: 'Users', href: '/hr/employees', shortcut: 'e' },
    { id: 'policies', label: 'Policies', icon: 'FileText', href: '/hr/policies', shortcut: 'p' },
    { id: 'analytics', label: 'Analytics', icon: 'TrendingUp', href: '/hr/analytics', shortcut: 'n' },
  ],
  admin: [
    { id: 'company', label: 'Company Settings', icon: 'Building', href: '/admin/company', shortcut: 's' },
    { id: 'billing', label: 'Billing', icon: 'CreditCard', href: '/admin/billing', shortcut: 'b' },
    { id: 'audit', label: 'Audit Logs', icon: 'Shield', href: '/admin/audit', shortcut: 'u' },
  ],
};

/**
 * Keyboard shortcut definitions
 */
export const KEYBOARD_SHORTCUTS = {
  global: {
    'Ctrl+K': 'Open command palette',
    'Ctrl+/': 'Show keyboard shortcuts',
    'Escape': 'Close modal/dropdown',
  },
  navigation: {
    'g d': 'Go to Dashboard',
    'g l': 'Go to Leave',
    'g a': 'Go to Attendance',
    'g s': 'Go to Settings',
  },
  actions: {
    'n l': 'New leave request',
    'n e': 'New employee (HR only)',
    'a': 'Approve selected',
    'r': 'Reject selected',
  },
};
