/**
 * Reject Leave Request API
 * POST /api/leaves/reject/[requestId]
 * 
 * Rejects a pending leave request
 */

import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const user = await currentUser();
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
    const allowedRoles = ["hr", "admin", "hr_manager", "manager"];
    if (!allowedRoles.includes((hrEmployee.role || "").toLowerCase())) {
      return NextResponse.json(
        { success: false, error: "Not authorized to reject leaves" },
        { status: 403 }
      );
    }

    // Find the leave request
    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { request_id: parseInt(requestId) },
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

    // Check if already processed
    if (leaveRequest.status !== "pending") {
      return NextResponse.json(
        { success: false, error: `Request already ${leaveRequest.status}` },
        { status: 400 }
      );
    }

    // Update the leave request to rejected
    const updatedRequest = await prisma.leaveRequest.update({
      where: { request_id: parseInt(requestId) },
      data: {
        status: "rejected",
        approved_by: hrEmployee.emp_id,
        approved_at: new Date(),
        rejection_reason: reason || comments || "Rejected by HR",
        approver_comments: comments || null,
      },
    });

    // Release pending days back to available (if they were reserved)
    const existingBalance = await prisma.leaveBalance.findFirst({
      where: {
        emp_id: leaveRequest.emp_id,
        leave_type: leaveRequest.leave_type,
        year: new Date().getFullYear(),
      },
    });

    if (existingBalance && Number(existingBalance.pending_days) > 0) {
      await prisma.leaveBalance.update({
        where: { balance_id: existingBalance.balance_id },
        data: {
          pending_days: {
            decrement: Math.min(
              Number(existingBalance.pending_days),
              Number(leaveRequest.days_requested)
            ),
          },
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Leave request rejected",
      request: updatedRequest,
    });
  } catch (error: any) {
    console.error("[Reject Leave] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to reject request" },
      { status: 500 }
    );
  }
}
