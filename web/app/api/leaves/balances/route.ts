import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

// Fallback leave allocations ONLY if company has no leave types configured
const FALLBACK_LEAVE_ALLOCATIONS: Record<string, number> = {
    "Sick Leave": 12,
    "Vacation Leave": 20,
    "Casual Leave": 7,
};

export async function GET(req: NextRequest) {
    try {
        const { userId } = await auth();
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
                // Fallback to defaults only if company has no configured types
                console.warn("[API] Company has no leave types - using fallback defaults");
                for (const [leaveType, allocation] of Object.entries(FALLBACK_LEAVE_ALLOCATIONS)) {
                    await prisma.leaveBalance.create({
                        data: {
                            emp_id: employee.emp_id,
                            country_code: employee.country_code || "IN",
                            leave_type: leaveType,
                            year: currentYear,
                            annual_entitlement: allocation,
                            carried_forward: 0,
                            used_days: 0,
                            pending_days: 0,
                        }
                    });
                }
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

        return NextResponse.json({
            success: true,
            balances: formattedBalances
        });
    } catch (error) {
        console.error("[API] Leave Balance Error:", error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : "Failed to fetch leave balances" },
            { status: 500 }
        );
    }
}
