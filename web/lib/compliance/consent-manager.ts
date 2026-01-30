/**
 * 📜 CONTINUUM COMPLIANCE ENGINE - CONSENT MANAGER
 * 
 * GDPR/Privacy compliant consent management:
 * - Granular consent tracking
 * - Consent version history
 * - Withdrawal support
 * - Audit trail
 */

import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit-logger';

// ============================================================
// CONSENT TYPES
// ============================================================

export type ConsentType = 
  | 'privacy_policy'
  | 'terms_of_service'
  | 'marketing_emails'
  | 'analytics_tracking'
  | 'data_processing'
  | 'third_party_sharing'
  | 'ai_analysis'
  | 'biometric_data'
  | 'location_tracking';

export interface ConsentRecord {
  id: string;
  userId: string;
  consentType: ConsentType;
  granted: boolean;
  version: string;
  grantedAt: Date | null;
  withdrawnAt: Date | null;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export interface ConsentRequest {
  userId: string;
  consentType: ConsentType;
  granted: boolean;
  version: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  companyId: string;
}

// ============================================================
// CONSENT VERSIONS
// ============================================================

/** Current versions of consent documents */
export const CONSENT_VERSIONS: Record<ConsentType, string> = {
  privacy_policy: '2.1.0',
  terms_of_service: '2.0.0',
  marketing_emails: '1.0.0',
  analytics_tracking: '1.0.0',
  data_processing: '1.1.0',
  third_party_sharing: '1.0.0',
  ai_analysis: '1.0.0',
  biometric_data: '1.0.0',
  location_tracking: '1.0.0',
};

/** Required consents for basic platform usage */
export const REQUIRED_CONSENTS: ConsentType[] = [
  'privacy_policy',
  'terms_of_service',
  'data_processing',
];

/** Optional consents that can be toggled */
export const OPTIONAL_CONSENTS: ConsentType[] = [
  'marketing_emails',
  'analytics_tracking',
  'third_party_sharing',
  'ai_analysis',
];

// ============================================================
// CONSENT OPERATIONS
// ============================================================

/**
 * Record a consent action (grant or withdraw)
 */
export async function recordConsent(request: ConsentRequest): Promise<{
  success: boolean;
  consentId?: string;
  error?: string;
}> {
  try {
    const { userId, consentType, granted, version, ipAddress, userAgent, metadata, companyId } = request;

    // Store consent in database (using details JSON in audit log for now)
    // In a full implementation, you'd have a dedicated consents table
    const auditResult = await createAuditLog({
      actor_id: userId,
      action: granted ? 'CONSENT_GRANTED' : 'CONSENT_WITHDRAWN',
      entity_type: 'Consent',
      entity_id: `${userId}_${consentType}`,
      resource_name: consentType,
      new_state: {
        consentType,
        granted,
        version,
      },
      details: {
        consent_version: version,
        current_version: CONSENT_VERSIONS[consentType],
        metadata,
      },
      ip_address: ipAddress,
      user_agent: userAgent,
      target_org: companyId,
    });

    return {
      success: true,
      consentId: auditResult.log_id,
    };
  } catch (error) {
    console.error('Failed to record consent:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check if user has granted a specific consent
 */
export async function hasConsent(
  userId: string,
  consentType: ConsentType
): Promise<boolean> {
  try {
    // Query the most recent consent action for this type
    const latestConsent = await prisma.auditLog.findFirst({
      where: {
        actor_id: userId,
        entity_type: 'Consent',
        entity_id: `${userId}_${consentType}`,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    if (!latestConsent) {
      return false;
    }

    const details = latestConsent.details as Record<string, unknown>;
    return details?.granted === true;
  } catch (error) {
    console.error('Failed to check consent:', error);
    return false;
  }
}

/**
 * Get all consents for a user
 */
export async function getUserConsents(userId: string): Promise<Record<ConsentType, boolean>> {
  const consents: Record<string, boolean> = {};

  for (const consentType of [...REQUIRED_CONSENTS, ...OPTIONAL_CONSENTS]) {
    consents[consentType] = await hasConsent(userId, consentType);
  }

  return consents as Record<ConsentType, boolean>;
}

/**
 * Check if user has all required consents
 */
export async function hasRequiredConsents(userId: string): Promise<{
  hasAll: boolean;
  missing: ConsentType[];
}> {
  const missing: ConsentType[] = [];

  for (const consentType of REQUIRED_CONSENTS) {
    const hasIt = await hasConsent(userId, consentType);
    if (!hasIt) {
      missing.push(consentType);
    }
  }

  return {
    hasAll: missing.length === 0,
    missing,
  };
}

/**
 * Withdraw all consents for a user (GDPR right to withdraw)
 */
export async function withdrawAllConsents(
  userId: string,
  companyId: string,
  options?: {
    ipAddress?: string;
    userAgent?: string;
    reason?: string;
  }
): Promise<{ success: boolean; withdrawnCount: number }> {
  const allConsentTypes = [...REQUIRED_CONSENTS, ...OPTIONAL_CONSENTS];
  let withdrawnCount = 0;

  for (const consentType of allConsentTypes) {
    const hasIt = await hasConsent(userId, consentType);
    if (hasIt) {
      await recordConsent({
        userId,
        consentType,
        granted: false,
        version: CONSENT_VERSIONS[consentType],
        companyId,
        ipAddress: options?.ipAddress,
        userAgent: options?.userAgent,
        metadata: { withdrawalReason: options?.reason },
      });
      withdrawnCount++;
    }
  }

  return { success: true, withdrawnCount };
}

// ============================================================
// CONSENT UI HELPERS
// ============================================================

/** Human-readable consent descriptions */
export const CONSENT_DESCRIPTIONS: Record<ConsentType, {
  title: string;
  description: string;
  required: boolean;
}> = {
  privacy_policy: {
    title: 'Privacy Policy',
    description: 'I have read and agree to the Privacy Policy, which explains how my personal data is collected, used, and protected.',
    required: true,
  },
  terms_of_service: {
    title: 'Terms of Service',
    description: 'I agree to the Terms of Service, which govern my use of the platform.',
    required: true,
  },
  marketing_emails: {
    title: 'Marketing Communications',
    description: 'I agree to receive promotional emails, newsletters, and product updates. I can unsubscribe at any time.',
    required: false,
  },
  analytics_tracking: {
    title: 'Analytics & Improvements',
    description: 'I allow the use of analytics cookies to help improve the platform experience.',
    required: false,
  },
  data_processing: {
    title: 'Data Processing',
    description: 'I consent to the processing of my personal and employment data as necessary for the HR platform functionality.',
    required: true,
  },
  third_party_sharing: {
    title: 'Third-Party Integrations',
    description: 'I allow sharing of my data with authorized third-party services (e.g., payroll, benefits providers) as configured by my employer.',
    required: false,
  },
  ai_analysis: {
    title: 'AI-Powered Features',
    description: 'I consent to AI analysis of my work patterns to provide personalized recommendations and insights.',
    required: false,
  },
  biometric_data: {
    title: 'Biometric Data',
    description: 'I consent to the collection of biometric data (e.g., facial recognition for attendance) where applicable.',
    required: false,
  },
  location_tracking: {
    title: 'Location Services',
    description: 'I allow location tracking for attendance verification and geofencing features.',
    required: false,
  },
};

/**
 * Get consent UI data for rendering consent forms
 */
export function getConsentFormData() {
  return {
    required: REQUIRED_CONSENTS.map(type => ({
      type,
      ...CONSENT_DESCRIPTIONS[type],
      version: CONSENT_VERSIONS[type],
    })),
    optional: OPTIONAL_CONSENTS.map(type => ({
      type,
      ...CONSENT_DESCRIPTIONS[type],
      version: CONSENT_VERSIONS[type],
    })),
  };
}
