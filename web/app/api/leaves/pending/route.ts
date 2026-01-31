/**
 * Pending Leave Requests API
 * GET /api/leaves/pending
 * 
 * Returns pending leave requests for HR approval
 */

import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Find the HR employee
    const hrEmployee = await prisma.employee.findUnique({
      where: { clerk_id: user.id },
      select: { emp_id: true, role: true, org_id: true },
    });

    if (!hrEmployee) {
      return NextResponse.json(
        { success: false, error: "Employee not found" },
        { status: 404 }
      );
    }

    // Only HR/Admin can view pending requests
    const allowedRoles = ["hr", "admin", "hr_manager", "manager"];
    if (!allowedRoles.includes((hrEmployee.role || "").toLowerCase())) {
      return NextResponse.json(
        { success: false, error: "HR access required" },
        { status: 403 }
      );
    }

    // Fetch pending leave requests for the same company
    const pendingRequests = await prisma.leaveRequest.findMany({
      where: {
        employee: {
          org_id: hrEmployee.org_id,
        },
        status: "pending",
      },
      include: {
        employee: {
          select: {
            full_name: true,
            email: true,
            department: true,
            position: true,
            profile_photo_url: true,
          },
        },
      },
      orderBy: {
        requested_at: "desc",
      },
    });

    // Transform to a cleaner format
    const requests = pendingRequests.map((req) => ({
      request_id: req.request_id,
      employee_name: req.employee.full_name,
      employee_email: req.employee.email,
      department: req.employee.department,
      position: req.employee.position,
      photo_url: req.employee.profile_photo_url,
      leave_type: req.leave_type,
      start_date: req.start_date.toISOString().split("T")[0],
      end_date: req.end_date.toISOString().split("T")[0],
      days_requested: req.days_requested,
      reason: req.reason,
      status: req.status,
      requested_at: req.requested_at,
      ai_analysis: req.ai_analysis,
      ai_recommendation: req.ai_recommendation,
      ai_confidence: req.ai_confidence,
      escalation_reason: req.escalation_reason,
    }));

    return NextResponse.json({
      success: true,
      requests,
      total: requests.length,
    });
  } catch (error: any) {
    console.error("[Pending Leaves] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch pending requests" },
      { status: 500 }
    );
  }
}
