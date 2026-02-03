import { getUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// Debug endpoint to check user's company/org setup
// GET /api/debug/me
export async function GET() {
    try {
        const user = await getUser();
        if (!user) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

        const employee = await prisma.employee.findUnique({
            where: { clerk_id: user.id },
            select: {
                emp_id: true,
                email: true,
                role: true,
                org_id: true,
                onboarding_status: true,
                onboarding_completed: true,
                approval_status: true,
                company: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                        work_start_time: true,
                        work_end_time: true,
                        timezone: true,
                        onboarding_completed: true,
                    }
                }
            }
        });

        if (!employee) {
            return NextResponse.json({ 
                error: "No employee record", 
                clerk_id: user.id,
                clerk_email: user.emailAddresses[0]?.emailAddress 
            });
        }

        // Check constraint policy
        let constraintPolicy = null;
        if (employee.org_id) {
            constraintPolicy = await prisma.constraintPolicy.findFirst({
                where: { org_id: employee.org_id },
                select: { id: true, name: true, is_active: true }
            });
        }

        // Check company settings
        let companySettings = null;
        if (employee.org_id) {
            companySettings = await prisma.companySettings.findUnique({
                where: { company_id: employee.org_id },
                select: { holiday_mode: true, country_code: true }
            });
        }

        // Check leave types
        let leaveTypesCount = 0;
        if (employee.org_id) {
            leaveTypesCount = await prisma.leaveType.count({
                where: { company_id: employee.org_id }
            });
        }

        return NextResponse.json({
            status: "ok",
            user: {
                clerk_id: user.id,
                email: user.emailAddresses[0]?.emailAddress,
            },
            employee: {
                emp_id: employee.emp_id,
                email: employee.email,
                role: employee.role,
                org_id: employee.org_id,
                onboarding_status: employee.onboarding_status,
                onboarding_completed: employee.onboarding_completed,
                approval_status: employee.approval_status,
            },
            company: employee.company ? {
                id: employee.company.id,
                name: employee.company.name,
                code: employee.company.code,
                work_times: `${employee.company.work_start_time} - ${employee.company.work_end_time}`,
                timezone: employee.company.timezone,
                onboarding_completed: employee.company.onboarding_completed,
            } : null,
            constraintPolicy: constraintPolicy,
            companySettings: companySettings,
            leaveTypesCount: leaveTypesCount,
            diagnosis: {
                hasCompany: !!employee.company,
                hasOrgId: !!employee.org_id,
                hasConstraintPolicy: !!constraintPolicy,
                hasCompanySettings: !!companySettings,
                hasLeaveTypes: leaveTypesCount > 0,
                isFullySetup: !!(employee.org_id && employee.company && constraintPolicy)
            }
        });
    } catch (error: any) {
        console.error("[Debug Me] Error:", error);
        return NextResponse.json({ 
            error: "Database error", 
            message: error?.message 
        }, { status: 500 });
    }
}
