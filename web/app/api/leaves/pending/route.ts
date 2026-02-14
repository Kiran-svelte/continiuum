/**
 * Pending Leave Requests API
 * GET /api/leaves/pending
 *
 * Returns pending and escalated leave requests for HR approval
 */

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
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

    // Only HR/Admin/Manager can view pending requests
    const allowedRoles = ["hr", "admin", "manager"];
    if (!allowedRoles.includes((hrEmployee.role || "").toLowerCase())) {
      return NextResponse.json(
        { success: false, error: "HR access required" },
        { status: 403 }
      );
    }

    if (!hrEmployee.org_id) {
      return NextResponse.json(
        { success: false, error: "No company linked to your account" },
        { status: 400 }
      );
    }

    // Fetch pending AND escalated leave requests for the same company
    const pendingRequests = await prisma.leaveRequest.findMany({
      where: {
        employee: {
          org_id: hrEmployee.org_id,
        },
        status: { in: ["pending", "escalated"] },
      },
      include: {
        employee: {
          select: {
            full_name: true,
            email: true,
            department: true,
            position: true,
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
    });

    // Transform to a cleaner format
    const requests = pendingRequests.map((req) => ({
      request_id: req.request_id,
      employee_name: req.employee.full_name,
      employee_email: req.employee.email,
      department: req.employee.department,
      position: req.employee.position,
      leave_type: req.leave_type,
      start_date: req.start_date.toISOString().split("T")[0],
      end_date: req.end_date.toISOString().split("T")[0],
      total_days: Number(req.total_days),
      reason: req.reason,
      status: req.status,
      created_at: req.created_at,
      ai_analysis_json: req.ai_analysis_json,
      ai_recommendation: req.ai_recommendation,
      ai_confidence: req.ai_confidence ? Number(req.ai_confidence) : null,
      escalation_reason: req.escalation_reason,
      sla_deadline: req.sla_deadline,
      sla_breached: req.sla_breached,
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
