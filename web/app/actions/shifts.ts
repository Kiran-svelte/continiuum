"use server";

import { prisma } from "@/lib/prisma";
import { ShiftType } from "@prisma/client";
import { requireHRAccess, requireCompanyAccess } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/rbac";
import { requirePermissionGuard } from "@/lib/auth-guard";
import { revalidatePath } from "next/cache";

// ============================================================================
// SHIFT CRUD
// ============================================================================

/**
 * Create a new shift for the company
 */
export async function createShift(data: {
  name: string;
  code: string;
  type: ShiftType;
  start_time: string;
  end_time: string;
  break_minutes?: number;
  grace_minutes?: number;
  is_overnight?: boolean;
  is_default?: boolean;
}) {
  const auth = await requirePermissionGuard(PERMISSIONS.COMPANY_MANAGE_SHIFTS);
  if (!auth.success) return auth;

  const orgId = auth.employee.org_id;
  if (!orgId) return { success: false, error: "Not linked to company" };

  // Validate time format
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  if (!timeRegex.test(data.start_time) || !timeRegex.test(data.end_time)) {
    return { success: false, error: "Invalid time format. Use HH:MM (e.g., 09:00)" };
  }

  // Check unique code per company
  const existing = await prisma.shift.findUnique({
    where: { company_id_code: { company_id: orgId, code: data.code } },
  });
  if (existing) {
    return { success: false, error: `Shift code "${data.code}" already exists` };
  }

  // If this is the new default, unset any existing default
  if (data.is_default) {
    await prisma.shift.updateMany({
      where: { company_id: orgId, is_default: true },
      data: { is_default: false },
    });
  }

  const shift = await prisma.shift.create({
    data: {
      company_id: orgId,
      name: data.name,
      code: data.code,
      type: data.type,
      start_time: data.start_time,
      end_time: data.end_time,
      break_minutes: data.break_minutes ?? 60,
      grace_minutes: data.grace_minutes ?? 15,
      is_overnight: data.is_overnight ?? false,
      is_default: data.is_default ?? false,
    },
  });

  revalidatePath("/hr/shifts");
  return { success: true, shift };
}

/**
 * Update a shift
 */
export async function updateShift(
  shiftId: string,
  data: {
    name?: string;
    type?: ShiftType;
    start_time?: string;
    end_time?: string;
    break_minutes?: number;
    grace_minutes?: number;
    is_overnight?: boolean;
    is_default?: boolean;
    is_active?: boolean;
  }
) {
  const auth = await requirePermissionGuard(PERMISSIONS.COMPANY_MANAGE_SHIFTS);
  if (!auth.success) return auth;

  const orgId = auth.employee.org_id;
  if (!orgId) return { success: false, error: "Not linked to company" };

  // Verify shift belongs to same company
  const existing = await prisma.shift.findUnique({
    where: { id: shiftId },
  });
  if (!existing || existing.company_id !== orgId) {
    return { success: false, error: "Shift not found" };
  }

  // If setting as default, unset existing
  if (data.is_default) {
    await prisma.shift.updateMany({
      where: { company_id: orgId, is_default: true, id: { not: shiftId } },
      data: { is_default: false },
    });
  }

  const shift = await prisma.shift.update({
    where: { id: shiftId },
    data,
  });

  revalidatePath("/hr/shifts");
  return { success: true, shift };
}

/**
 * Soft delete a shift
 */
export async function deleteShift(shiftId: string) {
  const auth = await requirePermissionGuard(PERMISSIONS.COMPANY_MANAGE_SHIFTS);
  if (!auth.success) return auth;

  // Check no active employee assignments
  const assignmentCount = await prisma.employeeShift.count({
    where: { shift_id: shiftId, is_active: true },
  });
  if (assignmentCount > 0) {
    return {
      success: false,
      error: `Cannot delete: ${assignmentCount} employee(s) are assigned to this shift. Reassign them first.`,
    };
  }

  await prisma.shift.update({
    where: { id: shiftId },
    data: { is_active: false, deleted_at: new Date() },
  });

  revalidatePath("/hr/shifts");
  return { success: true };
}

/**
 * Get all shifts for the company
 */
export async function getCompanyShifts() {
  const auth = await requireCompanyAccess();
  if (!auth.success) return auth;

  const orgId = auth.companyId!;

  const shifts = await prisma.shift.findMany({
    where: { company_id: orgId, is_active: true, deleted_at: null },
    orderBy: [{ is_default: "desc" }, { name: "asc" }],
  });

  // Get employee count per shift
  const shiftIds = shifts.map((s) => s.id);
  const assignments = await prisma.employeeShift.groupBy({
    by: ["shift_id"],
    where: { shift_id: { in: shiftIds }, is_active: true },
    _count: { emp_id: true },
  });
  const countMap = new Map(
    assignments.map((a) => [a.shift_id, a._count.emp_id])
  );

  return {
    success: true,
    shifts: shifts.map((s) => ({
      ...s,
      employee_count: countMap.get(s.id) || 0,
    })),
  };
}

// ============================================================================
// EMPLOYEE SHIFT ASSIGNMENT
// ============================================================================

/**
 * Assign a shift to an employee
 */
export async function assignShift(
  empId: string,
  shiftId: string,
  effectiveFrom: Date,
  effectiveTo?: Date
) {
  const auth = await requirePermissionGuard(PERMISSIONS.COMPANY_MANAGE_SHIFTS);
  if (!auth.success) return auth;

  // Verify employee and shift exist
  const [employee, shift] = await Promise.all([
    prisma.employee.findUnique({
      where: { emp_id: empId },
      select: { org_id: true },
    }),
    prisma.shift.findUnique({
      where: { id: shiftId },
      select: { company_id: true },
    }),
  ]);

  if (!employee) return { success: false, error: "Employee not found" };
  if (!shift) return { success: false, error: "Shift not found" };
  if (employee.org_id !== shift.company_id) {
    return { success: false, error: "Shift does not belong to employee's company" };
  }

  // Deactivate any current active shift assignment for this employee
  await prisma.employeeShift.updateMany({
    where: { emp_id: empId, is_active: true },
    data: { is_active: false, effective_to: effectiveFrom },
  });

  // Create new assignment
  const assignment = await prisma.employeeShift.create({
    data: {
      emp_id: empId,
      shift_id: shiftId,
      effective_from: effectiveFrom,
      effective_to: effectiveTo || null,
      is_active: true,
    },
  });

  revalidatePath("/hr/shifts");
  return { success: true, assignment };
}

/**
 * Bulk assign a shift to multiple employees
 */
export async function bulkAssignShift(
  empIds: string[],
  shiftId: string,
  effectiveFrom: Date
) {
  const auth = await requirePermissionGuard(PERMISSIONS.COMPANY_MANAGE_SHIFTS);
  if (!auth.success) return auth;

  if (empIds.length === 0) {
    return { success: false, error: "No employees specified" };
  }

  const shift = await prisma.shift.findUnique({ where: { id: shiftId } });
  if (!shift) return { success: false, error: "Shift not found" };

  let assignedCount = 0;
  for (const empId of empIds) {
    // Deactivate current assignments
    await prisma.employeeShift.updateMany({
      where: { emp_id: empId, is_active: true },
      data: { is_active: false, effective_to: effectiveFrom },
    });

    await prisma.employeeShift.create({
      data: {
        emp_id: empId,
        shift_id: shiftId,
        effective_from: effectiveFrom,
        is_active: true,
      },
    });

    assignedCount++;
  }

  revalidatePath("/hr/shifts");
  return {
    success: true,
    message: `Shift assigned to ${assignedCount} employee(s)`,
  };
}

/**
 * Get active shift assignments for an employee
 */
export async function getEmployeeShiftHistory(empId: string) {
  const auth = await requireCompanyAccess();
  if (!auth.success) return auth;

  const assignments = await prisma.employeeShift.findMany({
    where: { emp_id: empId },
    include: {
      shift: {
        select: {
          id: true,
          name: true,
          code: true,
          type: true,
          start_time: true,
          end_time: true,
        },
      },
    },
    orderBy: { effective_from: "desc" },
  });

  return { success: true, assignments };
}
