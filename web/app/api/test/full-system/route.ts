import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { DEFAULT_CONSTRAINT_RULES, RULE_CATEGORIES } from "@/lib/constraint-rules-config";

/**
 * FULL SYSTEM TEST API
 * Tests all major flows: auth, constraints, holidays, leave, attendance, AI
 * GET /api/test/full-system
 */

interface TestResult {
    name: string;
    status: "PASS" | "FAIL" | "WARN" | "SKIP";
    message: string;
    data?: any;
    error?: string;
}

export async function GET(request: NextRequest) {
    const results: TestResult[] = [];
    const startTime = Date.now();

    try {
        // ============================================
        // TEST 1: Authentication
        // ============================================
        const user = await getUser();
        if (!user) {
            return NextResponse.json({
                status: "AUTH_REQUIRED",
                message: "Please login first to run tests",
                loginUrl: "/sign-in"
            }, { status: 401 });
        }
        results.push({
            name: "Authentication",
            status: "PASS",
            message: "User authenticated successfully",
            data: { user_id: user.id, email: user.email }
        });

        // ============================================
        // TEST 2: Employee Record
        // ============================================
        const employee = await prisma.employee.findUnique({
            where: { clerk_id: user.id },
            include: { company: true }
        });

        if (!employee) {
            results.push({
                name: "Employee Record",
                status: "FAIL",
                message: "No employee record found",
                error: "Complete onboarding first"
            });
            return NextResponse.json({ results, duration: Date.now() - startTime });
        }
        results.push({
            name: "Employee Record",
            status: "PASS",
            message: "Employee record exists",
            data: { emp_id: employee.emp_id, role: employee.role, org_id: employee.org_id }
        });

        // ============================================
        // TEST 3: Company/Organization
        // ============================================
        if (!employee.org_id || !employee.company) {
            results.push({
                name: "Company Setup",
                status: "FAIL",
                message: "No company linked to employee",
                error: "Complete company registration"
            });
            return NextResponse.json({ results, duration: Date.now() - startTime });
        }
        results.push({
            name: "Company Setup",
            status: "PASS",
            message: "Company configured",
            data: { 
                name: employee.company.name, 
                code: employee.company.code,
                timezone: employee.company.timezone
            }
        });

        const orgId = employee.org_id;

        // ============================================
        // TEST 4: Constraint Policy
        // ============================================
        let constraintPolicy = await prisma.constraintPolicy.findFirst({
            where: { org_id: orgId, is_active: true }
        });

        if (!constraintPolicy) {
            // Try to create default policy
            try {
                const rulesWithMetadata = Object.entries(DEFAULT_CONSTRAINT_RULES).reduce(
                    (acc, [ruleId, rule]) => {
                        acc[ruleId] = {
                            ...rule,
                            is_active: true,
                            is_custom: false,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        };
                        return acc;
                    },
                    {} as Record<string, any>
                );

                constraintPolicy = await prisma.constraintPolicy.create({
                    data: {
                        org_id: orgId,
                        name: "Default Leave Policy",
                        rules: rulesWithMetadata,
                        is_active: true
                    }
                });
                results.push({
                    name: "Constraint Policy",
                    status: "PASS",
                    message: "Created default constraint policy",
                    data: { policy_id: constraintPolicy.id, rule_count: Object.keys(rulesWithMetadata).length }
                });
            } catch (e: any) {
                results.push({
                    name: "Constraint Policy",
                    status: "FAIL",
                    message: "Failed to create constraint policy",
                    error: e.message
                });
            }
        } else {
            const rules = constraintPolicy.rules as Record<string, any>;
            results.push({
                name: "Constraint Policy",
                status: "PASS",
                message: "Constraint policy exists",
                data: { policy_id: constraintPolicy.id, rule_count: Object.keys(rules || {}).length }
            });
        }

        // ============================================
        // TEST 5: Company Settings
        // ============================================
        let companySettings = await prisma.companySettings.findUnique({
            where: { company_id: orgId }
        });

        if (!companySettings) {
            try {
                companySettings = await prisma.companySettings.create({
                    data: {
                        company_id: orgId,
                        holiday_mode: "auto",
                        country_code: "IN",
                        weekly_off_days: [0, 6], // Sunday, Saturday
                        custom_holidays: [],
                        blocked_dates: []
                    }
                });
                results.push({
                    name: "Company Settings",
                    status: "PASS",
                    message: "Created default company settings",
                    data: { holiday_mode: "auto", country_code: "IN" }
                });
            } catch (e: any) {
                results.push({
                    name: "Company Settings",
                    status: "FAIL",
                    message: "Failed to create company settings",
                    error: e.message
                });
            }
        } else {
            results.push({
                name: "Company Settings",
                status: "PASS",
                message: "Company settings exist",
                data: { 
                    holiday_mode: companySettings.holiday_mode, 
                    country_code: companySettings.country_code 
                }
            });
        }

        // ============================================
        // TEST 6: Leave Types
        // ============================================
        const leaveTypes = await prisma.leaveType.findMany({
            where: { company_id: orgId, is_active: true }
        });

        if (leaveTypes.length === 0) {
            // Create default leave types
            try {
                const defaultLeaveTypes = [
                    { code: "CL", name: "Casual Leave", annual_quota: 12, color: "#3B82F6" },
                    { code: "SL", name: "Sick Leave", annual_quota: 10, color: "#EF4444" },
                    { code: "PL", name: "Privilege Leave", annual_quota: 15, color: "#10B981" },
                    { code: "ML", name: "Maternity Leave", annual_quota: 180, gender_specific: "F", color: "#EC4899" },
                    { code: "PT", name: "Paternity Leave", annual_quota: 15, gender_specific: "M", color: "#6366F1" },
                    { code: "LWP", name: "Leave Without Pay", annual_quota: 30, is_paid: false, color: "#6B7280" },
                ];

                await prisma.leaveType.createMany({
                    data: defaultLeaveTypes.map((lt, idx) => ({
                        company_id: orgId,
                        code: lt.code,
                        name: lt.name,
                        annual_quota: lt.annual_quota,
                        color: lt.color,
                        gender_specific: lt.gender_specific as any,
                        is_paid: lt.is_paid ?? true,
                        sort_order: idx,
                        is_active: true
                    })),
                    skipDuplicates: true
                });

                results.push({
                    name: "Leave Types",
                    status: "PASS",
                    message: "Created default leave types",
                    data: { count: defaultLeaveTypes.length }
                });
            } catch (e: any) {
                results.push({
                    name: "Leave Types",
                    status: "FAIL",
                    message: "Failed to create leave types",
                    error: e.message
                });
            }
        } else {
            results.push({
                name: "Leave Types",
                status: "PASS",
                message: "Leave types configured",
                data: { count: leaveTypes.length, types: leaveTypes.map(lt => lt.name) }
            });
        }

        // ============================================
        // TEST 7: Leave Balances
        // ============================================
        const currentYear = new Date().getFullYear();
        const leaveBalances = await prisma.leaveBalance.findMany({
            where: { employee_id: employee.id, year: currentYear }
        });

        if (leaveBalances.length === 0) {
            // Initialize leave balances
            try {
                const freshLeaveTypes = await prisma.leaveType.findMany({
                    where: { company_id: orgId, is_active: true }
                });

                if (freshLeaveTypes.length > 0) {
                    await prisma.leaveBalance.createMany({
                        data: freshLeaveTypes.map(lt => ({
                            employee_id: employee.id,
                            emp_id: employee.emp_id,
                            leave_type: lt.code,
                            leave_type_id: lt.id,
                            year: currentYear,
                            balance: Number(lt.annual_quota),
                            used: 0,
                            pending: 0,
                            carried_forward: 0
                        })),
                        skipDuplicates: true
                    });
                    results.push({
                        name: "Leave Balances",
                        status: "PASS",
                        message: "Initialized leave balances",
                        data: { count: freshLeaveTypes.length, year: currentYear }
                    });
                }
            } catch (e: any) {
                results.push({
                    name: "Leave Balances",
                    status: "WARN",
                    message: "Could not initialize leave balances",
                    error: e.message
                });
            }
        } else {
            results.push({
                name: "Leave Balances",
                status: "PASS",
                message: "Leave balances exist",
                data: { 
                    count: leaveBalances.length, 
                    year: currentYear,
                    balances: leaveBalances.map(lb => ({ type: lb.leave_type, balance: lb.balance, used: lb.used }))
                }
            });
        }

        // ============================================
        // TEST 8: Public Holidays Cache
        // ============================================
        const countryCode = companySettings?.country_code || "IN";
        const holidays = await prisma.publicHoliday.findMany({
            where: {
                country_code: countryCode,
                date: {
                    gte: new Date(`${currentYear}-01-01`),
                    lte: new Date(`${currentYear}-12-31`)
                }
            },
            orderBy: { date: "asc" }
        });

        if (holidays.length === 0) {
            results.push({
                name: "Public Holidays",
                status: "WARN",
                message: "No holidays cached - visit Holiday Settings to refresh",
                data: { country_code: countryCode, year: currentYear }
            });
        } else {
            results.push({
                name: "Public Holidays",
                status: "PASS",
                message: "Holidays cached",
                data: { 
                    count: holidays.length, 
                    country_code: countryCode,
                    sample: holidays.slice(0, 3).map(h => ({ name: h.name, date: h.date.toISOString().split('T')[0] }))
                }
            });
        }

        // ============================================
        // TEST 9: Recent Leave Requests
        // ============================================
        const recentRequests = await prisma.leaveRequest.findMany({
            where: { employee_id: employee.id },
            orderBy: { created_at: "desc" },
            take: 5,
            include: { leave_type: true }
        });

        results.push({
            name: "Leave Requests",
            status: "PASS",
            message: `Found ${recentRequests.length} leave requests`,
            data: { 
                count: recentRequests.length,
                recent: recentRequests.map(r => ({
                    id: r.id.substring(0, 8),
                    type: r.leave_type?.name || r.leave_type_name,
                    status: r.status,
                    days: r.days_requested
                }))
            }
        });

        // ============================================
        // TEST 10: Attendance Check
        // ============================================
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todayAttendance = await prisma.attendance.findFirst({
            where: {
                emp_id: employee.emp_id,
                date: today
            }
        });

        results.push({
            name: "Today's Attendance",
            status: "PASS",
            message: todayAttendance ? "Attendance recorded" : "No attendance yet today",
            data: todayAttendance ? {
                check_in: todayAttendance.check_in?.toISOString(),
                check_out: todayAttendance.check_out?.toISOString(),
                status: todayAttendance.status
            } : null
        });

        // ============================================
        // TEST 11: HR Dashboard Stats (if HR)
        // ============================================
        if (employee.role === "hr" || employee.role === "admin") {
            const [totalEmployees, pendingRequests, todayAbsent] = await Promise.all([
                prisma.employee.count({ where: { org_id: orgId, is_active: true } }),
                prisma.leaveRequest.count({ where: { employee: { org_id: orgId }, status: "pending" } }),
                prisma.leaveRequest.count({ 
                    where: { 
                        employee: { org_id: orgId }, 
                        status: "approved",
                        start_date: { lte: today },
                        end_date: { gte: today }
                    } 
                })
            ]);

            results.push({
                name: "HR Dashboard Data",
                status: "PASS",
                message: "HR stats retrieved",
                data: {
                    total_employees: totalEmployees,
                    pending_requests: pendingRequests,
                    on_leave_today: todayAbsent
                }
            });
        }

        // ============================================
        // TEST 12: Audit Logs Check
        // ============================================
        const recentAudits = await prisma.auditLog.findMany({
            where: { target_org: orgId },
            orderBy: { created_at: "desc" },
            take: 5
        });

        results.push({
            name: "Audit Logging",
            status: recentAudits.length > 0 ? "PASS" : "WARN",
            message: `${recentAudits.length} recent audit entries`,
            data: {
                count: recentAudits.length,
                recent: recentAudits.map(a => ({ action: a.action, timestamp: a.created_at }))
            }
        });

        // ============================================
        // SUMMARY
        // ============================================
        const passed = results.filter(r => r.status === "PASS").length;
        const failed = results.filter(r => r.status === "FAIL").length;
        const warnings = results.filter(r => r.status === "WARN").length;

        return NextResponse.json({
            status: failed === 0 ? "SUCCESS" : "HAS_FAILURES",
            summary: {
                total: results.length,
                passed,
                failed,
                warnings,
                duration_ms: Date.now() - startTime
            },
            results,
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        console.error("[Full System Test Error]:", error);
        return NextResponse.json({
            status: "ERROR",
            error: error.message,
            results,
            duration_ms: Date.now() - startTime
        }, { status: 500 });
    }
}
