import "server-only";

import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

// ============================================================================
// PERMISSION DEFINITIONS
// All permission codes used across the system
// ============================================================================

export const PERMISSIONS = {
  // Leave module
  LEAVE_VIEW_OWN: "leave.view_own",
  LEAVE_APPLY_OWN: "leave.apply_own",
  LEAVE_VIEW_TEAM: "leave.view_team",
  LEAVE_APPROVE_TEAM: "leave.approve_team",
  LEAVE_APPROVE_DEPARTMENT: "leave.approve_department",
  LEAVE_APPROVE_ALL: "leave.approve_all",
  LEAVE_CANCEL_ANY: "leave.cancel_any",
  LEAVE_ADJUST_BALANCE: "leave.adjust_balance",
  LEAVE_CONFIGURE_POLICY: "leave.configure_policy",
  LEAVE_VIEW_ALL: "leave.view_all",

  // Attendance module
  ATTENDANCE_VIEW_OWN: "attendance.view_own",
  ATTENDANCE_CHECKIN: "attendance.checkin",
  ATTENDANCE_VIEW_TEAM: "attendance.view_team",
  ATTENDANCE_REGULARIZE_OWN: "attendance.regularize_own",
  ATTENDANCE_APPROVE_REGULARIZATION: "attendance.approve_regularization",
  ATTENDANCE_VIEW_ALL: "attendance.view_all",
  ATTENDANCE_OVERRIDE: "attendance.override",

  // Payroll module
  PAYROLL_VIEW_OWN_SLIP: "payroll.view_own_slip",
  PAYROLL_VIEW_TEAM: "payroll.view_team",
  PAYROLL_GENERATE: "payroll.generate",
  PAYROLL_APPROVE: "payroll.approve",
  PAYROLL_PROCESS: "payroll.process",
  PAYROLL_CONFIGURE: "payroll.configure",

  // Employee module
  EMPLOYEE_VIEW_DIRECTORY: "employee.view_directory",
  EMPLOYEE_VIEW_TEAM_DETAILS: "employee.view_team_details",
  EMPLOYEE_VIEW_ALL_DETAILS: "employee.view_all_details",
  EMPLOYEE_EDIT_OWN_PROFILE: "employee.edit_own_profile",
  EMPLOYEE_EDIT_ANY_PROFILE: "employee.edit_any_profile",
  EMPLOYEE_MANAGE_ONBOARDING: "employee.manage_onboarding",
  EMPLOYEE_TERMINATE: "employee.terminate",
  EMPLOYEE_MANAGE_ROLES: "employee.manage_roles",

  // Company module
  COMPANY_VIEW_SETTINGS: "company.view_settings",
  COMPANY_EDIT_SETTINGS: "company.edit_settings",
  COMPANY_MANAGE_DEPARTMENTS: "company.manage_departments",
  COMPANY_MANAGE_SHIFTS: "company.manage_shifts",

  // Reports module
  REPORTS_VIEW_TEAM: "reports.view_team",
  REPORTS_VIEW_ALL: "reports.view_all",
  REPORTS_EXPORT: "reports.export",

  // Audit module
  AUDIT_VIEW: "audit.view",
  AUDIT_EXPORT: "audit.export",

  // Notifications module
  NOTIFICATIONS_CONFIGURE: "notifications.configure",
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// ============================================================================
// DEFAULT ROLE-PERMISSION MAPPING
// Used when seeding permissions for a new company
// ============================================================================

const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, PermissionCode[]> = {
  employee: [
    PERMISSIONS.LEAVE_VIEW_OWN,
    PERMISSIONS.LEAVE_APPLY_OWN,
    PERMISSIONS.ATTENDANCE_VIEW_OWN,
    PERMISSIONS.ATTENDANCE_CHECKIN,
    PERMISSIONS.ATTENDANCE_REGULARIZE_OWN,
    PERMISSIONS.PAYROLL_VIEW_OWN_SLIP,
    PERMISSIONS.EMPLOYEE_VIEW_DIRECTORY,
    PERMISSIONS.EMPLOYEE_EDIT_OWN_PROFILE,
  ],
  team_lead: [
    PERMISSIONS.LEAVE_VIEW_OWN,
    PERMISSIONS.LEAVE_APPLY_OWN,
    PERMISSIONS.LEAVE_VIEW_TEAM,
    PERMISSIONS.LEAVE_APPROVE_TEAM,
    PERMISSIONS.ATTENDANCE_VIEW_OWN,
    PERMISSIONS.ATTENDANCE_CHECKIN,
    PERMISSIONS.ATTENDANCE_VIEW_TEAM,
    PERMISSIONS.ATTENDANCE_REGULARIZE_OWN,
    PERMISSIONS.ATTENDANCE_APPROVE_REGULARIZATION,
    PERMISSIONS.PAYROLL_VIEW_OWN_SLIP,
    PERMISSIONS.EMPLOYEE_VIEW_DIRECTORY,
    PERMISSIONS.EMPLOYEE_VIEW_TEAM_DETAILS,
    PERMISSIONS.EMPLOYEE_EDIT_OWN_PROFILE,
    PERMISSIONS.REPORTS_VIEW_TEAM,
  ],
  manager: [
    PERMISSIONS.LEAVE_VIEW_OWN,
    PERMISSIONS.LEAVE_APPLY_OWN,
    PERMISSIONS.LEAVE_VIEW_TEAM,
    PERMISSIONS.LEAVE_APPROVE_TEAM,
    PERMISSIONS.LEAVE_APPROVE_DEPARTMENT,
    PERMISSIONS.ATTENDANCE_VIEW_OWN,
    PERMISSIONS.ATTENDANCE_CHECKIN,
    PERMISSIONS.ATTENDANCE_VIEW_TEAM,
    PERMISSIONS.ATTENDANCE_REGULARIZE_OWN,
    PERMISSIONS.ATTENDANCE_APPROVE_REGULARIZATION,
    PERMISSIONS.PAYROLL_VIEW_OWN_SLIP,
    PERMISSIONS.EMPLOYEE_VIEW_DIRECTORY,
    PERMISSIONS.EMPLOYEE_VIEW_TEAM_DETAILS,
    PERMISSIONS.EMPLOYEE_EDIT_OWN_PROFILE,
    PERMISSIONS.REPORTS_VIEW_TEAM,
  ],
  director: [
    PERMISSIONS.LEAVE_VIEW_OWN,
    PERMISSIONS.LEAVE_APPLY_OWN,
    PERMISSIONS.LEAVE_VIEW_TEAM,
    PERMISSIONS.LEAVE_APPROVE_TEAM,
    PERMISSIONS.LEAVE_APPROVE_DEPARTMENT,
    PERMISSIONS.ATTENDANCE_VIEW_OWN,
    PERMISSIONS.ATTENDANCE_CHECKIN,
    PERMISSIONS.ATTENDANCE_VIEW_TEAM,
    PERMISSIONS.ATTENDANCE_REGULARIZE_OWN,
    PERMISSIONS.ATTENDANCE_APPROVE_REGULARIZATION,
    PERMISSIONS.PAYROLL_VIEW_OWN_SLIP,
    PERMISSIONS.PAYROLL_VIEW_TEAM,
    PERMISSIONS.EMPLOYEE_VIEW_DIRECTORY,
    PERMISSIONS.EMPLOYEE_VIEW_TEAM_DETAILS,
    PERMISSIONS.EMPLOYEE_EDIT_OWN_PROFILE,
    PERMISSIONS.REPORTS_VIEW_TEAM,
    PERMISSIONS.REPORTS_EXPORT,
  ],
  hr: [
    PERMISSIONS.LEAVE_VIEW_OWN,
    PERMISSIONS.LEAVE_APPLY_OWN,
    PERMISSIONS.LEAVE_VIEW_TEAM,
    PERMISSIONS.LEAVE_APPROVE_ALL,
    PERMISSIONS.LEAVE_CANCEL_ANY,
    PERMISSIONS.LEAVE_ADJUST_BALANCE,
    PERMISSIONS.LEAVE_CONFIGURE_POLICY,
    PERMISSIONS.LEAVE_VIEW_ALL,
    PERMISSIONS.ATTENDANCE_VIEW_OWN,
    PERMISSIONS.ATTENDANCE_CHECKIN,
    PERMISSIONS.ATTENDANCE_VIEW_TEAM,
    PERMISSIONS.ATTENDANCE_REGULARIZE_OWN,
    PERMISSIONS.ATTENDANCE_APPROVE_REGULARIZATION,
    PERMISSIONS.ATTENDANCE_VIEW_ALL,
    PERMISSIONS.ATTENDANCE_OVERRIDE,
    PERMISSIONS.PAYROLL_VIEW_OWN_SLIP,
    PERMISSIONS.PAYROLL_VIEW_TEAM,
    PERMISSIONS.PAYROLL_GENERATE,
    PERMISSIONS.EMPLOYEE_VIEW_DIRECTORY,
    PERMISSIONS.EMPLOYEE_VIEW_TEAM_DETAILS,
    PERMISSIONS.EMPLOYEE_VIEW_ALL_DETAILS,
    PERMISSIONS.EMPLOYEE_EDIT_OWN_PROFILE,
    PERMISSIONS.EMPLOYEE_EDIT_ANY_PROFILE,
    PERMISSIONS.EMPLOYEE_MANAGE_ONBOARDING,
    PERMISSIONS.COMPANY_VIEW_SETTINGS,
    PERMISSIONS.COMPANY_MANAGE_DEPARTMENTS,
    PERMISSIONS.COMPANY_MANAGE_SHIFTS,
    PERMISSIONS.REPORTS_VIEW_ALL,
    PERMISSIONS.REPORTS_EXPORT,
    PERMISSIONS.AUDIT_VIEW,
    PERMISSIONS.NOTIFICATIONS_CONFIGURE,
  ],
  admin: [
    // Admin gets everything
    ...Object.values(PERMISSIONS),
  ],
};

// ============================================================================
// PERMISSION CACHE (in-memory, per-request lifecycle in serverless)
// ============================================================================

const permissionCache = new Map<string, { permissions: Set<string>; timestamp: number }>();
const CACHE_TTL_MS = 60_000; // 1 minute cache

function getCacheKey(empId: string, companyId: string): string {
  return `${empId}:${companyId}`;
}

function clearPermissionCache(empId?: string): void {
  if (empId) {
    // Clear all entries for this employee
    for (const key of permissionCache.keys()) {
      if (key.startsWith(empId + ":")) {
        permissionCache.delete(key);
      }
    }
  } else {
    permissionCache.clear();
  }
}

// ============================================================================
// CORE RBAC FUNCTIONS
// ============================================================================

/**
 * Get all effective roles for an employee (primary + secondary)
 */
export function getEffectiveRoles(employee: {
  primary_role?: UserRole | null;
  role?: UserRole | null;
  secondary_roles?: unknown;
}): UserRole[] {
  const roles = new Set<UserRole>();

  // Add primary role
  const primaryRole = employee.primary_role || employee.role || "employee";
  roles.add(primaryRole as UserRole);

  // Add secondary roles
  if (employee.secondary_roles && Array.isArray(employee.secondary_roles)) {
    for (const r of employee.secondary_roles) {
      if (typeof r === "string" && isValidRole(r)) {
        roles.add(r as UserRole);
      }
    }
  }

  return Array.from(roles);
}

function isValidRole(role: string): boolean {
  return ["employee", "team_lead", "manager", "director", "hr", "admin"].includes(role);
}

/**
 * Get all permissions for an employee in their company
 * Resolves from all effective roles, with company-specific overrides
 */
export async function getUserPermissions(
  empId: string,
  companyId: string
): Promise<Set<string>> {
  // Check cache
  const cacheKey = getCacheKey(empId, companyId);
  const cached = permissionCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.permissions;
  }

  // Fetch employee with roles
  const employee = await prisma.employee.findUnique({
    where: { emp_id: empId },
    select: { primary_role: true, role: true, secondary_roles: true },
  });

  if (!employee) return new Set();

  const effectiveRoles = getEffectiveRoles(employee);

  // Fetch company-specific role permissions
  const rolePermissions = await prisma.rolePermission.findMany({
    where: {
      company_id: companyId,
      role: { in: effectiveRoles },
      granted: true,
    },
    include: { permission: { select: { code: true, is_active: true } } },
  });

  // Build permission set
  const permissions = new Set<string>();

  if (rolePermissions.length > 0) {
    // Use company-specific permissions
    for (const rp of rolePermissions) {
      if (rp.permission.is_active) {
        permissions.add(rp.permission.code);
      }
    }
  } else {
    // Fallback to default permissions (company hasn't been seeded yet)
    for (const role of effectiveRoles) {
      const defaults = DEFAULT_ROLE_PERMISSIONS[role] || [];
      for (const perm of defaults) {
        permissions.add(perm);
      }
    }
  }

  // Cache the result
  permissionCache.set(cacheKey, { permissions, timestamp: Date.now() });

  return permissions;
}

/**
 * Check if employee has a specific permission
 */
export async function hasPermission(
  empId: string,
  companyId: string,
  permissionCode: PermissionCode
): Promise<boolean> {
  const permissions = await getUserPermissions(empId, companyId);
  return permissions.has(permissionCode);
}

/**
 * Check if employee has ANY of the specified permissions
 */
export async function hasAnyPermission(
  empId: string,
  companyId: string,
  permissionCodes: PermissionCode[]
): Promise<boolean> {
  const permissions = await getUserPermissions(empId, companyId);
  return permissionCodes.some((code) => permissions.has(code));
}

/**
 * Check if employee has ALL of the specified permissions
 */
export async function hasAllPermissions(
  empId: string,
  companyId: string,
  permissionCodes: PermissionCode[]
): Promise<boolean> {
  const permissions = await getUserPermissions(empId, companyId);
  return permissionCodes.every((code) => permissions.has(code));
}

/**
 * Require a permission - throws if denied
 */
export async function requirePermission(
  empId: string,
  companyId: string,
  permissionCode: PermissionCode
): Promise<void> {
  const allowed = await hasPermission(empId, companyId, permissionCode);
  if (!allowed) {
    throw new Error(
      `Access denied: missing permission '${permissionCode}'`
    );
  }
}

// ============================================================================
// TEAM/HIERARCHY-BASED ACCESS CHECKS
// ============================================================================

/**
 * Check if actor is the manager (direct or indirect) of the target employee
 */
export async function isManagerOf(
  actorEmpId: string,
  targetEmpId: string,
  maxDepth: number = 4
): Promise<boolean> {
  if (actorEmpId === targetEmpId) return false;

  let currentId: string | null = targetEmpId;
  let depth = 0;

  while (currentId && depth < maxDepth) {
    const emp = await prisma.employee.findUnique({
      where: { emp_id: currentId },
      select: { manager_id: true },
    });

    if (!emp?.manager_id) return false;
    if (emp.manager_id === actorEmpId) return true;

    currentId = emp.manager_id;
    depth++;
  }

  return false;
}

/**
 * Check if actor is the head of the org unit the target belongs to
 */
export async function isOrgUnitHead(
  actorEmpId: string,
  targetEmpId: string
): Promise<boolean> {
  const target = await prisma.employee.findUnique({
    where: { emp_id: targetEmpId },
    select: { org_unit_id: true },
  });

  if (!target?.org_unit_id) return false;

  // Walk up the org tree checking if actor is head at any level
  let currentUnitId: number | null = target.org_unit_id;
  const checkedUnits = new Set<number>();

  while (currentUnitId && !checkedUnits.has(currentUnitId)) {
    checkedUnits.add(currentUnitId);

    const unit = await prisma.organizationUnit.findUnique({
      where: { unit_id: currentUnitId },
      select: { head_emp_id: true, parent_unit_id: true },
    });

    if (!unit) break;
    if (unit.head_emp_id === actorEmpId) return true;

    currentUnitId = unit.parent_unit_id;
  }

  return false;
}

/**
 * Check if actor can access (view/manage) the target employee
 * Based on role hierarchy and org structure
 */
export async function canAccessEmployee(
  actorEmpId: string,
  actorCompanyId: string,
  targetEmpId: string
): Promise<boolean> {
  // Can always access self
  if (actorEmpId === targetEmpId) return true;

  // Check if actor has global access
  const hasGlobalAccess = await hasAnyPermission(actorEmpId, actorCompanyId, [
    PERMISSIONS.EMPLOYEE_VIEW_ALL_DETAILS,
    PERMISSIONS.EMPLOYEE_EDIT_ANY_PROFILE,
  ]);
  if (hasGlobalAccess) return true;

  // Check if actor has team access
  const hasTeamAccess = await hasPermission(
    actorEmpId,
    actorCompanyId,
    PERMISSIONS.EMPLOYEE_VIEW_TEAM_DETAILS
  );
  if (hasTeamAccess) {
    // Verify actor is manager or org unit head of target
    const isManager = await isManagerOf(actorEmpId, targetEmpId);
    if (isManager) return true;

    const isHead = await isOrgUnitHead(actorEmpId, targetEmpId);
    if (isHead) return true;
  }

  return false;
}

/**
 * Get the approval chain for an employee based on org structure
 * Returns the ordered list of approver emp_ids
 */
export async function getApprovalChain(empId: string): Promise<string[]> {
  const chain: string[] = [];
  const visited = new Set<string>();

  const employee = await prisma.employee.findUnique({
    where: { emp_id: empId },
    select: { org_unit_id: true, manager_id: true, org_id: true },
  });

  if (!employee) return chain;

  // Step 1: Direct manager (if exists)
  if (employee.manager_id) {
    chain.push(employee.manager_id);
    visited.add(employee.manager_id);
  }

  // Step 2: Walk up org unit hierarchy and add heads
  if (employee.org_unit_id) {
    let currentUnitId: number | null = employee.org_unit_id;
    const checkedUnits = new Set<number>();

    while (currentUnitId && !checkedUnits.has(currentUnitId)) {
      checkedUnits.add(currentUnitId);

      const unit = await prisma.organizationUnit.findUnique({
        where: { unit_id: currentUnitId },
        select: { head_emp_id: true, parent_unit_id: true, unit_type: true },
      });

      if (!unit) break;

      // Add unit head if not already in chain and not the requesting employee
      if (unit.head_emp_id && !visited.has(unit.head_emp_id) && unit.head_emp_id !== empId) {
        chain.push(unit.head_emp_id);
        visited.add(unit.head_emp_id);
      }

      currentUnitId = unit.parent_unit_id;
    }
  }

  // Step 3: Add HR partner as final approver
  if (employee.org_id) {
    const hrEmployees = await prisma.employee.findMany({
      where: {
        org_id: employee.org_id,
        primary_role: "hr",
        is_active: true,
        deleted_at: null,
      },
      select: { emp_id: true },
      take: 1,
    });

    if (hrEmployees.length > 0 && !visited.has(hrEmployees[0].emp_id)) {
      chain.push(hrEmployees[0].emp_id);
    }
  }

  return chain;
}

/**
 * Get all team members that an employee manages
 * Based on both manager_id and org unit head
 */
export async function getTeamMembers(
  empId: string,
  companyId: string
): Promise<string[]> {
  const memberIds = new Set<string>();

  // Direct reports
  const directReports = await prisma.employee.findMany({
    where: { manager_id: empId, org_id: companyId, is_active: true, deleted_at: null },
    select: { emp_id: true },
  });
  for (const r of directReports) {
    memberIds.add(r.emp_id);
  }

  // Members of org units where this employee is head
  const headedUnits = await prisma.organizationUnit.findMany({
    where: { head_emp_id: empId, company_id: companyId, is_active: true, deleted_at: null },
    select: { unit_id: true },
  });

  if (headedUnits.length > 0) {
    const unitIds = headedUnits.map((u) => u.unit_id);

    // Get all child units recursively (up to 3 levels deep)
    const allUnitIds = [...unitIds];
    let currentIds = unitIds;

    for (let depth = 0; depth < 3; depth++) {
      const children = await prisma.organizationUnit.findMany({
        where: { parent_unit_id: { in: currentIds }, is_active: true, deleted_at: null },
        select: { unit_id: true },
      });

      if (children.length === 0) break;
      const childIds = children.map((c) => c.unit_id);
      allUnitIds.push(...childIds);
      currentIds = childIds;
    }

    // Get all employees in these units
    const unitMembers = await prisma.employee.findMany({
      where: {
        org_unit_id: { in: allUnitIds },
        org_id: companyId,
        is_active: true,
        deleted_at: null,
        emp_id: { not: empId },
      },
      select: { emp_id: true },
    });

    for (const m of unitMembers) {
      memberIds.add(m.emp_id);
    }
  }

  return Array.from(memberIds);
}

// ============================================================================
// PERMISSION SEEDING
// ============================================================================

/**
 * Seed all permissions into the Permission table
 * Should be run once during initial setup
 */
export async function seedPermissions(): Promise<void> {
  const permissionDefinitions: Array<{
    code: string;
    name: string;
    module: string;
    description: string;
  }> = [
    // Leave
    { code: PERMISSIONS.LEAVE_VIEW_OWN, name: "View Own Leave", module: "leave", description: "View own leave requests and balance" },
    { code: PERMISSIONS.LEAVE_APPLY_OWN, name: "Apply Leave", module: "leave", description: "Submit own leave requests" },
    { code: PERMISSIONS.LEAVE_VIEW_TEAM, name: "View Team Leave", module: "leave", description: "View leave for team members" },
    { code: PERMISSIONS.LEAVE_APPROVE_TEAM, name: "Approve Team Leave", module: "leave", description: "Approve leave for direct team" },
    { code: PERMISSIONS.LEAVE_APPROVE_DEPARTMENT, name: "Approve Department Leave", module: "leave", description: "Approve leave for department" },
    { code: PERMISSIONS.LEAVE_APPROVE_ALL, name: "Approve All Leave", module: "leave", description: "Approve leave for any employee" },
    { code: PERMISSIONS.LEAVE_CANCEL_ANY, name: "Cancel Any Leave", module: "leave", description: "Cancel any employee leave" },
    { code: PERMISSIONS.LEAVE_ADJUST_BALANCE, name: "Adjust Leave Balance", module: "leave", description: "Manually adjust leave balances" },
    { code: PERMISSIONS.LEAVE_CONFIGURE_POLICY, name: "Configure Leave Policy", module: "leave", description: "Configure leave types, rules, quotas" },
    { code: PERMISSIONS.LEAVE_VIEW_ALL, name: "View All Leave", module: "leave", description: "View all leave requests across company" },

    // Attendance
    { code: PERMISSIONS.ATTENDANCE_VIEW_OWN, name: "View Own Attendance", module: "attendance", description: "View own attendance records" },
    { code: PERMISSIONS.ATTENDANCE_CHECKIN, name: "Check In/Out", module: "attendance", description: "Mark own attendance" },
    { code: PERMISSIONS.ATTENDANCE_VIEW_TEAM, name: "View Team Attendance", module: "attendance", description: "View attendance for team" },
    { code: PERMISSIONS.ATTENDANCE_REGULARIZE_OWN, name: "Regularize Own Attendance", module: "attendance", description: "Request attendance correction" },
    { code: PERMISSIONS.ATTENDANCE_APPROVE_REGULARIZATION, name: "Approve Regularization", module: "attendance", description: "Approve attendance corrections" },
    { code: PERMISSIONS.ATTENDANCE_VIEW_ALL, name: "View All Attendance", module: "attendance", description: "View attendance across company" },
    { code: PERMISSIONS.ATTENDANCE_OVERRIDE, name: "Override Attendance", module: "attendance", description: "Override attendance records directly" },

    // Payroll
    { code: PERMISSIONS.PAYROLL_VIEW_OWN_SLIP, name: "View Own Payslip", module: "payroll", description: "View own salary slips" },
    { code: PERMISSIONS.PAYROLL_VIEW_TEAM, name: "View Team Payroll", module: "payroll", description: "View payroll for team" },
    { code: PERMISSIONS.PAYROLL_GENERATE, name: "Generate Payroll", module: "payroll", description: "Generate monthly payroll" },
    { code: PERMISSIONS.PAYROLL_APPROVE, name: "Approve Payroll", module: "payroll", description: "Approve generated payroll" },
    { code: PERMISSIONS.PAYROLL_PROCESS, name: "Process Payroll", module: "payroll", description: "Process and disburse payroll" },
    { code: PERMISSIONS.PAYROLL_CONFIGURE, name: "Configure Payroll", module: "payroll", description: "Configure salary components, tax settings" },

    // Employee
    { code: PERMISSIONS.EMPLOYEE_VIEW_DIRECTORY, name: "View Directory", module: "employee", description: "View employee directory" },
    { code: PERMISSIONS.EMPLOYEE_VIEW_TEAM_DETAILS, name: "View Team Details", module: "employee", description: "View detailed profile of team members" },
    { code: PERMISSIONS.EMPLOYEE_VIEW_ALL_DETAILS, name: "View All Details", module: "employee", description: "View all employee details" },
    { code: PERMISSIONS.EMPLOYEE_EDIT_OWN_PROFILE, name: "Edit Own Profile", module: "employee", description: "Edit own profile information" },
    { code: PERMISSIONS.EMPLOYEE_EDIT_ANY_PROFILE, name: "Edit Any Profile", module: "employee", description: "Edit any employee profile" },
    { code: PERMISSIONS.EMPLOYEE_MANAGE_ONBOARDING, name: "Manage Onboarding", module: "employee", description: "Approve/reject employee onboarding" },
    { code: PERMISSIONS.EMPLOYEE_TERMINATE, name: "Terminate Employee", module: "employee", description: "Terminate employee access" },
    { code: PERMISSIONS.EMPLOYEE_MANAGE_ROLES, name: "Manage Roles", module: "employee", description: "Assign/change employee roles" },

    // Company
    { code: PERMISSIONS.COMPANY_VIEW_SETTINGS, name: "View Settings", module: "company", description: "View company settings" },
    { code: PERMISSIONS.COMPANY_EDIT_SETTINGS, name: "Edit Settings", module: "company", description: "Edit company settings" },
    { code: PERMISSIONS.COMPANY_MANAGE_DEPARTMENTS, name: "Manage Departments", module: "company", description: "Create/edit departments and teams" },
    { code: PERMISSIONS.COMPANY_MANAGE_SHIFTS, name: "Manage Shifts", module: "company", description: "Create/edit work shifts" },

    // Reports
    { code: PERMISSIONS.REPORTS_VIEW_TEAM, name: "View Team Reports", module: "reports", description: "View reports for team/department" },
    { code: PERMISSIONS.REPORTS_VIEW_ALL, name: "View All Reports", module: "reports", description: "View all company reports" },
    { code: PERMISSIONS.REPORTS_EXPORT, name: "Export Reports", module: "reports", description: "Export reports as CSV/PDF" },

    // Audit
    { code: PERMISSIONS.AUDIT_VIEW, name: "View Audit Logs", module: "audit", description: "View audit trail" },
    { code: PERMISSIONS.AUDIT_EXPORT, name: "Export Audit Logs", module: "audit", description: "Export audit logs" },

    // Notifications
    { code: PERMISSIONS.NOTIFICATIONS_CONFIGURE, name: "Configure Notifications", module: "notifications", description: "Configure notification templates and preferences" },
  ];

  // Upsert all permissions
  for (const perm of permissionDefinitions) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      create: perm,
      update: { name: perm.name, module: perm.module, description: perm.description },
    });
  }
}

/**
 * Seed default role permissions for a company
 * Should be called when a new company is created
 */
export async function seedCompanyPermissions(companyId: string): Promise<void> {
  // First ensure all permissions exist
  const allPermissions = await prisma.permission.findMany({
    select: { id: true, code: true },
  });

  const permissionMap = new Map(allPermissions.map((p) => [p.code, p.id]));

  // If no permissions exist, seed them first
  if (permissionMap.size === 0) {
    await seedPermissions();
    const freshPermissions = await prisma.permission.findMany({
      select: { id: true, code: true },
    });
    for (const p of freshPermissions) {
      permissionMap.set(p.code, p.id);
    }
  }

  // Create role-permission mappings for each role
  const roles = Object.keys(DEFAULT_ROLE_PERMISSIONS) as UserRole[];

  for (const role of roles) {
    const permissionCodes = DEFAULT_ROLE_PERMISSIONS[role];

    for (const code of permissionCodes) {
      const permissionId = permissionMap.get(code);
      if (!permissionId) continue;

      await prisma.rolePermission.upsert({
        where: {
          company_id_role_permission_id: {
            company_id: companyId,
            role,
            permission_id: permissionId,
          },
        },
        create: {
          company_id: companyId,
          role,
          permission_id: permissionId,
          granted: true,
        },
        update: {}, // Don't override existing customizations
      });
    }
  }
}

/**
 * Quick role check helper for backward compatibility
 * Checks if employee has any of the allowed roles
 */
export function hasRole(
  employee: { primary_role?: UserRole | null; role?: UserRole | null; secondary_roles?: unknown },
  allowedRoles: UserRole[]
): boolean {
  const effectiveRoles = getEffectiveRoles(employee);
  return effectiveRoles.some((r) => allowedRoles.includes(r));
}

/**
 * Check if role is a management role (team_lead, manager, director)
 */
export function isManagementRole(role: UserRole): boolean {
  return ["team_lead", "manager", "director"].includes(role);
}

/**
 * Get the highest role from a set of roles
 */
export function getHighestRole(roles: UserRole[]): UserRole {
  const hierarchy: UserRole[] = ["employee", "team_lead", "manager", "director", "hr", "admin"];
  let highest: UserRole = "employee";

  for (const role of roles) {
    const idx = hierarchy.indexOf(role);
    if (idx > hierarchy.indexOf(highest)) {
      highest = role;
    }
  }

  return highest;
}

export { clearPermissionCache, DEFAULT_ROLE_PERMISSIONS };
