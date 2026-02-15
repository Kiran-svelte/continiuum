"use server";

import { prisma } from "@/lib/prisma";
import { EmployeeStatus, UserRole, MovementType } from "@prisma/client";
import { requireHRAccess, requireAdminAccess, requireCompanyAccess, getAuthEmployee } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/rbac";
import { requirePermissionGuard } from "@/lib/auth-guard";
import { revalidatePath } from "next/cache";

// ============================================================================
// STATUS TRANSITIONS
// Valid transitions for the employee lifecycle state machine
// ============================================================================

const VALID_TRANSITIONS: Record<EmployeeStatus, EmployeeStatus[]> = {
  onboarding: ["probation", "active"],
  probation: ["active", "terminated"],
  active: ["on_notice", "suspended", "terminated"],
  on_notice: ["exited", "active"],
  suspended: ["active", "terminated"],
  terminated: [],
  resigned: ["on_notice", "exited"],
  exited: [],
};

// ============================================================================
// STATUS MACHINE
// ============================================================================

/**
 * Transition an employee's status with full validation and audit trail
 */
export async function transitionEmployeeStatus(
  empId: string,
  newStatus: EmployeeStatus,
  reason?: string,
  effectiveDate?: Date
) {
  const auth = await requireHRAccess();
  if (!auth.success) return auth;

  const employee = await prisma.employee.findUnique({
    where: { emp_id: empId },
    select: { emp_id: true, full_name: true, status: true, org_id: true },
  });

  if (!employee) return { success: false, error: "Employee not found" };

  // Validate transition
  const currentStatus = employee.status;
  const allowed = VALID_TRANSITIONS[currentStatus];
  if (!allowed.includes(newStatus)) {
    return {
      success: false,
      error: `Invalid transition: ${currentStatus} -> ${newStatus}. Allowed: ${allowed.join(", ") || "none"}`,
    };
  }

  const effectiveDt = effectiveDate || new Date();

  await prisma.$transaction([
    // Update employee status
    prisma.employee.update({
      where: { emp_id: empId },
      data: { status: newStatus },
    }),
    // Log status history
    prisma.employeeStatusHistory.create({
      data: {
        emp_id: empId,
        from_status: currentStatus,
        to_status: newStatus,
        reason: reason || null,
        changed_by: auth.employee.emp_id,
        effective_date: effectiveDt,
      },
    }),
  ]);

  revalidatePath("/hr/employees");
  return { success: true, from: currentStatus, to: newStatus };
}

// ============================================================================
// PROBATION MANAGEMENT
// ============================================================================

/**
 * Confirm an employee's probation - transition to active
 */
export async function confirmProbation(empId: string) {
  const auth = await requireHRAccess();
  if (!auth.success) return auth;

  const employee = await prisma.employee.findUnique({
    where: { emp_id: empId },
    select: { status: true, probation_end_date: true },
  });

  if (!employee) return { success: false, error: "Employee not found" };
  if (employee.status !== "probation") {
    return { success: false, error: `Employee is not on probation (current: ${employee.status})` };
  }

  await prisma.$transaction([
    prisma.employee.update({
      where: { emp_id: empId },
      data: {
        status: "active",
        probation_confirmed: true,
      },
    }),
    prisma.employeeStatusHistory.create({
      data: {
        emp_id: empId,
        from_status: "probation",
        to_status: "active",
        reason: "Probation confirmed",
        changed_by: auth.employee.emp_id,
        effective_date: new Date(),
      },
    }),
  ]);

  revalidatePath("/hr/employees");
  return { success: true };
}

/**
 * Extend an employee's probation period
 */
export async function extendProbation(empId: string, newEndDate: Date, reason: string) {
  const auth = await requireHRAccess();
  if (!auth.success) return auth;

  const employee = await prisma.employee.findUnique({
    where: { emp_id: empId },
    select: { status: true, probation_end_date: true },
  });

  if (!employee) return { success: false, error: "Employee not found" };
  if (employee.status !== "probation") {
    return { success: false, error: "Employee is not on probation" };
  }

  await prisma.employee.update({
    where: { emp_id: empId },
    data: { probation_end_date: newEndDate },
  });

  revalidatePath("/hr/employees");
  return { success: true };
}

/**
 * Get employees whose probation is ending within the next N days
 */
export async function getProbationDue(daysAhead: number = 30) {
  const auth = await requireHRAccess();
  if (!auth.success) return auth;

  const now = new Date();
  const future = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

  const employees = await prisma.employee.findMany({
    where: {
      org_id: auth.employee.org_id,
      status: "probation",
      is_active: true,
      deleted_at: null,
      probation_end_date: {
        lte: future,
        gte: now,
      },
    },
    select: {
      emp_id: true,
      full_name: true,
      email: true,
      department: true,
      designation: true,
      hire_date: true,
      probation_end_date: true,
    },
    orderBy: { probation_end_date: "asc" },
  });

  return { success: true, employees };
}

// ============================================================================
// RESIGNATION & EXIT
// ============================================================================

/**
 * Submit resignation (by employee)
 */
export async function submitResignation(
  lastWorkingDate: Date,
  reason: string
) {
  const auth = await getAuthEmployee();
  if (!auth.success) return auth;

  const employee = await prisma.employee.findUnique({
    where: { emp_id: auth.employee.emp_id },
    select: {
      status: true,
      notice_period_days: true,
      company: { select: { notice_period_days: true } },
    },
  });

  if (!employee) return { success: false, error: "Employee not found" };
  if (employee.status !== "active") {
    return { success: false, error: `Cannot resign from status: ${employee.status}` };
  }

  // Validate notice period
  const noticeDays = employee.notice_period_days || employee.company?.notice_period_days || 30;
  const minLastWorkingDate = new Date();
  minLastWorkingDate.setDate(minLastWorkingDate.getDate() + noticeDays);

  if (lastWorkingDate < minLastWorkingDate) {
    return {
      success: false,
      error: `Last working date must be at least ${noticeDays} days from today (${minLastWorkingDate.toLocaleDateString()})`,
    };
  }

  await prisma.$transaction([
    prisma.employee.update({
      where: { emp_id: auth.employee.emp_id },
      data: {
        status: "on_notice",
        resignation_date: new Date(),
        last_working_date: lastWorkingDate,
      },
    }),
    prisma.employeeStatusHistory.create({
      data: {
        emp_id: auth.employee.emp_id,
        from_status: "active",
        to_status: "on_notice",
        reason: reason,
        changed_by: auth.employee.emp_id,
        effective_date: new Date(),
      },
    }),
  ]);

  revalidatePath("/employee/dashboard");
  return { success: true, lastWorkingDate, noticeDays };
}

/**
 * Process exit - create exit checklist
 */
export async function initiateExit(empId: string) {
  const auth = await requireHRAccess();
  if (!auth.success) return auth;

  const employee = await prisma.employee.findUnique({
    where: { emp_id: empId },
    select: { status: true },
  });

  if (!employee) return { success: false, error: "Employee not found" };
  if (!["on_notice", "terminated"].includes(employee.status)) {
    return { success: false, error: "Employee must be on notice or terminated to initiate exit" };
  }

  // Check if checklist already exists
  const existing = await prisma.exitChecklist.findUnique({
    where: { emp_id: empId },
  });

  if (existing) {
    return { success: true, checklist: existing, message: "Exit checklist already exists" };
  }

  const checklist = await prisma.exitChecklist.create({
    data: {
      emp_id: empId,
      processed_by: auth.employee.emp_id,
    },
  });

  revalidatePath("/hr/exits");
  return { success: true, checklist };
}

/**
 * Update exit checklist item
 */
export async function updateExitChecklistItem(
  empId: string,
  item: string,
  completed: boolean
) {
  const auth = await requireHRAccess();
  if (!auth.success) return auth;

  const validItems = [
    "equipment_returned",
    "id_card_returned",
    "knowledge_transfer",
    "pending_leaves_settled",
    "final_settlement_done",
    "exit_interview_done",
    "access_revoked",
    "documents_collected",
  ];

  if (!validItems.includes(item)) {
    return { success: false, error: `Invalid checklist item: ${item}` };
  }

  await prisma.exitChecklist.update({
    where: { emp_id: empId },
    data: { [item]: completed },
  });

  revalidatePath("/hr/exits");
  return { success: true };
}

/**
 * Complete the exit process
 */
export async function completeExit(empId: string) {
  const auth = await requireHRAccess();
  if (!auth.success) return auth;

  const checklist = await prisma.exitChecklist.findUnique({
    where: { emp_id: empId },
  });

  if (!checklist) return { success: false, error: "Exit checklist not found" };

  // Verify all items are completed
  const requiredItems = [
    checklist.equipment_returned,
    checklist.id_card_returned,
    checklist.knowledge_transfer,
    checklist.pending_leaves_settled,
    checklist.access_revoked,
  ];

  const allComplete = requiredItems.every(Boolean);
  if (!allComplete) {
    return { success: false, error: "Not all required exit items are completed" };
  }

  await prisma.$transaction([
    prisma.exitChecklist.update({
      where: { emp_id: empId },
      data: { completed_at: new Date() },
    }),
    prisma.employee.update({
      where: { emp_id: empId },
      data: {
        status: "exited",
        exit_date: new Date(),
        is_active: false,
      },
    }),
    prisma.employeeStatusHistory.create({
      data: {
        emp_id: empId,
        from_status: "on_notice",
        to_status: "exited",
        reason: "Exit process completed",
        changed_by: auth.employee.emp_id,
        effective_date: new Date(),
      },
    }),
  ]);

  revalidatePath("/hr/exits");
  revalidatePath("/hr/employees");
  return { success: true };
}

/**
 * Get exit checklist for an employee
 */
export async function getExitChecklist(empId: string) {
  const auth = await requireHRAccess();
  if (!auth.success) return auth;

  const checklist = await prisma.exitChecklist.findUnique({
    where: { emp_id: empId },
  });

  const employee = await prisma.employee.findUnique({
    where: { emp_id: empId },
    select: {
      emp_id: true,
      full_name: true,
      email: true,
      department: true,
      designation: true,
      resignation_date: true,
      last_working_date: true,
      status: true,
    },
  });

  return { success: true, checklist, employee };
}

// ============================================================================
// PROMOTIONS & TRANSFERS
// ============================================================================

/**
 * Initiate an employee movement (promotion, transfer, role change, etc.)
 */
export async function initiateMovement(
  empId: string,
  type: MovementType,
  changes: {
    to_department?: string;
    to_designation?: string;
    to_role?: UserRole;
    to_org_unit_id?: number;
    to_manager_id?: string;
    reason: string;
    effective_date: Date;
  }
) {
  const auth = await requireHRAccess();
  if (!auth.success) return auth;

  const employee = await prisma.employee.findUnique({
    where: { emp_id: empId },
    select: {
      department: true,
      designation: true,
      primary_role: true,
      org_unit_id: true,
      manager_id: true,
    },
  });

  if (!employee) return { success: false, error: "Employee not found" };

  const movement = await prisma.employeeMovement.create({
    data: {
      emp_id: empId,
      type,
      from_department: employee.department,
      from_designation: employee.designation,
      from_role: employee.primary_role,
      from_org_unit_id: employee.org_unit_id,
      from_manager_id: employee.manager_id,
      to_department: changes.to_department || null,
      to_designation: changes.to_designation || null,
      to_role: changes.to_role || null,
      to_org_unit_id: changes.to_org_unit_id || null,
      to_manager_id: changes.to_manager_id || null,
      reason: changes.reason,
      effective_date: changes.effective_date,
      status: "pending",
    },
  });

  revalidatePath("/hr/employees");
  return { success: true, movement };
}

/**
 * Approve an employee movement and apply changes
 */
export async function approveMovement(movementId: string) {
  const auth = await requireAdminAccess();
  if (!auth.success) return auth;

  const movement = await prisma.employeeMovement.findUnique({
    where: { id: movementId },
  });

  if (!movement) return { success: false, error: "Movement not found" };
  if (movement.status !== "pending") {
    return { success: false, error: `Movement is already ${movement.status}` };
  }

  // Build the update data
  const updateData: any = {};
  if (movement.to_department) updateData.department = movement.to_department;
  if (movement.to_designation) updateData.designation = movement.to_designation;
  if (movement.to_role) {
    updateData.primary_role = movement.to_role;
    updateData.role = movement.to_role; // backward compat
  }
  if (movement.to_org_unit_id) updateData.org_unit_id = movement.to_org_unit_id;
  if (movement.to_manager_id) updateData.manager_id = movement.to_manager_id;

  await prisma.$transaction([
    prisma.employeeMovement.update({
      where: { id: movementId },
      data: {
        status: "approved",
        approved_by: auth.employee.emp_id,
        approved_at: new Date(),
      },
    }),
    prisma.employee.update({
      where: { emp_id: movement.emp_id },
      data: updateData,
    }),
  ]);

  revalidatePath("/hr/employees");
  return { success: true };
}

/**
 * Reject an employee movement
 */
export async function rejectMovement(movementId: string, reason: string) {
  const auth = await requireHRAccess();
  if (!auth.success) return auth;

  await prisma.employeeMovement.update({
    where: { id: movementId },
    data: { status: "rejected" },
  });

  revalidatePath("/hr/employees");
  return { success: true };
}

/**
 * Get employee status history
 */
export async function getEmployeeStatusHistory(empId: string) {
  const auth = await requireHRAccess();
  if (!auth.success) return auth;

  const history = await prisma.employeeStatusHistory.findMany({
    where: { emp_id: empId },
    orderBy: { effective_date: "desc" },
  });

  const movements = await prisma.employeeMovement.findMany({
    where: { emp_id: empId },
    orderBy: { effective_date: "desc" },
  });

  return { success: true, history, movements };
}

/**
 * Get all pending movements for the company
 */
export async function getPendingMovements() {
  const auth = await requireHRAccess();
  if (!auth.success) return auth;

  const movements = await prisma.employeeMovement.findMany({
    where: { status: "pending" },
    include: {
      employee: {
        select: {
          full_name: true,
          email: true,
          department: true,
          designation: true,
          primary_role: true,
        },
      },
    },
    orderBy: { created_at: "desc" },
  });

  return { success: true, movements };
}

/**
 * Get employees pending exit processing
 */
export async function getExitQueue() {
  const auth = await requireHRAccess();
  if (!auth.success) return auth;

  const employees = await prisma.employee.findMany({
    where: {
      org_id: auth.employee.org_id,
      status: { in: ["on_notice", "terminated"] },
      is_active: true,
    },
    select: {
      emp_id: true,
      full_name: true,
      email: true,
      department: true,
      designation: true,
      status: true,
      resignation_date: true,
      last_working_date: true,
      exit_checklist: true,
    },
    orderBy: { last_working_date: "asc" },
  });

  return { success: true, employees };
}
