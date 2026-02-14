/**
 * Reject Leave Request API
 * POST /api/leaves/reject/[requestId]
 *
 * Rejects a pending/escalated leave request
 */

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { createAuditLog, AUDIT_ACTIONS } from "@/lib/audit-logger";
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
    const { reason, comments } = body;

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

    // Only HR/Admin/Manager can reject
    const allowedRoles = ["hr", "admin", "manager"];
    if (!allowedRoles.includes((hrEmployee.role || "").toLowerCase())) {
      return NextResponse.json(
        { success: false, error: "Not authorized to reject leaves" },
        { status: 403 }
      );
    }

    // Find the leave request (request_id is a string, NOT int)
    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { request_id: requestId },
      include: {
        employee: {
          select: { org_id: true, full_name: true, email: true },
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

    // Atomic transaction: update request + release pending balance
    const updatedRequest = await prisma.$transaction(async (tx) => {
      // 1. Update the leave request to rejected
      const updated = await tx.leaveRequest.update({
        where: { request_id: requestId },
        data: {
          status: "rejected",
          approved_by: hrEmployee.emp_id,
          approved_at: new Date(),
          rejection_reason: reason || comments || "Rejected by HR",
          approver_comments: comments || null,
        },
      });

      // 2. Release pending days back to available
      const existingBalance = await tx.leaveBalance.findFirst({
        where: {
          emp_id: leaveRequest.emp_id,
          leave_type: leaveRequest.leave_type,
          year: new Date().getFullYear(),
        },
      });

      if (existingBalance && Number(existingBalance.pending_days) > 0) {
        const pendingDecrement = Math.min(
          Number(existingBalance.pending_days),
          totalDays
        );

        await tx.leaveBalance.update({
          where: { balance_id: existingBalance.balance_id },
          data: {
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
      action: AUDIT_ACTIONS.LEAVE_REJECTED || "LEAVE_REJECTED",
      entity_type: "LeaveRequest",
      entity_id: requestId,
      resource_name: `${leaveRequest.leave_type} - ${totalDays} days`,
      previous_state: { status: leaveRequest.status },
      new_state: { status: "rejected", rejection_reason: reason || comments },
      details: { reason, comments },
      target_org: hrEmployee.org_id || "unknown",
    }).catch((err) => console.error("Audit log failed:", err));

    // Revalidate pages
    revalidatePath("/hr/dashboard");
    revalidatePath("/hr/leave-requests");
    revalidatePath("/hr/approvals");
    revalidatePath("/employee/dashboard");
    revalidatePath("/employee/my-history");

    return NextResponse.json({
      success: true,
      message: "Leave request rejected",
      request: {
        request_id: updatedRequest.request_id,
        status: updatedRequest.status,
        rejection_reason: updatedRequest.rejection_reason,
      },
    });
  } catch (error: any) {
    console.error("[Reject Leave] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to reject request" },
      { status: 500 }
    );
  }
}
