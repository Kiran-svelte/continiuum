"use server";

import { prisma } from "@/lib/prisma";
import { getAuthEmployee, requireCompanyAccess } from "@/lib/auth-guard";
import { getTeamMembers, hasPermission, PERMISSIONS } from "@/lib/rbac";
import { getAccessScope } from "@/lib/auth-guard";

// ============================================================================
// MANAGER PORTAL SERVER ACTIONS
// Scoped to the manager's team/department based on RBAC
// ============================================================================

/**
 * Get team members visible to the current manager.
 */
export async function getMyTeamMembers() {
  const auth = await getAuthEmployee();
  if (!auth.success) return auth;

  const actor = auth.employee;
  if (!actor.org_id) return { success: false, error: "Not linked to company" };

  const scope = getAccessScope(actor);

  let empIds: string[];

  if (scope === "company") {
    // HR/Admin: see all active employees
    const all = await prisma.employee.findMany({
      where: { org_id: actor.org_id, is_active: true, deleted_at: null },
      select: { emp_id: true },
    });
    empIds = all.map((e) => e.emp_id);
  } else if (scope === "team") {
    empIds = await getTeamMembers(actor.emp_id, actor.org_id);
  } else {
    return { success: true, members: [] };
  }

  const members = await prisma.employee.findMany({
    where: { emp_id: { in: empIds }, is_active: true, deleted_at: null },
    select: {
      emp_id: true,
      full_name: true,
      email: true,
      department: true,
      designation: true,
      primary_role: true,
      status: true,
      hire_date: true,
      avatar_url: true,
    },
    orderBy: { full_name: "asc" },
  });

  return { success: true, members };
}

/**
 * Get manager dashboard summary.
 */
export async function getManagerDashboard() {
  const auth = await getAuthEmployee();
  if (!auth.success) return auth;

  const actor = auth.employee;
  if (!actor.org_id) return { success: false, error: "Not linked to company" };

  const scope = getAccessScope(actor);
  let empIds: string[];

  if (scope === "company") {
    const all = await prisma.employee.findMany({
      where: { org_id: actor.org_id, is_active: true, deleted_at: null },
      select: { emp_id: true },
    });
    empIds = all.map((e) => e.emp_id);
  } else if (scope === "team") {
    empIds = await getTeamMembers(actor.emp_id, actor.org_id);
  } else {
    return { success: true, dashboard: null };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    teamSize,
    todayAttendance,
    pendingLeaves,
    pendingRegularizations,
    upcomingLeaves,
    onProbation,
  ] = await Promise.all([
    // Team size
    prisma.employee.count({
      where: { emp_id: { in: empIds }, is_active: true },
    }),

    // Today's attendance
    prisma.attendance.findMany({
      where: { emp_id: { in: empIds }, date: today },
      select: { emp_id: true, status: true, is_wfh: true, check_in: true },
    }),

    // Pending leave requests
    prisma.leaveRequest.count({
      where: {
        emp_id: { in: empIds },
        status: { in: ["pending", "escalated"] },
        current_approver: actor.emp_id,
      },
    }),

    // Pending regularizations
    prisma.attendanceRegularization.count({
      where: {
        emp_id: { in: empIds },
        status: "pending",
      },
    }),

    // Upcoming approved leaves (next 7 days)
    prisma.leaveRequest.findMany({
      where: {
        emp_id: { in: empIds },
        status: "approved",
        start_date: {
          gte: today,
          lte: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000),
        },
      },
      include: {
        employee: { select: { full_name: true } },
      },
      orderBy: { start_date: "asc" },
      take: 10,
    }),

    // Team members on probation
    prisma.employee.count({
      where: {
        emp_id: { in: empIds },
        status: "probation",
        is_active: true,
      },
    }),
  ]);

  const checkedIn = todayAttendance.filter(
    (a) => a.status === "PRESENT" || a.status === "LATE"
  );
  const wfh = todayAttendance.filter((a) => a.is_wfh);
  const late = todayAttendance.filter((a) => a.status === "LATE");

  return {
    success: true,
    dashboard: {
      team_size: teamSize,
      today: {
        checked_in: checkedIn.length,
        wfh: wfh.length,
        late: late.length,
        not_checked_in: teamSize - todayAttendance.length,
        absent: todayAttendance.filter((a) => a.status === "ABSENT").length,
      },
      pending_approvals: {
        leave_requests: pendingLeaves,
        regularizations: pendingRegularizations,
        total: pendingLeaves + pendingRegularizations,
      },
      upcoming_leaves: upcomingLeaves.map((l) => ({
        employee_name: l.employee.full_name,
        leave_type: l.leave_type,
        start_date: l.start_date,
        end_date: l.end_date,
        total_days: Number(l.total_days),
      })),
      on_probation: onProbation,
    },
  };
}

/**
 * Get pending leave requests for the manager's team.
 */
export async function getTeamPendingLeaves() {
  const auth = await getAuthEmployee();
  if (!auth.success) return auth;

  const actor = auth.employee;
  if (!actor.org_id) return { success: false, error: "Not linked to company" };

  // Find requests where the current user is the approver,
  // OR requests from team members that are pending
  const scope = getAccessScope(actor);
  let empIds: string[] = [];

  if (scope === "team") {
    empIds = await getTeamMembers(actor.emp_id, actor.org_id);
  } else if (scope === "company") {
    const all = await prisma.employee.findMany({
      where: { org_id: actor.org_id, is_active: true, deleted_at: null },
      select: { emp_id: true },
    });
    empIds = all.map((e) => e.emp_id);
  }

  const requests = await prisma.leaveRequest.findMany({
    where: {
      OR: [
        { current_approver: actor.emp_id, status: { in: ["pending", "escalated"] } },
        { emp_id: { in: empIds }, status: { in: ["pending", "escalated"] } },
      ],
    },
    include: {
      employee: {
        select: {
          full_name: true,
          department: true,
          designation: true,
          avatar_url: true,
        },
      },
    },
    orderBy: { created_at: "desc" },
  });

  return {
    success: true,
    requests: requests.map((r) => ({
      request_id: r.request_id,
      employee: r.employee,
      leave_type: r.leave_type,
      start_date: r.start_date,
      end_date: r.end_date,
      total_days: Number(r.total_days),
      is_half_day: r.is_half_day,
      reason: r.reason,
      status: r.status,
      current_approver: r.current_approver,
      sla_breached: r.sla_breached,
      sla_deadline: r.sla_deadline,
      created_at: r.created_at,
      ai_decision: r.ai_decision,
      ai_violations: r.ai_violations,
    })),
  };
}

/**
 * Get team attendance for a specific date.
 */
export async function getTeamAttendance(date?: Date) {
  const auth = await getAuthEmployee();
  if (!auth.success) return auth;

  const actor = auth.employee;
  if (!actor.org_id) return { success: false, error: "Not linked to company" };

  const targetDate = date || new Date();
  targetDate.setHours(0, 0, 0, 0);

  const scope = getAccessScope(actor);
  let empIds: string[];

  if (scope === "company") {
    const all = await prisma.employee.findMany({
      where: { org_id: actor.org_id, is_active: true, deleted_at: null },
      select: { emp_id: true },
    });
    empIds = all.map((e) => e.emp_id);
  } else if (scope === "team") {
    empIds = await getTeamMembers(actor.emp_id, actor.org_id);
  } else {
    return { success: true, attendance: [] };
  }

  const [members, attendances] = await Promise.all([
    prisma.employee.findMany({
      where: { emp_id: { in: empIds }, is_active: true },
      select: {
        emp_id: true,
        full_name: true,
        department: true,
        designation: true,
      },
    }),
    prisma.attendance.findMany({
      where: { emp_id: { in: empIds }, date: targetDate },
    }),
  ]);

  const attendanceMap = new Map(attendances.map((a) => [a.emp_id, a]));

  const teamAttendance = members.map((m) => {
    const att = attendanceMap.get(m.emp_id);
    return {
      emp_id: m.emp_id,
      full_name: m.full_name,
      department: m.department,
      designation: m.designation,
      status: att?.status || "NOT_CHECKED_IN",
      check_in: att?.check_in || null,
      check_out: att?.check_out || null,
      total_hours: att?.total_hours ? Number(att.total_hours) : null,
      late_minutes: att?.late_minutes || 0,
      overtime_minutes: att?.overtime_minutes || 0,
      is_wfh: att?.is_wfh || false,
    };
  });

  const summary = {
    total: teamAttendance.length,
    present: teamAttendance.filter(
      (a) => a.status === "PRESENT" || a.status === "LATE"
    ).length,
    late: teamAttendance.filter((a) => a.status === "LATE").length,
    absent: teamAttendance.filter((a) => a.status === "ABSENT").length,
    wfh: teamAttendance.filter((a) => a.is_wfh).length,
    not_checked_in: teamAttendance.filter(
      (a) => a.status === "NOT_CHECKED_IN"
    ).length,
  };

  return {
    success: true,
    date: targetDate,
    attendance: teamAttendance,
    summary,
  };
}

/**
 * Get team leave balances.
 */
export async function getTeamLeaveBalances() {
  const auth = await getAuthEmployee();
  if (!auth.success) return auth;

  const actor = auth.employee;
  if (!actor.org_id) return { success: false, error: "Not linked to company" };

  const scope = getAccessScope(actor);
  let empIds: string[];

  if (scope === "company") {
    const all = await prisma.employee.findMany({
      where: { org_id: actor.org_id, is_active: true, deleted_at: null },
      select: { emp_id: true },
    });
    empIds = all.map((e) => e.emp_id);
  } else if (scope === "team") {
    empIds = await getTeamMembers(actor.emp_id, actor.org_id);
  } else {
    return { success: true, balances: [] };
  }

  const currentYear = new Date().getFullYear();

  const members = await prisma.employee.findMany({
    where: { emp_id: { in: empIds }, is_active: true },
    select: {
      emp_id: true,
      full_name: true,
      department: true,
      leave_balances: {
        where: { year: currentYear },
      },
    },
    orderBy: { full_name: "asc" },
  });

  const balances = members.map((m) => ({
    emp_id: m.emp_id,
    full_name: m.full_name,
    department: m.department,
    balances: m.leave_balances.map((b) => ({
      leave_type: b.leave_type,
      annual_entitlement: Number(b.annual_entitlement),
      used: Number(b.used_days),
      pending: Number(b.pending_days),
      remaining:
        Number(b.annual_entitlement) +
        Number(b.carried_forward) -
        Number(b.used_days) -
        Number(b.pending_days),
    })),
  }));

  return { success: true, year: currentYear, balances };
}
