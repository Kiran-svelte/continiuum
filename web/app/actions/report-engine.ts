"use server";

import { prisma } from "@/lib/prisma";
import {
  requireHRAccess,
  requireCompanyAccess,
  getAuthEmployee,
  requirePermissionGuard,
} from "@/lib/auth-guard";
import { PERMISSIONS, getTeamMembers, hasPermission } from "@/lib/rbac";
import { getAccessScope } from "@/lib/auth-guard";

// ============================================================================
// REPORT ENGINE
// All reports respect RBAC:
//   - Team Leads see team data
//   - Managers see department data
//   - HR/Admin see all company data
// ============================================================================

/**
 * Helper: Get employee IDs the actor can see.
 */
async function getVisibleEmployeeIds(actor: {
  emp_id: string;
  org_id: string | null;
  primary_role: string;
}): Promise<string[] | null> {
  if (!actor.org_id) return [];

  const scope = getAccessScope(actor as any);

  if (scope === "company") {
    // HR/Admin: see all - return null to signify no filter
    return null;
  }

  if (scope === "team") {
    const teamMembers = await getTeamMembers(actor.emp_id, actor.org_id);
    return [...teamMembers, actor.emp_id];
  }

  // Self only
  return [actor.emp_id];
}

// ============================================================================
// LEAVE REPORTS
// ============================================================================

/**
 * Leave utilization report - usage by department/type.
 */
export async function getLeaveUtilizationReport(
  month: number,
  year: number,
  department?: string
) {
  const auth = await requireCompanyAccess();
  if (!auth.success) return auth;

  const orgId = auth.companyId!;
  const visibleIds = await getVisibleEmployeeIds(auth.employee);

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  const where: any = {
    employee: { org_id: orgId },
    status: "approved",
    start_date: { lte: endDate },
    end_date: { gte: startDate },
  };

  if (visibleIds) where.emp_id = { in: visibleIds };
  if (department) where.employee.department = department;

  const leaves = await prisma.leaveRequest.findMany({
    where,
    include: {
      employee: {
        select: { full_name: true, department: true, designation: true },
      },
    },
  });

  // Aggregate by department
  const byDepartment: Record<
    string,
    { total_days: number; count: number; employees: Set<string> }
  > = {};

  // Aggregate by leave type
  const byType: Record<string, { total_days: number; count: number }> = {};

  for (const leave of leaves) {
    const dept = leave.employee.department || "Unassigned";
    const type = leave.leave_type;
    const days = Number(leave.total_days);

    if (!byDepartment[dept]) {
      byDepartment[dept] = { total_days: 0, count: 0, employees: new Set() };
    }
    byDepartment[dept].total_days += days;
    byDepartment[dept].count++;
    byDepartment[dept].employees.add(leave.emp_id);

    if (!byType[type]) byType[type] = { total_days: 0, count: 0 };
    byType[type].total_days += days;
    byType[type].count++;
  }

  return {
    success: true,
    period: { month, year },
    by_department: Object.entries(byDepartment).map(([dept, data]) => ({
      department: dept,
      total_days: Math.round(data.total_days * 100) / 100,
      request_count: data.count,
      unique_employees: data.employees.size,
    })),
    by_type: Object.entries(byType).map(([type, data]) => ({
      leave_type: type,
      total_days: Math.round(data.total_days * 100) / 100,
      request_count: data.count,
    })),
    total_requests: leaves.length,
    total_days: Math.round(
      leaves.reduce((sum, l) => sum + Number(l.total_days), 0) * 100
    ) / 100,
  };
}

/**
 * Leave balance summary for all employees.
 */
export async function getLeaveBalanceReport(year: number) {
  const auth = await requireCompanyAccess();
  if (!auth.success) return auth;

  const orgId = auth.companyId!;
  const visibleIds = await getVisibleEmployeeIds(auth.employee);

  const empWhere: any = {
    org_id: orgId,
    is_active: true,
    deleted_at: null,
  };
  if (visibleIds) empWhere.emp_id = { in: visibleIds };

  const employees = await prisma.employee.findMany({
    where: empWhere,
    select: {
      emp_id: true,
      full_name: true,
      department: true,
      designation: true,
      leave_balances: {
        where: { year },
      },
    },
    orderBy: [{ department: "asc" }, { full_name: "asc" }],
  });

  const report = employees.map((emp) => {
    const balances = emp.leave_balances.map((b) => ({
      leave_type: b.leave_type,
      annual_entitlement: Number(b.annual_entitlement),
      carried_forward: Number(b.carried_forward),
      used_days: Number(b.used_days),
      pending_days: Number(b.pending_days),
      remaining:
        Number(b.annual_entitlement) +
        Number(b.carried_forward) -
        Number(b.used_days) -
        Number(b.pending_days),
    }));

    return {
      emp_id: emp.emp_id,
      full_name: emp.full_name,
      department: emp.department,
      designation: emp.designation,
      balances,
      total_used: balances.reduce((sum, b) => sum + b.used_days, 0),
      total_remaining: balances.reduce((sum, b) => sum + b.remaining, 0),
    };
  });

  return { success: true, year, report };
}

/**
 * Pending/unapproved leaves aging report.
 */
export async function getPendingLeavesReport() {
  const auth = await requireHRAccess();
  if (!auth.success) return auth;

  const orgId = auth.employee.org_id;
  if (!orgId) return { success: false, error: "Not linked to company" };

  const pendingLeaves = await prisma.leaveRequest.findMany({
    where: {
      employee: { org_id: orgId },
      status: { in: ["pending", "escalated"] },
    },
    include: {
      employee: {
        select: { full_name: true, department: true, designation: true },
      },
    },
    orderBy: { created_at: "asc" },
  });

  const now = new Date();
  const report = pendingLeaves.map((l) => {
    const ageHours = Math.round(
      (now.getTime() - l.created_at.getTime()) / (1000 * 60 * 60)
    );
    return {
      request_id: l.request_id,
      employee: l.employee,
      leave_type: l.leave_type,
      start_date: l.start_date,
      end_date: l.end_date,
      total_days: Number(l.total_days),
      status: l.status,
      created_at: l.created_at,
      age_hours: ageHours,
      sla_breached: l.sla_breached,
      current_approver: l.current_approver,
      escalation_count: l.escalation_count,
    };
  });

  return {
    success: true,
    report,
    summary: {
      total_pending: report.length,
      sla_breached: report.filter((r) => r.sla_breached).length,
      escalated: report.filter((r) => r.status === "escalated").length,
      oldest_hours: report.length > 0 ? report[0].age_hours : 0,
    },
  };
}

// ============================================================================
// ATTENDANCE REPORTS
// ============================================================================

/**
 * Monthly attendance summary report.
 */
export async function getAttendanceReport(month: number, year: number) {
  const auth = await requireCompanyAccess();
  if (!auth.success) return auth;

  const orgId = auth.companyId!;
  const visibleIds = await getVisibleEmployeeIds(auth.employee);

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  const empWhere: any = {
    org_id: orgId,
    is_active: true,
    deleted_at: null,
  };
  if (visibleIds) empWhere.emp_id = { in: visibleIds };

  const employees = await prisma.employee.findMany({
    where: empWhere,
    select: { emp_id: true, full_name: true, department: true },
  });

  const attendances = await prisma.attendance.findMany({
    where: {
      emp_id: { in: employees.map((e) => e.emp_id) },
      date: { gte: startDate, lte: endDate },
    },
  });

  // Company work days
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

  // Group by employee
  const empAttendance = new Map<string, typeof attendances>();
  for (const att of attendances) {
    const list = empAttendance.get(att.emp_id) || [];
    list.push(att);
    empAttendance.set(att.emp_id, list);
  }

  const report = employees.map((emp) => {
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
          ? Math.round(
              ((present + halfDay * 0.5) / totalWorkingDays) * 10000
            ) / 100
          : 0,
    };
  });

  // Company-wide summary
  const avgAttendanceRate =
    report.length > 0
      ? Math.round(
          (report.reduce((sum, r) => sum + r.attendance_rate, 0) /
            report.length) *
            100
        ) / 100
      : 0;

  return {
    success: true,
    period: { month, year },
    working_days: totalWorkingDays,
    report,
    summary: {
      total_employees: report.length,
      avg_attendance_rate: avgAttendanceRate,
      total_late_incidents: report.reduce((sum, r) => sum + r.late, 0),
      total_absent_days: report.reduce((sum, r) => sum + r.absent, 0),
      total_wfh_days: report.reduce((sum, r) => sum + r.wfh, 0),
      total_overtime_hours: Math.round(
        report.reduce((sum, r) => sum + r.total_overtime_minutes, 0) / 60
      ),
    },
  };
}

/**
 * Late arrivals analysis report.
 */
export async function getLateArrivalsReport(month: number, year: number) {
  const auth = await requireCompanyAccess();
  if (!auth.success) return auth;

  const orgId = auth.companyId!;
  const visibleIds = await getVisibleEmployeeIds(auth.employee);

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  const where: any = {
    employee: { org_id: orgId },
    date: { gte: startDate, lte: endDate },
    status: "LATE",
  };
  if (visibleIds) where.emp_id = { in: visibleIds };

  const lateRecords = await prisma.attendance.findMany({
    where,
    include: {
      employee: {
        select: { full_name: true, department: true },
      },
    },
    orderBy: { date: "desc" },
  });

  // Group by employee
  const byEmployee: Record<
    string,
    {
      full_name: string;
      department: string | null;
      count: number;
      total_late_minutes: number;
      dates: string[];
    }
  > = {};

  for (const record of lateRecords) {
    if (!byEmployee[record.emp_id]) {
      byEmployee[record.emp_id] = {
        full_name: record.employee.full_name,
        department: record.employee.department,
        count: 0,
        total_late_minutes: 0,
        dates: [],
      };
    }
    byEmployee[record.emp_id].count++;
    byEmployee[record.emp_id].total_late_minutes += record.late_minutes;
    byEmployee[record.emp_id].dates.push(
      record.date.toISOString().split("T")[0]
    );
  }

  const report = Object.entries(byEmployee)
    .map(([empId, data]) => ({
      emp_id: empId,
      ...data,
      avg_late_minutes: Math.round(data.total_late_minutes / data.count),
    }))
    .sort((a, b) => b.count - a.count);

  return {
    success: true,
    period: { month, year },
    report,
    summary: {
      total_late_incidents: lateRecords.length,
      unique_employees: report.length,
      avg_late_per_employee:
        report.length > 0
          ? Math.round(lateRecords.length / report.length)
          : 0,
    },
  };
}

// ============================================================================
// PAYROLL REPORTS
// ============================================================================

/**
 * Monthly payroll summary report.
 */
export async function getPayrollSummaryReport(month: number, year: number) {
  const auth = await requireHRAccess();
  if (!auth.success) return auth;

  const orgId = auth.employee.org_id;
  if (!orgId) return { success: false, error: "Not linked to company" };

  const run = await prisma.payrollRun.findUnique({
    where: { company_id_month_year: { company_id: orgId, month, year } },
    include: {
      slips: {
        include: {
          employee: {
            select: { full_name: true, department: true, designation: true },
          },
        },
      },
    },
  });

  if (!run) return { success: false, error: "No payroll data for this period" };

  // Department-wise breakdown
  const byDepartment: Record<
    string,
    {
      count: number;
      total_gross: number;
      total_deductions: number;
      total_net: number;
      total_pf: number;
      total_esi: number;
      total_tds: number;
    }
  > = {};

  for (const slip of run.slips) {
    const dept = slip.employee.department || "Unassigned";
    if (!byDepartment[dept]) {
      byDepartment[dept] = {
        count: 0,
        total_gross: 0,
        total_deductions: 0,
        total_net: 0,
        total_pf: 0,
        total_esi: 0,
        total_tds: 0,
      };
    }
    byDepartment[dept].count++;
    byDepartment[dept].total_gross += Number(slip.gross_salary);
    byDepartment[dept].total_deductions += Number(slip.total_deductions);
    byDepartment[dept].total_net += Number(slip.net_pay);
    byDepartment[dept].total_pf +=
      Number(slip.pf_employee) + Number(slip.pf_employer);
    byDepartment[dept].total_esi +=
      Number(slip.esi_employee) + Number(slip.esi_employer);
    byDepartment[dept].total_tds += Number(slip.tds);
  }

  return {
    success: true,
    period: { month, year },
    status: run.status,
    totals: {
      employee_count: run.employee_count,
      total_gross: Number(run.total_gross),
      total_deductions: Number(run.total_deductions),
      total_net: Number(run.total_net),
      total_pf: Number(run.total_pf),
      total_esi: Number(run.total_esi),
      total_tds: Number(run.total_tds),
      total_pt: Number(run.total_pt),
    },
    by_department: Object.entries(byDepartment).map(([dept, data]) => ({
      department: dept,
      ...data,
      total_gross: Math.round(data.total_gross),
      total_deductions: Math.round(data.total_deductions),
      total_net: Math.round(data.total_net),
      total_pf: Math.round(data.total_pf),
      total_esi: Math.round(data.total_esi),
      total_tds: Math.round(data.total_tds),
    })),
  };
}

// ============================================================================
// HR / HEADCOUNT REPORTS
// ============================================================================

/**
 * Headcount report by department, role, and status.
 */
export async function getHeadcountReport() {
  const auth = await requireHRAccess();
  if (!auth.success) return auth;

  const orgId = auth.employee.org_id;
  if (!orgId) return { success: false, error: "Not linked to company" };

  const employees = await prisma.employee.findMany({
    where: { org_id: orgId, deleted_at: null },
    select: {
      emp_id: true,
      department: true,
      primary_role: true,
      status: true,
      is_active: true,
      hire_date: true,
      exit_date: true,
      gender: true,
    },
  });

  // By department
  const byDepartment: Record<string, { active: number; inactive: number }> = {};
  // By role
  const byRole: Record<string, number> = {};
  // By status
  const byStatus: Record<string, number> = {};
  // By gender
  const byGender: Record<string, number> = {};

  for (const emp of employees) {
    const dept = emp.department || "Unassigned";
    if (!byDepartment[dept])
      byDepartment[dept] = { active: 0, inactive: 0 };
    if (emp.is_active) byDepartment[dept].active++;
    else byDepartment[dept].inactive++;

    byRole[emp.primary_role] = (byRole[emp.primary_role] || 0) + 1;
    byStatus[emp.status] = (byStatus[emp.status] || 0) + 1;

    const gender = (emp as any).gender || "Not specified";
    byGender[gender] = (byGender[gender] || 0) + 1;
  }

  // New joiners this month
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const newJoiners = employees.filter(
    (e) => e.hire_date && e.hire_date >= monthStart
  ).length;

  // Exits this month
  const exits = employees.filter(
    (e) => e.exit_date && e.exit_date >= monthStart
  ).length;

  return {
    success: true,
    total: employees.length,
    active: employees.filter((e) => e.is_active).length,
    inactive: employees.filter((e) => !e.is_active).length,
    new_joiners_this_month: newJoiners,
    exits_this_month: exits,
    by_department: Object.entries(byDepartment)
      .map(([dept, data]) => ({
        department: dept,
        ...data,
        total: data.active + data.inactive,
      }))
      .sort((a, b) => b.total - a.total),
    by_role: Object.entries(byRole)
      .map(([role, count]) => ({ role, count }))
      .sort((a, b) => b.count - a.count),
    by_status: Object.entries(byStatus)
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count),
    by_gender: Object.entries(byGender)
      .map(([gender, count]) => ({ gender, count }))
      .sort((a, b) => b.count - a.count),
  };
}

/**
 * Attrition report - monthly exits over time.
 */
export async function getAttritionReport(year: number) {
  const auth = await requireHRAccess();
  if (!auth.success) return auth;

  const orgId = auth.employee.org_id;
  if (!orgId) return { success: false, error: "Not linked to company" };

  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31);

  const [exits, totalActive] = await Promise.all([
    prisma.employee.findMany({
      where: {
        org_id: orgId,
        exit_date: { gte: startDate, lte: endDate },
      },
      select: {
        emp_id: true,
        full_name: true,
        department: true,
        exit_date: true,
        status: true,
      },
    }),
    prisma.employee.count({
      where: { org_id: orgId, is_active: true, deleted_at: null },
    }),
  ]);

  // Monthly breakdown
  const monthly: Array<{
    month: number;
    exits: number;
    names: string[];
  }> = [];

  for (let m = 1; m <= 12; m++) {
    const monthExits = exits.filter((e) => {
      const exitMonth = e.exit_date!.getMonth() + 1;
      return exitMonth === m;
    });
    monthly.push({
      month: m,
      exits: monthExits.length,
      names: monthExits.map((e) => e.full_name),
    });
  }

  const totalExits = exits.length;
  const annualAttritionRate =
    totalActive > 0
      ? Math.round((totalExits / (totalActive + totalExits)) * 10000) / 100
      : 0;

  return {
    success: true,
    year,
    total_exits: totalExits,
    total_active: totalActive,
    annual_attrition_rate: annualAttritionRate,
    monthly,
    by_department: Object.entries(
      exits.reduce<Record<string, number>>((acc, e) => {
        const dept = e.department || "Unassigned";
        acc[dept] = (acc[dept] || 0) + 1;
        return acc;
      }, {})
    )
      .map(([dept, count]) => ({ department: dept, count }))
      .sort((a, b) => b.count - a.count),
  };
}

/**
 * Probation tracking report.
 */
export async function getProbationReport() {
  const auth = await requireHRAccess();
  if (!auth.success) return auth;

  const orgId = auth.employee.org_id;
  if (!orgId) return { success: false, error: "Not linked to company" };

  const now = new Date();
  const thirtyDaysFromNow = new Date(
    now.getTime() + 30 * 24 * 60 * 60 * 1000
  );

  const employees = await prisma.employee.findMany({
    where: {
      org_id: orgId,
      status: "probation",
      is_active: true,
      deleted_at: null,
    },
    select: {
      emp_id: true,
      full_name: true,
      department: true,
      designation: true,
      hire_date: true,
      probation_end_date: true,
    },
    orderBy: { probation_end_date: "asc" },
  });

  return {
    success: true,
    total_on_probation: employees.length,
    ending_in_30_days: employees.filter(
      (e) =>
        e.probation_end_date &&
        e.probation_end_date <= thirtyDaysFromNow &&
        e.probation_end_date >= now
    ).length,
    overdue: employees.filter(
      (e) => e.probation_end_date && e.probation_end_date < now
    ).length,
    employees: employees.map((e) => ({
      ...e,
      days_remaining: e.probation_end_date
        ? Math.ceil(
            (e.probation_end_date.getTime() - now.getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : null,
      is_overdue: e.probation_end_date ? e.probation_end_date < now : false,
    })),
  };
}

// ============================================================================
// CSV EXPORT HELPERS
// ============================================================================

/**
 * Export leave utilization report as CSV.
 */
export async function exportLeaveReportCSV(month: number, year: number) {
  const result = await getLeaveUtilizationReport(month, year);
  if (!result.success || !("by_department" in result)) return result;

  const headers = [
    "Department",
    "Total Days",
    "Request Count",
    "Unique Employees",
  ];
  const rows = result.by_department.map((d: any) =>
    [
      `"${d.department}"`,
      d.total_days,
      d.request_count,
      d.unique_employees,
    ].join(",")
  );

  return {
    success: true,
    csv: [headers.join(","), ...rows].join("\n"),
    filename: `leave_utilization_${month}_${year}.csv`,
  };
}

/**
 * Export attendance report as CSV.
 */
export async function exportAttendanceReportCSV(
  month: number,
  year: number
) {
  const result = await getAttendanceReport(month, year);
  if (!result.success || !("report" in result)) return result;

  const headers = [
    "Employee ID",
    "Name",
    "Department",
    "Working Days",
    "Present",
    "Late",
    "Absent",
    "Half Day",
    "WFH",
    "Late Minutes",
    "OT Minutes",
    "Total Hours",
    "Attendance %",
  ];

  const rows = result.report.map((r: any) =>
    [
      r.emp_id,
      `"${r.full_name}"`,
      `"${r.department || ""}"`,
      r.working_days,
      r.present,
      r.late,
      r.absent,
      r.half_day,
      r.wfh,
      r.total_late_minutes,
      r.total_overtime_minutes,
      r.total_hours,
      r.attendance_rate,
    ].join(",")
  );

  return {
    success: true,
    csv: [headers.join(","), ...rows].join("\n"),
    filename: `attendance_${month}_${year}.csv`,
  };
}

/**
 * Export headcount report as CSV.
 */
export async function exportHeadcountReportCSV() {
  const result = await getHeadcountReport();
  if (!result.success || !("by_department" in result)) return result;

  const headers = ["Department", "Active", "Inactive", "Total"];
  const rows = result.by_department.map((d: any) =>
    [`"${d.department}"`, d.active, d.inactive, d.total].join(",")
  );

  return {
    success: true,
    csv: [headers.join(","), ...rows].join("\n"),
    filename: `headcount_report.csv`,
  };
}
