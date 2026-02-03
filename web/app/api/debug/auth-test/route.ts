/**
 * Debug endpoint to test auth and employee lookup
 * GET /api/debug/auth-test
 */

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    
    if (!user) {
      return NextResponse.json({
        success: false,
        error: "No authenticated user found",
        details: "getUser() returned null"
      });
    }

    // Find employee by Supabase ID
    const employee = await prisma.employee.findUnique({
      where: { clerk_id: user.id },
      select: {
        emp_id: true,
        email: true,
        full_name: true,
        role: true,
        org_id: true,
      },
    });

    const allowedRoles = ["hr", "admin", "hr_manager", "super_admin"];
    const roleCheck = employee?.role ? allowedRoles.includes(employee.role.toLowerCase()) : false;

    return NextResponse.json({
      success: true,
      supabase: {
        id: user.id,
        email: user.emailAddresses[0]?.emailAddress,
      },
      employee: employee || null,
      roleCheck: {
        role: employee?.role,
        roleLower: employee?.role?.toLowerCase(),
        allowedRoles,
        isAllowed: roleCheck
      }
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
