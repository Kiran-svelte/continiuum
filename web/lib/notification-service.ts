"use server";

import { prisma } from "@/lib/prisma";
import { NotificationChannel } from "@prisma/client";

// ============================================================================
// NOTIFICATION EVENT TYPES
// ============================================================================

export const NOTIFICATION_EVENTS = {
  // Leave
  LEAVE_APPROVED: "leave_approved",
  LEAVE_REJECTED: "leave_rejected",
  LEAVE_ESCALATED: "leave_escalated",
  LEAVE_CANCELLED: "leave_cancelled",
  LEAVE_NEW_REQUEST: "leave_new_request",
  LEAVE_SLA_BREACH: "leave_sla_breach",

  // Attendance
  ATTENDANCE_CHECKIN_REMINDER: "attendance_checkin_reminder",
  ATTENDANCE_CHECKOUT_REMINDER: "attendance_checkout_reminder",
  ATTENDANCE_REGULARIZATION_REQUESTED: "attendance_regularization_requested",
  ATTENDANCE_REGULARIZATION_APPROVED: "attendance_regularization_approved",
  ATTENDANCE_REGULARIZATION_REJECTED: "attendance_regularization_rejected",

  // Payroll
  PAYROLL_GENERATED: "payroll_generated",
  PAYROLL_APPROVED: "payroll_approved",
  PAYROLL_SLIP_READY: "payroll_slip_ready",

  // Employee
  EMPLOYEE_REGISTERED: "employee_registered",
  EMPLOYEE_APPROVED: "employee_approved",
  PROBATION_ENDING: "probation_ending",
  RESIGNATION_SUBMITTED: "resignation_submitted",
  EXIT_INITIATED: "exit_initiated",

  // System
  DOCUMENT_EXPIRING: "document_expiring",
  SALARY_REVISION: "salary_revision",
} as const;

export type NotificationEvent =
  (typeof NOTIFICATION_EVENTS)[keyof typeof NOTIFICATION_EVENTS];

// ============================================================================
// DEFAULT TEMPLATES (used when no company-specific template exists)
// ============================================================================

const DEFAULT_TEMPLATES: Record<
  string,
  { title: string; message: string; priority: string }
> = {
  [NOTIFICATION_EVENTS.LEAVE_APPROVED]: {
    title: "Leave Approved",
    message:
      "Your {{leave_type}} leave request for {{days}} day(s) from {{start_date}} has been approved.",
    priority: "normal",
  },
  [NOTIFICATION_EVENTS.LEAVE_REJECTED]: {
    title: "Leave Rejected",
    message:
      "Your {{leave_type}} leave request for {{days}} day(s) from {{start_date}} has been rejected. Reason: {{reason}}",
    priority: "normal",
  },
  [NOTIFICATION_EVENTS.LEAVE_ESCALATED]: {
    title: "Leave Request Needs Approval",
    message:
      "{{employee_name}} has requested {{leave_type}} leave for {{days}} day(s) from {{start_date}}. Please review.",
    priority: "high",
  },
  [NOTIFICATION_EVENTS.LEAVE_CANCELLED]: {
    title: "Leave Cancelled",
    message:
      "{{employee_name}}'s {{leave_type}} leave for {{days}} day(s) from {{start_date}} has been cancelled.",
    priority: "normal",
  },
  [NOTIFICATION_EVENTS.LEAVE_NEW_REQUEST]: {
    title: "New Leave Request",
    message:
      "{{employee_name}} has applied for {{leave_type}} leave for {{days}} day(s) from {{start_date}}.",
    priority: "normal",
  },
  [NOTIFICATION_EVENTS.LEAVE_SLA_BREACH]: {
    title: "SLA Breach - Leave Request",
    message:
      "Leave request from {{employee_name}} has breached SLA. Pending for over {{sla_hours}} hours. Immediate action required.",
    priority: "urgent",
  },
  [NOTIFICATION_EVENTS.ATTENDANCE_REGULARIZATION_REQUESTED]: {
    title: "Attendance Regularization Request",
    message:
      "{{employee_name}} has requested attendance regularization for {{date}}. Please review.",
    priority: "normal",
  },
  [NOTIFICATION_EVENTS.ATTENDANCE_REGULARIZATION_APPROVED]: {
    title: "Regularization Approved",
    message:
      "Your attendance regularization request for {{date}} has been approved.",
    priority: "normal",
  },
  [NOTIFICATION_EVENTS.ATTENDANCE_REGULARIZATION_REJECTED]: {
    title: "Regularization Rejected",
    message:
      "Your attendance regularization request for {{date}} has been rejected. Reason: {{reason}}",
    priority: "normal",
  },
  [NOTIFICATION_EVENTS.PAYROLL_GENERATED]: {
    title: "Payroll Generated",
    message:
      "Payroll for {{month}}/{{year}} has been generated for {{employee_count}} employees. Total net: {{total_net}}.",
    priority: "normal",
  },
  [NOTIFICATION_EVENTS.PAYROLL_APPROVED]: {
    title: "Payroll Approved",
    message:
      "Payroll for {{month}}/{{year}} has been approved and is ready for processing.",
    priority: "normal",
  },
  [NOTIFICATION_EVENTS.PAYROLL_SLIP_READY]: {
    title: "Payslip Ready",
    message:
      "Your payslip for {{month}}/{{year}} is now available. Net pay: {{net_pay}}.",
    priority: "normal",
  },
  [NOTIFICATION_EVENTS.EMPLOYEE_REGISTERED]: {
    title: "New Employee Registration",
    message:
      "{{employee_name}} has registered and is pending approval.",
    priority: "normal",
  },
  [NOTIFICATION_EVENTS.EMPLOYEE_APPROVED]: {
    title: "Registration Approved",
    message:
      "Your registration has been approved. Welcome to {{company_name}}!",
    priority: "normal",
  },
  [NOTIFICATION_EVENTS.PROBATION_ENDING]: {
    title: "Probation Period Ending",
    message:
      "{{employee_name}}'s probation period ends on {{end_date}}. Please review and confirm/extend.",
    priority: "high",
  },
  [NOTIFICATION_EVENTS.RESIGNATION_SUBMITTED]: {
    title: "Resignation Submitted",
    message:
      "{{employee_name}} has submitted their resignation. Last working date: {{last_working_date}}.",
    priority: "high",
  },
  [NOTIFICATION_EVENTS.EXIT_INITIATED]: {
    title: "Exit Process Initiated",
    message:
      "Exit process has been initiated for {{employee_name}}. Please complete the exit checklist.",
    priority: "normal",
  },
  [NOTIFICATION_EVENTS.DOCUMENT_EXPIRING]: {
    title: "Document Expiring",
    message:
      "Your {{document_type}} is expiring on {{expiry_date}}. Please upload an updated document.",
    priority: "normal",
  },
  [NOTIFICATION_EVENTS.SALARY_REVISION]: {
    title: "Salary Revision",
    message:
      "A salary revision has been initiated for {{employee_name}}. New CTC: {{new_ctc}}.",
    priority: "normal",
  },
};

// ============================================================================
// TEMPLATE RENDERING
// ============================================================================

/**
 * Replace {{placeholders}} in template with actual values.
 */
function renderTemplate(
  template: string,
  data: Record<string, string | number>
): string {
  let rendered = template;
  for (const [key, value] of Object.entries(data)) {
    rendered = rendered.replace(
      new RegExp(`\\{\\{${key}\\}\\}`, "g"),
      String(value)
    );
  }
  return rendered;
}

// ============================================================================
// CORE NOTIFICATION DISPATCH
// ============================================================================

/**
 * Send a notification to one or more recipients.
 *
 * Checks recipient preferences and routes to appropriate channels.
 * Falls back to in_app if no preferences configured.
 */
export async function notify(
  recipientIds: string | string[],
  eventType: NotificationEvent,
  data: Record<string, string | number>,
  options?: {
    entityType?: string;
    entityId?: string;
    actionUrl?: string;
    companyId?: string;
  }
) {
  const ids = Array.isArray(recipientIds) ? recipientIds : [recipientIds];
  if (ids.length === 0) return;

  // Get company-specific template if available
  let template = DEFAULT_TEMPLATES[eventType];
  if (options?.companyId) {
    const companyTemplate = await prisma.notificationTemplate.findUnique({
      where: {
        company_id_event_type_channel: {
          company_id: options.companyId,
          event_type: eventType,
          channel: "in_app",
        },
      },
    });
    if (companyTemplate?.is_active) {
      template = {
        title: companyTemplate.subject || template?.title || eventType,
        message: companyTemplate.body,
        priority: template?.priority || "normal",
      };
    }
  }

  if (!template) {
    // Unknown event type, use generic
    template = {
      title: eventType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      message: JSON.stringify(data),
      priority: "normal",
    };
  }

  const title = renderTemplate(template.title, data);
  const message = renderTemplate(template.message, data);

  // Check each recipient's preferences
  for (const recipientId of ids) {
    // Check if recipient has opted out of this event type for in_app
    const preference = await prisma.notificationPreference.findUnique({
      where: {
        emp_id_event_type_channel: {
          emp_id: recipientId,
          event_type: eventType,
          channel: "in_app",
        },
      },
    });

    // Default to enabled if no preference set
    const isEnabled = preference?.enabled ?? true;
    if (!isEnabled) continue;

    // Create in-app notification
    await prisma.notification.create({
      data: {
        recipient_id: recipientId,
        title,
        message,
        type: eventType,
        channel: "in_app",
        priority: template.priority,
        entity_type: options?.entityType || null,
        entity_id: options?.entityId || null,
        action_url: options?.actionUrl || null,
      },
    });
  }
}

/**
 * Notify all HR users in a company.
 */
export async function notifyHR(
  companyId: string,
  eventType: NotificationEvent,
  data: Record<string, string | number>,
  options?: { entityType?: string; entityId?: string; actionUrl?: string }
) {
  const hrEmployees = await prisma.employee.findMany({
    where: {
      org_id: companyId,
      is_active: true,
      deleted_at: null,
      primary_role: { in: ["hr", "admin"] },
    },
    select: { emp_id: true },
  });

  if (hrEmployees.length === 0) return;

  await notify(
    hrEmployees.map((e) => e.emp_id),
    eventType,
    data,
    { ...options, companyId }
  );
}

/**
 * Notify an employee's manager chain.
 */
export async function notifyManagers(
  empId: string,
  eventType: NotificationEvent,
  data: Record<string, string | number>,
  options?: { entityType?: string; entityId?: string; actionUrl?: string }
) {
  const employee = await prisma.employee.findUnique({
    where: { emp_id: empId },
    select: { manager_id: true, org_id: true },
  });

  if (!employee?.manager_id) return;

  // Walk manager chain (up to 3 levels)
  const managerIds: string[] = [];
  let currentManagerId: string | null = employee.manager_id;
  const visited = new Set<string>();

  while (currentManagerId && !visited.has(currentManagerId) && managerIds.length < 3) {
    visited.add(currentManagerId);
    managerIds.push(currentManagerId);

    const manager = await prisma.employee.findUnique({
      where: { emp_id: currentManagerId },
      select: { manager_id: true },
    });
    currentManagerId = manager?.manager_id || null;
  }

  if (managerIds.length > 0) {
    await notify(managerIds, eventType, data, {
      ...options,
      companyId: employee.org_id || undefined,
    });
  }
}
