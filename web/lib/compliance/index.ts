/**
 * 📜 CONTINUUM COMPLIANCE ENGINE - INDEX
 * 
 * Exports all compliance utilities
 */

// Consent management
export {
  recordConsent,
  hasConsent,
  getUserConsents,
  hasRequiredConsents,
  withdrawAllConsents,
  getConsentFormData,
  CONSENT_VERSIONS,
  REQUIRED_CONSENTS,
  OPTIONAL_CONSENTS,
  CONSENT_DESCRIPTIONS,
  type ConsentType,
  type ConsentRecord,
  type ConsentRequest,
} from './consent-manager';

// Data export (GDPR)
export {
  exportUserData,
  exportToCSV,
  deleteUserData,
  type ExportRequest,
  type ExportedData,
  type DeletionRequest,
} from './data-export';

/**
 * Compliance status checker
 */
export async function getComplianceStatus(userId: string): Promise<{
  consentsValid: boolean;
  missingConsents: string[];
  dataExportAvailable: boolean;
  dataDeletionAvailable: boolean;
  lastConsentUpdate: Date | null;
}> {
  const { hasRequiredConsents } = await import('./consent-manager');
  
  const consentStatus = await hasRequiredConsents(userId);
  
  return {
    consentsValid: consentStatus.hasAll,
    missingConsents: consentStatus.missing,
    dataExportAvailable: true, // Always available for GDPR
    dataDeletionAvailable: true, // Always available for GDPR
    lastConsentUpdate: null, // Would need to query audit logs
  };
}

/**
 * Compliance report generator
 */
export async function generateComplianceReport(companyId: string): Promise<{
  generatedAt: string;
  companyId: string;
  metrics: {
    totalEmployees: number;
    employeesWithConsent: number;
    consentRate: number;
    pendingDataRequests: number;
    completedExports: number;
    completedDeletions: number;
  };
  recommendations: string[];
}> {
  // This would query the database for compliance metrics
  // Placeholder implementation
  return {
    generatedAt: new Date().toISOString(),
    companyId,
    metrics: {
      totalEmployees: 0,
      employeesWithConsent: 0,
      consentRate: 0,
      pendingDataRequests: 0,
      completedExports: 0,
      completedDeletions: 0,
    },
    recommendations: [
      'Ensure all employees have reviewed the latest privacy policy',
      'Set up automated consent renewal reminders',
      'Review data retention policies quarterly',
    ],
  };
}
