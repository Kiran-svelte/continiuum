import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// NO FALLBACK ALLOCATIONS - Company MUST configure leave types!
// If no leave types are configured, return empty balances and show error to user

export async function GET(req: NextRequest) {
    try {
        const user = await getUser();
        const userId = user?.id;
        if (!userId) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        // Get employee with org_id for company lookup
        const employee = await prisma.employee.findUnique({
            where: { clerk_id: userId },
            select: { emp_id: true, country_code: true, org_id: true }
        });

        if (!employee) {
            return NextResponse.json({ success: false, error: "Employee profile not found" }, { status: 404 });
        }

        const currentYear = new Date().getFullYear();

        // Fetch real leave balances from database using correct schema fields
        let balances = await prisma.leaveBalance.findMany({
            where: { 
                emp_id: employee.emp_id,
                year: currentYear
            },
            select: {
                leave_type: true,
                annual_entitlement: true,
                used_days: true,
                carried_forward: true,
                pending_days: true,
            }
        });

        // If no balances exist, create from company's leave types
        if (balances.length === 0 && employee.org_id) {
            console.log("[API] Creating leave balances for employee:", employee.emp_id);
            
            // First try to get company's configured leave types
            const companyLeaveTypes = await prisma.leaveType.findMany({
                where: { company_id: employee.org_id }
            });

            if (companyLeaveTypes.length > 0) {
                // Use company's configured leave types
                for (const lt of companyLeaveTypes) {
                    await prisma.leaveBalance.create({
                        data: {
                            emp_id: employee.emp_id,
                            country_code: employee.country_code || "IN",
                            leave_type: lt.code,
                            year: currentYear,
                            annual_entitlement: lt.annual_quota,
                            carried_forward: 0,
                            used_days: 0,
                            pending_days: 0,
                        }
                    });
                }
            } else {
                // NO FALLBACK! Return error - HR must configure leave types first
                console.error("[API] Company has no leave types configured! Company ID:", employee.org_id);
                return NextResponse.json({ 
                    success: false, 
                    error: "No leave types configured. Please contact HR to set up leave types.",
                    needsSetup: true,
                    balances: [],
                    leaveTypes: []
                });
            }
            
            // Re-fetch after creation
            balances = await prisma.leaveBalance.findMany({
                where: { 
                    emp_id: employee.emp_id,
                    year: currentYear
                },
                select: {
                    leave_type: true,
                    annual_entitlement: true,
                    used_days: true,
                    carried_forward: true,
                    pending_days: true,
                }
            });
        }

        // Transform to UI format
        const formattedBalances = balances.map(b => {
            const total = Number(b.annual_entitlement) + Number(b.carried_forward);
            const used = Number(b.used_days) + Number(b.pending_days);
            return {
                type: b.leave_type,
                available: total - used,
                total: total
            };
        });

        // Also fetch leave types for this company (for dropdown)
        let leaveTypes: { code: string; name: string; description?: string | null }[] = [];
        if (employee.org_id) {
            const companyLeaveTypes = await prisma.leaveType.findMany({
                where: { company_id: employee.org_id, is_active: true },
                select: { code: true, name: true, description: true },
                orderBy: { sort_order: 'asc' }
            });
            leaveTypes = companyLeaveTypes;
        }

        return NextResponse.json({
            success: true,
            balances: formattedBalances,
            leaveTypes: leaveTypes
        });
    } catch (error) {
        console.error("[API] Leave Balance Error:", error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : "Failed to fetch leave balances" },
            { status: 500 }
        );
    }
}
