"use server";

import { prisma } from "@/lib/prisma";
import { LeaveStatus } from "@prisma/client";
import {
  getAuthEmployee,
  requireHRAccess,
  requireManagementAccess,
  requireCompanyAccess,
  getAccessScope,
} from "@/lib/auth-guard";
import { PERMISSIONS, getApprovalChain, hasPermission, getTeamMembers } from "@/lib/rbac";
import { requirePermissionGuard, requireAnyPermissionGuard } from "@/lib/auth-guard";
import { revalidatePath } from "next/cache";

// ============================================================================
// TYPES
// ============================================================================

export type ConstraintResult = {
  passed: boolean;
  violations: string[];
  warnings: string[];
  suggestions: string[];
  canAutoApprove: boolean;
  details: Record<string, unknown>;
};

export type LeaveEngineResult = {
  success: boolean;
  error?: string;
  requestId?: string;
  status?: LeaveStatus;
  violations?: string[];
  warnings?: string[];
  suggestions?: string[];
  approver?: string;
  autoApproved?: boolean;
};

// ============================================================================
// CORE: WORKING DAYS CALCULATION
// ============================================================================

/**
 * Calculate actual working days between two dates.
 * Excludes weekends (per company config) and public/custom holidays.
 */
async function calculateWorkingDays(
  startDate: Date,
  endDate: Date,
  orgId: string,
  isHalfDay: boolean = false
): Promise<number> {
  if (isHalfDay) return 0.5;

  const company = await prisma.company.findUnique({
    where: { id: orgId },
    select: { work_days: true },
  });

  const workDays = (company?.work_days as number[]) || [1, 2, 3, 4, 5];

  const [publicHolidays, companySettings] = await Promise.all([
    prisma.publicHoliday.findMany({
      where: {
        country_code: "IN",
        date: { gte: startDate, lte: endDate },
      },
      select: { date: true },
    }),
    prisma.companySettings.findFirst({
      where: { company_id: orgId },
      select: { custom_holidays: true },
    }),
  ]);

  const holidayDates = new Set(
    publicHolidays.map((h) => h.date.toISOString().split("T")[0])
  );

  if (
    companySettings?.custom_holidays &&
    Array.isArray(companySettings.custom_holidays)
  ) {
    for (const ch of companySettings.custom_holidays as Array<{
      date?: string;
    }>) {
      if (ch.date) {
        const d = new Date(ch.date);
        if (d >= startDate && d <= endDate) {
          holidayDates.add(d.toISOString().split("T")[0]);
        }
      }
    }
  }

  let count = 0;
  const current = new Date(startDate);
  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    const dateStr = current.toISOString().split("T")[0];
    if (
      (workDays as number[]).includes(dayOfWeek) &&
      !holidayDates.has(dateStr)
    ) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}

// ============================================================================
// CORE: CONSTRAINT EVALUATION ENGINE
// ============================================================================

/**
 * Evaluate ALL company constraints against a leave request.
 * Returns a structured result with violations, warnings, and auto-approve eligibility.
 *
 * Constraints checked:
 * 1. Leave type exists and is active for the company
 * 2. Leave balance sufficiency
 * 3. Max consecutive days per leave type
 * 4. Min notice period per leave type
 * 5. Half-day eligibility per leave type
 * 6. Gender-specific leave types
 * 7. Document requirement per leave type or above X days
 * 8. Probation restriction (company config)
 * 9. Team coverage / max concurrent (LeaveRule)
 * 10. Blackout dates (LeaveRule)
 * 11. Min gap between leaves (LeaveRule)
 * 12. Department-specific limits (LeaveRule)
 * 13. Auto-approve policy (ConstraintPolicy)
 * 14. Consecutive leave escalation trigger
 * 15. Low balance escalation trigger
 * 16. Sandwich rule (leaves around weekends)
 */
async function evaluateConstraints(
  empId: string,
  orgId: string,
  leaveDetails: {
    type: string;
    startDate: Date;
    endDate: Date;
    days: number;
    isHalfDay: boolean;
    reason: string;
    documentId?: string;
  }
): Promise<ConstraintResult> {
  const violations: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];
  let canAutoApprove = true;
  const details: Record<string, unknown> = {};

  // ── Fetch all required data in parallel ──
  const [employee, company, leaveTypes, leaveRules, constraintPolicy] =
    await Promise.all([
      prisma.employee.findUnique({
        where: { emp_id: empId },
        select: {
          emp_id: true,
          full_name: true,
          department: true,
          status: true,
          hire_date: true,
          probation_confirmed: true,
          onboarding_status: true,
          gender: true,
          org_unit_id: true,
        },
      }),
      prisma.company.findUnique({
        where: { id: orgId },
        select: {
          name: true,
          probation_leave: true,
          probation_period_days: true,
          negative_balance: true,
          sla_hours: true,
          work_days: true,
        },
      }),
      prisma.leaveType.findMany({
        where: { company_id: orgId, is_active: true },
        orderBy: { sort_order: "asc" },
      }),
      prisma.leaveRule.findMany({
        where: { company_id: orgId, is_active: true },
        orderBy: { priority: "desc" },
      }),
      prisma.constraintPolicy.findFirst({
        where: { org_id: orgId, is_active: true },
      }),
    ]);

  if (!employee) {
    return {
      passed: false,
      violations: ["Employee not found"],
      warnings: [],
      suggestions: [],
      canAutoApprove: false,
      details: {},
    };
  }

  // ── 1. Leave type validation ──
  const leaveTypeConfig = leaveTypes.find(
    (lt) => lt.code.toUpperCase() === leaveDetails.type.toUpperCase()
  );

  if (!leaveTypeConfig) {
    return {
      passed: false,
      violations: [
        `Leave type "${leaveDetails.type}" is not configured for ${company?.name || "your company"}. Contact HR to set up leave types.`,
      ],
      warnings: [],
      suggestions: ["Contact HR to configure this leave type"],
      canAutoApprove: false,
      details: {},
    };
  }

  details.leaveTypeConfig = {
    code: leaveTypeConfig.code,
    name: leaveTypeConfig.name,
    annual_quota: Number(leaveTypeConfig.annual_quota),
    max_consecutive: leaveTypeConfig.max_consecutive,
    min_notice_days: leaveTypeConfig.min_notice_days,
  };

  // ── 2. Leave balance check ──
  const currentYear = new Date().getFullYear();
  const balance = await prisma.leaveBalance.findUnique({
    where: {
      emp_id_leave_type_year: {
        emp_id: empId,
        leave_type: leaveDetails.type,
        year: currentYear,
      },
    },
  });

  const totalEntitlement = balance
    ? Number(balance.annual_entitlement) + Number(balance.carried_forward)
    : Number(leaveTypeConfig.annual_quota);
  const usedDays = balance
    ? Number(balance.used_days) + Number(balance.pending_days)
    : 0;
  const remainingBalance = totalEntitlement - usedDays;

  details.balance = { totalEntitlement, usedDays, remainingBalance };

  if (remainingBalance < leaveDetails.days) {
    if (!company?.negative_balance) {
      violations.push(
        `Insufficient ${leaveTypeConfig.name} balance: ${remainingBalance} days available, ${leaveDetails.days} requested`
      );
      suggestions.push("Request fewer days or apply for Leave Without Pay");
      canAutoApprove = false;
    } else {
      warnings.push(
        "This will result in negative balance (company allows negative balance)"
      );
    }
  }

  // ── 3. Max consecutive days ──
  if (leaveDetails.days > leaveTypeConfig.max_consecutive) {
    violations.push(
      `Exceeds maximum consecutive days (${leaveTypeConfig.max_consecutive}) for ${leaveTypeConfig.name}`
    );
    suggestions.push(
      `Split your leave into periods of ${leaveTypeConfig.max_consecutive} days or less`
    );
    canAutoApprove = false;
  }

  // ── 4. Min notice period ──
  const daysUntilStart = Math.ceil(
    (leaveDetails.startDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  if (daysUntilStart < leaveTypeConfig.min_notice_days) {
    violations.push(
      `Insufficient notice: ${leaveTypeConfig.name} requires ${leaveTypeConfig.min_notice_days} days advance notice (you gave ${Math.max(0, daysUntilStart)} days)`
    );
    suggestions.push(
      `Submit requests at least ${leaveTypeConfig.min_notice_days} days in advance`
    );
    canAutoApprove = false;
  }

  // ── 5. Half-day eligibility ──
  if (leaveDetails.isHalfDay && !leaveTypeConfig.half_day_allowed) {
    violations.push(`Half-day not allowed for ${leaveTypeConfig.name}`);
    suggestions.push("Request a full day instead");
    canAutoApprove = false;
  }

  // ── 6. Gender-specific leave ──
  if (leaveTypeConfig.gender_specific) {
    const empGender = employee.gender;
    if (empGender && empGender !== leaveTypeConfig.gender_specific) {
      violations.push(
        `${leaveTypeConfig.name} is only available for ${leaveTypeConfig.gender_specific === "F" ? "female" : "male"} employees`
      );
      canAutoApprove = false;
    }
  }

  // ── 7. Document requirement ──
  const policyRules = (constraintPolicy?.rules as Record<string, any>) || {};
  const requireDocAboveDays =
    policyRules.escalation?.require_document_above_days ?? 3;

  if (
    (leaveDetails.days > requireDocAboveDays ||
      leaveTypeConfig.requires_document) &&
    !leaveDetails.documentId
  ) {
    const reason = leaveTypeConfig.requires_document
      ? `${leaveTypeConfig.name} requires a supporting document`
      : `Leave requests over ${requireDocAboveDays} days require a supporting document`;
    warnings.push(reason);
    canAutoApprove = false;
  }

  // ── 8. Probation restriction ──
  if (!company?.probation_leave && !employee.probation_confirmed) {
    if (
      employee.status === "probation" ||
      employee.onboarding_status !== "completed"
    ) {
      if (employee.hire_date) {
        const probationDays = company?.probation_period_days || 180;
        const probationEnd = new Date(employee.hire_date);
        probationEnd.setDate(probationEnd.getDate() + probationDays);
        if (new Date() < probationEnd) {
          violations.push(
            `Leave not available during probation period (${probationDays} days from hire date)`
          );
          suggestions.push("Contact HR for special circumstances");
          canAutoApprove = false;
        }
      }
    }
  }

  // ── 9-12. Company Leave Rules ──
  const department = employee.department || "General";
  const [teamCount, onLeaveCount] = await Promise.all([
    prisma.employee.count({
      where: { org_id: orgId, department, is_active: true, deleted_at: null },
    }),
    prisma.leaveRequest.count({
      where: {
        status: "approved",
        deleted_at: null,
        employee: { org_id: orgId, department },
        start_date: { lte: leaveDetails.endDate },
        end_date: { gte: leaveDetails.startDate },
      },
    }),
  ]);

  details.teamState = {
    teamSize: teamCount || 1,
    alreadyOnLeave: onLeaveCount,
  };

  for (const rule of leaveRules) {
    // Check department applicability
    if (
      !rule.applies_to_all &&
      rule.departments &&
      (rule.departments as string[]).length > 0
    ) {
      if (!(rule.departments as string[]).includes(department)) continue;
    }

    const config = (rule.config as Record<string, any>) || {};

    switch (rule.rule_type) {
      case "blackout": {
        if (config.dates?.length > 0) {
          for (const blackoutDate of config.dates) {
            const bd = new Date(blackoutDate);
            if (bd >= leaveDetails.startDate && bd <= leaveDetails.endDate) {
              violations.push(
                `${rule.name}: ${bd.toLocaleDateString()} is a blackout date`
              );
              if (rule.is_blocking) canAutoApprove = false;
            }
          }
        }
        if (config.days_of_week?.length > 0) {
          const startDay = leaveDetails.startDate.getDay();
          const blockedDay = startDay === 0 ? 7 : startDay;
          if (config.days_of_week.includes(blockedDay)) {
            const dayNames = [
              "",
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
              "Saturday",
              "Sunday",
            ];
            violations.push(
              `${rule.name}: ${dayNames[blockedDay]} is a restricted day`
            );
            if (rule.is_blocking) canAutoApprove = false;
          }
        }
        break;
      }

      case "max_concurrent": {
        const maxConcurrent =
          config.max_count ||
          Math.ceil(
            (teamCount * (config.max_percentage || 10)) / 100
          );
        if (onLeaveCount >= maxConcurrent) {
          violations.push(
            `${rule.name}: ${onLeaveCount} colleagues already on leave (max: ${maxConcurrent})`
          );
          suggestions.push(
            "Try different dates when fewer team members are on leave"
          );
          if (rule.is_blocking) canAutoApprove = false;
        }
        break;
      }

      case "min_gap": {
        const minGap = config.days || 7;
        const previousLeave = await prisma.leaveRequest.findFirst({
          where: {
            emp_id: empId,
            status: { in: ["approved", "pending", "escalated"] },
            deleted_at: null,
            end_date: { lt: leaveDetails.startDate },
          },
          orderBy: { end_date: "desc" },
        });

        if (previousLeave) {
          const daysSinceLast = Math.floor(
            (leaveDetails.startDate.getTime() -
              previousLeave.end_date.getTime()) /
              (1000 * 60 * 60 * 24)
          );
          if (daysSinceLast < minGap) {
            violations.push(
              `${rule.name}: Only ${daysSinceLast} days since last leave (minimum ${minGap} days required)`
            );
            const nextAllowed = new Date(
              previousLeave.end_date.getTime() +
                minGap * 24 * 60 * 60 * 1000
            );
            suggestions.push(
              `Wait until ${nextAllowed.toLocaleDateString()}`
            );
            if (rule.is_blocking) canAutoApprove = false;
          }
        }
        break;
      }

      case "department_limit": {
        const deptLimit = config.max_per_department || 2;
        if (onLeaveCount >= deptLimit) {
          violations.push(
            `${rule.name}: Department leave limit reached (${deptLimit})`
          );
          if (rule.is_blocking) canAutoApprove = false;
        }
        break;
      }
    }
  }

  // ── 13. Auto-approve policy from ConstraintPolicy ──
  const autoApprovePolicy = policyRules.auto_approve || {
    max_days: 3,
    min_notice_days: 1,
    allowed_leave_types: ["CL", "SL"],
  };

  if (
    !autoApprovePolicy.allowed_leave_types?.includes(
      leaveDetails.type.toUpperCase()
    )
  ) {
    canAutoApprove = false;
    warnings.push(`${leaveTypeConfig.name} requires HR approval`);
  }

  if (leaveDetails.days > (autoApprovePolicy.max_days || 3)) {
    canAutoApprove = false;
    warnings.push(
      `Requests over ${autoApprovePolicy.max_days || 3} days require HR approval`
    );
  }

  if (
    daysUntilStart <
    (autoApprovePolicy.min_notice_days || 1)
  ) {
    canAutoApprove = false;
    warnings.push(
      `Auto-approval requires ${autoApprovePolicy.min_notice_days || 1} days advance notice`
    );
  }

  // ── 14. Consecutive leave escalation ──
  const escalationConfig = policyRules.escalation || {};
  if (escalationConfig.consecutive_leaves) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [recentLeavesCount, adjacentLeave] = await Promise.all([
      prisma.leaveRequest.count({
        where: {
          emp_id: empId,
          status: "approved",
          deleted_at: null,
          end_date: { gte: thirtyDaysAgo },
        },
      }),
      prisma.leaveRequest.findFirst({
        where: {
          emp_id: empId,
          status: "approved",
          deleted_at: null,
          end_date: {
            gte: new Date(
              leaveDetails.startDate.getTime() - 7 * 24 * 60 * 60 * 1000
            ),
            lt: leaveDetails.startDate,
          },
        },
      }),
    ]);

    if (recentLeavesCount >= 2 || adjacentLeave) {
      canAutoApprove = false;
      const reason = adjacentLeave
        ? "New leave starts within 7 days of your previous leave ending"
        : `${recentLeavesCount} approved leaves in the past 30 days`;
      warnings.push(`Consecutive leave detected: ${reason} — escalated to HR`);
    }
  }

  // ── 15. Low balance escalation ──
  if (
    escalationConfig.low_balance &&
    remainingBalance - leaveDetails.days < 2
  ) {
    canAutoApprove = false;
    warnings.push("Low remaining balance — escalated to HR for review");
  }

  // ── 16. Sandwich rule ──
  // If leave is taken on Friday + Monday (sandwiching weekend), count weekend as leave
  const workDaysConfig = (company?.work_days as number[]) || [1, 2, 3, 4, 5];
  const startDay = leaveDetails.startDate.getDay();
  const endDay = leaveDetails.endDate.getDay();

  // Check if leave wraps around a weekend (e.g., Fri + Mon)
  if (
    leaveDetails.days <= 3 &&
    !leaveDetails.isHalfDay &&
    !workDaysConfig.includes(0) &&
    !workDaysConfig.includes(6)
  ) {
    // Check Friday-to-Monday pattern
    if (
      (startDay === 5 && endDay === 1) ||
      (startDay === 1 && endDay === 5)
    ) {
      warnings.push(
        "Sandwich rule: Leave around weekends may count weekends as leave days per company policy"
      );
    }
  }

  // ── 17. Team coverage from constraint policy ──
  const teamCoverage = policyRules.team_coverage || {};
  if (
    teamCoverage.max_concurrent &&
    onLeaveCount >= teamCoverage.max_concurrent
  ) {
    canAutoApprove = false;
    violations.push(
      `Team leave limit reached: ${onLeaveCount} already on leave (max: ${teamCoverage.max_concurrent})`
    );
  }
  if (
    teamCoverage.min_coverage &&
    teamCount - onLeaveCount - 1 < teamCoverage.min_coverage
  ) {
    canAutoApprove = false;
    violations.push(
      `Insufficient team coverage: minimum ${teamCoverage.min_coverage} members required`
    );
  }

  // ── All blocking violations make it fail ──
  const passed = violations.length === 0;

  return {
    passed,
    violations,
    warnings,
    suggestions,
    canAutoApprove: passed && canAutoApprove,
    details,
  };
}

// ============================================================================
// CORE: SUBMIT LEAVE REQUEST
// ============================================================================

/**
 * Submit a new leave request through the policy engine.
 *
 * Flow:
 * 1. Validate inputs
 * 2. Run constraint engine
 * 3. If all pass + auto-approve eligible → auto-approve, deduct from balance
 * 4. If violations or not auto-approvable → escalate to first approver in chain
 * 5. Create leave request record
 * 6. Return result
 */
export async function submitLeaveRequest(formData: {
  leaveType: string;
  reason: string;
  startDate: string;
  endDate: string;
  days: number;
  isHalfDay?: boolean;
  documentId?: string;
}): Promise<LeaveEngineResult> {
  const auth = await getAuthEmployee();
  if (!auth.success) return { success: false, error: auth.error };

  const empId = auth.employee.emp_id;
  const orgId = auth.employee.org_id;
  if (!orgId) return { success: false, error: "Employee not linked to company" };

  // ── Input validation ──
  const startDate = new Date(formData.startDate);
  const endDate = new Date(formData.endDate);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return { success: false, error: "Invalid date format" };
  }
  if (endDate < startDate) {
    return { success: false, error: "End date cannot be before start date" };
  }

  const reason = (formData.reason || "").trim();
  if (reason.length < 5) {
    return { success: false, error: "Reason must be at least 5 characters" };
  }
  if (reason.length > 1000) {
    return { success: false, error: "Reason must not exceed 1000 characters" };
  }

  const now = new Date();
  const sixMonthsFromNow = new Date(
    now.getTime() + 180 * 24 * 60 * 60 * 1000
  );
  const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
  if (startDate > sixMonthsFromNow) {
    return {
      success: false,
      error: "Cannot request leave more than 6 months in advance",
    };
  }
  if (startDate < oneYearAgo) {
    return {
      success: false,
      error: "Cannot request leave for dates more than 1 year ago",
    };
  }
  if (
    typeof formData.days !== "number" ||
    formData.days <= 0 ||
    formData.days > 90
  ) {
    return { success: false, error: "Days must be between 0.5 and 90" };
  }
  if (formData.isHalfDay && formData.days !== 0.5) {
    return {
      success: false,
      error: "Half day requests must be 0.5 days",
    };
  }

  // ── Check for duplicate/overlapping requests ──
  const overlapping = await prisma.leaveRequest.findFirst({
    where: {
      emp_id: empId,
      status: { in: ["pending", "approved", "escalated"] },
      deleted_at: null,
      start_date: { lte: endDate },
      end_date: { gte: startDate },
    },
  });
  if (overlapping) {
    return {
      success: false,
      error: `You already have a ${overlapping.status} leave request (${overlapping.request_id}) overlapping these dates`,
    };
  }

  // ── Run constraint engine ──
  const constraints = await evaluateConstraints(empId, orgId, {
    type: formData.leaveType,
    startDate,
    endDate,
    days: formData.days,
    isHalfDay: formData.isHalfDay || false,
    reason,
    documentId: formData.documentId,
  });

  // If there are blocking violations (not just warnings), check if any are hard blocks
  // Hard blocks = balance insufficient, leave type not found, gender mismatch, etc.
  const hasHardBlockingViolations = constraints.violations.length > 0;

  // Determine status
  const isAutoApproved = constraints.canAutoApprove;
  const requestStatus: LeaveStatus = isAutoApproved ? "approved" : "escalated";

  // ── Derive approval chain ──
  let firstApprover: string | null = null;
  if (!isAutoApproved) {
    const chain = await getApprovalChain(empId);
    firstApprover = chain.length > 0 ? chain[0] : null;

    // If no approver found in chain, assign to first available HR
    if (!firstApprover) {
      const hrEmployee = await prisma.employee.findFirst({
        where: {
          org_id: orgId,
          primary_role: { in: ["hr", "admin"] },
          is_active: true,
          deleted_at: null,
        },
        select: { emp_id: true },
      });
      firstApprover = hrEmployee?.emp_id || null;
    }
  }

  // ── Get company SLA config ──
  const company = await prisma.company.findUnique({
    where: { id: orgId },
    select: { sla_hours: true },
  });
  const slaHours = company?.sla_hours || 48;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // A. Check/create balance
      const currentYear = new Date().getFullYear();
      let balance = await tx.leaveBalance.findUnique({
        where: {
          emp_id_leave_type_year: {
            emp_id: empId,
            leave_type: formData.leaveType,
            year: currentYear,
          },
        },
      });

      if (!balance) {
        const leaveType = await tx.leaveType.findFirst({
          where: {
            company_id: orgId,
            code: { equals: formData.leaveType, mode: "insensitive" },
            is_active: true,
          },
          select: { annual_quota: true },
        });

        const entitlement = leaveType ? Number(leaveType.annual_quota) : 0;
        if (entitlement <= 0) {
          throw new Error(
            `No leave entitlement configured for "${formData.leaveType}". Contact HR.`
          );
        }

        balance = await tx.leaveBalance.create({
          data: {
            emp_id: empId,
            leave_type: formData.leaveType,
            year: currentYear,
            country_code: "IN",
            annual_entitlement: entitlement,
            used_days: 0,
            pending_days: 0,
            carried_forward: 0,
          },
        });
      }

      // Verify balance
      const remaining =
        Number(balance.annual_entitlement) +
        Number(balance.carried_forward) -
        Number(balance.used_days) -
        Number(balance.pending_days);

      if (remaining < formData.days) {
        // Only throw if company doesn't allow negative balance
        const co = await tx.company.findUnique({
          where: { id: orgId },
          select: { negative_balance: true },
        });
        if (!co?.negative_balance) {
          throw new Error(
            `Insufficient balance. Remaining: ${remaining}, Requested: ${formData.days}`
          );
        }
      }

      // B. Update balance
      if (isAutoApproved) {
        await tx.leaveBalance.update({
          where: { balance_id: balance.balance_id },
          data: { used_days: { increment: formData.days } },
        });
      } else {
        await tx.leaveBalance.update({
          where: { balance_id: balance.balance_id },
          data: { pending_days: { increment: formData.days } },
        });
      }

      // C. Calculate working days
      const workingDays = await calculateWorkingDays(
        startDate,
        endDate,
        orgId,
        formData.isHalfDay || false
      );

      // D. Create leave request
      const requestId = `LR-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

      const newRequest = await tx.leaveRequest.create({
        data: {
          request_id: requestId,
          emp_id: empId,
          country_code: "IN",
          leave_type: formData.leaveType,
          start_date: startDate,
          end_date: endDate,
          total_days: formData.days,
          working_days: workingDays,
          reason,
          status: requestStatus,
          is_half_day: formData.isHalfDay || false,
          current_approver: firstApprover,
          ai_recommendation: isAutoApproved ? "approve" : "escalate",
          ai_confidence: isAutoApproved ? 0.95 : 0.5,
          ai_analysis_json: {
            violations: constraints.violations,
            warnings: constraints.warnings,
            suggestions: constraints.suggestions,
            autoApproved: isAutoApproved,
            details: constraints.details,
          },
          sla_deadline: isAutoApproved
            ? null
            : new Date(Date.now() + slaHours * 60 * 60 * 1000),
          escalation_count: 0,
        },
      });

      return newRequest;
    });

    revalidatePath("/employee/dashboard");
    revalidatePath("/employee/request-leave");
    revalidatePath("/hr/leave-requests");
    revalidatePath("/manager/leave-requests");

    return {
      success: true,
      requestId: result.request_id,
      status: result.status,
      violations: constraints.violations,
      warnings: constraints.warnings,
      suggestions: constraints.suggestions,
      approver: firstApprover || undefined,
      autoApproved: isAutoApproved,
    };
  } catch (error: any) {
    console.error("[LeaveEngine] Submit error:", error);
    return {
      success: false,
      error: error.message || "Failed to submit leave request",
    };
  }
}

// ============================================================================
// ACTION: APPROVE LEAVE REQUEST
// ============================================================================

/**
 * Approve a leave request. Checks that the actor has permission to approve.
 * Moves pending_days → used_days.
 */
export async function approveLeaveRequest(
  requestId: string,
  comments?: string
): Promise<LeaveEngineResult> {
  const auth = await getAuthEmployee();
  if (!auth.success) return { success: false, error: auth.error };

  const actor = auth.employee;

  const leaveRequest = await prisma.leaveRequest.findUnique({
    where: { request_id: requestId },
    include: {
      employee: {
        select: {
          org_id: true,
          full_name: true,
          email: true,
          emp_id: true,
        },
      },
    },
  });

  if (!leaveRequest)
    return { success: false, error: "Leave request not found" };
  if (leaveRequest.deleted_at)
    return { success: false, error: "Leave request has been deleted" };

  // Verify same company
  if (leaveRequest.employee.org_id !== actor.org_id) {
    return { success: false, error: "Not authorized for this company" };
  }

  if (
    leaveRequest.status !== "pending" &&
    leaveRequest.status !== "escalated"
  ) {
    return {
      success: false,
      error: `Request already ${leaveRequest.status}`,
    };
  }

  // Permission check:
  // 1. If actor is the current_approver → allowed
  // 2. If actor has leave.approve_all → allowed
  // 3. If actor has leave.approve_department and is in same department → allowed
  // 4. If actor has leave.approve_team and is manager of the employee → allowed
  let authorized = false;

  if (leaveRequest.current_approver === actor.emp_id) {
    authorized = true;
  }

  if (!authorized && actor.org_id) {
    authorized = await hasPermission(
      actor.emp_id,
      actor.org_id,
      PERMISSIONS.LEAVE_APPROVE_ALL
    );
  }

  if (!authorized && actor.org_id) {
    const canApproveDept = await hasPermission(
      actor.emp_id,
      actor.org_id,
      PERMISSIONS.LEAVE_APPROVE_DEPARTMENT
    );
    if (canApproveDept && actor.department === leaveRequest.employee.org_id) {
      authorized = true;
    }
  }

  if (!authorized && actor.org_id) {
    const canApproveTeam = await hasPermission(
      actor.emp_id,
      actor.org_id,
      PERMISSIONS.LEAVE_APPROVE_TEAM
    );
    if (canApproveTeam) {
      const teamMembers = await getTeamMembers(actor.emp_id, actor.org_id);
      if (teamMembers.includes(leaveRequest.emp_id)) {
        authorized = true;
      }
    }
  }

  if (!authorized) {
    return { success: false, error: "Not authorized to approve this request" };
  }

  const totalDays = Number(leaveRequest.total_days);

  try {
    await prisma.$transaction(async (tx) => {
      // Update request
      await tx.leaveRequest.update({
        where: { request_id: requestId },
        data: {
          status: "approved",
          approved_by: actor.emp_id,
          approved_at: new Date(),
          approver_comments: comments || null,
          current_approver: null,
        },
      });

      // Move pending → used
      const balance = await tx.leaveBalance.findFirst({
        where: {
          emp_id: leaveRequest.emp_id,
          leave_type: leaveRequest.leave_type,
          year: new Date().getFullYear(),
        },
      });

      if (balance) {
        const pendingDecrement = Math.min(
          Number(balance.pending_days),
          totalDays
        );
        await tx.leaveBalance.update({
          where: { balance_id: balance.balance_id },
          data: {
            used_days: { increment: totalDays },
            pending_days: { decrement: pendingDecrement },
          },
        });
      }
    });

    revalidatePath("/hr/leave-requests");
    revalidatePath("/hr/dashboard");
    revalidatePath("/manager/leave-requests");
    revalidatePath("/employee/dashboard");

    return {
      success: true,
      requestId,
      status: "approved",
      autoApproved: false,
    };
  } catch (error: any) {
    console.error("[LeaveEngine] Approve error:", error);
    return { success: false, error: error.message || "Failed to approve" };
  }
}

// ============================================================================
// ACTION: REJECT LEAVE REQUEST
// ============================================================================

/**
 * Reject a leave request. Releases pending_days back to balance.
 */
export async function rejectLeaveRequest(
  requestId: string,
  reason: string,
  comments?: string
): Promise<LeaveEngineResult> {
  const auth = await getAuthEmployee();
  if (!auth.success) return { success: false, error: auth.error };

  const actor = auth.employee;

  const leaveRequest = await prisma.leaveRequest.findUnique({
    where: { request_id: requestId },
    include: {
      employee: { select: { org_id: true, emp_id: true } },
    },
  });

  if (!leaveRequest)
    return { success: false, error: "Leave request not found" };
  if (leaveRequest.deleted_at)
    return { success: false, error: "Leave request has been deleted" };

  if (leaveRequest.employee.org_id !== actor.org_id) {
    return { success: false, error: "Not authorized for this company" };
  }

  if (
    leaveRequest.status !== "pending" &&
    leaveRequest.status !== "escalated"
  ) {
    return {
      success: false,
      error: `Request already ${leaveRequest.status}`,
    };
  }

  // Same permission checks as approve
  let authorized = false;
  if (leaveRequest.current_approver === actor.emp_id) authorized = true;
  if (!authorized && actor.org_id) {
    authorized = await hasPermission(
      actor.emp_id,
      actor.org_id,
      PERMISSIONS.LEAVE_APPROVE_ALL
    );
  }
  if (!authorized && actor.org_id) {
    const canApproveTeam = await hasPermission(
      actor.emp_id,
      actor.org_id,
      PERMISSIONS.LEAVE_APPROVE_TEAM
    );
    if (canApproveTeam) {
      const teamMembers = await getTeamMembers(actor.emp_id, actor.org_id);
      if (teamMembers.includes(leaveRequest.emp_id)) authorized = true;
    }
  }

  if (!authorized) {
    return { success: false, error: "Not authorized to reject this request" };
  }

  const totalDays = Number(leaveRequest.total_days);

  try {
    await prisma.$transaction(async (tx) => {
      await tx.leaveRequest.update({
        where: { request_id: requestId },
        data: {
          status: "rejected",
          approved_by: actor.emp_id,
          approved_at: new Date(),
          rejection_reason: reason,
          approver_comments: comments || null,
          current_approver: null,
        },
      });

      // Release pending days
      const balance = await tx.leaveBalance.findFirst({
        where: {
          emp_id: leaveRequest.emp_id,
          leave_type: leaveRequest.leave_type,
          year: new Date().getFullYear(),
        },
      });

      if (balance && Number(balance.pending_days) > 0) {
        const pendingDecrement = Math.min(
          Number(balance.pending_days),
          totalDays
        );
        await tx.leaveBalance.update({
          where: { balance_id: balance.balance_id },
          data: { pending_days: { decrement: pendingDecrement } },
        });
      }
    });

    revalidatePath("/hr/leave-requests");
    revalidatePath("/hr/dashboard");
    revalidatePath("/manager/leave-requests");
    revalidatePath("/employee/dashboard");

    return {
      success: true,
      requestId,
      status: "rejected",
    };
  } catch (error: any) {
    console.error("[LeaveEngine] Reject error:", error);
    return { success: false, error: error.message || "Failed to reject" };
  }
}

// ============================================================================
// ACTION: ESCALATE LEAVE REQUEST
// ============================================================================

/**
 * Escalate a leave request to the next approver in the chain.
 * Called by current approver when they cannot decide, or by SLA cron.
 */
export async function escalateLeaveRequest(
  requestId: string,
  reason?: string
): Promise<LeaveEngineResult> {
  const leaveRequest = await prisma.leaveRequest.findUnique({
    where: { request_id: requestId },
    include: {
      employee: { select: { emp_id: true, org_id: true } },
    },
  });

  if (!leaveRequest)
    return { success: false, error: "Leave request not found" };

  if (
    leaveRequest.status !== "pending" &&
    leaveRequest.status !== "escalated"
  ) {
    return {
      success: false,
      error: `Cannot escalate: request is ${leaveRequest.status}`,
    };
  }

  // Get the full approval chain
  const chain = await getApprovalChain(leaveRequest.emp_id);

  // Find the next approver after the current one
  let nextApprover: string | null = null;
  const currentApprover = leaveRequest.current_approver;

  if (currentApprover) {
    const currentIdx = chain.indexOf(currentApprover);
    if (currentIdx >= 0 && currentIdx < chain.length - 1) {
      nextApprover = chain[currentIdx + 1];
    }
  } else if (chain.length > 0) {
    nextApprover = chain[0];
  }

  // If no next approver in chain, assign to HR
  if (!nextApprover) {
    const hrEmployee = await prisma.employee.findFirst({
      where: {
        org_id: leaveRequest.employee.org_id,
        primary_role: { in: ["hr", "admin"] },
        is_active: true,
        deleted_at: null,
      },
      select: { emp_id: true },
    });
    nextApprover = hrEmployee?.emp_id || null;
  }

  // Get company SLA
  const company = await prisma.company.findUnique({
    where: { id: leaveRequest.employee.org_id! },
    select: { sla_hours: true },
  });
  const slaHours = company?.sla_hours || 48;

  await prisma.leaveRequest.update({
    where: { request_id: requestId },
    data: {
      current_approver: nextApprover,
      escalation_count: { increment: 1 },
      escalation_reason: reason || "Auto-escalated",
      sla_deadline: new Date(Date.now() + slaHours * 60 * 60 * 1000),
      status: "escalated",
    },
  });

  revalidatePath("/hr/leave-requests");
  revalidatePath("/manager/leave-requests");

  return {
    success: true,
    requestId,
    status: "escalated",
    approver: nextApprover || undefined,
  };
}

// ============================================================================
// ACTION: CANCEL LEAVE REQUEST
// ============================================================================

/**
 * Cancel a leave request. Can be done by the employee (before start date)
 * or by HR/Admin at any time.
 *
 * - If approved: restore used_days to balance
 * - If pending/escalated: restore pending_days to balance
 */
export async function cancelLeaveRequest(
  requestId: string,
  reason: string
): Promise<LeaveEngineResult> {
  const auth = await getAuthEmployee();
  if (!auth.success) return { success: false, error: auth.error };

  const actor = auth.employee;

  const leaveRequest = await prisma.leaveRequest.findUnique({
    where: { request_id: requestId },
    include: {
      employee: { select: { org_id: true, emp_id: true } },
    },
  });

  if (!leaveRequest)
    return { success: false, error: "Leave request not found" };
  if (leaveRequest.deleted_at)
    return { success: false, error: "Leave request already deleted" };
  if (leaveRequest.status === "cancelled")
    return { success: false, error: "Leave request already cancelled" };
  if (leaveRequest.status === "rejected")
    return { success: false, error: "Cannot cancel a rejected request" };

  // Authorization:
  // 1. Employee can cancel their own request (before start date)
  // 2. HR/Admin can cancel any request
  const isOwner = leaveRequest.emp_id === actor.emp_id;
  let canCancel = false;

  if (isOwner) {
    // Employee can cancel before start date
    if (new Date() < leaveRequest.start_date) {
      canCancel = true;
    } else {
      return {
        success: false,
        error: "Cannot cancel a leave that has already started. Contact HR.",
      };
    }
  }

  if (!canCancel && actor.org_id) {
    canCancel = await hasPermission(
      actor.emp_id,
      actor.org_id,
      PERMISSIONS.LEAVE_CANCEL_ANY
    );
  }

  if (!canCancel) {
    return {
      success: false,
      error: "Not authorized to cancel this leave request",
    };
  }

  const totalDays = Number(leaveRequest.total_days);
  const wasApproved = leaveRequest.status === "approved";

  try {
    await prisma.$transaction(async (tx) => {
      // Update request status
      await tx.leaveRequest.update({
        where: { request_id: requestId },
        data: {
          status: "cancelled",
          cancelled_at: new Date(),
          cancel_reason: reason,
          current_approver: null,
        },
      });

      // Restore balance
      const balance = await tx.leaveBalance.findFirst({
        where: {
          emp_id: leaveRequest.emp_id,
          leave_type: leaveRequest.leave_type,
          year: new Date().getFullYear(),
        },
      });

      if (balance) {
        if (wasApproved) {
          // Restore used_days
          await tx.leaveBalance.update({
            where: { balance_id: balance.balance_id },
            data: {
              used_days: {
                decrement: Math.min(Number(balance.used_days), totalDays),
              },
            },
          });
        } else {
          // Restore pending_days
          await tx.leaveBalance.update({
            where: { balance_id: balance.balance_id },
            data: {
              pending_days: {
                decrement: Math.min(Number(balance.pending_days), totalDays),
              },
            },
          });
        }
      }
    });

    revalidatePath("/employee/dashboard");
    revalidatePath("/hr/leave-requests");

    return {
      success: true,
      requestId,
      status: "cancelled",
    };
  } catch (error: any) {
    console.error("[LeaveEngine] Cancel error:", error);
    return { success: false, error: error.message || "Failed to cancel" };
  }
}

// ============================================================================
// ACTION: ADJUST LEAVE BALANCE
// ============================================================================

/**
 * Manually adjust an employee's leave balance. HR/Admin only.
 */
export async function adjustLeaveBalance(
  empId: string,
  leaveType: string,
  adjustment: number,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const auth = await requirePermissionGuard(PERMISSIONS.LEAVE_ADJUST_BALANCE);
  if (!auth.success) return auth;

  const currentYear = new Date().getFullYear();

  const balance = await prisma.leaveBalance.findUnique({
    where: {
      emp_id_leave_type_year: {
        emp_id: empId,
        leave_type: leaveType,
        year: currentYear,
      },
    },
  });

  if (!balance) {
    return {
      success: false,
      error: `No balance record found for ${leaveType} in ${currentYear}`,
    };
  }

  // Apply adjustment to annual_entitlement (positive = add, negative = deduct)
  const newEntitlement = Math.max(
    0,
    Number(balance.annual_entitlement) + adjustment
  );

  await prisma.leaveBalance.update({
    where: { balance_id: balance.balance_id },
    data: { annual_entitlement: newEntitlement },
  });

  revalidatePath("/hr/leave-records");
  return { success: true };
}

// ============================================================================
// ACTION: LEAVE ENCASHMENT (India-specific)
// ============================================================================

/**
 * Process leave encashment for an employee.
 * Deducts from leave balance and creates an encashment record
 * to be included in the next payroll.
 */
export async function processLeaveEncashment(
  empId: string,
  leaveType: string,
  days: number,
  reason: string = "year_end"
): Promise<{ success: boolean; error?: string; encashment?: any }> {
  const auth = await requireHRAccess();
  if (!auth.success) return auth;

  // Check company has encashment enabled
  const company = await prisma.company.findFirst({
    where: {
      employees: { some: { emp_id: empId } },
    },
    select: {
      id: true,
      encashment_enabled: true,
      encashment_max_days: true,
      encashment_per_day: true,
    },
  });

  if (!company) return { success: false, error: "Company not found" };
  if (!company.encashment_enabled) {
    return { success: false, error: "Leave encashment is not enabled for this company" };
  }

  if (days > (company.encashment_max_days || 30)) {
    return {
      success: false,
      error: `Cannot encash more than ${company.encashment_max_days || 30} days`,
    };
  }

  // Check balance
  const currentYear = new Date().getFullYear();
  const balance = await prisma.leaveBalance.findUnique({
    where: {
      emp_id_leave_type_year: {
        emp_id: empId,
        leave_type: leaveType,
        year: currentYear,
      },
    },
  });

  if (!balance) {
    return { success: false, error: "No leave balance found" };
  }

  const remaining =
    Number(balance.annual_entitlement) +
    Number(balance.carried_forward) -
    Number(balance.used_days) -
    Number(balance.pending_days);

  if (remaining < days) {
    return {
      success: false,
      error: `Insufficient balance: ${remaining} days available, ${days} requested for encashment`,
    };
  }

  // Get per-day rate
  let perDayAmount = company.encashment_per_day
    ? Number(company.encashment_per_day)
    : 0;

  // If no company-wide rate, try to derive from employee salary
  if (!perDayAmount) {
    const salaryStructure = await prisma.salaryStructure.findUnique({
      where: { emp_id: empId },
      select: { basic: true },
    });
    if (salaryStructure) {
      // Per day = basic / 30
      perDayAmount = Number(salaryStructure.basic) / 30;
    }
  }

  if (perDayAmount <= 0) {
    return {
      success: false,
      error: "Cannot determine per-day encashment rate. Set up salary structure or company encashment rate.",
    };
  }

  const totalAmount = days * perDayAmount;

  try {
    const [encashment] = await prisma.$transaction([
      prisma.leaveEncashment.create({
        data: {
          emp_id: empId,
          leave_type: leaveType,
          days,
          per_day_amount: perDayAmount,
          total_amount: totalAmount,
          year: currentYear,
          reason,
          status: "pending",
        },
      }),
      // Deduct from balance
      prisma.leaveBalance.update({
        where: { balance_id: balance.balance_id },
        data: { used_days: { increment: days } },
      }),
    ]);

    revalidatePath("/hr/leave-records");
    return { success: true, encashment };
  } catch (error: any) {
    console.error("[LeaveEngine] Encashment error:", error);
    return { success: false, error: error.message || "Failed to process encashment" };
  }
}

// ============================================================================
// ACTION: SLA BREACH CHECK (called by cron)
// ============================================================================

/**
 * Find and auto-escalate leave requests that have breached SLA.
 * Called by the /api/cron/sla-check route.
 */
export async function checkAndEscalateSLABreaches(): Promise<{
  success: boolean;
  breachedCount: number;
  escalatedCount: number;
  errors: string[];
}> {
  const now = new Date();
  const errors: string[] = [];

  // Find all requests past SLA deadline that haven't been breached yet
  const breachedRequests = await prisma.leaveRequest.findMany({
    where: {
      status: { in: ["pending", "escalated"] },
      sla_breached: false,
      sla_deadline: { lt: now },
      deleted_at: null,
    },
    include: {
      employee: { select: { emp_id: true, org_id: true } },
    },
  });

  let escalatedCount = 0;

  for (const request of breachedRequests) {
    try {
      // Mark as SLA breached
      await prisma.leaveRequest.update({
        where: { request_id: request.request_id },
        data: { sla_breached: true },
      });

      // Auto-escalate to next level
      const result = await escalateLeaveRequest(
        request.request_id,
        `SLA breached: request pending for over ${Math.ceil((now.getTime() - (request.created_at?.getTime() || now.getTime())) / (1000 * 60 * 60))} hours`
      );

      if (result.success) {
        escalatedCount++;
      } else {
        errors.push(
          `Failed to escalate ${request.request_id}: ${result.error}`
        );
      }
    } catch (err: any) {
      errors.push(
        `Error processing ${request.request_id}: ${err.message}`
      );
    }
  }

  return {
    success: true,
    breachedCount: breachedRequests.length,
    escalatedCount,
    errors,
  };
}

// ============================================================================
// QUERY: GET PENDING APPROVALS FOR CURRENT USER
// ============================================================================

/**
 * Get leave requests pending approval for the current user.
 * Shows requests where they are the current_approver,
 * or all escalated requests if they have approve_all permission.
 */
export async function getPendingApprovals(): Promise<{
  success: boolean;
  error?: string;
  requests?: any[];
}> {
  const auth = await getAuthEmployee();
  if (!auth.success) return { success: false, error: auth.error };

  const actor = auth.employee;
  if (!actor.org_id)
    return { success: false, error: "Not linked to company" };

  const scope = getAccessScope(actor);

  let whereClause: any = {
    status: { in: ["pending", "escalated"] },
    deleted_at: null,
    employee: { org_id: actor.org_id },
  };

  if (scope === "company") {
    // HR/Admin see all pending in their company
  } else if (scope === "team") {
    // Managers see their team members' requests + where they are current_approver
    const teamMembers = await getTeamMembers(actor.emp_id, actor.org_id);
    whereClause.OR = [
      { current_approver: actor.emp_id },
      { emp_id: { in: teamMembers } },
    ];
  } else {
    // Employee scope - only see requests where they are explicitly the approver
    whereClause.current_approver = actor.emp_id;
  }

  const requests = await prisma.leaveRequest.findMany({
    where: whereClause,
    include: {
      employee: {
        select: {
          emp_id: true,
          full_name: true,
          email: true,
          department: true,
          designation: true,
        },
      },
    },
    orderBy: [
      { sla_breached: "desc" },
      { sla_deadline: "asc" },
      { created_at: "asc" },
    ],
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
      working_days: Number(r.working_days),
      is_half_day: r.is_half_day,
      reason: r.reason,
      status: r.status,
      current_approver: r.current_approver,
      sla_deadline: r.sla_deadline,
      sla_breached: r.sla_breached,
      escalation_count: r.escalation_count,
      escalation_reason: r.escalation_reason,
      ai_analysis: r.ai_analysis_json,
      created_at: r.created_at,
    })),
  };
}

// ============================================================================
// QUERY: GET MY LEAVE REQUESTS
// ============================================================================

/**
 * Get the current employee's leave requests with optional filters.
 */
export async function getMyLeaveRequests(filters?: {
  year?: number;
  status?: LeaveStatus;
  leaveType?: string;
}): Promise<{
  success: boolean;
  error?: string;
  requests?: any[];
  balances?: any[];
}> {
  const auth = await getAuthEmployee();
  if (!auth.success) return { success: false, error: auth.error };

  const empId = auth.employee.emp_id;
  const year = filters?.year || new Date().getFullYear();

  const whereClause: any = {
    emp_id: empId,
    deleted_at: null,
    created_at: {
      gte: new Date(`${year}-01-01`),
      lte: new Date(`${year}-12-31T23:59:59`),
    },
  };

  if (filters?.status) whereClause.status = filters.status;
  if (filters?.leaveType) whereClause.leave_type = filters.leaveType;

  const [requests, balances] = await Promise.all([
    prisma.leaveRequest.findMany({
      where: whereClause,
      orderBy: { created_at: "desc" },
    }),
    prisma.leaveBalance.findMany({
      where: { emp_id: empId, year },
    }),
  ]);

  return {
    success: true,
    requests: requests.map((r) => ({
      request_id: r.request_id,
      leave_type: r.leave_type,
      start_date: r.start_date,
      end_date: r.end_date,
      total_days: Number(r.total_days),
      working_days: Number(r.working_days),
      is_half_day: r.is_half_day,
      reason: r.reason,
      status: r.status,
      approved_by: r.approved_by,
      approved_at: r.approved_at,
      rejection_reason: r.rejection_reason,
      cancelled_at: r.cancelled_at,
      cancel_reason: r.cancel_reason,
      created_at: r.created_at,
    })),
    balances: balances.map((b) => ({
      leave_type: b.leave_type,
      entitled: Number(b.annual_entitlement),
      carried_forward: Number(b.carried_forward),
      used: Number(b.used_days),
      pending: Number(b.pending_days),
      remaining:
        Number(b.annual_entitlement) +
        Number(b.carried_forward) -
        Number(b.used_days) -
        Number(b.pending_days),
    })),
  };
}

// ============================================================================
// QUERY: GET LEAVE BALANCES
// ============================================================================

/**
 * Get leave balances for a specific employee or the current user.
 */
export async function getLeaveBalances(targetEmpId?: string): Promise<{
  success: boolean;
  error?: string;
  balances?: any[];
}> {
  const auth = await getAuthEmployee();
  if (!auth.success) return { success: false, error: auth.error };

  const empId = targetEmpId || auth.employee.emp_id;
  const orgId = auth.employee.org_id;

  // If viewing another employee's balance, check permission
  if (targetEmpId && targetEmpId !== auth.employee.emp_id) {
    if (!orgId) return { success: false, error: "Not linked to company" };

    const canView = await hasPermission(
      auth.employee.emp_id,
      orgId,
      PERMISSIONS.LEAVE_APPROVE_ALL
    );
    if (!canView) {
      const teamMembers = await getTeamMembers(auth.employee.emp_id, orgId);
      if (!teamMembers.includes(targetEmpId)) {
        return {
          success: false,
          error: "Not authorized to view this employee's balance",
        };
      }
    }
  }

  const currentYear = new Date().getFullYear();

  // Get existing balances
  const balances = await prisma.leaveBalance.findMany({
    where: { emp_id: empId, year: currentYear },
  });

  // Get company leave types for context
  const leaveTypes = orgId
    ? await prisma.leaveType.findMany({
        where: { company_id: orgId, is_active: true },
        orderBy: { sort_order: "asc" },
      })
    : [];

  // Merge balances with leave type info
  const result = leaveTypes.map((lt) => {
    const balance = balances.find(
      (b) => b.leave_type.toUpperCase() === lt.code.toUpperCase()
    );
    return {
      leave_type: lt.code,
      leave_type_name: lt.name,
      entitled: balance
        ? Number(balance.annual_entitlement)
        : Number(lt.annual_quota),
      carried_forward: balance ? Number(balance.carried_forward) : 0,
      used: balance ? Number(balance.used_days) : 0,
      pending: balance ? Number(balance.pending_days) : 0,
      remaining: balance
        ? Number(balance.annual_entitlement) +
          Number(balance.carried_forward) -
          Number(balance.used_days) -
          Number(balance.pending_days)
        : Number(lt.annual_quota),
      is_paid: lt.is_paid,
      color: lt.color,
    };
  });

  return { success: true, balances: result };
}

// ============================================================================
// QUERY: TEAM LEAVE CALENDAR
// ============================================================================

/**
 * Get team leave calendar for a date range.
 * Shows who is on leave when, for team/department/company based on scope.
 */
export async function getTeamLeaveCalendar(
  startDate: string,
  endDate: string
): Promise<{
  success: boolean;
  error?: string;
  entries?: any[];
}> {
  const auth = await getAuthEmployee();
  if (!auth.success) return { success: false, error: auth.error };

  const actor = auth.employee;
  if (!actor.org_id) return { success: false, error: "Not linked to company" };

  const scope = getAccessScope(actor);

  let empFilter: any = { org_id: actor.org_id, is_active: true, deleted_at: null };

  if (scope === "team") {
    const teamMembers = await getTeamMembers(actor.emp_id, actor.org_id);
    // Include self
    empFilter.emp_id = { in: [actor.emp_id, ...teamMembers] };
  } else if (scope === "self") {
    empFilter.emp_id = actor.emp_id;
  }
  // scope === "company" = no additional filter

  const leaves = await prisma.leaveRequest.findMany({
    where: {
      status: "approved",
      deleted_at: null,
      start_date: { lte: new Date(endDate) },
      end_date: { gte: new Date(startDate) },
      employee: empFilter,
    },
    include: {
      employee: {
        select: {
          emp_id: true,
          full_name: true,
          department: true,
          designation: true,
        },
      },
    },
    orderBy: { start_date: "asc" },
  });

  return {
    success: true,
    entries: leaves.map((l) => ({
      request_id: l.request_id,
      employee: l.employee,
      leave_type: l.leave_type,
      start_date: l.start_date,
      end_date: l.end_date,
      total_days: Number(l.total_days),
      is_half_day: l.is_half_day,
    })),
  };
}
