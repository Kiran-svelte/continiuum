/**
 * OTP Verify API Endpoint
 * POST /api/security/otp/verify
 * 
 * Verifies an OTP code for sensitive operations
 */

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { 
  verifyOtpToken, 
  logSettingsChange,
  OTP_REQUIRED_ACTIONS, 
  type OtpAction 
} from "@/lib/otp-service";
import { prisma } from "@/lib/prisma";

// Alias for compatibility during Clerk to Supabase migration
const currentUser = getUser;

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, code } = body;

    // Validate inputs
    if (!action || !Object.values(OTP_REQUIRED_ACTIONS).includes(action)) {
      return NextResponse.json(
        { error: "Invalid action type" },
        { status: 400 }
      );
    }

    if (!code || typeof code !== "string" || code.length !== 6) {
      return NextResponse.json(
        { error: "Invalid OTP code format" },
        { status: 400 }
      );
    }

    // Verify the OTP
    const result = await verifyOtpToken({
      userId: user.id,
      action: action as OtpAction,
      code: code,
    });

    if (!result.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error || "Invalid OTP" 
        },
        { status: 400 }
      );
    }

    // Get employee info for audit log
    const employee = await prisma.employee.findUnique({
      where: { clerk_id: user.id },
      select: { org_id: true, email: true },
    });

    // Log the successful verification
    if (employee?.org_id) {
      await logSettingsChange({
        companyId: employee.org_id,
        userId: user.id,
        userEmail: employee.email,
        action: `otp_verified_${action}`,
        otpVerified: true,
        ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || undefined,
        userAgent: request.headers.get("user-agent") || undefined,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Verification successful",
      tokenId: result.tokenId,
    });
  } catch (error: any) {
    console.error("[OTP Verify] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to verify OTP" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/security/otp/verify
 * Check OTP status for a given action
 */
export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const action = request.nextUrl.searchParams.get("action");
    
    if (!action || !Object.values(OTP_REQUIRED_ACTIONS).includes(action as any)) {
      return NextResponse.json(
        { error: "Invalid action type" },
        { status: 400 }
      );
    }

    // Check for pending OTP
    const pendingOtp = await prisma.otpToken.findFirst({
      where: {
        user_id: user.id,
        action: action,
        verified_at: null,
        expires_at: { gt: new Date() },
      },
      orderBy: { created_at: "desc" },
      select: {
        expires_at: true,
        attempts: true,
        max_attempts: true,
      },
    });

    // Check for recent verification (within 5 minutes)
    const recentVerification = await prisma.otpToken.findFirst({
      where: {
        user_id: user.id,
        action: action,
        verified_at: { 
          gte: new Date(Date.now() - 5 * 60 * 1000) // 5 minutes ago
        },
      },
    });

    return NextResponse.json({
      hasPendingOtp: !!pendingOtp,
      expiresAt: pendingOtp?.expires_at,
      attemptsRemaining: pendingOtp 
        ? pendingOtp.max_attempts - pendingOtp.attempts 
        : undefined,
      isRecentlyVerified: !!recentVerification,
    });
  } catch (error: any) {
    console.error("[OTP Status] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get OTP status" },
      { status: 500 }
    );
  }
}
