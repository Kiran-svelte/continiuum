/**
 * 📜 CONTINUUM COMPLIANCE ENGINE - DATA EXPORT
 * 
 * GDPR Data Portability (Article 20) compliance:
 * - Export all user data
 * - Machine-readable formats (JSON, CSV)
 * - Data deletion support
 */

import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit-logger';

// ============================================================
// DATA EXPORT TYPES
// ============================================================

export interface ExportRequest {
  userId: string;
  employeeId: string;
  companyId: string;
  format: 'json' | 'csv';
  includeAuditLogs?: boolean;
  ipAddress?: string;
  userAgent?: string;
}

export interface ExportedData {
  exportedAt: string;
  format: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
  employee: Record<string, unknown> | null;
  leaveRequests: Record<string, unknown>[];
  attendance: Record<string, unknown>[];
  auditLogs?: Record<string, unknown>[];
  consents: Record<string, unknown>[];
}

// ============================================================
// DATA EXPORT FUNCTIONS
// ============================================================

/**
 * Export all user data for GDPR compliance
 */
export async function exportUserData(request: ExportRequest): Promise<{
  success: boolean;
  data?: ExportedData;
  error?: string;
}> {
  try {
    const { userId, employeeId, companyId, format, includeAuditLogs = false, ipAddress, userAgent } = request;

    // Log the export request
    await createAuditLog({
      actor_id: userId,
      action: 'DATA_EXPORT_REQUESTED',
      entity_type: 'User',
      entity_id: userId,
      details: { format, includeAuditLogs },
      ip_address: ipAddress,
      user_agent: userAgent,
      target_org: companyId,
    });

    // Fetch employee data
    const employee = await prisma.employee.findUnique({
      where: { emp_id: employeeId },
      select: {
        emp_id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        phone: true,
        clerk_id: true,
        created_at: true,
        company_id: true,
        manager_id: true,
      },
    });

    // Fetch leave requests
    const leaveRequests = await prisma.leaveRequest.findMany({
      where: { employee_id: employeeId },
      select: {
        id: true,
        type: true,
        start_date: true,
        end_date: true,
        status: true,
        reason: true,
        created_at: true,
        approved_at: true,
        approved_by: true,
      },
    });

    // Fetch attendance records
    const attendance = await prisma.attendance.findMany({
      where: { employee_id: employeeId },
      select: {
        id: true,
        date: true,
        check_in: true,
        check_out: true,
        status: true,
        notes: true,
      },
    });

    // Fetch audit logs if requested
    let auditLogs: Record<string, unknown>[] = [];
    if (includeAuditLogs) {
      const logs = await prisma.auditLog.findMany({
        where: { actor_id: userId },
        orderBy: { created_at: 'desc' },
        take: 1000, // Limit to prevent huge exports
      });
      auditLogs = logs.map(log => ({
        id: log.id,
        action: log.action,
        entityType: log.entity_type,
        entityId: log.entity_id,
        createdAt: log.created_at,
      }));
    }

    // Fetch consent records
    const consentLogs = await prisma.auditLog.findMany({
      where: {
        actor_id: userId,
        entity_type: 'Consent',
      },
      orderBy: { created_at: 'desc' },
    });

    const exportedData: ExportedData = {
      exportedAt: new Date().toISOString(),
      format,
      user: {
        id: userId,
        email: employee?.email || '',
        name: employee?.name || '',
      },
      employee: employee ? {
        id: employee.emp_id,
        name: employee.name,
        email: employee.email,
        role: employee.role,
        department: employee.department,
        phone: employee.phone,
        joinedAt: employee.created_at,
      } : null,
      leaveRequests: leaveRequests.map(lr => ({
        id: lr.id,
        type: lr.type,
        startDate: lr.start_date,
        endDate: lr.end_date,
        status: lr.status,
        reason: lr.reason,
        createdAt: lr.created_at,
        approvedAt: lr.approved_at,
      })),
      attendance: attendance.map(a => ({
        id: a.id,
        date: a.date,
        checkIn: a.check_in,
        checkOut: a.check_out,
        status: a.status,
      })),
      auditLogs: includeAuditLogs ? auditLogs : undefined,
      consents: consentLogs.map(c => ({
        id: c.id,
        action: c.action,
        createdAt: c.created_at,
        details: c.details,
      })),
    };

    // Log successful export
    await createAuditLog({
      actor_id: userId,
      action: 'DATA_EXPORT_COMPLETED',
      entity_type: 'User',
      entity_id: userId,
      details: {
        format,
        recordCounts: {
          leaveRequests: leaveRequests.length,
          attendance: attendance.length,
          auditLogs: auditLogs.length,
          consents: consentLogs.length,
        },
      },
      ip_address: ipAddress,
      user_agent: userAgent,
      target_org: companyId,
    });

    return {
      success: true,
      data: exportedData,
    };
  } catch (error) {
    console.error('Data export failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Export failed',
    };
  }
}

/**
 * Convert exported data to CSV format
 */
export function exportToCSV(data: ExportedData): string {
  const sections: string[] = [];

  // User section
  sections.push('=== USER DATA ===');
  sections.push('ID,Email,Name');
  sections.push(`"${data.user.id}","${data.user.email}","${data.user.name}"`);
  sections.push('');

  // Employee section
  if (data.employee) {
    sections.push('=== EMPLOYEE DATA ===');
    const employeeHeaders = Object.keys(data.employee);
    sections.push(employeeHeaders.join(','));
    sections.push(employeeHeaders.map(h => `"${data.employee![h] || ''}"`).join(','));
    sections.push('');
  }

  // Leave requests section
  sections.push('=== LEAVE REQUESTS ===');
  if (data.leaveRequests.length > 0) {
    const leaveHeaders = Object.keys(data.leaveRequests[0]);
    sections.push(leaveHeaders.join(','));
    data.leaveRequests.forEach(lr => {
      sections.push(leaveHeaders.map(h => `"${(lr as any)[h] || ''}"`).join(','));
    });
  } else {
    sections.push('No leave requests found');
  }
  sections.push('');

  // Attendance section
  sections.push('=== ATTENDANCE ===');
  if (data.attendance.length > 0) {
    const attendanceHeaders = Object.keys(data.attendance[0]);
    sections.push(attendanceHeaders.join(','));
    data.attendance.forEach(a => {
      sections.push(attendanceHeaders.map(h => `"${(a as any)[h] || ''}"`).join(','));
    });
  } else {
    sections.push('No attendance records found');
  }

  return sections.join('\n');
}

// ============================================================
// DATA DELETION (Right to Erasure)
// ============================================================

export interface DeletionRequest {
  userId: string;
  employeeId: string;
  companyId: string;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Delete/anonymize user data (GDPR Right to Erasure)
 * Note: Some data may be retained for legal compliance
 */
export async function deleteUserData(request: DeletionRequest): Promise<{
  success: boolean;
  deletedRecords: Record<string, number>;
  retainedRecords?: Record<string, number>;
  error?: string;
}> {
  try {
    const { userId, employeeId, companyId, reason, ipAddress, userAgent } = request;

    // Log deletion request before processing
    await createAuditLog({
      actor_id: userId,
      action: 'DATA_DELETION_REQUESTED',
      entity_type: 'User',
      entity_id: userId,
      details: { reason },
      ip_address: ipAddress,
      user_agent: userAgent,
      target_org: companyId,
    });

    const deletedRecords: Record<string, number> = {};
    const retainedRecords: Record<string, number> = {};

    // Delete/anonymize attendance records
    const attendanceResult = await prisma.attendance.updateMany({
      where: { employee_id: employeeId },
      data: { notes: '[DELETED]' },
    });
    deletedRecords.attendance = attendanceResult.count;

    // For leave requests, we might need to retain some for legal compliance
    // but anonymize personal details
    const leaveRequests = await prisma.leaveRequest.findMany({
      where: { employee_id: employeeId },
    });
    
    // Approved leaves within retention period should be retained (anonymized)
    const retentionDate = new Date();
    retentionDate.setFullYear(retentionDate.getFullYear() - 7); // 7 year retention
    
    for (const lr of leaveRequests) {
      if (lr.status === 'approved' && lr.created_at > retentionDate) {
        await prisma.leaveRequest.update({
          where: { id: lr.id },
          data: { reason: '[ANONYMIZED]' },
        });
        retainedRecords.leaveRequests = (retainedRecords.leaveRequests || 0) + 1;
      } else {
        await prisma.leaveRequest.delete({
          where: { id: lr.id },
        });
        deletedRecords.leaveRequests = (deletedRecords.leaveRequests || 0) + 1;
      }
    }

    // Anonymize employee record (don't delete to maintain referential integrity)
    await prisma.employee.update({
      where: { emp_id: employeeId },
      data: {
        name: '[DELETED USER]',
        email: `deleted_${userId}@deleted.local`,
        phone: null,
      },
    });
    deletedRecords.employee = 1;

    // Log completion
    await createAuditLog({
      actor_id: 'system',
      action: 'DATA_DELETION_COMPLETED',
      entity_type: 'User',
      entity_id: userId,
      details: { deletedRecords, retainedRecords },
      target_org: companyId,
    });

    return {
      success: true,
      deletedRecords,
      retainedRecords: Object.keys(retainedRecords).length > 0 ? retainedRecords : undefined,
    };
  } catch (error) {
    console.error('Data deletion failed:', error);
    return {
      success: false,
      deletedRecords: {},
      error: error instanceof Error ? error.message : 'Deletion failed',
    };
  }
}
