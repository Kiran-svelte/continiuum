/**
 * 🛡️ CONTINUUM INTEGRITY ENGINE - INDEX
 * 
 * Exports all integrity utilities
 */

// Validators
export * from './validators';

// Sanitizers
export * from './sanitizers';

// Type-safe validation helper
import { z } from 'zod';
import { formatValidationErrors, getFirstErrors } from './validators';
import { sanitizeInput, sanitizeObject } from './sanitizers';

/**
 * Validate and sanitize input in one step
 * 
 * @example
 * ```ts
 * const result = await validateAndSanitize(
 *   leaveRequestSchema,
 *   request.body
 * );
 * 
 * if (!result.success) {
 *   return { error: result.errors };
 * }
 * 
 * // result.data is typed and sanitized
 * ```
 */
export function validateAndSanitize<T extends z.ZodType>(
  schema: T,
  data: unknown
): 
  | { success: true; data: z.infer<T> }
  | { success: false; errors: Record<string, string[]>; firstErrors: Record<string, string> } {
  
  // First sanitize if it's an object
  const sanitizedData = typeof data === 'object' && data !== null
    ? sanitizeObject(data as Record<string, unknown>)
    : typeof data === 'string'
    ? sanitizeInput(data)
    : data;
  
  // Then validate
  const result = schema.safeParse(sanitizedData);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  return {
    success: false,
    errors: formatValidationErrors(result.error),
    firstErrors: getFirstErrors(result.error),
  };
}

/**
 * Validation middleware for API routes
 */
export function createValidator<T extends z.ZodType>(schema: T) {
  return (data: unknown) => validateAndSanitize(schema, data);
}

/**
 * Assert data matches schema (throws if invalid)
 */
export function assertValid<T extends z.ZodType>(
  schema: T,
  data: unknown,
  message?: string
): z.infer<T> {
  const result = schema.safeParse(data);
  
  if (!result.success) {
    const errors = getFirstErrors(result.error);
    const errorMessages = Object.entries(errors)
      .map(([key, msg]) => `${key}: ${msg}`)
      .join('; ');
    
    throw new ValidationError(
      message || `Validation failed: ${errorMessages}`,
      result.error
    );
  }
  
  return result.data;
}

/**
 * Custom validation error class
 */
export class ValidationError extends Error {
  public readonly zodError: z.ZodError;
  public readonly fieldErrors: Record<string, string[]>;
  
  constructor(message: string, zodError: z.ZodError) {
    super(message);
    this.name = 'ValidationError';
    this.zodError = zodError;
    this.fieldErrors = formatValidationErrors(zodError);
  }
}

/**
 * Type guard to check if error is validation error
 */
export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}
