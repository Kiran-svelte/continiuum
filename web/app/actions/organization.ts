"use server";

import { prisma } from "@/lib/prisma";
import { UnitType } from "@prisma/client";
import { requireHRAccess, requireManagementAccess, requireCompanyAccess } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/rbac";
import { requirePermissionGuard } from "@/lib/auth-guard";
import { revalidatePath } from "next/cache";

// ============================================================================
// ORG UNIT CRUD
// ============================================================================

/**
 * Get the full organization tree for a company
 */
export async function getOrgTree(companyId?: string) {
  const auth = await requireCompanyAccess();
  if (!auth.success) return auth;

  const targetCompanyId = companyId || auth.companyId!;

  const units = await prisma.organizationUnit.findMany({
    where: {
      company_id: targetCompanyId,
      is_active: true,
      deleted_at: null,
    },
    orderBy: [{ unit_type: "asc" }, { unit_name: "asc" }],
  });

  // Fetch heads info
  const headIds = units.map((u) => u.head_emp_id).filter(Boolean) as string[];
  const heads = headIds.length > 0
    ? await prisma.employee.findMany({
        where: { emp_id: { in: headIds } },
        select: { emp_id: true, full_name: true, designation: true, email: true },
      })
    : [];
  const headMap = new Map(heads.map((h) => [h.emp_id, h]));

  // Fetch employee counts per unit
  const employeeCounts = await prisma.employee.groupBy({
    by: ["org_unit_id"],
    where: {
      org_id: targetCompanyId,
      is_active: true,
      deleted_at: null,
      org_unit_id: { not: null },
    },
    _count: { emp_id: true },
  });
  const countMap = new Map(
    employeeCounts.map((c) => [c.org_unit_id, c._count.emp_id])
  );

  // Build tree structure
  const unitMap = new Map(
    units.map((u) => [
      u.unit_id,
      {
        ...u,
        head: u.head_emp_id ? headMap.get(u.head_emp_id) || null : null,
        employee_count: countMap.get(u.unit_id) || 0,
        children: [] as any[],
      },
    ])
  );

  const roots: any[] = [];
  for (const unit of unitMap.values()) {
    if (unit.parent_unit_id && unitMap.has(unit.parent_unit_id)) {
      unitMap.get(unit.parent_unit_id)!.children.push(unit);
    } else {
      roots.push(unit);
    }
  }

  return { success: true, tree: roots, flatList: Array.from(unitMap.values()) };
}

/**
 * Create a new organization unit (department, team, etc.)
 */
export async function createOrgUnit(data: {
  unit_name: string;
  unit_code: string;
  unit_type: UnitType;
  parent_unit_id?: number;
  head_emp_id?: string;
  location?: string;
  cost_center?: string;
}) {
  const auth = await requirePermissionGuard(PERMISSIONS.COMPANY_MANAGE_DEPARTMENTS);
  if (!auth.success) return auth;

  // Validate unique code
  const existing = await prisma.organizationUnit.findUnique({
    where: { unit_code: data.unit_code },
  });
  if (existing) {
    return { success: false, error: `Unit code "${data.unit_code}" already exists` };
  }

  // Validate parent exists if specified
  if (data.parent_unit_id) {
    const parent = await prisma.organizationUnit.findUnique({
      where: { unit_id: data.parent_unit_id },
    });
    if (!parent) {
      return { success: false, error: "Parent unit not found" };
    }
  }

  const unit = await prisma.organizationUnit.create({
    data: {
      unit_name: data.unit_name,
      unit_code: data.unit_code,
      unit_type: data.unit_type,
      parent_unit_id: data.parent_unit_id || null,
      head_emp_id: data.head_emp_id || null,
      company_id: auth.employee.org_id,
      location: data.location || null,
      cost_center: data.cost_center || null,
    },
  });

  revalidatePath("/hr/organization");
  return { success: true, unit };
}

/**
 * Update an organization unit
 */
export async function updateOrgUnit(
  unitId: number,
  data: {
    unit_name?: string;
    unit_type?: UnitType;
    parent_unit_id?: number | null;
    head_emp_id?: string | null;
    location?: string | null;
    cost_center?: string | null;
  }
) {
  const auth = await requirePermissionGuard(PERMISSIONS.COMPANY_MANAGE_DEPARTMENTS);
  if (!auth.success) return auth;

  // Prevent circular parent reference
  if (data.parent_unit_id === unitId) {
    return { success: false, error: "Cannot set unit as its own parent" };
  }

  const unit = await prisma.organizationUnit.update({
    where: { unit_id: unitId },
    data,
  });

  revalidatePath("/hr/organization");
  return { success: true, unit };
}

/**
 * Soft delete an organization unit
 */
export async function deleteOrgUnit(unitId: number) {
  const auth = await requirePermissionGuard(PERMISSIONS.COMPANY_MANAGE_DEPARTMENTS);
  if (!auth.success) return auth;

  // Check no employees are assigned
  const employeeCount = await prisma.employee.count({
    where: { org_unit_id: unitId, is_active: true, deleted_at: null },
  });
  if (employeeCount > 0) {
    return {
      success: false,
      error: `Cannot delete: ${employeeCount} employee(s) are still assigned to this unit. Reassign them first.`,
    };
  }

  // Check no child units
  const childCount = await prisma.organizationUnit.count({
    where: { parent_unit_id: unitId, is_active: true, deleted_at: null },
  });
  if (childCount > 0) {
    return {
      success: false,
      error: `Cannot delete: ${childCount} child unit(s) exist. Delete or move them first.`,
    };
  }

  await prisma.organizationUnit.update({
    where: { unit_id: unitId },
    data: { is_active: false, deleted_at: new Date() },
  });

  revalidatePath("/hr/organization");
  return { success: true };
}

/**
 * Assign an employee to an organization unit
 */
export async function assignEmployeeToUnit(empId: string, unitId: number) {
  const auth = await requirePermissionGuard(PERMISSIONS.COMPANY_MANAGE_DEPARTMENTS);
  if (!auth.success) return auth;

  // Verify unit exists
  const unit = await prisma.organizationUnit.findUnique({
    where: { unit_id: unitId },
    select: { unit_id: true, unit_name: true, company_id: true },
  });
  if (!unit) return { success: false, error: "Unit not found" };

  // Record movement
  const employee = await prisma.employee.findUnique({
    where: { emp_id: empId },
    select: { org_unit_id: true, department: true },
  });

  await prisma.$transaction([
    prisma.employee.update({
      where: { emp_id: empId },
      data: { org_unit_id: unitId },
    }),
    prisma.employeeMovement.create({
      data: {
        emp_id: empId,
        type: "department_change",
        from_org_unit_id: employee?.org_unit_id || null,
        to_org_unit_id: unitId,
        from_department: employee?.department || null,
        to_department: unit.unit_name,
        reason: "Unit assignment",
        effective_date: new Date(),
        approved_by: auth.employee.emp_id,
        approved_at: new Date(),
        status: "approved",
      },
    }),
  ]);

  revalidatePath("/hr/organization");
  revalidatePath("/hr/employees");
  return { success: true };
}

/**
 * Set the head of an organization unit
 */
export async function setUnitHead(unitId: number, empId: string) {
  const auth = await requirePermissionGuard(PERMISSIONS.COMPANY_MANAGE_DEPARTMENTS);
  if (!auth.success) return auth;

  await prisma.organizationUnit.update({
    where: { unit_id: unitId },
    data: { head_emp_id: empId },
  });

  revalidatePath("/hr/organization");
  return { success: true };
}

/**
 * Get all employees in a specific organization unit (and child units)
 */
export async function getUnitMembers(unitId: number, includeChildren: boolean = true) {
  const auth = await requireCompanyAccess();
  if (!auth.success) return auth;

  let unitIds = [unitId];

  if (includeChildren) {
    // Get child units recursively (up to 3 levels)
    let currentIds = [unitId];
    for (let depth = 0; depth < 3; depth++) {
      const children = await prisma.organizationUnit.findMany({
        where: { parent_unit_id: { in: currentIds }, is_active: true, deleted_at: null },
        select: { unit_id: true },
      });
      if (children.length === 0) break;
      const childIds = children.map((c) => c.unit_id);
      unitIds.push(...childIds);
      currentIds = childIds;
    }
  }

  const members = await prisma.employee.findMany({
    where: {
      org_unit_id: { in: unitIds },
      is_active: true,
      deleted_at: null,
    },
    select: {
      emp_id: true,
      full_name: true,
      email: true,
      designation: true,
      department: true,
      primary_role: true,
      status: true,
      org_unit_id: true,
      manager_id: true,
      hire_date: true,
    },
    orderBy: { full_name: "asc" },
  });

  return { success: true, members };
}

// ============================================================================
// REPORTING LINE DERIVATION
// ============================================================================

/**
 * Get the reporting chain for an employee
 * Uses org structure to derive the hierarchy
 */
export async function getReportingChain(empId: string) {
  const auth = await requireCompanyAccess();
  if (!auth.success) return auth;

  const employee = await prisma.employee.findUnique({
    where: { emp_id: empId },
    select: {
      emp_id: true,
      full_name: true,
      designation: true,
      manager_id: true,
      org_unit_id: true,
      primary_role: true,
    },
  });

  if (!employee) return { success: false, error: "Employee not found" };

  const chain: Array<{
    emp_id: string;
    full_name: string;
    designation: string | null;
    role: string;
    level: string;
  }> = [];

  // 1. Direct manager chain
  let currentManagerId = employee.manager_id;
  const visited = new Set<string>();

  while (currentManagerId && !visited.has(currentManagerId)) {
    visited.add(currentManagerId);
    const manager = await prisma.employee.findUnique({
      where: { emp_id: currentManagerId },
      select: {
        emp_id: true,
        full_name: true,
        designation: true,
        primary_role: true,
        manager_id: true,
      },
    });

    if (!manager) break;

    chain.push({
      emp_id: manager.emp_id,
      full_name: manager.full_name,
      designation: manager.designation,
      role: manager.primary_role,
      level: `L${chain.length + 1}`,
    });

    currentManagerId = manager.manager_id;
  }

  // 2. Org unit heads (if not already in chain)
  if (employee.org_unit_id) {
    let currentUnitId: number | null = employee.org_unit_id;
    const checkedUnits = new Set<number>();

    while (currentUnitId && !checkedUnits.has(currentUnitId)) {
      checkedUnits.add(currentUnitId);
      const unit = await prisma.organizationUnit.findUnique({
        where: { unit_id: currentUnitId },
        select: { head_emp_id: true, parent_unit_id: true, unit_name: true, unit_type: true },
      });

      if (!unit) break;

      if (unit.head_emp_id && !visited.has(unit.head_emp_id) && unit.head_emp_id !== empId) {
        visited.add(unit.head_emp_id);
        const head = await prisma.employee.findUnique({
          where: { emp_id: unit.head_emp_id },
          select: { emp_id: true, full_name: true, designation: true, primary_role: true },
        });
        if (head) {
          chain.push({
            emp_id: head.emp_id,
            full_name: head.full_name,
            designation: head.designation,
            role: head.primary_role,
            level: `${unit.unit_type} head`,
          });
        }
      }

      currentUnitId = unit.parent_unit_id;
    }
  }

  return { success: true, employee, chain };
}
