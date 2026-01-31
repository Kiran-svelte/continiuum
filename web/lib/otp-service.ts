/**
 * OTP (One-Time Password) Service for High-Security Operations
 * 
 * Used for sensitive operations like:
 * - Modifying company settings
 * - Deleting employees
 * - Exporting sensitive data
 * - Changing billing information
 */

import { prisma } from "@/lib/prisma";
import crypto from "crypto";

// OTP Configuration
const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;
const MAX_ATTEMPTS = 3;

// Actions that require OTP verification
export const OTP_REQUIRED_ACTIONS = {
  SETTINGS_CHANGE: "settings_change",
  DELETE_EMPLOYEE: "delete_employee",
  EXPORT_DATA: "export_data",
  BILLING_CHANGE: "billing_change",
  LEAVE_TYPE_CREATE: "leave_type_create",
  LEAVE_TYPE_DELETE: "leave_type_delete",
  RULE_CHANGE: "rule_change",
  WORK_SCHEDULE_CHANGE: "work_schedule_change",
} as const;

export type OtpAction = typeof OTP_REQUIRED_ACTIONS[keyof typeof OTP_REQUIRED_ACTIONS];

/**
 * Generate a random 6-digit OTP
 */
export function generateOtpCode(): string {
  // Generate cryptographically secure random OTP
  const buffer = crypto.randomBytes(4);
  const number = buffer.readUInt32BE(0);
  // Ensure 6 digits by using modulo and padding
  const otp = (number % 1000000).toString().padStart(OTP_LENGTH, "0");
  return otp;
}

/**
 * Hash an OTP code for secure storage
 */
export function hashOtpCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

/**
 * Verify an OTP code against its hash
 */
export function verifyOtpHash(code: string, hash: string): boolean {
  return hashOtpCode(code) === hash;
}

/**
 * Create and store a new OTP token
 */
export async function createOtpToken(params: {
  userId: string;
  companyId: string;
  email: string;
  action: OtpAction;
  context?: Record<string, any>;
}): Promise<{ success: boolean; code?: string; error?: string; expiresAt?: Date }> {
  try {
    // Invalidate any existing OTPs for this user/action
    await prisma.otpToken.updateMany({
      where: {
        user_id: params.userId,
        action: params.action,
        verified_at: null,
        expires_at: { gt: new Date() },
      },
      data: {
        expires_at: new Date(), // Expire immediately
      },
    });

    // Generate new OTP
    const code = generateOtpCode();
    const hashedCode = hashOtpCode(code);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // Store in database
    await prisma.otpToken.create({
      data: {
        user_id: params.userId,
        company_id: params.companyId,
        email: params.email,
        code: hashedCode,
        action: params.action,
        context: params.context || {},
        max_attempts: MAX_ATTEMPTS,
        expires_at: expiresAt,
      },
    });

    return { success: true, code, expiresAt };
  } catch (error: any) {
    console.error("[createOtpToken] Error:", error);
    return { success: false, error: error.message || "Failed to create OTP" };
  }
}

/**
 * Verify an OTP code
 */
export async function verifyOtpToken(params: {
  userId: string;
  action: OtpAction;
  code: string;
}): Promise<{ success: boolean; error?: string; tokenId?: string }> {
  try {
    // Find valid OTP token
    const token = await prisma.otpToken.findFirst({
      where: {
        user_id: params.userId,
        action: params.action,
        verified_at: null,
        expires_at: { gt: new Date() },
      },
      orderBy: { created_at: "desc" },
    });

    if (!token) {
      return { success: false, error: "No valid OTP found. Please request a new one." };
    }

    // Check if max attempts exceeded
    if (token.attempts >= token.max_attempts) {
      // Invalidate the token
      await prisma.otpToken.update({
        where: { id: token.id },
        data: { expires_at: new Date() },
      });
      return { success: false, error: "Maximum attempts exceeded. Please request a new OTP." };
    }

    // Verify the code
    if (!verifyOtpHash(params.code, token.code)) {
      // Increment attempts
      await prisma.otpToken.update({
        where: { id: token.id },
        data: { attempts: token.attempts + 1 },
      });
      const remaining = token.max_attempts - token.attempts - 1;
      return { 
        success: false, 
        error: `Invalid OTP code. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.` 
      };
    }

    // Mark as verified
    await prisma.otpToken.update({
      where: { id: token.id },
      data: { verified_at: new Date() },
    });

    return { success: true, tokenId: token.id };
  } catch (error: any) {
    console.error("[verifyOtpToken] Error:", error);
    return { success: false, error: error.message || "Failed to verify OTP" };
  }
}

/**
 * Check if an action was recently verified with OTP (within 5 minutes)
 */
export async function isRecentlyVerified(params: {
  userId: string;
  action: OtpAction;
  windowMinutes?: number;
}): Promise<boolean> {
  const windowMinutes = params.windowMinutes || 5;
  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);

  const recentVerification = await prisma.otpToken.findFirst({
    where: {
      user_id: params.userId,
      action: params.action,
      verified_at: { gte: windowStart },
    },
  });

  return !!recentVerification;
}

/**
 * Log a settings change to the audit log
 */
export async function logSettingsChange(params: {
  companyId: string;
  userId: string;
  userEmail: string;
  action: string;
  previousValue?: any;
  newValue?: any;
  otpVerified: boolean;
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> {
  try {
    await prisma.settingsAuditLog.create({
      data: {
        company_id: params.companyId,
        user_id: params.userId,
        user_email: params.userEmail,
        action: params.action,
        previous_value: params.previousValue || null,
        new_value: params.newValue || null,
        otp_verified: params.otpVerified,
        ip_address: params.ipAddress,
        user_agent: params.userAgent,
      },
    });
  } catch (error) {
    console.error("[logSettingsChange] Error:", error);
    // Don't throw - audit logging shouldn't break the main operation
  }
}

/**
 * Get OTP status for a user
 */
export async function getOtpStatus(params: {
  userId: string;
  action: OtpAction;
}): Promise<{ 
  hasPendingOtp: boolean; 
  expiresAt?: Date; 
  attemptsRemaining?: number;
}> {
  const token = await prisma.otpToken.findFirst({
    where: {
      user_id: params.userId,
      action: params.action,
      verified_at: null,
      expires_at: { gt: new Date() },
    },
    orderBy: { created_at: "desc" },
  });

  if (!token) {
    return { hasPendingOtp: false };
  }

  return {
    hasPendingOtp: true,
    expiresAt: token.expires_at,
    attemptsRemaining: token.max_attempts - token.attempts,
  };
}
