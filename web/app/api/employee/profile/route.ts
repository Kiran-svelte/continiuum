/**
 * Employee Profile API Endpoint
 * GET /api/employee/profile
 * 
 * Returns the current logged-in employee's profile data
 */

import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    console.log("[Employee Profile] Clerk user:", user?.id || "null");
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized - Please sign in" },
        { status: 401 }
      );
    }

    // Find employee by Clerk ID
    const employee = await prisma.employee.findUnique({
      where: { clerk_id: user.id },
      select: {
        emp_id: true,
        full_name: true,
        email: true,
        phone: true,
        position: true,
        department: true,
        role: true,
        org_id: true,
        join_date: true,
        probation_end_date: true,
        onboarding_completed: true,
        profile_photo_url: true,
        status: true,
        company: {
          select: {
            id: true,
            company_id: true,
            name: true,
            code: true,
            work_start_time: true,
            work_end_time: true,
            grace_period_mins: true,
            timezone: true,
            work_days: true,
          },
        },
      },
    });

    console.log("[Employee Profile] Found employee:", employee?.emp_id || "null");

    if (!employee) {
      return NextResponse.json(
        { success: false, error: `Employee not found for Clerk ID: ${user.id}` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      employee: {
        ...employee,
        // Ensure org_id is set (use company.id if org_id is null)
        org_id: employee.org_id || employee.company?.id,
      },
    });
  } catch (error: any) {
    console.error("[Employee Profile] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch profile" },
      { status: 500 }
    );
  }
}
