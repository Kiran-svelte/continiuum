"use client";

/**
 * 🏢 CONTINUUM ENTERPRISE HOOKS
 * 
 * React hooks for enterprise-grade features:
 * - Validated forms with integrity checks
 * - Retry-enabled API calls
 * - Consent management
 * - Smart defaults
 */

import { useState, useCallback, useEffect } from 'react';
import { z, ZodIssue } from 'zod';
import { withRetry, RetryConfig, RetryResult } from '@/lib/reliability';

// ============================================================
// VALIDATED FORM HOOK
// ============================================================

export interface UseValidatedFormOptions<T extends z.ZodSchema> {
  schema: T;
  initialValues?: Partial<z.infer<T>>;
  onSubmit: (data: z.infer<T>) => Promise<void>;
  validateOnChange?: boolean;
}

export interface ValidationError {
  field: string;
  message: string;
}

export function useValidatedForm<T extends z.ZodSchema>({
  schema,
  initialValues = {},
  onSubmit,
  validateOnChange = true,
}: UseValidatedFormOptions<T>) {
  const [values, setValues] = useState<Record<string, any>>(initialValues);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValid, setIsValid] = useState(false);

  // Validate single field
  const validateField = useCallback(
    (field: string, value: any) => {
      try {
        const partial = { ...values, [field]: value };
        schema.parse(partial);
        setErrors((prev) => prev.filter((e) => e.field !== field));
        return true;
      } catch (error) {
        if (error instanceof z.ZodError) {
          const fieldError = error.issues.find((e: ZodIssue) => e.path.includes(field));
          if (fieldError) {
            setErrors((prev) => [
              ...prev.filter((e) => e.field !== field),
              { field, message: fieldError.message },
            ]);
          }
        }
        return false;
      }
    },
    [schema, values]
  );

  // Validate entire form
  const validateForm = useCallback(() => {
    try {
      schema.parse(values);
      setErrors([]);
      setIsValid(true);
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        setErrors(
          error.issues.map((e: ZodIssue) => ({
            field: e.path.join('.'),
            message: e.message,
          }))
        );
      }
      setIsValid(false);
      return false;
    }
  }, [schema, values]);

  // Update field value
  const setValue = useCallback(
    (field: string, value: any) => {
      setValues((prev) => ({ ...prev, [field]: value }));
      if (validateOnChange) {
        validateField(field, value);
      }
    },
    [validateOnChange, validateField]
  );

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    if (!validateForm()) {
      return false;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(values as z.infer<T>);
      return true;
    } catch (error) {
      console.error('Form submission error:', error);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [validateForm, onSubmit, values]);

  // Get error for specific field
  const getError = useCallback(
    (field: string) => errors.find((e) => e.field === field)?.message,
    [errors]
  );

  // Reset form
  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors([]);
    setIsValid(false);
  }, [initialValues]);

  return {
    values,
    errors,
    isSubmitting,
    isValid,
    setValue,
    validateField,
    validateForm,
    handleSubmit,
    getError,
    reset,
  };
}

// ============================================================
// RELIABLE API HOOK
// ============================================================

export interface UseReliableApiOptions<T> extends Partial<RetryConfig> {
  onSuccess?: (data: T) => void;
  onError?: (error: unknown) => void;
  immediate?: boolean;
}

export function useReliableApi<T>(
  fetcher: () => Promise<T>,
  options: UseReliableApiOptions<T> = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lastSuccess, setLastSuccess] = useState<Date | null>(null);

  const execute = useCallback(async (): Promise<RetryResult<T>> => {
    setIsLoading(true);
    setError(null);

    const result = await withRetry(fetcher, {
      maxRetries: options.maxRetries ?? 3,
      baseDelay: options.baseDelay ?? 1000,
      maxDelay: options.maxDelay ?? 10000,
      backoffMultiplier: options.backoffMultiplier ?? 2,
      jitter: options.jitter ?? true,
      onRetry: (err, attempt, delay) => {
        console.log(`[ReliableAPI] Retry ${attempt}, waiting ${delay}ms`);
        setAttempts(attempt);
      },
    });

    setIsLoading(false);
    setAttempts(result.attempts);

    if (result.success && result.data !== undefined) {
      setData(result.data);
      setLastSuccess(new Date());
      options.onSuccess?.(result.data);
    } else {
      setError(result.error);
      options.onError?.(result.error);
    }

    return result;
  }, [fetcher, options]);

  // Execute immediately if requested
  useEffect(() => {
    if (options.immediate) {
      execute();
    }
  }, [options.immediate, execute]);

  return {
    data,
    error,
    isLoading,
    attempts,
    lastSuccess,
    execute,
    reset: () => {
      setData(null);
      setError(null);
      setAttempts(0);
    },
  };
}

// ============================================================
// CONSENT HOOK
// ============================================================

export type ConsentType = 'analytics' | 'marketing' | 'performance' | 'functional' | 'data_processing';

const CONSENT_STORAGE_KEY = 'continuum_consent_preferences';

export function useConsent() {
  const [consents, setConsents] = useState<Record<ConsentType, boolean>>({
    analytics: false,
    marketing: false,
    performance: false,
    functional: true,
    data_processing: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load from localStorage
    try {
      const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setConsents(prev => ({ ...prev, ...parsed }));
      }
    } catch {
      // Use defaults
    }
    setIsLoading(false);
  }, []);

  const hasConsentFor = useCallback(
    (type: ConsentType) => consents[type],
    [consents]
  );

  return {
    consents,
    isLoading,
    hasConsentFor,
  };
}

// ============================================================
// SMART DEFAULTS HOOK
// ============================================================

export function useLeaveDefaults(employeeId?: string, department?: string) {
  const [defaults, setDefaults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Generate smart defaults client-side
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Skip weekends
    while (tomorrow.getDay() === 0 || tomorrow.getDay() === 6) {
      tomorrow.setDate(tomorrow.getDate() + 1);
    }

    setDefaults({
      suggestedStartDate: tomorrow.toISOString().split('T')[0],
      suggestedLeaveType: 'casual',
      minNoticeDays: 1,
      maxDaysPerRequest: 14,
    });
    setIsLoading(false);
  }, [employeeId, department]);

  return { defaults, isLoading };
}

export function useDashboardRecommendations(role: 'employee' | 'hr' | 'admin' = 'employee') {
  const [recommendations, setRecommendations] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Generate recommendations based on role
    const recs = {
      employee: [
        { id: 'check-balance', title: 'Check Leave Balance', priority: 'high' },
        { id: 'plan-leave', title: 'Plan Your Next Leave', priority: 'medium' },
      ],
      hr: [
        { id: 'pending-approvals', title: 'Review Pending Requests', priority: 'high' },
        { id: 'attendance-report', title: 'Check Attendance Overview', priority: 'medium' },
      ],
      admin: [
        { id: 'system-health', title: 'Monitor System Health', priority: 'high' },
        { id: 'audit-logs', title: 'Review Audit Logs', priority: 'medium' },
      ],
    };

    setRecommendations(recs[role] || recs.employee);
    setIsLoading(false);
  }, [role]);

  return { recommendations, isLoading };
}
