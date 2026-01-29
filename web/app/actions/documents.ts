'use server';

/**
 * 📄 DOCUMENT MANAGEMENT
 * 
 * Server actions for uploading and managing employee documents.
 * Stores file metadata in database, with base64 content for small files
 * or external storage URLs for larger files.
 */

import { currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { DocType } from '@prisma/client';

interface UploadDocumentInput {
    employeeId: string;
    type: DocType;
    fileName: string;
    fileContent: string; // Base64 encoded content for small files, or external URL
    contentType: string;
    fileSize: number;
}

interface DocumentResult {
    success: boolean;
    document?: {
        id: string;
        name: string;
        type: DocType;
        fileUrl: string;
        uploadedAt: string;
    };
    error?: string;
}

/**
 * Get current user's employee record
 */
async function getCurrentEmployee() {
    const user = await currentUser();
    if (!user) return null;
    
    return prisma.employee.findUnique({
        where: { clerk_id: user.id },
        include: { company: true }
    });
}

/**
 * Check if user has HR access
 */
async function hasHRAccess(): Promise<{ hasAccess: boolean; orgId?: string }> {
    const user = await currentUser();
    if (!user) return { hasAccess: false };
    
    const employee = await prisma.employee.findUnique({
        where: { clerk_id: user.id },
        select: { role: true, org_id: true }
    });
    
    if (!employee) return { hasAccess: false };
    
    const hrRoles = ['HR', 'ADMIN', 'hr', 'admin', 'HR_MANAGER'];
    return { 
        hasAccess: hrRoles.includes(employee.role),
        orgId: employee.org_id || undefined
    };
}

/**
 * Upload a document for an employee
 * For small files (<5MB), stores base64 in database via data URL
 * For larger files, expects an external storage URL
 */
export async function uploadDocument(input: UploadDocumentInput): Promise<DocumentResult> {
    try {
        const { hasAccess, orgId } = await hasHRAccess();
        
        // Allow self-upload for employees
        const employee = await getCurrentEmployee();
        const isSelfUpload = employee?.emp_id === input.employeeId;
        
        if (!hasAccess && !isSelfUpload) {
            return { success: false, error: 'Unauthorized to upload documents' };
        }
        
        // Verify employee exists and belongs to same org
        const targetEmployee = await prisma.employee.findUnique({
            where: { emp_id: input.employeeId },
            select: { emp_id: true, org_id: true }
        });
        
        if (!targetEmployee) {
            return { success: false, error: 'Employee not found' };
        }
        
        if (hasAccess && targetEmployee.org_id !== orgId) {
            return { success: false, error: 'Employee belongs to different organization' };
        }
        
        // Validate file size (max 10MB)
        const maxSize = 10 * 1024 * 1024;
        if (input.fileSize > maxSize) {
            return { success: false, error: 'File too large. Maximum size is 10MB.' };
        }
        
        // Determine file URL
        // For small files, create data URL; for external storage, use provided URL
        let fileUrl: string;
        if (input.fileContent.startsWith('http://') || input.fileContent.startsWith('https://')) {
            fileUrl = input.fileContent;
        } else if (input.fileContent.startsWith('data:')) {
            fileUrl = input.fileContent;
        } else {
            // Assume base64, create data URL
            fileUrl = `data:${input.contentType};base64,${input.fileContent}`;
        }
        
        // Create document record
        const document = await prisma.document.create({
            data: {
                emp_id: input.employeeId,
                type: input.type,
                name: input.fileName,
                file_url: fileUrl,
                verified: false, // HR needs to verify
            }
        });
        
        // Log the upload
        await prisma.auditLog.create({
            data: {
                action: 'DOCUMENT_UPLOADED',
                entity_type: 'Document',
                entity_id: document.id,
                actor_type: 'user',
                actor_id: employee?.emp_id || 'unknown',
                target_org: targetEmployee.org_id || 'unknown',
                details: {
                    documentType: input.type,
                    fileName: input.fileName,
                    fileSize: input.fileSize,
                    employeeId: input.employeeId,
                }
            }
        });
        
        revalidatePath('/hr/employees');
        revalidatePath(`/employee/profile`);
        
        return {
            success: true,
            document: {
                id: document.id,
                name: document.name,
                type: document.type as DocType,
                fileUrl: document.file_url,
                uploadedAt: document.uploaded_at.toISOString(),
            }
        };
        
    } catch (error) {
        console.error('[Documents] Upload error:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Failed to upload document' 
        };
    }
}

/**
 * Get documents for an employee
 */
export async function getEmployeeDocuments(employeeId: string): Promise<{
    success: boolean;
    documents?: Array<{
        id: string;
        name: string;
        type: DocType;
        fileUrl: string;
        verified: boolean;
        uploadedAt: string;
    }>;
    error?: string;
}> {
    try {
        const { hasAccess, orgId } = await hasHRAccess();
        const employee = await getCurrentEmployee();
        const isSelf = employee?.emp_id === employeeId;
        
        if (!hasAccess && !isSelf) {
            return { success: false, error: 'Unauthorized to view documents' };
        }
        
        // Verify target employee
        const targetEmployee = await prisma.employee.findUnique({
            where: { emp_id: employeeId },
            select: { org_id: true }
        });
        
        if (!targetEmployee) {
            return { success: false, error: 'Employee not found' };
        }
        
        if (hasAccess && targetEmployee.org_id !== orgId) {
            return { success: false, error: 'Unauthorized' };
        }
        
        const documents = await prisma.document.findMany({
            where: { emp_id: employeeId },
            orderBy: { uploaded_at: 'desc' }
        });
        
        return {
            success: true,
            documents: documents.map(doc => ({
                id: doc.id,
                name: doc.name,
                type: doc.type as DocType,
                fileUrl: doc.file_url,
                verified: doc.verified,
                uploadedAt: doc.uploaded_at.toISOString(),
            }))
        };
        
    } catch (error) {
        console.error('[Documents] Get error:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Failed to fetch documents' 
        };
    }
}

/**
 * Verify a document (HR only)
 */
export async function verifyDocument(documentId: string, verified: boolean): Promise<{
    success: boolean;
    error?: string;
}> {
    try {
        const { hasAccess, orgId } = await hasHRAccess();
        if (!hasAccess) {
            return { success: false, error: 'HR access required' };
        }
        
        const document = await prisma.document.findUnique({
            where: { id: documentId },
            include: { employee: { select: { org_id: true } } }
        });
        
        if (!document) {
            return { success: false, error: 'Document not found' };
        }
        
        if (document.employee.org_id !== orgId) {
            return { success: false, error: 'Unauthorized' };
        }
        
        await prisma.document.update({
            where: { id: documentId },
            data: { verified }
        });
        
        // Log verification
        const employee = await getCurrentEmployee();
        await prisma.auditLog.create({
            data: {
                action: verified ? 'DOCUMENT_VERIFIED' : 'DOCUMENT_UNVERIFIED',
                entity_type: 'Document',
                entity_id: documentId,
                actor_type: 'user',
                actor_id: employee?.emp_id || 'unknown',
                target_org: orgId!,
                details: { verified }
            }
        });
        
        revalidatePath('/hr/employees');
        
        return { success: true };
        
    } catch (error) {
        console.error('[Documents] Verify error:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Failed to verify document' 
        };
    }
}

/**
 * Delete a document
 */
export async function deleteDocument(documentId: string): Promise<{
    success: boolean;
    error?: string;
}> {
    try {
        const { hasAccess, orgId } = await hasHRAccess();
        const employee = await getCurrentEmployee();
        
        const document = await prisma.document.findUnique({
            where: { id: documentId },
            include: { employee: { select: { org_id: true, emp_id: true } } }
        });
        
        if (!document) {
            return { success: false, error: 'Document not found' };
        }
        
        const isSelf = document.employee.emp_id === employee?.emp_id;
        const isHRSameOrg = hasAccess && document.employee.org_id === orgId;
        
        if (!isSelf && !isHRSameOrg) {
            return { success: false, error: 'Unauthorized to delete document' };
        }
        
        // Don't allow deleting verified documents without HR access
        if (document.verified && !hasAccess) {
            return { success: false, error: 'Cannot delete verified documents. Contact HR.' };
        }
        
        await prisma.document.delete({
            where: { id: documentId }
        });
        
        // Log deletion
        await prisma.auditLog.create({
            data: {
                action: 'DOCUMENT_DELETED',
                entity_type: 'Document',
                entity_id: documentId,
                actor_type: 'user',
                actor_id: employee?.emp_id || 'unknown',
                target_org: document.employee.org_id || 'unknown',
                details: {
                    documentName: document.name,
                    documentType: document.type,
                }
            }
        });
        
        revalidatePath('/hr/employees');
        revalidatePath('/employee/profile');
        
        return { success: true };
        
    } catch (error) {
        console.error('[Documents] Delete error:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Failed to delete document' 
        };
    }
}
