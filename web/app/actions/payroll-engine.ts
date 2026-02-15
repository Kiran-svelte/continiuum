"use server";

import { prisma } from "@/lib/prisma";
import {
  getAuthEmployee,
  requireHRAccess,
  requirePermissionGuard,
} from "@/lib/auth-guard";
import { PERMISSIONS, hasPermission } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import {
  calculateMonthlyPayroll,
  calculatePF,
  calculateESI,
  getProfessionalTax,
  calculateTDS,
  calculateLOP,
  type PFConfig,
  type ESIConfig,
  type TDSConfig,
  type PayrollCalculationInput,
} from "@/lib/india-tax";

// ============================================================================
// PAYROLL ENGINE
// Handles the complete payroll lifecycle:
// generate → under_review → approved → processed → paid
// ============================================================================

/**
 * Get attendance summary for an employee for a given month.
 */
async function getAttendanceSummary(
  empId: string,
  month: number,
  year: number,
  companyWorkDays: number[]
) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0); // Last day of month

  // Get attendance records
  const attendances = await prisma.attendance.findMany({
    where: {
      emp_id: empId,
      date: { gte: startDate, lte: endDate },
    },
  });

  // Get approved leaves overlapping this month
  const leaves = await prisma.leaveRequest.findMany({
    where: {
      emp_id: empId,
      status: "approved",
      start_date: { lte: endDate },
      end_date: { gte: startDate },
    },
    include: {
      leave_type_rel: { select: { is_paid: true, code: true } },
    },
  });

  // Get public holidays
  const holidays = await prisma.publicHoliday
    .findMany({
      where: { date: { gte: startDate, lte: endDate } },
    })
    .catch(() => []);

  const holidayDates = new Set(
    holidays.map((h) => h.date.toISOString().split("T")[0])
  );

  // Calculate working days in month (using company work days config)
  let totalWorkingDays = 0;
  const d = new Date(startDate);
  while (d <= endDate) {
    if (companyWorkDays.includes(d.getDay()) && !holidayDates.has(d.toISOString().split("T")[0])) {
      totalWorkingDays++;
    }
    d.setDate(d.getDate() + 1);
  }

  // Count attendance statuses
  let presentDays = 0;
  let absentDays = 0;
  let lateCount = 0;
  let totalOvertimeMinutes = 0;

  for (const att of attendances) {
    const dateStr = att.date.toISOString().split("T")[0];
    if (holidayDates.has(dateStr)) continue;

    switch (att.status) {
      case "PRESENT":
        presentDays++;
        break;
      case "LATE":
        presentDays++;
        lateCount++;
        break;
      case "HALF_DAY":
        presentDays += 0.5;
        break;
      case "ABSENT":
        absentDays++;
        break;
    }

    totalOvertimeMinutes += att.overtime_minutes || 0;
  }

  // Calculate leave days within this month
  let paidLeaveDays = 0;
  let unpaidLeaveDays = 0;

  for (const leave of leaves) {
    const leaveStart = new Date(
      Math.max(leave.start_date.getTime(), startDate.getTime())
    );
    const leaveEnd = new Date(
      Math.min(leave.end_date.getTime(), endDate.getTime())
    );

    let leaveDaysInMonth = 0;
    const date = new Date(leaveStart);
    while (date <= leaveEnd) {
      const dateStr = date.toISOString().split("T")[0];
      if (companyWorkDays.includes(date.getDay()) && !holidayDates.has(dateStr)) {
        leaveDaysInMonth++;
      }
      date.setDate(date.getDate() + 1);
    }

    // Half-day leaves
    if (leave.is_half_day) {
      leaveDaysInMonth = 0.5;
    }

    // Determine paid vs unpaid using leave type config
    const isPaid = leave.leave_type_rel?.is_paid ?? true;
    if (isPaid) {
      paidLeaveDays += leaveDaysInMonth;
    } else {
      unpaidLeaveDays += leaveDaysInMonth;
    }
  }

  // Effective present = attendance present + paid leave
  const effectivePresent = presentDays + paidLeaveDays;

  // Unaccounted days = working days not covered by attendance or approved leave
  const accountedDays = presentDays + absentDays + paidLeaveDays + unpaidLeaveDays;
  const unaccountedAbsent = Math.max(0, totalWorkingDays - accountedDays);

  return {
    totalWorkingDays,
    presentDays: effectivePresent,
    absentDays: absentDays + unaccountedAbsent,
    paidLeaveDays,
    unpaidLeaveDays: unpaidLeaveDays + unaccountedAbsent,
    lateCount,
    overtimeHours: Math.round((totalOvertimeMinutes / 60) * 100) / 100,
  };
}

// ============================================================================
// GENERATE PAYROLL
// ============================================================================

/**
 * Generate payroll for a month/year.
 * Creates a PayrollRun with individual PayrollSlips for each active employee.
 */
export async function generatePayroll(month: number, year: number) {
  const auth = await requirePermissionGuard(PERMISSIONS.PAYROLL_GENERATE);
  if (!auth.success) return auth;

  const orgId = auth.employee.org_id;
  if (!orgId) return { success: false, error: "Not linked to company" };

  if (month < 1 || month > 12) return { success: false, error: "Invalid month" };
  if (year < 2020 || year > 2099) return { success: false, error: "Invalid year" };

  // Check if payroll run already exists
  const existingRun = await prisma.payrollRun.findUnique({
    where: { company_id_month_year: { company_id: orgId, month, year } },
  });

  if (existingRun && existingRun.status !== "draft") {
    return {
      success: false,
      error: `Payroll for ${month}/${year} is already ${existingRun.status}. Cannot regenerate.`,
    };
  }

  // Get company config
  const company = await prisma.company.findUnique({
    where: { id: orgId },
    select: {
      id: true,
      name: true,
      work_days: true,
      pf_enabled: true,
      pf_employer_rate: true,
      pf_employee_rate: true,
      pf_ceiling: true,
      esi_enabled: true,
      esi_employer_rate: true,
      esi_employee_rate: true,
      esi_ceiling: true,
      pt_state: true,
      tds_enabled: true,
    },
  });

  if (!company) return { success: false, error: "Company not found" };

  const workDays = (company.work_days as number[]) || [1, 2, 3, 4, 5];

  // Build statutory configs from company settings
  const pfConfig: PFConfig = {
    enabled: company.pf_enabled,
    employeeRate: Number(company.pf_employee_rate),
    employerRate: Number(company.pf_employer_rate),
    ceiling: Number(company.pf_ceiling),
  };

  const esiConfig: ESIConfig = {
    enabled: company.esi_enabled,
    employeeRate: Number(company.esi_employee_rate),
    employerRate: Number(company.esi_employer_rate),
    ceiling: Number(company.esi_ceiling),
  };

  const tdsConfig: TDSConfig = {
    enabled: company.tds_enabled,
    regime: "new", // Default to new regime; can be per-employee override
  };

  // Get all active employees with salary structures
  const employees = await prisma.employee.findMany({
    where: {
      org_id: orgId,
      is_active: true,
      deleted_at: null,
      status: { in: ["active", "probation", "on_notice"] },
    },
    select: {
      emp_id: true,
      full_name: true,
      department: true,
      designation: true,
      salary_structure: true,
    },
  });

  if (employees.length === 0) {
    return { success: false, error: "No active employees found" };
  }

  // Process payroll for each employee
  const slipData: Array<{
    emp_id: string;
    working_days: number;
    present_days: number;
    absent_days: number;
    paid_leave_days: number;
    unpaid_leave_days: number;
    late_count: number;
    overtime_hours: number;
    basic: number;
    hra: number;
    da: number;
    special_allowance: number;
    other_earnings: any;
    gross_salary: number;
    pf_employee: number;
    pf_employer: number;
    esi_employee: number;
    esi_employer: number;
    professional_tax: number;
    tds: number;
    lop_deduction: number;
    other_deductions: any;
    total_deductions: number;
    net_pay: number;
  }> = [];

  let totalGross = 0;
  let totalDeductions = 0;
  let totalNet = 0;
  let totalPF = 0;
  let totalESI = 0;
  let totalTDS = 0;
  let totalPT = 0;

  for (const emp of employees) {
    const structure = emp.salary_structure;

    if (!structure) {
      // Skip employees without salary structure
      continue;
    }

    const monthlyCTC = Number(structure.ctc) / 12;
    const monthlyBasic = Number(structure.basic);
    const components = (structure.components as any[]) || [];

    // Extract component amounts
    const hra = components.find((c) => c.code === "HRA")?.amount || 0;
    const da = components.find((c) => c.code === "DA")?.amount || 0;
    const specialAllowance = components.find((c) => c.code === "SA")?.amount || 0;

    // Other earnings (non-standard components)
    const standardCodes = ["BASIC", "HRA", "DA", "SA", "PF_EE", "PF_ER", "ESI_EE", "ESI_ER", "PT", "TDS", "CA", "MA"];
    const otherEarnings = components
      .filter((c) => c.type === "earning" && !standardCodes.includes(c.code))
      .map((c) => ({ name: c.name, amount: c.amount }));

    // Fixed allowances from components
    const conveyance = components.find((c) => c.code === "CA")?.amount || 0;
    const medical = components.find((c) => c.code === "MA")?.amount || 0;
    const otherEarningsWithFixed = [
      ...otherEarnings,
      ...(conveyance > 0 ? [{ name: "Conveyance Allowance", amount: conveyance }] : []),
      ...(medical > 0 ? [{ name: "Medical Allowance", amount: medical }] : []),
    ];

    // Get attendance summary
    const attendance = await getAttendanceSummary(emp.emp_id, month, year, workDays);

    // Calculate payroll using india-tax library
    const payrollInput: PayrollCalculationInput = {
      monthlyBasic,
      monthlyHRA: hra,
      monthlyDA: da,
      monthlySpecialAllowance: specialAllowance,
      otherEarnings: otherEarningsWithFixed,
      annualCTC: Number(structure.ctc),
      totalWorkingDays: attendance.totalWorkingDays,
      presentDays: attendance.presentDays,
      paidLeaveDays: attendance.paidLeaveDays,
      unpaidLeaveDays: attendance.unpaidLeaveDays,
      lateCount: attendance.lateCount,
      overtimeHours: attendance.overtimeHours,
      pfConfig,
      esiConfig,
      tdsConfig,
      ptState: company.pt_state,
      month,
    };

    const result = calculateMonthlyPayroll(payrollInput);

    const slip = {
      emp_id: emp.emp_id,
      working_days: attendance.totalWorkingDays,
      present_days: attendance.presentDays,
      absent_days: attendance.absentDays,
      paid_leave_days: attendance.paidLeaveDays,
      unpaid_leave_days: attendance.unpaidLeaveDays,
      late_count: attendance.lateCount,
      overtime_hours: attendance.overtimeHours,
      basic: result.basic,
      hra: result.hra,
      da: result.da,
      special_allowance: result.specialAllowance,
      other_earnings: otherEarningsWithFixed,
      gross_salary: result.grossSalary,
      pf_employee: result.pfEmployee,
      pf_employer: result.pfEmployer,
      esi_employee: result.esiEmployee,
      esi_employer: result.esiEmployer,
      professional_tax: result.professionalTax,
      tds: result.tds,
      lop_deduction: result.lopDeduction,
      other_deductions: result.otherDeductions,
      total_deductions: result.totalDeductions,
      net_pay: result.netPay,
    };

    slipData.push(slip);

    totalGross += result.grossSalary;
    totalDeductions += result.totalDeductions;
    totalNet += result.netPay;
    totalPF += result.pfEmployee + result.pfEmployer;
    totalESI += result.esiEmployee + result.esiEmployer;
    totalTDS += result.tds;
    totalPT += result.professionalTax;
  }

  if (slipData.length === 0) {
    return {
      success: false,
      error: "No employees with salary structures found. Set up salary structures first.",
    };
  }

  // Create/update payroll run and slips in a transaction
  await prisma.$transaction(async (tx) => {
    // Upsert payroll run
    const run = await tx.payrollRun.upsert({
      where: { company_id_month_year: { company_id: orgId, month, year } },
      create: {
        company_id: orgId,
        month,
        year,
        status: "draft",
        generated_by: auth.employee.emp_id,
        generated_at: new Date(),
        total_gross: totalGross,
        total_deductions: totalDeductions,
        total_net: totalNet,
        total_pf: totalPF,
        total_esi: totalESI,
        total_tds: totalTDS,
        total_pt: totalPT,
        employee_count: slipData.length,
      },
      update: {
        status: "draft",
        generated_by: auth.employee.emp_id,
        generated_at: new Date(),
        total_gross: totalGross,
        total_deductions: totalDeductions,
        total_net: totalNet,
        total_pf: totalPF,
        total_esi: totalESI,
        total_tds: totalTDS,
        total_pt: totalPT,
        employee_count: slipData.length,
        approved_by: null,
        approved_at: null,
        processed_by: null,
        processed_at: null,
      },
    });

    // Delete existing slips for this run (regeneration)
    await tx.payrollSlip.deleteMany({
      where: { payroll_run_id: run.id },
    });

    // Create all slips
    for (const slip of slipData) {
      await tx.payrollSlip.create({
        data: {
          payroll_run_id: run.id,
          ...slip,
        },
      });
    }
  });

  revalidatePath("/hr/payroll");
  return {
    success: true,
    summary: {
      month,
      year,
      employee_count: slipData.length,
      total_gross: totalGross,
      total_deductions: totalDeductions,
      total_net: totalNet,
      total_pf: totalPF,
      total_esi: totalESI,
      total_tds: totalTDS,
      total_pt: totalPT,
    },
  };
}

// ============================================================================
// PAYROLL WORKFLOW TRANSITIONS
// ============================================================================

/**
 * Submit payroll for review (draft -> under_review).
 */
export async function submitPayrollForReview(month: number, year: number) {
  const auth = await requirePermissionGuard(PERMISSIONS.PAYROLL_GENERATE);
  if (!auth.success) return auth;

  const orgId = auth.employee.org_id;
  if (!orgId) return { success: false, error: "Not linked to company" };

  const run = await prisma.payrollRun.findUnique({
    where: { company_id_month_year: { company_id: orgId, month, year } },
  });

  if (!run) return { success: false, error: "Payroll run not found" };
  if (run.status !== "draft") {
    return { success: false, error: `Cannot submit: payroll is ${run.status}` };
  }

  await prisma.payrollRun.update({
    where: { id: run.id },
    data: { status: "under_review" },
  });

  revalidatePath("/hr/payroll");
  return { success: true };
}

/**
 * Approve payroll (under_review -> approved).
 */
export async function approvePayrollRun(month: number, year: number) {
  const auth = await requirePermissionGuard(PERMISSIONS.PAYROLL_APPROVE);
  if (!auth.success) return auth;

  const orgId = auth.employee.org_id;
  if (!orgId) return { success: false, error: "Not linked to company" };

  const run = await prisma.payrollRun.findUnique({
    where: { company_id_month_year: { company_id: orgId, month, year } },
  });

  if (!run) return { success: false, error: "Payroll run not found" };
  if (run.status !== "under_review") {
    return { success: false, error: `Cannot approve: payroll is ${run.status}` };
  }

  await prisma.payrollRun.update({
    where: { id: run.id },
    data: {
      status: "approved",
      approved_by: auth.employee.emp_id,
      approved_at: new Date(),
    },
  });

  revalidatePath("/hr/payroll");
  return { success: true };
}

/**
 * Reject payroll back to draft (under_review -> rejected).
 */
export async function rejectPayrollRun(
  month: number,
  year: number,
  reason: string
) {
  const auth = await requirePermissionGuard(PERMISSIONS.PAYROLL_APPROVE);
  if (!auth.success) return auth;

  const orgId = auth.employee.org_id;
  if (!orgId) return { success: false, error: "Not linked to company" };

  const run = await prisma.payrollRun.findUnique({
    where: { company_id_month_year: { company_id: orgId, month, year } },
  });

  if (!run) return { success: false, error: "Payroll run not found" };
  if (run.status !== "under_review") {
    return { success: false, error: `Cannot reject: payroll is ${run.status}` };
  }

  await prisma.payrollRun.update({
    where: { id: run.id },
    data: {
      status: "rejected",
      notes: reason,
    },
  });

  revalidatePath("/hr/payroll");
  return { success: true };
}

/**
 * Process payroll (approved -> processed).
 * This represents the actual disbursement initiation.
 */
export async function processPayrollRun(month: number, year: number) {
  const auth = await requirePermissionGuard(PERMISSIONS.PAYROLL_PROCESS);
  if (!auth.success) return auth;

  const orgId = auth.employee.org_id;
  if (!orgId) return { success: false, error: "Not linked to company" };

  const run = await prisma.payrollRun.findUnique({
    where: { company_id_month_year: { company_id: orgId, month, year } },
  });

  if (!run) return { success: false, error: "Payroll run not found" };
  if (run.status !== "approved") {
    return { success: false, error: `Cannot process: payroll is ${run.status}` };
  }

  await prisma.payrollRun.update({
    where: { id: run.id },
    data: {
      status: "processed",
      processed_by: auth.employee.emp_id,
      processed_at: new Date(),
    },
  });

  revalidatePath("/hr/payroll");
  return { success: true };
}

/**
 * Mark payroll as paid (processed -> paid).
 */
export async function markPayrollAsPaid(month: number, year: number) {
  const auth = await requirePermissionGuard(PERMISSIONS.PAYROLL_PROCESS);
  if (!auth.success) return auth;

  const orgId = auth.employee.org_id;
  if (!orgId) return { success: false, error: "Not linked to company" };

  const run = await prisma.payrollRun.findUnique({
    where: { company_id_month_year: { company_id: orgId, month, year } },
  });

  if (!run) return { success: false, error: "Payroll run not found" };
  if (run.status !== "processed") {
    return { success: false, error: `Cannot mark as paid: payroll is ${run.status}` };
  }

  await prisma.payrollRun.update({
    where: { id: run.id },
    data: { status: "paid" },
  });

  revalidatePath("/hr/payroll");
  return { success: true };
}

/**
 * Revert rejected payroll back to draft for re-generation.
 */
export async function revertPayrollToDraft(month: number, year: number) {
  const auth = await requirePermissionGuard(PERMISSIONS.PAYROLL_GENERATE);
  if (!auth.success) return auth;

  const orgId = auth.employee.org_id;
  if (!orgId) return { success: false, error: "Not linked to company" };

  const run = await prisma.payrollRun.findUnique({
    where: { company_id_month_year: { company_id: orgId, month, year } },
  });

  if (!run) return { success: false, error: "Payroll run not found" };
  if (run.status !== "rejected") {
    return { success: false, error: `Cannot revert: payroll is ${run.status}` };
  }

  await prisma.payrollRun.update({
    where: { id: run.id },
    data: {
      status: "draft",
      approved_by: null,
      approved_at: null,
      notes: null,
    },
  });

  revalidatePath("/hr/payroll");
  return { success: true };
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get payroll run details including all slips.
 */
export async function getPayrollRunDetails(month: number, year: number) {
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
            select: {
              full_name: true,
              department: true,
              designation: true,
              email: true,
            },
          },
        },
        orderBy: { employee: { full_name: "asc" } },
      },
    },
  });

  if (!run) return { success: false, error: "Payroll run not found for this period" };

  return {
    success: true,
    run: {
      id: run.id,
      month: run.month,
      year: run.year,
      status: run.status,
      generated_by: run.generated_by,
      approved_by: run.approved_by,
      processed_by: run.processed_by,
      generated_at: run.generated_at,
      approved_at: run.approved_at,
      processed_at: run.processed_at,
      total_gross: Number(run.total_gross),
      total_deductions: Number(run.total_deductions),
      total_net: Number(run.total_net),
      total_pf: Number(run.total_pf),
      total_esi: Number(run.total_esi),
      total_tds: Number(run.total_tds),
      total_pt: Number(run.total_pt),
      employee_count: run.employee_count,
      notes: run.notes,
      slips: run.slips.map((s) => ({
        id: s.id,
        emp_id: s.emp_id,
        employee: s.employee,
        working_days: s.working_days,
        present_days: Number(s.present_days),
        absent_days: Number(s.absent_days),
        paid_leave_days: Number(s.paid_leave_days),
        unpaid_leave_days: Number(s.unpaid_leave_days),
        late_count: s.late_count,
        overtime_hours: Number(s.overtime_hours),
        basic: Number(s.basic),
        hra: Number(s.hra),
        da: Number(s.da),
        special_allowance: Number(s.special_allowance),
        other_earnings: s.other_earnings,
        gross_salary: Number(s.gross_salary),
        pf_employee: Number(s.pf_employee),
        pf_employer: Number(s.pf_employer),
        esi_employee: Number(s.esi_employee),
        esi_employer: Number(s.esi_employer),
        professional_tax: Number(s.professional_tax),
        tds: Number(s.tds),
        lop_deduction: Number(s.lop_deduction),
        other_deductions: s.other_deductions,
        total_deductions: Number(s.total_deductions),
        net_pay: Number(s.net_pay),
      })),
    },
  };
}

/**
 * Get payroll run history for the company.
 */
export async function getPayrollRunHistory() {
  const auth = await requireHRAccess();
  if (!auth.success) return auth;

  const orgId = auth.employee.org_id;
  if (!orgId) return { success: false, error: "Not linked to company" };

  const runs = await prisma.payrollRun.findMany({
    where: { company_id: orgId },
    orderBy: [{ year: "desc" }, { month: "desc" }],
    take: 24,
  });

  return {
    success: true,
    runs: runs.map((r) => ({
      id: r.id,
      month: r.month,
      year: r.year,
      status: r.status,
      employee_count: r.employee_count,
      total_gross: Number(r.total_gross),
      total_deductions: Number(r.total_deductions),
      total_net: Number(r.total_net),
      total_pf: Number(r.total_pf),
      total_esi: Number(r.total_esi),
      total_tds: Number(r.total_tds),
      total_pt: Number(r.total_pt),
      generated_at: r.generated_at,
      approved_at: r.approved_at,
      processed_at: r.processed_at,
      notes: r.notes,
    })),
  };
}

/**
 * Get individual employee payslip.
 * Employees can view their own; HR/Admin can view any.
 */
export async function getEmployeePayslip(
  empId: string,
  month: number,
  year: number
) {
  const auth = await getAuthEmployee();
  if (!auth.success) return auth;

  const actor = auth.employee;
  const isOwnSlip = actor.emp_id === empId;

  if (!isOwnSlip) {
    // Must be HR/Admin or have payroll.view_team permission
    if (actor.org_id) {
      const canView = await hasPermission(
        actor.emp_id,
        actor.org_id,
        PERMISSIONS.PAYROLL_VIEW_TEAM
      );
      if (!canView && actor.primary_role !== "hr" && actor.primary_role !== "admin") {
        return { success: false, error: "Not authorized to view this payslip" };
      }
    } else {
      return { success: false, error: "Not authorized" };
    }
  }

  const slip = await prisma.payrollSlip.findFirst({
    where: {
      emp_id: empId,
      payroll_run: {
        month,
        year,
        status: { in: ["approved", "processed", "paid"] },
      },
    },
    include: {
      employee: {
        select: {
          full_name: true,
          email: true,
          department: true,
          designation: true,
          hire_date: true,
          employee_code: true,
        },
      },
      payroll_run: {
        select: {
          status: true,
          company: {
            select: { name: true, address: true },
          },
        },
      },
    },
  });

  if (!slip) {
    return { success: false, error: "Payslip not found or not yet approved" };
  }

  return {
    success: true,
    payslip: {
      employee: {
        emp_id: empId,
        employee_code: slip.employee.employee_code,
        full_name: slip.employee.full_name,
        email: slip.employee.email,
        department: slip.employee.department,
        designation: slip.employee.designation,
        hire_date: slip.employee.hire_date,
      },
      company: slip.payroll_run.company,
      period: { month, year },
      status: slip.payroll_run.status,

      attendance: {
        working_days: slip.working_days,
        present_days: Number(slip.present_days),
        absent_days: Number(slip.absent_days),
        paid_leave_days: Number(slip.paid_leave_days),
        unpaid_leave_days: Number(slip.unpaid_leave_days),
        late_count: slip.late_count,
        overtime_hours: Number(slip.overtime_hours),
      },

      earnings: {
        basic: Number(slip.basic),
        hra: Number(slip.hra),
        da: Number(slip.da),
        special_allowance: Number(slip.special_allowance),
        other_earnings: slip.other_earnings || [],
        gross_salary: Number(slip.gross_salary),
      },

      deductions: {
        pf_employee: Number(slip.pf_employee),
        esi_employee: Number(slip.esi_employee),
        professional_tax: Number(slip.professional_tax),
        tds: Number(slip.tds),
        lop_deduction: Number(slip.lop_deduction),
        other_deductions: slip.other_deductions || [],
        total_deductions: Number(slip.total_deductions),
      },

      employer_contributions: {
        pf_employer: Number(slip.pf_employer),
        esi_employer: Number(slip.esi_employer),
      },

      net_pay: Number(slip.net_pay),
    },
  };
}

/**
 * Get all payslips for the current employee.
 */
export async function getMyPayslips() {
  const auth = await getAuthEmployee();
  if (!auth.success) return auth;

  const slips = await prisma.payrollSlip.findMany({
    where: {
      emp_id: auth.employee.emp_id,
      payroll_run: {
        status: { in: ["approved", "processed", "paid"] },
      },
    },
    include: {
      payroll_run: {
        select: { month: true, year: true, status: true },
      },
    },
    orderBy: {
      payroll_run: { year: "desc" },
    },
  });

  return {
    success: true,
    payslips: slips.map((s) => ({
      id: s.id,
      month: s.payroll_run.month,
      year: s.payroll_run.year,
      status: s.payroll_run.status,
      gross_salary: Number(s.gross_salary),
      total_deductions: Number(s.total_deductions),
      net_pay: Number(s.net_pay),
    })),
  };
}

// ============================================================================
// EXPORT
// ============================================================================

/**
 * Export payroll data as CSV.
 */
export async function exportPayrollRunCSV(month: number, year: number) {
  const auth = await requirePermissionGuard(PERMISSIONS.PAYROLL_GENERATE);
  if (!auth.success) return auth;

  const orgId = auth.employee.org_id;
  if (!orgId) return { success: false, error: "Not linked to company" };

  const run = await prisma.payrollRun.findUnique({
    where: { company_id_month_year: { company_id: orgId, month, year } },
    include: {
      slips: {
        include: {
          employee: {
            select: {
              full_name: true,
              department: true,
              designation: true,
              employee_code: true,
            },
          },
        },
        orderBy: { employee: { full_name: "asc" } },
      },
    },
  });

  if (!run) return { success: false, error: "Payroll run not found" };

  const headers = [
    "Employee Code",
    "Employee ID",
    "Name",
    "Department",
    "Designation",
    "Working Days",
    "Present Days",
    "Absent Days",
    "Paid Leave",
    "Unpaid Leave",
    "Late Count",
    "OT Hours",
    "Basic",
    "HRA",
    "DA",
    "Special Allowance",
    "Gross Salary",
    "PF (Employee)",
    "PF (Employer)",
    "ESI (Employee)",
    "ESI (Employer)",
    "Professional Tax",
    "TDS",
    "LOP Deduction",
    "Total Deductions",
    "Net Pay",
  ];

  const rows = run.slips.map((s) =>
    [
      s.employee.employee_code || "",
      s.emp_id,
      `"${s.employee.full_name}"`,
      `"${s.employee.department || ""}"`,
      `"${s.employee.designation || ""}"`,
      s.working_days,
      Number(s.present_days),
      Number(s.absent_days),
      Number(s.paid_leave_days),
      Number(s.unpaid_leave_days),
      s.late_count,
      Number(s.overtime_hours),
      Number(s.basic),
      Number(s.hra),
      Number(s.da),
      Number(s.special_allowance),
      Number(s.gross_salary),
      Number(s.pf_employee),
      Number(s.pf_employer),
      Number(s.esi_employee),
      Number(s.esi_employer),
      Number(s.professional_tax),
      Number(s.tds),
      Number(s.lop_deduction),
      Number(s.total_deductions),
      Number(s.net_pay),
    ].join(",")
  );

  const csv = [headers.join(","), ...rows].join("\n");

  return {
    success: true,
    csv,
    filename: `payroll_${month}_${year}.csv`,
  };
}

/**
 * Export PF contribution register as CSV.
 */
export async function exportPFRegister(month: number, year: number) {
  const auth = await requirePermissionGuard(PERMISSIONS.PAYROLL_GENERATE);
  if (!auth.success) return auth;

  const orgId = auth.employee.org_id;
  if (!orgId) return { success: false, error: "Not linked to company" };

  const run = await prisma.payrollRun.findUnique({
    where: { company_id_month_year: { company_id: orgId, month, year } },
    include: {
      slips: {
        where: {
          OR: [
            { pf_employee: { gt: 0 } },
            { pf_employer: { gt: 0 } },
          ],
        },
        include: {
          employee: {
            select: {
              full_name: true,
              employee_code: true,
              department: true,
            },
          },
        },
        orderBy: { employee: { full_name: "asc" } },
      },
    },
  });

  if (!run) return { success: false, error: "Payroll run not found" };

  const headers = [
    "Employee Code",
    "Employee ID",
    "Name",
    "Department",
    "Basic",
    "PF Employee (12%)",
    "PF Employer (12%)",
    "EPS (8.33%)",
    "Total PF",
  ];

  const rows = run.slips.map((s) => {
    const pfEmp = Number(s.pf_employee);
    const pfEr = Number(s.pf_employer);
    const basic = Number(s.basic);
    // EPS = 8.33% of basic, max 1250
    const eps = Math.min(Math.round(Math.min(basic, 15000) * 0.0833), 1250);
    return [
      s.employee.employee_code || "",
      s.emp_id,
      `"${s.employee.full_name}"`,
      `"${s.employee.department || ""}"`,
      basic,
      pfEmp,
      pfEr,
      eps,
      pfEmp + pfEr,
    ].join(",");
  });

  const csv = [headers.join(","), ...rows].join("\n");

  return {
    success: true,
    csv,
    filename: `pf_register_${month}_${year}.csv`,
  };
}

/**
 * Export ESI contribution register as CSV.
 */
export async function exportESIRegister(month: number, year: number) {
  const auth = await requirePermissionGuard(PERMISSIONS.PAYROLL_GENERATE);
  if (!auth.success) return auth;

  const orgId = auth.employee.org_id;
  if (!orgId) return { success: false, error: "Not linked to company" };

  const run = await prisma.payrollRun.findUnique({
    where: { company_id_month_year: { company_id: orgId, month, year } },
    include: {
      slips: {
        where: {
          OR: [
            { esi_employee: { gt: 0 } },
            { esi_employer: { gt: 0 } },
          ],
        },
        include: {
          employee: {
            select: {
              full_name: true,
              employee_code: true,
              department: true,
            },
          },
        },
        orderBy: { employee: { full_name: "asc" } },
      },
    },
  });

  if (!run) return { success: false, error: "Payroll run not found" };

  const headers = [
    "Employee Code",
    "Employee ID",
    "Name",
    "Department",
    "Gross Salary",
    "ESI Employee (0.75%)",
    "ESI Employer (3.25%)",
    "Total ESI",
  ];

  const rows = run.slips.map((s) => {
    const esiEmp = Number(s.esi_employee);
    const esiEr = Number(s.esi_employer);
    return [
      s.employee.employee_code || "",
      s.emp_id,
      `"${s.employee.full_name}"`,
      `"${s.employee.department || ""}"`,
      Number(s.gross_salary),
      esiEmp,
      esiEr,
      esiEmp + esiEr,
    ].join(",");
  });

  const csv = [headers.join(","), ...rows].join("\n");

  return {
    success: true,
    csv,
    filename: `esi_register_${month}_${year}.csv`,
  };
}
