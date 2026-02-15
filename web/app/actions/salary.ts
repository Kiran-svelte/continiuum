"use server";

import { prisma } from "@/lib/prisma";
import {
  requireHRAccess,
  requireCompanyAccess,
  getAuthEmployee,
  requirePermissionGuard,
} from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/rbac";
import { revalidatePath } from "next/cache";

// ============================================================================
// SALARY COMPONENTS (Company-level configuration)
// ============================================================================

/**
 * Get all salary components for a company.
 */
export async function getSalaryComponents() {
  const auth = await requireCompanyAccess();
  if (!auth.success) return auth;

  const components = await prisma.salaryComponent.findMany({
    where: { company_id: auth.companyId! },
    orderBy: [{ type: "asc" }, { sort_order: "asc" }],
  });

  return {
    success: true,
    components: components.map((c) => ({
      ...c,
      default_value: c.default_value ? Number(c.default_value) : null,
      percentage: c.percentage ? Number(c.percentage) : null,
    })),
  };
}

/**
 * Create a new salary component for the company.
 */
export async function createSalaryComponent(data: {
  name: string;
  code: string;
  type: string; // "earning" | "deduction" | "employer_contribution"
  calculation: string; // "fixed" | "percentage_of_basic" | "percentage_of_gross" | "percentage_of_ctc"
  default_value?: number;
  percentage?: number;
  is_taxable?: boolean;
  is_statutory?: boolean;
  sort_order?: number;
}) {
  const auth = await requirePermissionGuard(PERMISSIONS.PAYROLL_CONFIGURE);
  if (!auth.success) return auth;

  const orgId = auth.employee.org_id;
  if (!orgId) return { success: false, error: "Not linked to company" };

  // Validate code format
  const code = data.code.toUpperCase().replace(/[^A-Z0-9_]/g, "");
  if (code.length < 2 || code.length > 20) {
    return { success: false, error: "Code must be 2-20 alphanumeric characters" };
  }

  // Check unique code per company
  const existing = await prisma.salaryComponent.findUnique({
    where: { company_id_code: { company_id: orgId, code } },
  });
  if (existing) {
    return { success: false, error: `Component code "${code}" already exists` };
  }

  const component = await prisma.salaryComponent.create({
    data: {
      company_id: orgId,
      name: data.name,
      code,
      type: data.type,
      calculation: data.calculation,
      default_value: data.default_value ?? null,
      percentage: data.percentage ?? null,
      is_taxable: data.is_taxable ?? true,
      is_statutory: data.is_statutory ?? false,
      sort_order: data.sort_order ?? 0,
    },
  });

  revalidatePath("/hr/payroll");
  return { success: true, component };
}

/**
 * Update a salary component.
 */
export async function updateSalaryComponent(
  componentId: string,
  data: {
    name?: string;
    type?: string;
    calculation?: string;
    default_value?: number | null;
    percentage?: number | null;
    is_taxable?: boolean;
    is_statutory?: boolean;
    is_active?: boolean;
    sort_order?: number;
  }
) {
  const auth = await requirePermissionGuard(PERMISSIONS.PAYROLL_CONFIGURE);
  if (!auth.success) return auth;

  const component = await prisma.salaryComponent.findUnique({
    where: { id: componentId },
  });
  if (!component) return { success: false, error: "Component not found" };
  if (component.company_id !== auth.employee.org_id) {
    return { success: false, error: "Not authorized for this company" };
  }

  await prisma.salaryComponent.update({
    where: { id: componentId },
    data,
  });

  revalidatePath("/hr/payroll");
  return { success: true };
}

/**
 * Seed default salary components for a company.
 * Called during company setup.
 */
export async function seedDefaultSalaryComponents(companyId: string) {
  const defaults = [
    { name: "Basic", code: "BASIC", type: "earning", calculation: "percentage_of_ctc", percentage: 40, is_taxable: true, is_statutory: false, sort_order: 1 },
    { name: "House Rent Allowance", code: "HRA", type: "earning", calculation: "percentage_of_basic", percentage: 50, is_taxable: true, is_statutory: false, sort_order: 2 },
    { name: "Dearness Allowance", code: "DA", type: "earning", calculation: "percentage_of_basic", percentage: 0, is_taxable: true, is_statutory: false, sort_order: 3 },
    { name: "Special Allowance", code: "SA", type: "earning", calculation: "fixed", default_value: 0, is_taxable: true, is_statutory: false, sort_order: 4 },
    { name: "Conveyance Allowance", code: "CA", type: "earning", calculation: "fixed", default_value: 1600, is_taxable: true, is_statutory: false, sort_order: 5 },
    { name: "Medical Allowance", code: "MA", type: "earning", calculation: "fixed", default_value: 1250, is_taxable: true, is_statutory: false, sort_order: 6 },
    { name: "Provident Fund (Employee)", code: "PF_EE", type: "deduction", calculation: "percentage_of_basic", percentage: 12, is_taxable: false, is_statutory: true, sort_order: 10 },
    { name: "Provident Fund (Employer)", code: "PF_ER", type: "employer_contribution", calculation: "percentage_of_basic", percentage: 12, is_taxable: false, is_statutory: true, sort_order: 11 },
    { name: "ESI (Employee)", code: "ESI_EE", type: "deduction", calculation: "percentage_of_gross", percentage: 0.75, is_taxable: false, is_statutory: true, sort_order: 12 },
    { name: "ESI (Employer)", code: "ESI_ER", type: "employer_contribution", calculation: "percentage_of_gross", percentage: 3.25, is_taxable: false, is_statutory: true, sort_order: 13 },
    { name: "Professional Tax", code: "PT", type: "deduction", calculation: "fixed", default_value: 200, is_taxable: false, is_statutory: true, sort_order: 14 },
    { name: "TDS", code: "TDS", type: "deduction", calculation: "fixed", default_value: 0, is_taxable: false, is_statutory: true, sort_order: 15 },
  ];

  for (const comp of defaults) {
    await prisma.salaryComponent.upsert({
      where: { company_id_code: { company_id: companyId, code: comp.code } },
      create: { company_id: companyId, ...comp },
      update: {},
    });
  }
}

// ============================================================================
// SALARY STRUCTURE (Per-employee)
// ============================================================================

/**
 * Derive salary breakdown from CTC based on company's salary components.
 */
function deriveSalaryBreakdown(
  annualCTC: number,
  components: Array<{
    code: string;
    name: string;
    type: string;
    calculation: string;
    default_value: number | null;
    percentage: number | null;
  }>
) {
  const monthlyCtc = annualCTC / 12;
  const earningComponents = components.filter((c) => c.type === "earning");

  // Step 1: Calculate Basic first (usually percentage_of_ctc)
  const basicComp = earningComponents.find((c) => c.code === "BASIC");
  let monthlyBasic = 0;

  if (basicComp) {
    if (basicComp.calculation === "percentage_of_ctc" && basicComp.percentage) {
      monthlyBasic = Math.round((monthlyCtc * basicComp.percentage) / 100);
    } else if (basicComp.calculation === "fixed" && basicComp.default_value) {
      monthlyBasic = basicComp.default_value;
    } else {
      monthlyBasic = Math.round(monthlyCtc * 0.4); // Default 40% of CTC
    }
  } else {
    monthlyBasic = Math.round(monthlyCtc * 0.4);
  }

  // Step 2: Calculate all components
  const breakdown: Array<{ code: string; name: string; type: string; amount: number }> = [];
  let totalEarnings = 0;
  let totalFixedDeductions = 0;

  for (const comp of components) {
    let amount = 0;

    switch (comp.calculation) {
      case "percentage_of_basic":
        amount = Math.round(monthlyBasic * ((comp.percentage || 0) / 100));
        break;
      case "percentage_of_gross":
        // Will be calculated after gross is known
        break;
      case "percentage_of_ctc":
        amount = Math.round(monthlyCtc * ((comp.percentage || 0) / 100));
        break;
      case "fixed":
        amount = comp.default_value || 0;
        break;
    }

    if (comp.type === "earning") {
      totalEarnings += amount;
    }

    breakdown.push({
      code: comp.code,
      name: comp.name,
      type: comp.type,
      amount,
    });
  }

  // Step 3: Calculate Special Allowance as remainder
  // SA = Monthly CTC - Basic - HRA - DA - CA - MA - Employer PF - Employer ESI
  const employerContributions = breakdown
    .filter((b) => b.type === "employer_contribution")
    .reduce((sum, b) => sum + b.amount, 0);

  const fixedEarnings = breakdown
    .filter((b) => b.type === "earning" && b.code !== "SA")
    .reduce((sum, b) => sum + b.amount, 0);

  const saIndex = breakdown.findIndex((b) => b.code === "SA");
  if (saIndex >= 0) {
    const specialAllowance = Math.max(
      0,
      Math.round(monthlyCtc - fixedEarnings - employerContributions)
    );
    breakdown[saIndex].amount = specialAllowance;
  }

  return {
    monthlyBasic,
    breakdown,
  };
}

/**
 * Set up or update salary structure for an employee.
 */
export async function setupSalaryStructure(
  empId: string,
  annualCTC: number,
  customComponents?: Array<{ code: string; amount: number }>
) {
  const auth = await requirePermissionGuard(PERMISSIONS.PAYROLL_CONFIGURE);
  if (!auth.success) return auth;

  const orgId = auth.employee.org_id;
  if (!orgId) return { success: false, error: "Not linked to company" };

  if (annualCTC <= 0) {
    return { success: false, error: "Annual CTC must be greater than 0" };
  }

  // Verify employee exists and belongs to same company
  const employee = await prisma.employee.findUnique({
    where: { emp_id: empId },
    select: { emp_id: true, org_id: true, full_name: true },
  });
  if (!employee) return { success: false, error: "Employee not found" };
  if (employee.org_id !== orgId) {
    return { success: false, error: "Employee belongs to different company" };
  }

  // Get company salary components
  const components = await prisma.salaryComponent.findMany({
    where: { company_id: orgId, is_active: true },
    orderBy: { sort_order: "asc" },
  });

  if (components.length === 0) {
    return {
      success: false,
      error: "No salary components configured. Set up salary components first.",
    };
  }

  // Derive breakdown from CTC
  const compData = components.map((c) => ({
    code: c.code,
    name: c.name,
    type: c.type,
    calculation: c.calculation,
    default_value: c.default_value ? Number(c.default_value) : null,
    percentage: c.percentage ? Number(c.percentage) : null,
  }));

  const { monthlyBasic, breakdown } = deriveSalaryBreakdown(annualCTC, compData);

  // Apply custom overrides if provided
  if (customComponents) {
    for (const custom of customComponents) {
      const idx = breakdown.findIndex((b) => b.code === custom.code);
      if (idx >= 0) {
        breakdown[idx].amount = custom.amount;
      }
    }
  }

  // Upsert salary structure
  const structure = await prisma.salaryStructure.upsert({
    where: { emp_id: empId },
    create: {
      emp_id: empId,
      ctc: annualCTC,
      basic: monthlyBasic,
      components: breakdown,
      effective_from: new Date(),
    },
    update: {
      ctc: annualCTC,
      basic: monthlyBasic,
      components: breakdown,
      effective_from: new Date(),
      is_active: true,
    },
  });

  revalidatePath("/hr/payroll");
  return {
    success: true,
    structure: {
      ...structure,
      ctc: Number(structure.ctc),
      basic: Number(structure.basic),
    },
  };
}

/**
 * Get salary structure for an employee.
 */
export async function getSalaryStructure(empId: string) {
  const auth = await getAuthEmployee();
  if (!auth.success) return auth;

  const actor = auth.employee;

  // Employees can view their own, HR/Admin can view any in company
  const isOwnProfile = actor.emp_id === empId;
  if (!isOwnProfile) {
    const employee = await prisma.employee.findUnique({
      where: { emp_id: empId },
      select: { org_id: true },
    });
    if (!employee || employee.org_id !== actor.org_id) {
      return { success: false, error: "Not authorized" };
    }
    // Only HR/Admin can view others' salary
    if (actor.primary_role !== "hr" && actor.primary_role !== "admin") {
      return { success: false, error: "Only HR/Admin can view other employees' salary" };
    }
  }

  const structure = await prisma.salaryStructure.findUnique({
    where: { emp_id: empId },
  });

  if (!structure) {
    return { success: false, error: "Salary structure not set up" };
  }

  return {
    success: true,
    structure: {
      ...structure,
      ctc: Number(structure.ctc),
      basic: Number(structure.basic),
    },
  };
}

/**
 * Initiate a salary revision for an employee.
 */
export async function reviseSalary(
  empId: string,
  newAnnualCTC: number,
  reason: string,
  effectiveDate: Date
) {
  const auth = await requirePermissionGuard(PERMISSIONS.PAYROLL_CONFIGURE);
  if (!auth.success) return auth;

  const orgId = auth.employee.org_id;
  if (!orgId) return { success: false, error: "Not linked to company" };

  if (newAnnualCTC <= 0) {
    return { success: false, error: "New CTC must be greater than 0" };
  }

  // Get current salary
  const currentStructure = await prisma.salaryStructure.findUnique({
    where: { emp_id: empId },
  });

  const oldCTC = currentStructure ? Number(currentStructure.ctc) : 0;

  if (oldCTC === newAnnualCTC) {
    return { success: false, error: "New CTC is the same as current CTC" };
  }

  // Check for pending revision
  const pendingRevision = await prisma.salaryRevision.findFirst({
    where: { emp_id: empId, status: "pending" },
  });
  if (pendingRevision) {
    return { success: false, error: "A salary revision is already pending for this employee" };
  }

  const revision = await prisma.salaryRevision.create({
    data: {
      emp_id: empId,
      old_ctc: oldCTC,
      new_ctc: newAnnualCTC,
      reason,
      effective_from: effectiveDate,
    },
  });

  revalidatePath("/hr/payroll");
  return {
    success: true,
    revision: {
      ...revision,
      old_ctc: Number(revision.old_ctc),
      new_ctc: Number(revision.new_ctc),
    },
  };
}

/**
 * Approve a salary revision and update the salary structure.
 */
export async function approveSalaryRevision(revisionId: string) {
  const auth = await requirePermissionGuard(PERMISSIONS.PAYROLL_APPROVE);
  if (!auth.success) return auth;

  const orgId = auth.employee.org_id;
  if (!orgId) return { success: false, error: "Not linked to company" };

  const revision = await prisma.salaryRevision.findUnique({
    where: { id: revisionId },
    include: { employee: { select: { org_id: true } } },
  });

  if (!revision) return { success: false, error: "Revision not found" };
  if (revision.status !== "pending") {
    return { success: false, error: `Revision already ${revision.status}` };
  }
  if (revision.employee.org_id !== orgId) {
    return { success: false, error: "Not authorized for this company" };
  }

  // Get company components for re-deriving structure
  const components = await prisma.salaryComponent.findMany({
    where: { company_id: orgId, is_active: true },
    orderBy: { sort_order: "asc" },
  });

  const compData = components.map((c) => ({
    code: c.code,
    name: c.name,
    type: c.type,
    calculation: c.calculation,
    default_value: c.default_value ? Number(c.default_value) : null,
    percentage: c.percentage ? Number(c.percentage) : null,
  }));

  const newCTC = Number(revision.new_ctc);
  const { monthlyBasic, breakdown } = deriveSalaryBreakdown(newCTC, compData);

  await prisma.$transaction([
    // Update revision status
    prisma.salaryRevision.update({
      where: { id: revisionId },
      data: {
        status: "approved",
        approved_by: auth.employee.emp_id,
        approved_at: new Date(),
      },
    }),
    // Update salary structure
    prisma.salaryStructure.upsert({
      where: { emp_id: revision.emp_id },
      create: {
        emp_id: revision.emp_id,
        ctc: newCTC,
        basic: monthlyBasic,
        components: breakdown,
        effective_from: revision.effective_from,
      },
      update: {
        ctc: newCTC,
        basic: monthlyBasic,
        components: breakdown,
        effective_from: revision.effective_from,
        is_active: true,
      },
    }),
  ]);

  revalidatePath("/hr/payroll");
  return { success: true };
}

/**
 * Reject a salary revision.
 */
export async function rejectSalaryRevision(revisionId: string) {
  const auth = await requirePermissionGuard(PERMISSIONS.PAYROLL_APPROVE);
  if (!auth.success) return auth;

  await prisma.salaryRevision.update({
    where: { id: revisionId },
    data: { status: "rejected" },
  });

  revalidatePath("/hr/payroll");
  return { success: true };
}

/**
 * Get pending salary revisions for the company.
 */
export async function getPendingSalaryRevisions() {
  const auth = await requireHRAccess();
  if (!auth.success) return auth;

  const revisions = await prisma.salaryRevision.findMany({
    where: {
      status: "pending",
      employee: { org_id: auth.employee.org_id },
    },
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
    orderBy: { created_at: "desc" },
  });

  return {
    success: true,
    revisions: revisions.map((r) => ({
      ...r,
      old_ctc: Number(r.old_ctc),
      new_ctc: Number(r.new_ctc),
    })),
  };
}

/**
 * Get salary revision history for an employee.
 */
export async function getSalaryRevisionHistory(empId: string) {
  const auth = await requireHRAccess();
  if (!auth.success) return auth;

  const revisions = await prisma.salaryRevision.findMany({
    where: { emp_id: empId },
    orderBy: { created_at: "desc" },
  });

  return {
    success: true,
    revisions: revisions.map((r) => ({
      ...r,
      old_ctc: Number(r.old_ctc),
      new_ctc: Number(r.new_ctc),
    })),
  };
}

/**
 * Bulk setup salary structures.
 */
export async function bulkSetupSalaryStructures(
  employees: Array<{ emp_id: string; annual_ctc: number }>
) {
  const auth = await requirePermissionGuard(PERMISSIONS.PAYROLL_CONFIGURE);
  if (!auth.success) return auth;

  const orgId = auth.employee.org_id;
  if (!orgId) return { success: false, error: "Not linked to company" };

  const components = await prisma.salaryComponent.findMany({
    where: { company_id: orgId, is_active: true },
    orderBy: { sort_order: "asc" },
  });

  if (components.length === 0) {
    return { success: false, error: "No salary components configured" };
  }

  const compData = components.map((c) => ({
    code: c.code,
    name: c.name,
    type: c.type,
    calculation: c.calculation,
    default_value: c.default_value ? Number(c.default_value) : null,
    percentage: c.percentage ? Number(c.percentage) : null,
  }));

  const results: Array<{ emp_id: string; success: boolean; error?: string }> = [];

  for (const emp of employees) {
    if (emp.annual_ctc <= 0) {
      results.push({ emp_id: emp.emp_id, success: false, error: "Invalid CTC" });
      continue;
    }

    // Verify employee belongs to company
    const employee = await prisma.employee.findUnique({
      where: { emp_id: emp.emp_id },
      select: { org_id: true },
    });

    if (!employee || employee.org_id !== orgId) {
      results.push({ emp_id: emp.emp_id, success: false, error: "Not in company" });
      continue;
    }

    const { monthlyBasic, breakdown } = deriveSalaryBreakdown(emp.annual_ctc, compData);

    await prisma.salaryStructure.upsert({
      where: { emp_id: emp.emp_id },
      create: {
        emp_id: emp.emp_id,
        ctc: emp.annual_ctc,
        basic: monthlyBasic,
        components: breakdown,
        effective_from: new Date(),
      },
      update: {
        ctc: emp.annual_ctc,
        basic: monthlyBasic,
        components: breakdown,
        effective_from: new Date(),
        is_active: true,
      },
    });

    results.push({ emp_id: emp.emp_id, success: true });
  }

  revalidatePath("/hr/payroll");
  return {
    success: true,
    results,
    summary: {
      total: employees.length,
      succeeded: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
    },
  };
}
