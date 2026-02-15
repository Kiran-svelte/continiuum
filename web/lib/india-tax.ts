/**
 * India Tax Calculation Library
 *
 * Handles all statutory calculations for Indian payroll:
 * - PF (Provident Fund) - Employee + Employer contribution
 * - ESI (Employee State Insurance) - Employee + Employer
 * - PT (Professional Tax) - State-wise slabs
 * - TDS (Tax Deducted at Source) - Income tax (Old & New regime)
 * - LOP (Loss of Pay) deduction
 *
 * All calculations follow Indian government regulations.
 * Rates are configurable per company for flexibility.
 */

// ============================================================================
// PF (PROVIDENT FUND)
// ============================================================================

export interface PFConfig {
  employeeRate: number; // Default 12%
  employerRate: number; // Default 12%
  ceiling: number; // Default 15000 (PF applies only on basic up to this ceiling)
  enabled: boolean;
}

export interface PFResult {
  pfEmployeeContribution: number;
  pfEmployerContribution: number;
  pfEmployerEPS: number; // Employer's EPS portion (8.33% of basic, max 1250)
  pfEmployerPF: number; // Employer's PF portion (3.67% remainder)
  applicableBasic: number;
}

/**
 * Calculate PF contributions.
 * PF = rate% of min(basic, ceiling)
 * Employer contribution splits: 8.33% to EPS (max Rs 1250/month), rest to PF
 */
export function calculatePF(
  monthlyBasic: number,
  config: PFConfig
): PFResult {
  if (!config.enabled) {
    return {
      pfEmployeeContribution: 0,
      pfEmployerContribution: 0,
      pfEmployerEPS: 0,
      pfEmployerPF: 0,
      applicableBasic: 0,
    };
  }

  const applicableBasic = Math.min(monthlyBasic, config.ceiling);

  const pfEmployee = Math.round(applicableBasic * (config.employeeRate / 100));

  // Employer: total is employerRate% of applicable basic
  const pfEmployerTotal = Math.round(
    applicableBasic * (config.employerRate / 100)
  );

  // EPS: 8.33% of applicable basic, max Rs 1250/month
  const epsContribution = Math.min(
    Math.round(applicableBasic * (8.33 / 100)),
    1250
  );

  // Remaining employer portion goes to PF
  const pfEmployerPF = pfEmployerTotal - epsContribution;

  return {
    pfEmployeeContribution: pfEmployee,
    pfEmployerContribution: pfEmployerTotal,
    pfEmployerEPS: epsContribution,
    pfEmployerPF,
    applicableBasic,
  };
}

// ============================================================================
// ESI (EMPLOYEE STATE INSURANCE)
// ============================================================================

export interface ESIConfig {
  employeeRate: number; // Default 0.75%
  employerRate: number; // Default 3.25%
  ceiling: number; // Default 21000 (gross salary limit for ESI applicability)
  enabled: boolean;
}

export interface ESIResult {
  esiEmployee: number;
  esiEmployer: number;
  isApplicable: boolean;
}

/**
 * Calculate ESI contributions.
 * ESI applies only when gross monthly salary is <= ceiling.
 */
export function calculateESI(
  grossMonthlySalary: number,
  config: ESIConfig
): ESIResult {
  if (!config.enabled || grossMonthlySalary > config.ceiling) {
    return {
      esiEmployee: 0,
      esiEmployer: 0,
      isApplicable: false,
    };
  }

  return {
    esiEmployee: Math.round(
      grossMonthlySalary * (config.employeeRate / 100)
    ),
    esiEmployer: Math.round(
      grossMonthlySalary * (config.employerRate / 100)
    ),
    isApplicable: true,
  };
}

// ============================================================================
// PROFESSIONAL TAX (STATE-WISE)
// ============================================================================

/**
 * Professional tax slabs by state.
 * These are monthly deduction amounts based on gross monthly salary.
 * Format: { minSalary, maxSalary, taxAmount }
 */
const PT_SLABS: Record<
  string,
  Array<{ min: number; max: number; tax: number }>
> = {
  maharashtra: [
    { min: 0, max: 7500, tax: 0 },
    { min: 7501, max: 10000, tax: 175 },
    { min: 10001, max: Infinity, tax: 200 },
    // Note: Feb month is 300 for top slab (handled in annual calculation)
  ],
  karnataka: [
    { min: 0, max: 15000, tax: 0 },
    { min: 15001, max: 25000, tax: 200 },
    { min: 25001, max: Infinity, tax: 200 },
  ],
  telangana: [
    { min: 0, max: 15000, tax: 0 },
    { min: 15001, max: 20000, tax: 150 },
    { min: 20001, max: 30000, tax: 200 },
    { min: 30001, max: Infinity, tax: 200 },
  ],
  tamilnadu: [
    { min: 0, max: 21000, tax: 0 },
    { min: 21001, max: 30000, tax: 100 },
    { min: 30001, max: 45000, tax: 235 },
    { min: 45001, max: 60000, tax: 510 },
    { min: 60001, max: 75000, tax: 760 },
    { min: 75001, max: Infinity, tax: 1095 },
  ],
  westbengal: [
    { min: 0, max: 10000, tax: 0 },
    { min: 10001, max: 15000, tax: 110 },
    { min: 15001, max: 25000, tax: 130 },
    { min: 25001, max: 40000, tax: 150 },
    { min: 40001, max: Infinity, tax: 200 },
  ],
  gujarat: [
    { min: 0, max: 5999, tax: 0 },
    { min: 6000, max: 8999, tax: 80 },
    { min: 9000, max: 11999, tax: 150 },
    { min: 12000, max: Infinity, tax: 200 },
  ],
  andhrapradesh: [
    { min: 0, max: 15000, tax: 0 },
    { min: 15001, max: 20000, tax: 150 },
    { min: 20001, max: Infinity, tax: 200 },
  ],
  // Default for states not listed or states where PT is not applicable
  default: [{ min: 0, max: Infinity, tax: 0 }],
};

/**
 * Calculate Professional Tax based on state and gross monthly salary.
 */
export function getProfessionalTax(
  state: string | null | undefined,
  grossMonthlySalary: number,
  month?: number // 1-12, February special handling for Maharashtra
): number {
  if (!state) return 0;

  const normalizedState = state.toLowerCase().replace(/[\s-_]/g, "");
  const slabs = PT_SLABS[normalizedState] || PT_SLABS.default;

  for (const slab of slabs) {
    if (grossMonthlySalary >= slab.min && grossMonthlySalary <= slab.max) {
      // Maharashtra: February is 300 for top slab
      if (
        normalizedState === "maharashtra" &&
        month === 2 &&
        slab.tax === 200
      ) {
        return 300;
      }
      return slab.tax;
    }
  }

  return 0;
}

// ============================================================================
// TDS (INCOME TAX)
// ============================================================================

/**
 * Old regime tax slabs (FY 2024-25)
 */
const OLD_REGIME_SLABS = [
  { min: 0, max: 250000, rate: 0 },
  { min: 250001, max: 500000, rate: 5 },
  { min: 500001, max: 1000000, rate: 20 },
  { min: 1000001, max: Infinity, rate: 30 },
];

/**
 * New regime tax slabs (FY 2024-25, updated Budget 2024)
 */
const NEW_REGIME_SLABS = [
  { min: 0, max: 300000, rate: 0 },
  { min: 300001, max: 700000, rate: 5 },
  { min: 700001, max: 1000000, rate: 10 },
  { min: 1000001, max: 1200000, rate: 15 },
  { min: 1200001, max: 1500000, rate: 20 },
  { min: 1500001, max: Infinity, rate: 30 },
];

export interface TDSConfig {
  enabled: boolean;
  regime: "old" | "new";
}

export interface TDSDeductions {
  section80C?: number; // Max 150000 (investments, insurance, etc.)
  section80D?: number; // Max 25000/50000 (health insurance)
  section80E?: number; // Education loan interest (no limit)
  hra?: number; // HRA exemption (calculated separately)
  standardDeduction?: number; // Default 50000
  other?: number; // Other deductions
}

export interface TDSResult {
  annualTaxableIncome: number;
  annualTax: number;
  monthlyTDS: number;
  effectiveRate: number;
  surcharge: number;
  cess: number;
  regime: "old" | "new";
}

/**
 * Calculate monthly TDS (income tax) based on projected annual income.
 *
 * @param annualGrossIncome - Total annual gross salary (CTC minus employer PF/ESI)
 * @param regime - "old" or "new" tax regime
 * @param deductions - Applicable deductions (only for old regime)
 * @param monthsRemaining - Months remaining in the FY (for pro-rata calculation)
 */
export function calculateTDS(
  annualGrossIncome: number,
  config: TDSConfig,
  deductions: TDSDeductions = {},
  monthsRemaining: number = 12
): TDSResult {
  if (!config.enabled || annualGrossIncome <= 0) {
    return {
      annualTaxableIncome: 0,
      annualTax: 0,
      monthlyTDS: 0,
      effectiveRate: 0,
      surcharge: 0,
      cess: 0,
      regime: config.regime,
    };
  }

  let taxableIncome = annualGrossIncome;

  if (config.regime === "old") {
    // Old regime: apply standard deduction + all deductions
    const standardDeduction = deductions.standardDeduction ?? 50000;
    taxableIncome -= standardDeduction;
    taxableIncome -= Math.min(deductions.section80C || 0, 150000);
    taxableIncome -= Math.min(deductions.section80D || 0, 50000);
    taxableIncome -= deductions.section80E || 0;
    taxableIncome -= deductions.hra || 0;
    taxableIncome -= deductions.other || 0;
  } else {
    // New regime: only standard deduction of 75000 (Budget 2024)
    taxableIncome -= 75000;
  }

  taxableIncome = Math.max(0, taxableIncome);

  // Calculate tax using slabs
  const slabs =
    config.regime === "old" ? OLD_REGIME_SLABS : NEW_REGIME_SLABS;
  let tax = 0;

  for (const slab of slabs) {
    if (taxableIncome <= 0) break;

    const taxableInSlab =
      Math.min(taxableIncome, slab.max) - (slab.min - 1);
    if (taxableInSlab > 0) {
      tax += taxableInSlab * (slab.rate / 100);
    }
    taxableIncome -= taxableInSlab;
    // Reset for next slab calculation
    taxableIncome = Math.max(
      0,
      annualGrossIncome -
        (config.regime === "old"
          ? (deductions.standardDeduction ?? 50000) +
            Math.min(deductions.section80C || 0, 150000) +
            Math.min(deductions.section80D || 0, 50000) +
            (deductions.section80E || 0) +
            (deductions.hra || 0) +
            (deductions.other || 0)
          : 75000) -
        slab.max
    );
  }

  // Recalculate correctly using slab method
  const actualTaxableIncome = Math.max(
    0,
    annualGrossIncome -
      (config.regime === "old"
        ? (deductions.standardDeduction ?? 50000) +
          Math.min(deductions.section80C || 0, 150000) +
          Math.min(deductions.section80D || 0, 50000) +
          (deductions.section80E || 0) +
          (deductions.hra || 0) +
          (deductions.other || 0)
        : 75000)
  );

  tax = 0;
  let remaining = actualTaxableIncome;

  for (const slab of slabs) {
    if (remaining <= 0) break;
    const slabRange = slab.max - (slab.min - 1);
    const taxableInSlab = Math.min(remaining, slabRange);
    tax += taxableInSlab * (slab.rate / 100);
    remaining -= taxableInSlab;
  }

  // Rebate under Section 87A
  if (config.regime === "new" && actualTaxableIncome <= 700000) {
    tax = Math.max(0, tax - 25000);
  } else if (config.regime === "old" && actualTaxableIncome <= 500000) {
    tax = Math.max(0, tax - 12500);
  }

  // Surcharge
  let surcharge = 0;
  if (actualTaxableIncome > 5000000 && actualTaxableIncome <= 10000000) {
    surcharge = tax * 0.1;
  } else if (
    actualTaxableIncome > 10000000 &&
    actualTaxableIncome <= 20000000
  ) {
    surcharge = tax * 0.15;
  } else if (
    actualTaxableIncome > 20000000 &&
    actualTaxableIncome <= 50000000
  ) {
    surcharge = tax * 0.25;
  } else if (actualTaxableIncome > 50000000) {
    surcharge = tax * 0.37;
  }

  // Health & Education Cess: 4% on (tax + surcharge)
  const cess = (tax + surcharge) * 0.04;

  const totalAnnualTax = Math.round(tax + surcharge + cess);
  const monthlyTDS = Math.round(totalAnnualTax / monthsRemaining);

  return {
    annualTaxableIncome: actualTaxableIncome,
    annualTax: totalAnnualTax,
    monthlyTDS,
    effectiveRate:
      annualGrossIncome > 0
        ? Math.round((totalAnnualTax / annualGrossIncome) * 10000) / 100
        : 0,
    surcharge: Math.round(surcharge),
    cess: Math.round(cess),
    regime: config.regime,
  };
}

// ============================================================================
// LOP (LOSS OF PAY)
// ============================================================================

/**
 * Calculate Loss of Pay deduction.
 * LOP = (unpaid_leave_days / total_working_days) * gross_salary
 */
export function calculateLOP(
  unpaidLeaveDays: number,
  totalWorkingDays: number,
  grossSalary: number
): number {
  if (totalWorkingDays <= 0 || unpaidLeaveDays <= 0) return 0;
  return Math.round((unpaidLeaveDays / totalWorkingDays) * grossSalary);
}

// ============================================================================
// SUMMARY CALCULATION
// ============================================================================

export interface PayrollCalculationInput {
  monthlyBasic: number;
  monthlyHRA: number;
  monthlyDA: number;
  monthlySpecialAllowance: number;
  otherEarnings: Array<{ name: string; amount: number }>;
  annualCTC: number;

  // Attendance
  totalWorkingDays: number;
  presentDays: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  lateCount: number;
  overtimeHours: number;

  // Company config
  pfConfig: PFConfig;
  esiConfig: ESIConfig;
  tdsConfig: TDSConfig;
  tdsDeductions?: TDSDeductions;
  ptState?: string | null;
  month: number;

  // Other deductions
  otherDeductions?: Array<{ name: string; amount: number }>;
}

export interface PayrollCalculationResult {
  // Earnings
  basic: number;
  hra: number;
  da: number;
  specialAllowance: number;
  otherEarnings: Array<{ name: string; amount: number }>;
  grossSalary: number;

  // Deductions
  pfEmployee: number;
  pfEmployer: number;
  esiEmployee: number;
  esiEmployer: number;
  professionalTax: number;
  tds: number;
  lopDeduction: number;
  otherDeductions: Array<{ name: string; amount: number }>;
  totalDeductions: number;

  // Net
  netPay: number;
}

/**
 * Calculate the complete payroll for a single employee for a month.
 */
export function calculateMonthlyPayroll(
  input: PayrollCalculationInput
): PayrollCalculationResult {
  // Pro-rata basic for LOP
  const lopDeduction = calculateLOP(
    input.unpaidLeaveDays,
    input.totalWorkingDays,
    input.monthlyBasic +
      input.monthlyHRA +
      input.monthlyDA +
      input.monthlySpecialAllowance
  );

  // Effective earnings after LOP
  const effectiveBasic = Math.max(
    0,
    input.monthlyBasic -
      calculateLOP(
        input.unpaidLeaveDays,
        input.totalWorkingDays,
        input.monthlyBasic
      )
  );

  // Gross salary (before deductions, after LOP)
  const otherEarningsTotal = input.otherEarnings.reduce(
    (sum, e) => sum + e.amount,
    0
  );
  const grossSalary =
    input.monthlyBasic +
    input.monthlyHRA +
    input.monthlyDA +
    input.monthlySpecialAllowance +
    otherEarningsTotal -
    lopDeduction;

  // PF on effective basic
  const pf = calculatePF(effectiveBasic, input.pfConfig);

  // ESI on gross salary
  const esi = calculateESI(grossSalary, input.esiConfig);

  // Professional Tax
  const pt = getProfessionalTax(input.ptState, grossSalary, input.month);

  // TDS (based on annual projected income)
  const monthsRemaining = 13 - input.month; // Remaining months in FY
  const tds = calculateTDS(
    input.annualCTC -
      pf.pfEmployerContribution * 12 -
      (esi.isApplicable ? esi.esiEmployer * 12 : 0),
    input.tdsConfig,
    input.tdsDeductions,
    Math.max(1, monthsRemaining)
  );

  // Other deductions
  const otherDeductionsTotal = (input.otherDeductions || []).reduce(
    (sum, d) => sum + d.amount,
    0
  );

  const totalDeductions =
    pf.pfEmployeeContribution +
    esi.esiEmployee +
    pt +
    tds.monthlyTDS +
    lopDeduction +
    otherDeductionsTotal;

  const netPay = Math.max(
    0,
    grossSalary - totalDeductions + lopDeduction // Add back LOP since it was already deducted from gross
  );

  // Correct: Net = Gross - (PF + ESI + PT + TDS + OtherDeductions)
  const correctedNetPay = Math.max(
    0,
    grossSalary -
      pf.pfEmployeeContribution -
      esi.esiEmployee -
      pt -
      tds.monthlyTDS -
      otherDeductionsTotal
  );

  return {
    basic: input.monthlyBasic,
    hra: input.monthlyHRA,
    da: input.monthlyDA,
    specialAllowance: input.monthlySpecialAllowance,
    otherEarnings: input.otherEarnings,
    grossSalary,

    pfEmployee: pf.pfEmployeeContribution,
    pfEmployer: pf.pfEmployerContribution,
    esiEmployee: esi.esiEmployee,
    esiEmployer: esi.esiEmployer,
    professionalTax: pt,
    tds: tds.monthlyTDS,
    lopDeduction,
    otherDeductions: input.otherDeductions || [],
    totalDeductions:
      pf.pfEmployeeContribution +
      esi.esiEmployee +
      pt +
      tds.monthlyTDS +
      lopDeduction +
      otherDeductionsTotal,

    netPay: correctedNetPay,
  };
}
