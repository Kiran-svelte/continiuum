/**
 * Employee Profile API Endpoint
 * GET /api/employee/profile
 * 
 * Returns the current logged-in employee's profile data
 */

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// Prevent caching
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    console.log("[Employee Profile] Supabase user:", user?.id || "null");
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized - Please sign in" },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }

    // Find employee by Clerk ID
    const employee = await prisma.employee.findUnique({
      where: { clerk_id: user.id },
      select: {
        emp_id: true,
        full_name: true,
        email: true,
        position: true,
        department: true,
        role: true,
        org_id: true,
        hire_date: true,
        onboarding_completed: true,
        onboarding_status: true,
        is_active: true,
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
        { status: 404, headers: { "Cache-Control": "no-store" } }
      );
    }

    return NextResponse.json({
      success: true,
      employee: {
        ...employee,
        // Ensure org_id is set (use company.id if org_id is null)
        org_id: employee.org_id || employee.company?.id,
      },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error: any) {
    console.error("[Employee Profile] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch profile" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
