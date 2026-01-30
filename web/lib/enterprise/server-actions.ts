"use server";

/**
 * 🏢 CONTINUUM ENTERPRISE SERVER ACTIONS
 * 
 * Server-side utilities for enterprise-grade operations:
 * - Database operations with reliability
 * - Validated data processing
 * - Audit logging
 * - Compliance tracking
 */

import { prisma } from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";
import { withRetry, getCircuitBreaker } from "@/lib/reliability";
import { validateLeaveRequest, validateEmployee, ValidationResult } from "@/lib/integrity";
import { logAudit, AuditAction } from "@/lib/audit";

// Circuit breakers for external services
const aiCircuitBreaker = getCircuitBreaker('ai-engine');
const emailCircuitBreaker = getCircuitBreaker('email-service');

// ============================================================
// RELIABLE DATABASE OPERATIONS
// ============================================================

/**
 * Execute a Prisma operation with retry logic
 */
export async function reliablePrismaOperation<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const result = await withRetry(operation, {
      maxRetries: 3,
      baseDelay: 500,
      maxDelay: 5000,
      shouldRetry: (error) => {
        // Retry on connection errors
        const errorCode = (error as any)?.code;
        return ['P1001', 'P1002', 'P1017', 'P2024'].includes(errorCode);
      },
      onRetry: (error, attempt) => {
        console.warn(`[${operationName}] Retry ${attempt}:`, (error as Error).message);
      },
    });

    if (result.success) {
      return { success: true, data: result.data };
    } else {
      return { 
        success: false, 
        error: result.error instanceof Error 
          ? result.error.message 
          : 'Operation failed after retries' 
      };
    }
  } catch (error) {
    console.error(`[${operationName}] Fatal error:`, error);
    return { 
      success: false, 
      error: 'A database error occurred. Please try again later.' 
    };
  }
}

// ============================================================
// VALIDATED LEAVE REQUEST SUBMISSION
// ============================================================

export interface ValidatedLeaveInput {
  type: string;
  start_date: string;
  end_date: string;
  reason: string;
  is_half_day?: boolean;
  half_day_type?: 'morning' | 'afternoon';
}

/**
 * Submit leave request with full validation and reliability
 */
export async function submitValidatedLeaveRequest(
  input: ValidatedLeaveInput
): Promise<{ success: boolean; data?: any; errors?: string[] }> {
  const user = await currentUser();
  if (!user) {
    return { success: false, errors: ['Unauthorized'] };
  }

  // 1. Validate input with Zod schema
  const validation = validateLeaveRequest({
    type: input.type as any,
    start_date: new Date(input.start_date),
    end_date: new Date(input.end_date),
    reason: input.reason,
    is_half_day: input.is_half_day || false,
    half_day_type: input.half_day_type,
  });

  if (!validation.success) {
    return { 
      success: false, 
      errors: validation.errors?.map(e => e.message) || ['Validation failed'] 
    };
  }

  // 2. Get employee with reliability
  const employeeResult = await reliablePrismaOperation(
    () => prisma.employee.findUnique({
      where: { clerk_id: user.id },
      include: { company: true }
    }),
    'getEmployee'
  );

  if (!employeeResult.success || !employeeResult.data) {
    return { success: false, errors: ['Employee not found'] };
  }

  const employee = employeeResult.data;

  // 3. Create leave request with reliability
  const createResult = await reliablePrismaOperation(
    () => prisma.leaveRequest.create({
      data: {
        emp_id: employee.emp_id,
        leave_type: input.type,
        start_date: new Date(input.start_date),
        end_date: new Date(input.end_date),
        reason: validation.data!.reason,
        is_half_day: input.is_half_day || false,
        status: 'pending',
        total_days: calculateDays(input.start_date, input.end_date, input.is_half_day),
        working_days: calculateDays(input.start_date, input.end_date, input.is_half_day),
      }
    }),
    'createLeaveRequest'
  );

  if (!createResult.success) {
    return { success: false, errors: [createResult.error || 'Failed to create request'] };
  }

  // 4. Log audit
  if (employee.org_id) {
    await logAudit({
      action: AuditAction.LEAVE_CREATED,
      actorId: user.id,
      entityType: 'leave_request',
      entityId: createResult.data?.request_id || '',
      orgId: employee.org_id,
      details: {
        requestId: createResult.data?.request_id,
        type: input.type,
        days: calculateDays(input.start_date, input.end_date, input.is_half_day),
      }
    });
  }

  return { success: true, data: createResult.data };
}

function calculateDays(start: string, end: string, isHalfDay?: boolean): number {
  if (isHalfDay) return 0.5;
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

// ============================================================
// GDPR COMPLIANCE ACTIONS
// ============================================================

/**
 * Record user consent for a specific purpose
 */
export async function recordUserConsent(
  consentType: 'analytics' | 'marketing' | 'performance' | 'functional' | 'data_processing',
  granted: boolean
) {
  const user = await currentUser();
  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  const employee = await prisma.employee.findUnique({
    where: { clerk_id: user.id },
    select: { emp_id: true, org_id: true }
  });

  if (!employee) {
    return { success: false, error: 'Employee not found' };
  }

  try {
    // Store consent in local storage on client side
    // Server-side we just log the audit
    if (employee.org_id) {
      await logAudit({
        action: AuditAction.SETTINGS_UPDATED,
        actorId: user.id,
        entityType: 'consent',
        entityId: employee.emp_id,
        orgId: employee.org_id,
        details: { consentType, granted }
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to record consent:', error);
    return { success: false, error: 'Failed to update consent preferences' };
  }
}

/**
 * Export all user data for GDPR compliance
 */
export async function requestDataExport(format: 'json' | 'csv' = 'json') {
  const user = await currentUser();
  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  const employee = await prisma.employee.findUnique({
    where: { clerk_id: user.id },
    include: {
      leave_requests: true,
      attendances: true,
      leave_balances: true
    }
  });

  if (!employee) {
    return { success: false, error: 'Employee not found' };
  }

  try {
    // Compile all user data
    const exportData = {
      profile: {
        name: employee.full_name,
        email: employee.email,
        department: employee.department,
        position: employee.position,
        hire_date: employee.hire_date,
        country_code: employee.country_code,
      },
      leaveRequests: employee.leave_requests.map(lr => ({
        type: lr.leave_type,
        startDate: lr.start_date,
        endDate: lr.end_date,
        status: lr.status,
        reason: lr.reason,
        createdAt: lr.created_at,
      })),
      attendance: employee.attendances.map(a => ({
        date: a.date,
        checkIn: a.check_in,
        checkOut: a.check_out,
        status: a.status,
      })),
      leaveBalances: employee.leave_balances.map(b => ({
        type: b.leave_type,
        year: b.year,
        entitlement: Number(b.annual_entitlement),
        used: Number(b.used_days),
        remaining: Number(b.annual_entitlement) - Number(b.used_days),
      })),
      exportedAt: new Date().toISOString(),
    };

    // Log audit
    if (employee.org_id) {
      await logAudit({
        action: AuditAction.DATA_EXPORTED,
        actorId: user.id,
        entityType: 'employee',
        entityId: employee.emp_id,
        orgId: employee.org_id,
        details: { format }
      });
    }

    return { success: true, data: exportData };
  } catch (error) {
    console.error('Failed to export data:', error);
    return { success: false, error: 'Failed to export data' };
  }
}

/**
 * Request deletion of all user data (GDPR Right to Erasure)
 */
export async function requestDataDeletion() {
  const user = await currentUser();
  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  const employee = await prisma.employee.findUnique({
    where: { clerk_id: user.id },
    select: { emp_id: true, org_id: true }
  });

  if (!employee) {
    return { success: false, error: 'Employee not found' };
  }

  try {
    // Log the deletion request (data will be handled by admin)
    if (employee.org_id) {
      await logAudit({
        action: AuditAction.GDPR_REQUEST,
        actorId: user.id,
        entityType: 'employee',
        entityId: employee.emp_id,
        orgId: employee.org_id,
        details: { 
          requestType: 'deletion',
          requestedAt: new Date().toISOString() 
        }
      });
    }

    // Mark the request - actual deletion requires admin approval
    return { 
      success: true, 
      message: 'Deletion request submitted. An administrator will process your request within 30 days.' 
    };
  } catch (error) {
    console.error('Failed to process deletion request:', error);
    return { success: false, error: 'Failed to process deletion request' };
  }
}

// ============================================================
// ENTERPRISE HEALTH CHECKS
// ============================================================

export async function getSystemHealth() {
  const checks = {
    database: false,
    aiEngine: false,
    emailService: false,
    overall: 'unhealthy' as 'healthy' | 'degraded' | 'unhealthy',
  };

  // Check database
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = true;
  } catch {
    checks.database = false;
  }

  // Check circuit breaker states
  checks.aiEngine = !aiCircuitBreaker.isOpen;
  checks.emailService = !emailCircuitBreaker.isOpen;

  // Calculate overall health
  const healthyCount = [checks.database, checks.aiEngine, checks.emailService]
    .filter(Boolean).length;
  
  if (healthyCount === 3) {
    checks.overall = 'healthy';
  } else if (healthyCount >= 1) {
    checks.overall = 'degraded';
  } else {
    checks.overall = 'unhealthy';
  }

  return checks;
}
