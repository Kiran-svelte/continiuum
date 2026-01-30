import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

/**
 * Comprehensive Test API
 * Tests all HR features: constraint rules, leave requests, holidays, attendance
 * GET /api/test/comprehensive
 */

export async function GET() {
    const results: Record<string, any> = {
        timestamp: new Date().toISOString(),
        tests: {},
        summary: { passed: 0, failed: 0 }
    };

    try {
        // Test 1: Auth & User Setup
        const user = await currentUser();
        if (!user) {
            return NextResponse.json({
                error: "Not authenticated",
                hint: "Please login first at /sign-in"
            }, { status: 401 });
        }

        results.tests.auth = { 
            passed: true, 
            clerk_id: user.id,
            email: user.emailAddresses[0]?.emailAddress 
        };
        results.summary.passed++;

        // Test 2: Employee Record
        const employee = await prisma.employee.findUnique({
            where: { clerk_id: user.id },
            include: {
                company: true
            }
        });

        if (!employee) {
            results.tests.employee = { 
                passed: false, 
                error: "No employee record found",
                hint: "Complete onboarding at /onboarding?intent=hr"
            };
            results.summary.failed++;
            return NextResponse.json(results);
        }

        results.tests.employee = {
            passed: true,
            emp_id: employee.emp_id,
            role: employee.role,
            org_id: employee.org_id,
            approval_status: employee.approval_status,
            onboarding_completed: employee.onboarding_completed
        };
        results.summary.passed++;

        // Test 3: Company/Organization
        if (!employee.org_id || !employee.company) {
            results.tests.company = {
                passed: false,
                error: "No company linked",
                org_id: employee.org_id,
                hint: "Complete company registration in onboarding"
            };
            results.summary.failed++;
            return NextResponse.json(results);
        }

        results.tests.company = {
            passed: true,
            id: employee.company.id,
            name: employee.company.name,
            code: employee.company.code,
            work_times: employee.company.work_times,
            timezone: employee.company.timezone
        };
        results.summary.passed++;

        const orgId = employee.org_id;

        // Test 4: Constraint Policy
        const constraintPolicy = await prisma.constraintPolicy.findFirst({
            where: { org_id: orgId, is_active: true }
        });

        if (constraintPolicy) {
            const rules = constraintPolicy.rules as Record<string, any>;
            const ruleCount = Object.keys(rules || {}).length;
            const ruleIds = Object.keys(rules || {}).slice(0, 5);
            
            results.tests.constraintPolicy = {
                passed: true,
                policy_id: constraintPolicy.id,
                policy_name: constraintPolicy.name,
                is_active: constraintPolicy.is_active,
                rule_count: ruleCount,
                sample_rule_ids: ruleIds,
                hint: ruleCount > 0 ? "Rules loaded successfully" : "No rules in policy"
            };
            results.summary.passed++;
        } else {
            results.tests.constraintPolicy = {
                passed: false,
                error: "No active constraint policy found",
                hint: "Will be auto-created when you visit /hr/constraint-rules"
            };
            results.summary.failed++;
        }

        // Test 5: Company Settings (Holiday config)
        const companySettings = await prisma.companySettings.findUnique({
            where: { company_id: orgId }
        });

        if (companySettings) {
            results.tests.companySettings = {
                passed: true,
                holiday_mode: companySettings.holiday_mode,
                country_code: companySettings.country_code,
                weekly_off_days: companySettings.weekly_off_days
            };
            results.summary.passed++;
        } else {
            results.tests.companySettings = {
                passed: false,
                error: "No company settings found",
                hint: "Configure at /hr/holiday-settings"
            };
            results.summary.failed++;
        }

        // Test 6: Leave Types (Company-specific)
        const leaveTypes = await prisma.leaveType.findMany({
            where: { org_id: orgId },
            select: { id: true, name: true, default_days: true, is_active: true }
        });

        if (leaveTypes.length > 0) {
            results.tests.leaveTypes = {
                passed: true,
                count: leaveTypes.length,
                types: leaveTypes.map(lt => ({ name: lt.name, days: lt.default_days, active: lt.is_active }))
            };
            results.summary.passed++;
        } else {
            results.tests.leaveTypes = {
                passed: false,
                error: "No leave types configured",
                hint: "Leave types should be created during onboarding"
            };
            results.summary.failed++;
        }

        // Test 7: Leave Balances (User's balances)
        const leaveBalances = await prisma.leaveBalance.findMany({
            where: { employee_id: employee.id },
            include: { leave_type: true }
        });

        if (leaveBalances.length > 0) {
            results.tests.leaveBalances = {
                passed: true,
                count: leaveBalances.length,
                balances: leaveBalances.map(lb => ({
                    type: lb.leave_type?.name,
                    balance: lb.balance,
                    used: lb.used,
                    pending: lb.pending
                }))
            };
            results.summary.passed++;
        } else {
            results.tests.leaveBalances = {
                passed: false,
                error: "No leave balances found",
                hint: "Balances should be initialized during onboarding"
            };
            results.summary.failed++;
        }

        // Test 8: Recent Leave Requests
        const recentRequests = await prisma.leaveRequest.findMany({
            where: { employee_id: employee.id },
            orderBy: { created_at: "desc" },
            take: 5,
            select: {
                id: true,
                status: true,
                start_date: true,
                end_date: true,
                days_requested: true,
                leave_type: { select: { name: true } }
            }
        });

        results.tests.leaveRequests = {
            passed: true,
            count: recentRequests.length,
            recent: recentRequests.map(r => ({
                id: r.id,
                type: r.leave_type?.name,
                status: r.status,
                days: r.days_requested,
                dates: `${r.start_date.toISOString().split('T')[0]} to ${r.end_date.toISOString().split('T')[0]}`
            }))
        };
        results.summary.passed++;

        // Test 9: Cached Holidays
        const countryCode = companySettings?.country_code || "IN";
        const currentYear = new Date().getFullYear();
        
        const holidays = await prisma.publicHoliday.findMany({
            where: {
                country_code: countryCode,
                date: {
                    gte: new Date(`${currentYear}-01-01`),
                    lte: new Date(`${currentYear}-12-31`)
                }
            },
            orderBy: { date: "asc" },
            take: 10
        });

        results.tests.holidays = {
            passed: holidays.length > 0,
            country_code: countryCode,
            year: currentYear,
            count: holidays.length,
            sample: holidays.slice(0, 5).map(h => ({
                name: h.name,
                date: h.date.toISOString().split('T')[0]
            })),
            hint: holidays.length === 0 ? "Visit /hr/holiday-settings to load holidays" : "Holidays cached successfully"
        };
        if (holidays.length > 0) {
            results.summary.passed++;
        } else {
            results.summary.failed++;
        }

        // Test 10: Attendance Records (Today)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const todayAttendance = await prisma.attendance.findFirst({
            where: {
                employee_id: employee.id,
                check_in: {
                    gte: today,
                    lt: tomorrow
                }
            }
        });

        results.tests.attendance = {
            passed: true,
            today_record: todayAttendance ? {
                check_in: todayAttendance.check_in?.toISOString(),
                check_out: todayAttendance.check_out?.toISOString(),
                status: todayAttendance.status
            } : null,
            hint: todayAttendance ? "Attendance recorded for today" : "No attendance record for today yet"
        };
        results.summary.passed++;

        // Test 11: Team Members (for HR view)
        if (employee.role === "hr" || employee.role === "admin") {
            const teamCount = await prisma.employee.count({
                where: { org_id: orgId }
            });

            const pendingApprovals = await prisma.leaveRequest.count({
                where: {
                    employee: { org_id: orgId },
                    status: "pending"
                }
            });

            results.tests.hrDashboard = {
                passed: true,
                total_employees: teamCount,
                pending_leave_requests: pendingApprovals,
                hint: "HR dashboard data available"
            };
            results.summary.passed++;
        }

        // Overall Status
        results.status = results.summary.failed === 0 ? "ALL_TESTS_PASSED" : "SOME_TESTS_FAILED";

        return NextResponse.json(results, { status: 200 });

    } catch (error: any) {
        console.error("[Comprehensive Test Error]:", error);
        return NextResponse.json({
            error: "Test execution failed",
            message: error.message,
            stack: process.env.NODE_ENV === "development" ? error.stack : undefined
        }, { status: 500 });
    }
}
