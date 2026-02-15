"use server";

import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/supabase/server";
import { UserRole } from "@prisma/client";
import { getEffectiveRoles, hasRole, hasPermission, hasAnyPermission, type PermissionCode } from "@/lib/rbac";

// ============================================================================
// TYPES
// ============================================================================

export type AuthEmployee = {
  emp_id: string;
  full_name: string;
  email: string;
  department: string | null;
  designation: string | null;
  role: UserRole;
  primary_role: UserRole;
  secondary_roles: unknown;
  org_id: string | null;
  org_unit_id: number | null;
  manager_id: string | null;
  status: string;
  is_active: boolean;
  onboarding_status: string;
  onboarding_completed: boolean;
  approval_status: string;
};

type AuthSuccess = {
  success: true;
  user: { id: string; email: string };
  employee: AuthEmployee;
};

type AuthFailure = {
  success: false;
  error: string;
  statusCode?: number;
};

export type AuthResult = AuthSuccess | AuthFailure;

// ============================================================================
// CORE AUTH GUARD
// ============================================================================

/**
 * Get the authenticated user and their employee record.
 * Use this as the starting point for all server actions and page data fetching.
 */
export async function getAuthEmployee(): Promise<AuthResult> {
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Unauthorized", statusCode: 401 };
  }

  const employee = await prisma.employee.findUnique({
    where: { clerk_id: user.id },
    select: {
      emp_id: true,
      full_name: true,
      email: true,
      department: true,
      designation: true,
      role: true,
      primary_role: true,
      secondary_roles: true,
      org_id: true,
      org_unit_id: true,
      manager_id: true,
      status: true,
      is_active: true,
      onboarding_status: true,
      onboarding_completed: true,
      approval_status: true,
    },
  });

  if (!employee) {
    return { success: false, error: "Employee not found", statusCode: 404 };
  }

  return {
    success: true,
    user: { id: user.id, email: user.email || "" },
    employee: employee as AuthEmployee,
  };
}

// ============================================================================
// ROLE-BASED GUARDS
// ============================================================================

/**
 * Require the user to have any of the specified roles.
 * Uses both primary_role and secondary_roles (multi-role support).
 */
export async function requireRole(
  allowedRoles: UserRole[]
): Promise<AuthResult> {
  const auth = await getAuthEmployee();
  if (!auth.success) return auth;

  if (!hasRole(auth.employee, allowedRoles)) {
    return {
      success: false,
      error: `Access denied. Required roles: ${allowedRoles.join(", ")}`,
      statusCode: 403,
    };
  }

  return auth;
}

/**
 * Require the user to be HR or Admin.
 */
export async function requireHRAccess(): Promise<AuthResult> {
  return requireRole(["hr", "admin"]);
}

/**
 * Require the user to be a management role (team_lead, manager, director, hr, admin).
 */
export async function requireManagementAccess(): Promise<AuthResult> {
  return requireRole(["team_lead", "manager", "director", "hr", "admin"]);
}

/**
 * Require the user to be admin only.
 */
export async function requireAdminAccess(): Promise<AuthResult> {
  return requireRole(["admin"]);
}

// ============================================================================
// PERMISSION-BASED GUARDS
// ============================================================================

/**
 * Require the user to have a specific RBAC permission.
 * Falls back to default role permissions if company hasn't seeded yet.
 */
export async function requirePermissionGuard(
  permissionCode: PermissionCode
): Promise<AuthResult> {
  const auth = await getAuthEmployee();
  if (!auth.success) return auth;

  if (!auth.employee.org_id) {
    return { success: false, error: "Employee not linked to company", statusCode: 403 };
  }

  const allowed = await hasPermission(
    auth.employee.emp_id,
    auth.employee.org_id,
    permissionCode
  );

  if (!allowed) {
    return {
      success: false,
      error: `Access denied: missing permission '${permissionCode}'`,
      statusCode: 403,
    };
  }

  return auth;
}

/**
 * Require the user to have any of the specified RBAC permissions.
 */
export async function requireAnyPermissionGuard(
  permissionCodes: PermissionCode[]
): Promise<AuthResult> {
  const auth = await getAuthEmployee();
  if (!auth.success) return auth;

  if (!auth.employee.org_id) {
    return { success: false, error: "Employee not linked to company", statusCode: 403 };
  }

  const allowed = await hasAnyPermission(
    auth.employee.emp_id,
    auth.employee.org_id,
    permissionCodes
  );

  if (!allowed) {
    return {
      success: false,
      error: `Access denied: requires one of [${permissionCodes.join(", ")}]`,
      statusCode: 403,
    };
  }

  return auth;
}

// ============================================================================
// COMPANY-SCOPED GUARD
// ============================================================================

/**
 * Require the user to be in a company with active status.
 * Returns the auth result with company guarantee.
 */
export async function requireCompanyAccess(): Promise<
  AuthResult & { companyId?: string }
> {
  const auth = await getAuthEmployee();
  if (!auth.success) return auth;

  if (!auth.employee.org_id) {
    return {
      success: false,
      error: "Employee not linked to company",
      statusCode: 403,
    };
  }

  if (!auth.employee.is_active) {
    return {
      success: false,
      error: "Employee account is deactivated",
      statusCode: 403,
    };
  }

  return { ...auth, companyId: auth.employee.org_id };
}

// ============================================================================
// HELPER: Check management scope
// ============================================================================

/**
 * Get the role-based scope for the current user.
 * - employee: self only
 * - team_lead/manager: their team members
 * - director: their division
 * - hr/admin: entire company
 */
export function getAccessScope(employee: AuthEmployee): "self" | "team" | "company" {
  const roles = getEffectiveRoles(employee);

  if (roles.includes("admin") || roles.includes("hr")) {
    return "company";
  }
  if (roles.includes("team_lead") || roles.includes("manager") || roles.includes("director")) {
    return "team";
  }
  return "self";
}
