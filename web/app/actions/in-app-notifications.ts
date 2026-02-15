"use server";

import { prisma } from "@/lib/prisma";
import { getAuthEmployee } from "@/lib/auth-guard";

// ============================================================================
// IN-APP NOTIFICATION QUERIES & MUTATIONS
// ============================================================================

/**
 * Get recent unread notifications for the current user.
 */
export async function getUnreadNotifications(limit: number = 20) {
  const auth = await getAuthEmployee();
  if (!auth.success) return auth;

  const notifications = await prisma.notification.findMany({
    where: {
      recipient_id: auth.employee.emp_id,
      read_at: null,
      channel: "in_app",
    },
    orderBy: { sent_at: "desc" },
    take: limit,
  });

  const unreadCount = await prisma.notification.count({
    where: {
      recipient_id: auth.employee.emp_id,
      read_at: null,
      channel: "in_app",
    },
  });

  return {
    success: true,
    notifications: notifications.map((n) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      type: n.type,
      priority: n.priority,
      entity_type: n.entity_type,
      entity_id: n.entity_id,
      action_url: n.action_url,
      sent_at: n.sent_at,
      read_at: n.read_at,
    })),
    unreadCount,
  };
}

/**
 * Get all notifications for the current user with pagination.
 */
export async function getNotifications(
  page: number = 1,
  pageSize: number = 30,
  filter?: { type?: string; unreadOnly?: boolean }
) {
  const auth = await getAuthEmployee();
  if (!auth.success) return auth;

  const where: any = {
    recipient_id: auth.employee.emp_id,
    channel: "in_app",
  };

  if (filter?.type) where.type = filter.type;
  if (filter?.unreadOnly) where.read_at = null;

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { sent_at: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.notification.count({ where }),
  ]);

  return {
    success: true,
    notifications: notifications.map((n) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      type: n.type,
      priority: n.priority,
      entity_type: n.entity_type,
      entity_id: n.entity_id,
      action_url: n.action_url,
      sent_at: n.sent_at,
      read_at: n.read_at,
    })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

/**
 * Mark a notification as read.
 */
export async function markNotificationRead(notificationId: string) {
  const auth = await getAuthEmployee();
  if (!auth.success) return auth;

  await prisma.notification.updateMany({
    where: {
      id: notificationId,
      recipient_id: auth.employee.emp_id,
    },
    data: { read_at: new Date() },
  });

  return { success: true };
}

/**
 * Mark all notifications as read.
 */
export async function markAllNotificationsRead() {
  const auth = await getAuthEmployee();
  if (!auth.success) return auth;

  await prisma.notification.updateMany({
    where: {
      recipient_id: auth.employee.emp_id,
      read_at: null,
      channel: "in_app",
    },
    data: { read_at: new Date() },
  });

  return { success: true };
}

/**
 * Get unread notification count.
 */
export async function getUnreadCount() {
  const auth = await getAuthEmployee();
  if (!auth.success) return { success: false, count: 0 };

  const count = await prisma.notification.count({
    where: {
      recipient_id: auth.employee.emp_id,
      read_at: null,
      channel: "in_app",
    },
  });

  return { success: true, count };
}

// ============================================================================
// NOTIFICATION PREFERENCES
// ============================================================================

/**
 * Get current user's notification preferences.
 */
export async function getMyNotificationPreferences() {
  const auth = await getAuthEmployee();
  if (!auth.success) return auth;

  const preferences = await prisma.notificationPreference.findMany({
    where: { emp_id: auth.employee.emp_id },
  });

  return {
    success: true,
    preferences: preferences.map((p) => ({
      id: p.id,
      event_type: p.event_type,
      channel: p.channel,
      enabled: p.enabled,
    })),
  };
}

/**
 * Update a notification preference.
 */
export async function updateNotificationPreference(
  eventType: string,
  channel: "in_app" | "email" | "sms" | "whatsapp",
  enabled: boolean
) {
  const auth = await getAuthEmployee();
  if (!auth.success) return auth;

  await prisma.notificationPreference.upsert({
    where: {
      emp_id_event_type_channel: {
        emp_id: auth.employee.emp_id,
        event_type: eventType,
        channel,
      },
    },
    create: {
      emp_id: auth.employee.emp_id,
      event_type: eventType,
      channel,
      enabled,
    },
    update: { enabled },
  });

  return { success: true };
}

/**
 * Delete old notifications (cleanup - older than 90 days).
 */
export async function cleanupOldNotifications() {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const deleted = await prisma.notification.deleteMany({
    where: {
      sent_at: { lt: ninetyDaysAgo },
      read_at: { not: null },
    },
  });

  return { success: true, deleted: deleted.count };
}
