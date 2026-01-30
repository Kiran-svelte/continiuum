/**
 * 🛡️ CONTINUUM INTEGRITY ENGINE - VALIDATORS
 * 
 * Enterprise-grade data validation with:
 * - Zod schema definitions
 * - Type-safe validation
 * - Detailed error messages
 * - Composable schemas
 */

import { z } from 'zod';

// ============================================================
// COMMON VALIDATORS
// ============================================================

/** Email validation with common corporate domain support */
export const emailSchema = z
  .string()
  .email('Please enter a valid email address')
  .min(5, 'Email must be at least 5 characters')
  .max(254, 'Email must be less than 255 characters')
  .toLowerCase()
  .trim();

/** Strong password validation */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be less than 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

/** Basic password for less critical uses */
export const basicPasswordSchema = z
  .string()
  .min(6, 'Password must be at least 6 characters')
  .max(128, 'Password must be less than 128 characters');

/** Phone number validation (international format) */
export const phoneSchema = z
  .string()
  .regex(
    /^\+?[1-9]\d{1,14}$/,
    'Please enter a valid phone number (e.g., +91XXXXXXXXXX)'
  )
  .optional()
  .or(z.literal(''));

/** URL validation */
export const urlSchema = z
  .string()
  .url('Please enter a valid URL')
  .max(2048, 'URL is too long')
  .optional()
  .or(z.literal(''));

/** Safe string - no HTML/script injection */
export const safeStringSchema = z
  .string()
  .transform((val) => val.replace(/<[^>]*>/g, '').trim())
  .refine((val) => !/<script/i.test(val), 'Invalid characters detected');

/** Name validation */
export const nameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(100, 'Name must be less than 100 characters')
  .regex(
    /^[a-zA-Z\s\-'\.]+$/,
    'Name can only contain letters, spaces, hyphens, and apostrophes'
  )
  .trim();

/** Company name validation */
export const companyNameSchema = z
  .string()
  .min(2, 'Company name must be at least 2 characters')
  .max(200, 'Company name must be less than 200 characters')
  .trim();

/** UUID validation */
export const uuidSchema = z.string().uuid('Invalid ID format');

// ============================================================
// DATE VALIDATORS
// ============================================================

/** Date string in ISO format */
export const dateStringSchema = z
  .string()
  .datetime({ message: 'Invalid date format' })
  .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'));

/** Date must be in the future */
export const futureDateSchema = z
  .coerce
  .date()
  .refine((date) => date > new Date(), 'Date must be in the future');

/** Date must be in the past */
export const pastDateSchema = z
  .coerce
  .date()
  .refine((date) => date < new Date(), 'Date must be in the past');

/** Date range validation */
export const dateRangeSchema = z
  .object({
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: 'End date must be on or after start date',
    path: ['endDate'],
  });

// ============================================================
// EMPLOYEE VALIDATORS
// ============================================================

/** Employee role validation */
export const roleSchema = z.enum(['employee', 'manager', 'hr', 'admin'], {
  errorMap: () => ({ message: 'Invalid role selected' }),
});

/** Employee ID format */
export const employeeIdSchema = z
  .string()
  .min(1, 'Employee ID is required')
  .max(50, 'Employee ID is too long')
  .regex(/^[A-Za-z0-9\-_]+$/, 'Employee ID contains invalid characters');

/** Department validation */
export const departmentSchema = z
  .string()
  .min(1, 'Department is required')
  .max(100, 'Department name is too long')
  .trim();

/** Employee creation/update schema */
export const employeeSchema = z.object({
  emp_id: employeeIdSchema.optional(),
  name: nameSchema,
  email: emailSchema,
  role: roleSchema.default('employee'),
  department: departmentSchema.optional(),
  phone: phoneSchema,
  manager_id: z.string().optional(),
  company_id: uuidSchema,
  joining_date: z.coerce.date().optional(),
});

// ============================================================
// LEAVE REQUEST VALIDATORS
// ============================================================

/** Leave type validation */
export const leaveTypeSchema = z.enum([
  'annual',
  'sick',
  'casual',
  'maternity',
  'paternity',
  'unpaid',
  'compensatory',
  'bereavement',
  'study',
  'other',
], {
  errorMap: () => ({ message: 'Invalid leave type' }),
});

/** Leave status validation */
export const leaveStatusSchema = z.enum([
  'pending',
  'approved',
  'rejected',
  'cancelled',
  'withdrawn',
], {
  errorMap: () => ({ message: 'Invalid leave status' }),
});

/** Leave request creation schema */
export const leaveRequestSchema = z
  .object({
    type: leaveTypeSchema,
    start_date: z.coerce.date(),
    end_date: z.coerce.date(),
    reason: z
      .string()
      .min(1, 'Please provide a reason for your leave request')
      .max(500, 'Reason must be less than 500 characters')
      .transform((val) => val.trim()),
    is_half_day: z.boolean().default(false),
    half_day_type: z.enum(['morning', 'afternoon']).optional(),
    contact_during_leave: phoneSchema.optional(),
    handover_notes: z.string().max(1000).optional(),
  })
  .refine((data) => data.end_date >= data.start_date, {
    message: 'End date must be on or after start date',
    path: ['end_date'],
  })
  .refine(
    (data) => {
      if (data.is_half_day && !data.half_day_type) {
        return false;
      }
      return true;
    },
    {
      message: 'Please specify morning or afternoon for half-day leave',
      path: ['half_day_type'],
    }
  );

/** Leave approval/rejection schema */
export const leaveDecisionSchema = z.object({
  decision: z.enum(['approved', 'rejected']),
  reason: z
    .string()
    .min(1, 'Please provide a reason for your decision')
    .max(500, 'Reason must be less than 500 characters'),
  notifyEmployee: z.boolean().default(true),
});

// ============================================================
// COMPANY/ORGANIZATION VALIDATORS
// ============================================================

/** Company registration schema */
export const companySchema = z.object({
  name: companyNameSchema,
  domain: z
    .string()
    .min(3, 'Domain must be at least 3 characters')
    .max(253, 'Domain is too long')
    .regex(
      /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/i,
      'Please enter a valid domain (e.g., company.com)'
    )
    .optional(),
  industry: z.string().max(100).optional(),
  size: z.enum(['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'] as const).optional(),
  country: z.string().max(100).optional(),
  timezone: z.string().max(100).optional(),
});

/** Policy configuration schema */
export const policySchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  leaveTypes: z.array(z.object({
    type: leaveTypeSchema,
    daysPerYear: z.number().min(0).max(365),
    carryForward: z.boolean().default(false),
    maxCarryForward: z.number().min(0).max(365).default(0),
    requiresApproval: z.boolean().default(true),
    minNoticeDays: z.number().min(0).max(365).default(0),
  })),
  workWeek: z.array(z.number().min(0).max(6)).min(1).max(7),
  holidays: z.array(z.object({
    date: z.coerce.date(),
    name: z.string().max(100),
    optional: z.boolean().default(false),
  })).optional(),
});

// ============================================================
// API REQUEST VALIDATORS
// ============================================================

/** Pagination schema */
export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.string().max(50).optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/** Search query schema */
export const searchSchema = z.object({
  q: z
    .string()
    .max(200, 'Search query is too long')
    .transform((val) => val.trim())
    .optional(),
  filters: z.record(z.string(), z.unknown()).optional(),
});

/** API response wrapper */
export const apiResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.string().optional(),
    message: z.string().optional(),
    meta: z.object({
      page: z.number(),
      limit: z.number(),
      total: z.number(),
      totalPages: z.number(),
    }).optional(),
  });

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Validate data and return typed result
 */
export function validate<T extends z.ZodType>(
  schema: T,
  data: unknown
): { success: true; data: z.infer<T> } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Format Zod errors into user-friendly messages
 */
export function formatValidationErrors(error: z.ZodError): Record<string, string[]> {
  const formatted: Record<string, string[]> = {};
  
  for (const issue of error.issues) {
    const path = issue.path.join('.') || '_root';
    if (!formatted[path]) {
      formatted[path] = [];
    }
    formatted[path].push(issue.message);
  }
  
  return formatted;
}

/**
 * Get first error message for each field
 */
export function getFirstErrors(error: z.ZodError): Record<string, string> {
  const errors = formatValidationErrors(error);
  const first: Record<string, string> = {};
  
  for (const [key, messages] of Object.entries(errors)) {
    first[key] = messages[0];
  }
  
  return first;
}

// Re-export Zod for convenience
export { z } from 'zod';

// ============================================================
// TYPE-SAFE VALIDATION HELPERS
// ============================================================

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: Array<{ field: string; message: string }>;
}

/**
 * Validate a leave request with full type safety
 */
export function validateLeaveRequest(data: unknown): ValidationResult<z.infer<typeof leaveRequestSchema>> {
  const result = leaveRequestSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    errors: result.error.issues.map(issue => ({
      field: issue.path.join('.'),
      message: issue.message
    }))
  };
}

/**
 * Validate employee data with full type safety
 */
export function validateEmployee(data: unknown): ValidationResult<z.infer<typeof employeeSchema>> {
  const result = employeeSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    errors: result.error.issues.map(issue => ({
      field: issue.path.join('.'),
      message: issue.message
    }))
  };
}

/**
 * Validate company data with full type safety
 */
export function validateCompany(data: unknown): ValidationResult<z.infer<typeof companySchema>> {
  const result = companySchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    errors: result.error.issues.map(issue => ({
      field: issue.path.join('.'),
      message: issue.message
    }))
  };
}

