"use server";

import { prisma } from "@/lib/prisma";
import {
  getAuthEmployee,
  requireManagementAccess,
  requireHRAccess,
  getAccessScope,
} from "@/lib/auth-guard";
import { PERMISSIONS, hasPermission, getTeamMembers } from "@/lib/rbac";
import { revalidatePath } from "next/cache";

// ============================================================================
// EMPLOYEE: Request Attendance Regularization
// ============================================================================

/**
 * Employee submits a request to correct their attendance record.
 * Used when check-in/check-out was missed or incorrect.
 */
export async function requestRegularization(
  attendanceId: string,
  requestedIn: Date,
  requestedOut: Date,
  reason: string
): Promise<{ success: boolean; error?: string; regularization?: any }> {
  const auth = await getAuthEmployee();
  if (!auth.success) return { success: false, error: auth.error };

  if (reason.trim().length < 10) {
    return { success: false, error: "Reason must be at least 10 characters" };
  }

  // Verify attendance record exists and belongs to this employee
  const attendance = await prisma.attendance.findUnique({
    where: { id: attendanceId },
    select: {
      id: true,
      emp_id: true,
      check_in: true,
      check_out: true,
      date: true,
    },
  });

  if (!attendance) {
    return { success: false, error: "Attendance record not found" };
  }

  if (attendance.emp_id !== auth.employee.emp_id) {
    return {
      success: false,
      error: "Can only regularize your own attendance records",
    };
  }

  // Check if regularization already exists for this attendance
  const existing = await prisma.attendanceRegularization.findUnique({
    where: { attendance_id: attendanceId },
  });

  if (existing) {
    if (existing.status === "pending") {
      return {
        success: false,
        error: "A regularization request is already pending for this record",
      };
    }
    if (existing.status === "approved") {
      return {
        success: false,
        error: "This attendance has already been regularized",
      };
    }
  }

  // Validate requested timesTh
  if (requestedOut <= requestedIn) {
    return {
      success: false,
      error: "Check-out time must be after check-in time",
    };
  }

  // Don't allow regularization for dates more than 30 days old
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  if (attendance.date < thirtyDaysAgo) {
    return {
      success: false,
      error: "Cannot regularize attendance older than 30 days",
    };
  }

  // Create or update regularization request
  const regularization = existing
    ? await prisma.attendanceRegularization.update({
        where: { attendance_id: attendanceId },
        data: {
          original_in: attendance.check_in,
          original_out: attendance.check_out,
          requested_in: requestedIn,
          requested_out: requestedOut,
          reason,
          status: "pending",
          approved_by: null,
          approved_at: null,
          rejection_reason: null,
        },
      })
    : await prisma.attendanceRegularization.create({
        data: {
          emp_id: auth.employee.emp_id,
          attendance_id: attendanceId,
          original_in: attendance.check_in,
          original_out: attendance.check_out,
          requested_in: requestedIn,
          requested_out: requestedOut,
          reason,
        },
      });

  revalidatePath("/employee/attendance");
  return { success: true, regularization };
}

/**
 * Employee requests regularization for a missing attendance record.
 * Creates both the attendance record and the regularization in one step.
 */
export async function requestMissingAttendance(
  date: Date,
  requestedIn: Date,
  requestedOut: Date,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const auth = await getAuthEmployee();
  if (!auth.success) return { success: false, error: auth.error };

  if (reason.trim().length < 10) {
    return { success: false, error: "Reason must be at least 10 characters" };
  }

  const dateOnly = new Date(date);
  dateOnly.setHours(0, 0, 0, 0);

  // Check if attendance already exists
  const existing = await prisma.attendance.findUnique({
    where: {
      emp_id_date: { emp_id: auth.employee.emp_id, date: dateOnly },
    },
  });

  if (existing) {
    return {
      success: false,
      error: "Attendance record already exists for this date. Use the regularization form instead.",
    };
  }

  // Don't allow past 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  if (dateOnly < thirtyDaysAgo) {
    return {
      success: false,
      error: "Cannot request attendance for dates older than 30 days",
    };
  }

  // Don't allow future dates
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (dateOnly > today) {
    return { success: false, error: "Cannot request attendance for future dates" };
  }

  // Create attendance record + regularization in transaction
  await prisma.$transaction(async (tx) => {
    const attendance = await tx.attendance.create({
      data: {
        emp_id: auth.employee.emp_id,
        date: dateOnly,
        check_in: null,
        check_out: null,
        status: "ABSENT",
      },
    });

    await tx.attendanceRegularization.create({
      data: {
        emp_id: auth.employee.emp_id,
        attendance_id: attendance.id,
        original_in: null,
        original_out: null,
        requested_in: requestedIn,
        requested_out: requestedOut,
        reason,
      },
    });
  });

  revalidatePath("/employee/attendance");
  return { success: true };
}

// ============================================================================
// MANAGER/HR: Approve/Reject Regularization
// ============================================================================

/**
 * Approve a regularization request. Updates the attendance record.
 */
export async function approveRegularization(
  regularizationId: string
): Promise<{ success: boolean; error?: string }> {
  const auth = await getAuthEmployee();
  if (!auth.success) return { success: false, error: auth.error };

  const actor = auth.employee;

  const regularization = await prisma.attendanceRegularization.findUnique({
    where: { id: regularizationId },
    include: {
      employee: { select: { org_id: true, emp_id: true } },
      attendance: true,
    },
  });

  if (!regularization) {
    return { success: false, error: "Regularization request not found" };
  }

  if (regularization.status !== "pending") {
    return {
      success: false,
      error: `Request already ${regularization.status}`,
    };
  }

  // Verify same company
  if (regularization.employee.org_id !== actor.org_id) {
    return { success: false, error: "Not authorized for this company" };
  }

  // Check permission: either ATTENDANCE_APPROVE_REGULARIZATION or team manager
  let authorized = false;

  if (actor.org_id) {
    authorized = await hasPermission(
      actor.emp_id,
      actor.org_id,
      PERMISSIONS.ATTENDANCE_APPROVE_REGULARIZATION
    );
  }

  if (!authorized && actor.org_id) {
    const teamMembers = await getTeamMembers(actor.emp_id, actor.org_id);
    if (teamMembers.includes(regularization.emp_id)) {
      authorized = true;
    }
  }

  if (!authorized) {
    return {
      success: false,
      error: "Not authorized to approve regularization requests",
    };
  }

  // Calculate total hours and late/overtime from the corrected times
  const totalHours =
    (regularization.requested_out.getTime() -
      regularization.requested_in.getTime()) /
    (1000 * 60 * 60);

  await prisma.$transaction([
    // Update regularization status
    prisma.attendanceRegularization.update({
      where: { id: regularizationId },
      data: {
        status: "approved",
        approved_by: actor.emp_id,
        approved_at: new Date(),
      },
    }),
    // Update the attendance record with corrected times
    prisma.attendance.update({
      where: { id: regularization.attendance_id },
      data: {
        check_in: regularization.requested_in,
        check_out: regularization.requested_out,
        total_hours: Math.round(totalHours * 100) / 100,
        status: "PRESENT",
      },
    }),
  ]);

  revalidatePath("/manager/attendance");
  revalidatePath("/hr/attendance");
  revalidatePath("/employee/attendance");
  return { success: true };
}

/**
 * Reject a regularization request.
 */
export async function rejectRegularization(
  regularizationId: string,
  rejectionReason: string
): Promise<{ success: boolean; error?: string }> {
  const auth = await getAuthEmployee();
  if (!auth.success) return { success: false, error: auth.error };

  const actor = auth.employee;

  const regularization = await prisma.attendanceRegularization.findUnique({
    where: { id: regularizationId },
    include: {
      employee: { select: { org_id: true, emp_id: true } },
    },
  });

  if (!regularization) {
    return { success: false, error: "Regularization request not found" };
  }

  if (regularization.status !== "pending") {
    return {
      success: false,
      error: `Request already ${regularization.status}`,
    };
  }

  if (regularization.employee.org_id !== actor.org_id) {
    return { success: false, error: "Not authorized for this company" };
  }

  // Same permission check as approve
  let authorized = false;
  if (actor.org_id) {
    authorized = await hasPermission(
      actor.emp_id,
      actor.org_id,
      PERMISSIONS.ATTENDANCE_APPROVE_REGULARIZATION
    );
  }
  if (!authorized && actor.org_id) {
    const teamMembers = await getTeamMembers(actor.emp_id, actor.org_id);
    if (teamMembers.includes(regularization.emp_id)) authorized = true;
  }

  if (!authorized) {
    return { success: false, error: "Not authorized to reject regularization requests" };
  }

  await prisma.attendanceRegularization.update({
    where: { id: regularizationId },
    data: {
      status: "rejected",
      approved_by: actor.emp_id,
      approved_at: new Date(),
      rejection_reason: rejectionReason,
    },
  });

  revalidatePath("/manager/attendance");
  revalidatePath("/hr/attendance");
  revalidatePath("/employee/attendance");
  return { success: true };
}

// ============================================================================
// QUERIES: Get Regularization Requests
// ============================================================================

/**
 * Get pending regularization requests for the current user's scope.
 */
export async function getPendingRegularizations(): Promise<{
  success: boolean;
  error?: string;
  requests?: any[];
}> {
  const auth = await getAuthEmployee();
  if (!auth.success) return { success: false, error: auth.error };

  const actor = auth.employee;
  if (!actor.org_id) return { success: false, error: "Not linked to company" };

  const scope = getAccessScope(actor);

  let whereClause: any = {
    status: "pending",
    employee: { org_id: actor.org_id },
  };

  if (scope === "team") {
    const teamMembers = await getTeamMembers(actor.emp_id, actor.org_id);
    whereClause.emp_id = { in: teamMembers };
  } else if (scope === "self") {
    // Regular employees shouldn't see pending requests to approve
    whereClause.emp_id = actor.emp_id;
  }

  const requests = await prisma.attendanceRegularization.findMany({
    where: whereClause,
    include: {
      employee: {
        select: {
          emp_id: true,
          full_name: true,
          department: true,
          designation: true,
        },
      },
      attendance: {
        select: {
          date: true,
          check_in: true,
          check_out: true,
          status: true,
        },
      },
    },
    orderBy: { created_at: "desc" },
  });

  return {
    success: true,
    requests: requests.map((r) => ({
      id: r.id,
      employee: r.employee,
      attendance_date: r.attendance.date,
      original_in: r.original_in,
      original_out: r.original_out,
      requested_in: r.requested_in,
      requested_out: r.requested_out,
      reason: r.reason,
      status: r.status,
      created_at: r.created_at,
    })),
  };
}

/**
 * Get regularization history for an employee.
 */
export async function getMyRegularizations(): Promise<{
  success: boolean;
  error?: string;
  requests?: any[];
}> {
  const auth = await getAuthEmployee();
  if (!auth.success) return { success: false, error: auth.error };

  const requests = await prisma.attendanceRegularization.findMany({
    where: { emp_id: auth.employee.emp_id },
    include: {
      attendance: {
        select: { date: true, check_in: true, check_out: true, status: true },
      },
    },
    orderBy: { created_at: "desc" },
    take: 50,
  });

  return {
    success: true,
    requests: requests.map((r) => ({
      id: r.id,
      attendance_date: r.attendance.date,
      original_in: r.original_in,
      original_out: r.original_out,
      requested_in: r.requested_in,
      requested_out: r.requested_out,
      reason: r.reason,
      status: r.status,
      approved_by: r.approved_by,
      rejection_reason: r.rejection_reason,
      created_at: r.created_at,
    })),
  };
}

// ============================================================================
// HR: Override Attendance
// ============================================================================

/**
 * HR/Admin directly overrides an attendance record.
 */
export async function overrideAttendance(
  attendanceId: string,
  data: {
    check_in?: Date;
    check_out?: Date;
    status?: string;
    reason: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const auth = await requireHRAccess();
  if (!auth.success) return auth;

  const attendance = await prisma.attendance.findUnique({
    where: { id: attendanceId },
    include: { employee: { select: { org_id: true } } },
  });

  if (!attendance) return { success: false, error: "Attendance record not found" };
  if (attendance.employee.org_id !== auth.employee.org_id) {
    return { success: false, error: "Not authorized for this company" };
  }

  const updateData: any = {};
  if (data.check_in !== undefined) updateData.check_in = data.check_in;
  if (data.check_out !== undefined) updateData.check_out = data.check_out;
  if (data.status !== undefined) updateData.status = data.status;

  if (updateData.check_in && updateData.check_out) {
    const hours =
      (updateData.check_out.getTime() - updateData.check_in.getTime()) /
      (1000 * 60 * 60);
    updateData.total_hours = Math.round(hours * 100) / 100;
  }

  await prisma.attendance.update({
    where: { id: attendanceId },
    data: updateData,
  });

  revalidatePath("/hr/attendance");
  return { success: true };
}

// ============================================================================
// HR: Daily Attendance Report
// ============================================================================

/**
 * Get daily attendance report for the company.
 */
export async function getDailyAttendanceReport(date: Date): Promise<{
  success: boolean;
  error?: string;
  report?: any;
}> {
  const auth = await requireHRAccess();
  if (!auth.success) return { success: false, error: auth.error };

  const orgId = auth.employee.org_id;
  if (!orgId) return { success: false, error: "Not linked to company" };

  const dateOnly = new Date(date);
  dateOnly.setHours(0, 0, 0, 0);

  const [employees, attendances] = await Promise.all([
    prisma.employee.findMany({
      where: { org_id: orgId, is_active: true, deleted_at: null },
      select: {
        emp_id: true,
        full_name: true,
        department: true,
        designation: true,
      },
    }),
    prisma.attendance.findMany({
      where: {
        employee: { org_id: orgId },
        date: dateOnly,
      },
    }),
  ]);

  const attendanceMap = new Map(attendances.map((a) => [a.emp_id, a]));

  const employeeStatuses = employees.map((emp) => {
    const att = attendanceMap.get(emp.emp_id);
    return {
      emp_id: emp.emp_id,
      full_name: emp.full_name,
      department: emp.department,
      designation: emp.designation,
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
    total: employees.length,
    present: employeeStatuses.filter(
      (e) => e.status === "PRESENT" || e.status === "LATE"
    ).length,
    late: employeeStatuses.filter((e) => e.status === "LATE").length,
    absent: employeeStatuses.filter((e) => e.status === "ABSENT").length,
    on_leave: employeeStatuses.filter((e) => e.status === "ON_LEAVE").length,
    wfh: employeeStatuses.filter((e) => e.is_wfh).length,
    not_checked_in: employeeStatuses.filter(
      (e) => e.status === "NOT_CHECKED_IN"
    ).length,
    half_day: employeeStatuses.filter((e) => e.status === "HALF_DAY").length,
  };

  return {
    success: true,
    report: {
      date: dateOnly,
      summary,
      employees: employeeStatuses,
    },
  };
}

/**
 * Get monthly attendance summary for the company.
 */
export async function getMonthlyAttendanceSummary(
  month: number,
  year: number
): Promise<{
  success: boolean;
  error?: string;
  summary?: any[];
}> {
  const auth = await requireHRAccess();
  if (!auth.success) return { success: false, error: auth.error };

  const orgId = auth.employee.org_id;
  if (!orgId) return { success: false, error: "Not linked to company" };

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  const employees = await prisma.employee.findMany({
    where: { org_id: orgId, is_active: true, deleted_at: null },
    select: { emp_id: true, full_name: true, department: true },
  });

  const attendances = await prisma.attendance.findMany({
    where: {
      employee: { org_id: orgId },
      date: { gte: startDate, lte: endDate },
    },
  });

  // Group by employee
  const empAttendance = new Map<string, typeof attendances>();
  for (const att of attendances) {
    const list = empAttendance.get(att.emp_id) || [];
    list.push(att);
    empAttendance.set(att.emp_id, list);
  }

  // Calculate working days in month
  const company = await prisma.company.findUnique({
    where: { id: orgId },
    select: { work_days: true },
  });
  const workDays = (company?.work_days as number[]) || [1, 2, 3, 4, 5];
  let totalWorkingDays = 0;
  const d = new Date(startDate);
  while (d <= endDate) {
    if (workDays.includes(d.getDay())) totalWorkingDays++;
    d.setDate(d.getDate() + 1);
  }

  const summary = employees.map((emp) => {
    const records = empAttendance.get(emp.emp_id) || [];
    const present = records.filter(
      (r) => r.status === "PRESENT" || r.status === "LATE"
    ).length;
    const late = records.filter((r) => r.status === "LATE").length;
    const absent = records.filter((r) => r.status === "ABSENT").length;
    const halfDay = records.filter((r) => r.status === "HALF_DAY").length;
    const wfh = records.filter((r) => r.is_wfh).length;
    const totalLateMinutes = records.reduce(
      (sum, r) => sum + r.late_minutes,
      0
    );
    const totalOvertimeMinutes = records.reduce(
      (sum, r) => sum + r.overtime_minutes,
      0
    );
    const totalHours = records.reduce(
      (sum, r) => sum + (r.total_hours ? Number(r.total_hours) : 0),
      0
    );

    return {
      emp_id: emp.emp_id,
      full_name: emp.full_name,
      department: emp.department,
      working_days: totalWorkingDays,
      present,
      late,
      absent,
      half_day: halfDay,
      wfh,
      total_late_minutes: totalLateMinutes,
      total_overtime_minutes: totalOvertimeMinutes,
      total_hours: Math.round(totalHours * 100) / 100,
      attendance_rate:
        totalWorkingDays > 0
          ? Math.round(((present + halfDay * 0.5) / totalWorkingDays) * 10000) /
            100
          : 0,
    };
  });

  return { success: true, summary };
}
