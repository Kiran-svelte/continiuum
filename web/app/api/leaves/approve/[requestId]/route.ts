/**
 * Approve Leave Request API
 * POST /api/leaves/approve/[requestId]
 *
 * Approves a pending/escalated leave request
 */

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { createAuditLog, AUDIT_ACTIONS } from "@/lib/audit-logger";
import { sendLeaveApprovalEmail } from "@/lib/email-service";
import { revalidatePath } from "next/cache";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { requestId } = await params;
    const body = await request.json();
    const { comments } = body;

    // Find the HR employee
    const hrEmployee = await prisma.employee.findUnique({
      where: { clerk_id: user.id },
      select: { emp_id: true, role: true, org_id: true, full_name: true },
    });

    if (!hrEmployee) {
      return NextResponse.json(
        { success: false, error: "Employee not found" },
        { status: 404 }
      );
    }

    // Only HR/Admin/Manager can approve
    const allowedRoles = ["hr", "admin", "manager"];
    if (!allowedRoles.includes((hrEmployee.role || "").toLowerCase())) {
      return NextResponse.json(
        { success: false, error: "Not authorized to approve leaves" },
        { status: 403 }
      );
    }

    // Find the leave request (request_id is a string, NOT int)
    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { request_id: requestId },
      include: {
        employee: {
          select: { org_id: true, full_name: true, email: true, emp_id: true },
        },
      },
    });

    if (!leaveRequest) {
      return NextResponse.json(
        { success: false, error: "Leave request not found" },
        { status: 404 }
      );
    }

    // Verify HR is from same company
    if (leaveRequest.employee.org_id !== hrEmployee.org_id) {
      return NextResponse.json(
        { success: false, error: "Not authorized for this company" },
        { status: 403 }
      );
    }

    // Check if already processed - allow both "pending" and "escalated"
    if (leaveRequest.status !== "pending" && leaveRequest.status !== "escalated") {
      return NextResponse.json(
        { success: false, error: `Request already ${leaveRequest.status}` },
        { status: 400 }
      );
    }

    const totalDays = Number(leaveRequest.total_days);

    // Atomic transaction: update request + update balance
    const updatedRequest = await prisma.$transaction(async (tx) => {
      // 1. Update the leave request to approved
      const updated = await tx.leaveRequest.update({
        where: { request_id: requestId },
        data: {
          status: "approved",
          approved_by: hrEmployee.emp_id,
          approved_at: new Date(),
          approver_comments: comments || null,
        },
      });

      // 2. Update employee's leave balance
      const existingBalance = await tx.leaveBalance.findFirst({
        where: {
          emp_id: leaveRequest.emp_id,
          leave_type: leaveRequest.leave_type,
          year: new Date().getFullYear(),
        },
      });

      if (existingBalance) {
        // Move from pending_days to used_days
        const pendingDecrement = Math.min(
          Number(existingBalance.pending_days),
          totalDays
        );

        await tx.leaveBalance.update({
          where: { balance_id: existingBalance.balance_id },
          data: {
            used_days: { increment: totalDays },
            pending_days: { decrement: pendingDecrement },
          },
        });
      }

      return updated;
    });

    // Audit log
    await createAuditLog({
      actor_id: hrEmployee.emp_id,
      actor_role: hrEmployee.role,
      action: AUDIT_ACTIONS.LEAVE_APPROVED || "LEAVE_APPROVED",
      entity_type: "LeaveRequest",
      entity_id: requestId,
      resource_name: `${leaveRequest.leave_type} - ${totalDays} days`,
      previous_state: { status: leaveRequest.status },
      new_state: { status: "approved", approved_by: hrEmployee.emp_id },
      details: { comments },
      target_org: hrEmployee.org_id || "unknown",
    }).catch((err) => console.error("Audit log failed:", err));

    // Send approval email to employee
    sendLeaveApprovalEmail(
      { email: leaveRequest.employee.email, full_name: leaveRequest.employee.full_name },
      {
        leaveType: leaveRequest.leave_type,
        startDate: leaveRequest.start_date.toLocaleDateString("en-US", {
          weekday: "long", year: "numeric", month: "long", day: "numeric",
        }),
        endDate: leaveRequest.end_date.toLocaleDateString("en-US", {
          weekday: "long", year: "numeric", month: "long", day: "numeric",
        }),
        totalDays,
        approvedBy: hrEmployee.full_name,
        reason: comments || "Approved by HR",
      }
    ).catch((err) => console.error("Email notification failed:", err));

    // Revalidate pages
    revalidatePath("/hr/dashboard");
    revalidatePath("/hr/leave-requests");
    revalidatePath("/hr/approvals");
    revalidatePath("/employee/dashboard");
    revalidatePath("/employee/my-history");

    return NextResponse.json({
      success: true,
      message: "Leave request approved successfully",
      request: {
        request_id: updatedRequest.request_id,
        status: updatedRequest.status,
        approved_by: updatedRequest.approved_by,
        approved_at: updatedRequest.approved_at,
      },
    });
  } catch (error: any) {
    console.error("[Approve Leave] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to approve request" },
      { status: 500 }
    );
  }
}
