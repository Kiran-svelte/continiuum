/**
 * OTP Send API Endpoint
 * POST /api/security/otp/send
 * 
 * Sends an OTP to the user's email for verifying sensitive operations
 */

import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { 
  createOtpToken, 
  OTP_REQUIRED_ACTIONS, 
  type OtpAction 
} from "@/lib/otp-service";
import { sendEmail } from "@/lib/email-service";

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, context } = body;

    // Validate action
    if (!action || !Object.values(OTP_REQUIRED_ACTIONS).includes(action)) {
      return NextResponse.json(
        { error: "Invalid action type" },
        { status: 400 }
      );
    }

    // Get employee and company info
    const employee = await prisma.employee.findUnique({
      where: { clerk_id: user.id },
      select: { 
        emp_id: true,
        email: true, 
        org_id: true, 
        role: true,
        full_name: true,
      },
    });

    if (!employee || !employee.org_id) {
      return NextResponse.json(
        { error: "Employee not found or not associated with a company" },
        { status: 404 }
      );
    }

    // Only HR/Admin can perform sensitive operations
    const allowedRoles = ["hr", "admin", "hr_manager", "super_admin"];
    if (!allowedRoles.includes((employee.role || "").toLowerCase())) {
      return NextResponse.json(
        { error: "Not authorized to perform this action" },
        { status: 403 }
      );
    }

    // Create OTP token
    const result = await createOtpToken({
      userId: user.id,
      companyId: employee.org_id,
      email: employee.email,
      action: action as OtpAction,
      context: context || {},
    });

    if (!result.success || !result.code) {
      return NextResponse.json(
        { error: result.error || "Failed to generate OTP" },
        { status: 500 }
      );
    }

    // Get action description for email
    const actionDescriptions: Record<string, string> = {
      settings_change: "modify company settings",
      delete_employee: "delete an employee",
      export_data: "export sensitive data",
      billing_change: "modify billing information",
      leave_type_create: "create a new leave type",
      leave_type_delete: "delete a leave type",
      rule_change: "modify company rules",
      work_schedule_change: "change work schedule",
    };
    const actionDescription = actionDescriptions[action] || "perform a sensitive operation";

    // Send OTP email
    const emailResult = await sendEmail({
      to: employee.email,
      subject: `Security Verification Code - ${result.code}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #6366f1;">🔐 Security Verification Required</h2>
          
          <p>Hi ${employee.full_name || "there"},</p>
          
          <p>You are attempting to <strong>${actionDescription}</strong> in your HR Settings.</p>
          
          <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); 
                      padding: 30px; 
                      border-radius: 12px; 
                      text-align: center; 
                      margin: 30px 0;">
            <p style="color: rgba(255,255,255,0.8); margin: 0 0 10px 0; font-size: 14px;">
              Your verification code is:
            </p>
            <div style="background: rgba(255,255,255,0.15); 
                        border-radius: 8px; 
                        padding: 20px; 
                        display: inline-block;">
              <span style="font-size: 36px; 
                          letter-spacing: 8px; 
                          font-weight: bold; 
                          color: white;
                          font-family: 'Courier New', monospace;">
                ${result.code}
              </span>
            </div>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            ⏰ This code expires in <strong>10 minutes</strong>.
          </p>
          
          <p style="color: #666; font-size: 14px;">
            ⚠️ If you didn't request this verification, please contact your administrator immediately.
          </p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          
          <p style="color: #999; font-size: 12px;">
            This is an automated security email from Continiuum HR.
            <br>
            Do not share this code with anyone.
          </p>
        </div>
      `,
    });

    if (!emailResult.success) {
      console.error("[OTP Send] Email failed:", emailResult.error);
      // In development/staging, show the OTP in the response for testing
      // WARNING: Remove this in production!
      const isDev = process.env.NODE_ENV === 'development' || process.env.VERCEL_ENV === 'preview';
      return NextResponse.json({
        success: true,
        message: `Verification code sent to ${maskEmail(employee.email)}`,
        expiresAt: result.expiresAt,
        // For testing: include OTP code when email fails (only in dev/staging)
        ...(isDev && { debugCode: result.code, emailError: emailResult.error }),
      });
    }

    // Return success (but don't expose the OTP code in response for security)
    return NextResponse.json({
      success: true,
      message: `Verification code sent to ${maskEmail(employee.email)}`,
      expiresAt: result.expiresAt,
    });
  } catch (error: any) {
    console.error("[OTP Send] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send OTP" },
      { status: 500 }
    );
  }
}

// Mask email for privacy
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (local.length <= 2) return email;
  const masked = local[0] + "***" + local[local.length - 1];
  return `${masked}@${domain}`;
}
