"use server";

import { prisma } from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";

// ============================================================================
// TYPES
// ============================================================================

export type AIInsight = {
    id: string;
    type: 'warning' | 'success' | 'info' | 'action';
    title: string;
    message: string;
    priority: 'high' | 'medium' | 'low';
    actionUrl?: string;
    actionLabel?: string;
    createdAt: Date;
};

export type TeamHealthMetrics = {
    overallScore: number; // 0-100
    attendance: number;
    leaveBalance: number;
    burnoutRisk: number;
    teamMorale: number;
    trend: 'up' | 'down' | 'stable';
};

export type PredictiveData = {
    month: string;
    predicted: number;
    actual?: number;
    confidence: number;
};

export type BurnoutRisk = {
    employeeId: string;
    employeeName: string;
    riskLevel: 'high' | 'medium' | 'low';
    riskScore: number;
    factors: string[];
    recommendation: string;
};

export type SmartCalendarSuggestion = {
    date: string;
    score: number; // 0-100, higher is better
    reason: string;
    teamAvailability: number;
    conflicts: string[];
};

export type WellnessScore = {
    overall: number;
    workLifeBalance: number;
    leaveUtilization: number;
    attendanceHealth: number;
    stressIndicator: number;
    recommendations: string[];
};

export type DepartmentInsight = {
    department: string;
    headcount: number;
    onLeaveToday: number;
    avgLeaveBalance: number;
    burnoutRiskCount: number;
    coveragePercent: number;
};

// ============================================================================
// AI INSIGHTS - Smart notifications and alerts
// ============================================================================

export async function getAIInsights(): Promise<{
    success: boolean;
    insights?: AIInsight[];
    teamHealth?: TeamHealthMetrics;
    error?: string;
}> {
    try {
        const user = await currentUser();
        if (!user) return { success: false, error: "Unauthorized" };

        const employee = await prisma.employee.findUnique({
            where: { clerk_id: user.id },
            include: { company: true }
        });

        if (!employee?.org_id) {
            return { success: false, error: "Employee not found" };
        }

        const orgId = employee.org_id;
        const today = new Date();
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const sevenDaysFromNow = new Date(today);
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

        // Fetch all required data in parallel
        const [
            totalEmployees,
            onLeaveToday,
            pendingRequests,
            lowBalanceEmployees,
            upcomingLeaves,
            recentAttendance,
            consecutiveLeaveRequests
        ] = await Promise.all([
            // Total employees in org
            prisma.employee.count({ where: { org_id: orgId } }),
            
            // Employees on leave today
            prisma.leaveRequest.count({
                where: {
                    status: 'approved',
                    start_date: { lte: today },
                    end_date: { gte: today },
                    employee: { org_id: orgId }
                }
            }),
            
            // Pending leave requests
            prisma.leaveRequest.count({
                where: {
                    status: 'pending',
                    employee: { org_id: orgId }
                }
            }),
            
            // Employees with low leave balance (< 3 days)
            prisma.leaveBalance.findMany({
                where: {
                    year: today.getFullYear(),
                    employee: { org_id: orgId }
                },
                include: { employee: true }
            }),
            
            // Leaves in next 7 days
            prisma.leaveRequest.findMany({
                where: {
                    status: 'approved',
                    start_date: { gte: today, lte: sevenDaysFromNow },
                    employee: { org_id: orgId }
                },
                include: { employee: true }
            }),
            
            // Recent attendance for pattern analysis
            prisma.attendance.findMany({
                where: {
                    date: { gte: thirtyDaysAgo },
                    employee: { org_id: orgId }
                },
                include: { employee: true }
            }),
            
            // Check for consecutive leave patterns (burnout indicator)
            prisma.leaveRequest.findMany({
                where: {
                    created_at: { gte: thirtyDaysAgo },
                    employee: { org_id: orgId }
                },
                include: { employee: true },
                orderBy: { created_at: 'desc' }
            })
        ]);

        // Calculate low balance employees
        const lowBalanceCount = lowBalanceEmployees.filter(b => {
            const remaining = Number(b.annual_entitlement) + Number(b.carried_forward) - Number(b.used_days) - Number(b.pending_days);
            return remaining < 3;
        }).length;

        // Calculate late arrival percentage
        const lateArrivals = recentAttendance.filter(a => a.status === 'LATE').length;
        const latePercentage = recentAttendance.length > 0 
            ? Math.round((lateArrivals / recentAttendance.length) * 100) 
            : 0;

        // Build insights based on real data
        const insights: AIInsight[] = [];

        // High priority: Pending requests
        if (pendingRequests > 0) {
            insights.push({
                id: 'pending-requests',
                type: 'action',
                title: `${pendingRequests} Pending Leave Request${pendingRequests > 1 ? 's' : ''}`,
                message: `You have ${pendingRequests} leave request${pendingRequests > 1 ? 's' : ''} awaiting approval.`,
                priority: pendingRequests > 5 ? 'high' : 'medium',
                actionUrl: '/hr/leave-requests',
                actionLabel: 'Review Now',
                createdAt: new Date()
            });
        }

        // Team coverage warning
        const coveragePercent = totalEmployees > 0 
            ? Math.round(((totalEmployees - onLeaveToday) / totalEmployees) * 100) 
            : 100;
        
        if (coveragePercent < 80) {
            insights.push({
                id: 'low-coverage',
                type: 'warning',
                title: 'Low Team Coverage Today',
                message: `Only ${coveragePercent}% of your team is available today. ${onLeaveToday} employee${onLeaveToday > 1 ? 's are' : ' is'} on leave.`,
                priority: 'high',
                createdAt: new Date()
            });
        }

        // Low balance warning
        if (lowBalanceCount > 0) {
            insights.push({
                id: 'low-balance',
                type: 'warning',
                title: `${lowBalanceCount} Employee${lowBalanceCount > 1 ? 's' : ''} with Low Leave Balance`,
                message: `${lowBalanceCount} team member${lowBalanceCount > 1 ? 's have' : ' has'} less than 3 days of leave remaining.`,
                priority: 'medium',
                actionUrl: '/hr/leave-balances',
                actionLabel: 'View Details',
                createdAt: new Date()
            });
        }

        // Upcoming leave surge
        if (upcomingLeaves.length > 3) {
            insights.push({
                id: 'upcoming-surge',
                type: 'info',
                title: 'High Leave Volume Next Week',
                message: `${upcomingLeaves.length} approved leaves scheduled for the next 7 days. Plan for coverage.`,
                priority: 'medium',
                actionUrl: '/hr/calendar',
                actionLabel: 'View Calendar',
                createdAt: new Date()
            });
        }

        // Late arrival pattern
        if (latePercentage > 20) {
            insights.push({
                id: 'late-pattern',
                type: 'warning',
                title: 'High Late Arrival Rate',
                message: `${latePercentage}% late arrivals in the past 30 days. Consider reviewing work schedules.`,
                priority: latePercentage > 30 ? 'high' : 'medium',
                createdAt: new Date()
            });
        }

        // Positive insight if everything is good
        if (insights.length === 0) {
            insights.push({
                id: 'all-good',
                type: 'success',
                title: 'Team Health is Excellent',
                message: 'No issues detected. Your team coverage, leave balances, and attendance are all healthy.',
                priority: 'low',
                createdAt: new Date()
            });
        }

        // Calculate team health metrics
        const attendanceScore = Math.max(0, 100 - latePercentage);
        const balanceScore = totalEmployees > 0 
            ? Math.round(((totalEmployees - lowBalanceCount) / totalEmployees) * 100) 
            : 100;
        const burnoutIndicator = consecutiveLeaveRequests.length > totalEmployees * 0.5 ? 30 : 10;
        
        const teamHealth: TeamHealthMetrics = {
            overallScore: Math.round((attendanceScore + balanceScore + coveragePercent + (100 - burnoutIndicator)) / 4),
            attendance: attendanceScore,
            leaveBalance: balanceScore,
            burnoutRisk: burnoutIndicator,
            teamMorale: Math.max(60, 100 - burnoutIndicator - (100 - coveragePercent)),
            trend: latePercentage > 20 ? 'down' : coveragePercent > 90 ? 'up' : 'stable'
        };

        return { success: true, insights, teamHealth };

    } catch (error) {
        console.error("Error fetching AI insights:", error);
        return { success: false, error: "Failed to fetch insights" };
    }
}

// ============================================================================
// PREDICTIVE ANALYTICS - Leave forecasting and trends
// ============================================================================

export async function getPredictiveAnalytics(): Promise<{
    success: boolean;
    predictions?: PredictiveData[];
    seasonalPatterns?: { month: string; avgLeaves: number }[];
    burnoutRisks?: BurnoutRisk[];
    error?: string;
}> {
    try {
        const user = await currentUser();
        if (!user) return { success: false, error: "Unauthorized" };

        const employee = await prisma.employee.findUnique({
            where: { clerk_id: user.id },
            include: { company: true }
        });

        if (!employee?.org_id) {
            return { success: false, error: "Employee not found" };
        }

        const orgId = employee.org_id;
        const currentYear = new Date().getFullYear();
        const lastYear = currentYear - 1;

        // Fetch historical leave data
        const [lastYearLeaves, thisYearLeaves, employees] = await Promise.all([
            prisma.leaveRequest.findMany({
                where: {
                    employee: { org_id: orgId },
                    start_date: {
                        gte: new Date(lastYear, 0, 1),
                        lt: new Date(currentYear, 0, 1)
                    }
                }
            }),
            prisma.leaveRequest.findMany({
                where: {
                    employee: { org_id: orgId },
                    start_date: {
                        gte: new Date(currentYear, 0, 1)
                    }
                },
                include: { employee: true }
            }),
            prisma.employee.findMany({
                where: { org_id: orgId },
                include: {
                    attendances: {
                        where: {
                            date: { gte: new Date(new Date().setDate(new Date().getDate() - 90)) }
                        }
                    },
                    leave_requests: {
                        where: {
                            created_at: { gte: new Date(new Date().setDate(new Date().getDate() - 90)) }
                        }
                    }
                }
            })
        ]);

        // Calculate monthly patterns from last year
        const monthlyPatternLastYear: Record<number, number> = {};
        for (let i = 0; i < 12; i++) monthlyPatternLastYear[i] = 0;
        
        lastYearLeaves.forEach(leave => {
            const month = new Date(leave.start_date).getMonth();
            monthlyPatternLastYear[month]++;
        });

        // Calculate this year's actual data
        const monthlyActualThisYear: Record<number, number> = {};
        for (let i = 0; i < 12; i++) monthlyActualThisYear[i] = 0;
        
        thisYearLeaves.forEach(leave => {
            const month = new Date(leave.start_date).getMonth();
            monthlyActualThisYear[month]++;
        });

        const currentMonth = new Date().getMonth();
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        // Build predictions based on historical patterns
        const predictions: PredictiveData[] = monthNames.map((name, index) => {
            const lastYearValue = monthlyPatternLastYear[index] || 0;
            const thisYearValue = monthlyActualThisYear[index];
            
            // Simple prediction: last year's value adjusted by growth factor
            const growthFactor = employees.length > 0 ? 1 + (employees.length / 100) : 1;
            const predicted = Math.round(lastYearValue * growthFactor);
            
            return {
                month: name,
                predicted,
                actual: index <= currentMonth ? thisYearValue : undefined,
                confidence: index <= currentMonth + 2 ? 85 : 70 // Higher confidence for near-term
            };
        });

        // Seasonal patterns
        const seasonalPatterns = monthNames.map((month, index) => ({
            month,
            avgLeaves: monthlyPatternLastYear[index] || 0
        }));

        // Calculate burnout risks
        const burnoutRisks: BurnoutRisk[] = [];
        
        for (const emp of employees) {
            const factors: string[] = [];
            let riskScore = 0;

            // Factor 1: High leave frequency
            const recentLeaves = emp.leave_requests?.length || 0;
            if (recentLeaves > 5) {
                factors.push('Frequent leave requests');
                riskScore += 25;
            }

            // Factor 2: Late arrivals
            const lateCount = emp.attendances?.filter((a: { status: string }) => a.status === 'LATE').length || 0;
            const totalAttendance = emp.attendances?.length || 1;
            const latePercent = (lateCount / totalAttendance) * 100;
            if (latePercent > 30) {
                factors.push('Consistent late arrivals');
                riskScore += 30;
            }

            // Factor 3: No leave taken (might be overworking)
            if (recentLeaves === 0 && totalAttendance > 60) {
                factors.push('No leave taken in 90 days');
                riskScore += 20;
            }

            // Factor 4: Short notice leaves (stress indicator)
            const shortNoticeLeaves = emp.leave_requests?.filter((l: { start_date: Date; created_at: Date }) => {
                const daysBefore = Math.ceil((new Date(l.start_date).getTime() - new Date(l.created_at).getTime()) / (1000 * 60 * 60 * 24));
                return daysBefore < 2;
            }).length || 0;
            
            if (shortNoticeLeaves > 2) {
                factors.push('Multiple short-notice leave requests');
                riskScore += 25;
            }

            if (riskScore >= 30) {
                burnoutRisks.push({
                    employeeId: emp.emp_id,
                    employeeName: emp.full_name,
                    riskLevel: riskScore >= 60 ? 'high' : riskScore >= 40 ? 'medium' : 'low',
                    riskScore,
                    factors,
                    recommendation: riskScore >= 60 
                        ? 'Schedule a 1:1 wellness check-in immediately'
                        : riskScore >= 40 
                            ? 'Consider discussing workload and encourage time off'
                            : 'Monitor over the next few weeks'
                });
            }
        }

        // Sort by risk score descending
        burnoutRisks.sort((a, b) => b.riskScore - a.riskScore);

        return {
            success: true,
            predictions,
            seasonalPatterns,
            burnoutRisks: burnoutRisks.slice(0, 10) // Top 10 at-risk employees
        };

    } catch (error) {
        console.error("Error fetching predictive analytics:", error);
        return { success: false, error: "Failed to fetch predictions" };
    }
}

// ============================================================================
// TEAM INSIGHTS - Department-level analytics
// ============================================================================

export async function getTeamInsights(): Promise<{
    success: boolean;
    departments?: DepartmentInsight[];
    todayOverview?: {
        totalPresent: number;
        totalOnLeave: number;
        totalAbsent: number;
        coverage: number;
    };
    error?: string;
}> {
    try {
        const user = await currentUser();
        if (!user) return { success: false, error: "Unauthorized" };

        const employee = await prisma.employee.findUnique({
            where: { clerk_id: user.id },
            include: { company: true }
        });

        if (!employee?.org_id) {
            return { success: false, error: "Employee not found" };
        }

        const orgId = employee.org_id;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const currentYear = today.getFullYear();

        // Get all employees grouped by department
        const allEmployees = await prisma.employee.findMany({
            where: { org_id: orgId },
            include: {
                attendances: {
                    where: { date: today }
                },
                leave_requests: {
                    where: {
                        status: 'approved',
                        start_date: { lte: today },
                        end_date: { gte: today }
                    }
                },
                leave_balances: {
                    where: { year: currentYear }
                }
            }
        });

        // Group by department
        const deptMap: Record<string, typeof allEmployees> = {};
        allEmployees.forEach(emp => {
            const dept = emp.department || 'General';
            if (!deptMap[dept]) deptMap[dept] = [];
            deptMap[dept].push(emp);
        });

        const departments: DepartmentInsight[] = Object.entries(deptMap).map(([dept, emps]) => {
            const onLeave = emps.filter(e => e.leave_requests.length > 0).length;
            const avgBalance = emps.reduce((sum, e) => {
                const bal = e.leave_balances[0];
                if (!bal) return sum;
                const remaining = Number(bal.annual_entitlement) + Number(bal.carried_forward) - Number(bal.used_days);
                return sum + remaining;
            }, 0) / (emps.length || 1);

            // Count burnout risks (simplified)
            const burnoutRisk = emps.filter(e => e.leave_requests.length > 3).length;

            return {
                department: dept,
                headcount: emps.length,
                onLeaveToday: onLeave,
                avgLeaveBalance: Math.round(avgBalance * 10) / 10,
                burnoutRiskCount: burnoutRisk,
                coveragePercent: emps.length > 0 ? Math.round(((emps.length - onLeave) / emps.length) * 100) : 100
            };
        });

        // Today's overview
        const present = allEmployees.filter(e => e.attendances.length > 0 && e.attendances[0].check_in).length;
        const onLeave = allEmployees.filter(e => e.leave_requests.length > 0).length;
        const total = allEmployees.length;
        const absent = total - present - onLeave;

        return {
            success: true,
            departments,
            todayOverview: {
                totalPresent: present,
                totalOnLeave: onLeave,
                totalAbsent: Math.max(0, absent),
                coverage: total > 0 ? Math.round((present / total) * 100) : 100
            }
        };

    } catch (error) {
        console.error("Error fetching team insights:", error);
        return { success: false, error: "Failed to fetch team insights" };
    }
}

// ============================================================================
// EMPLOYEE WELLNESS - Individual health scoring
// ============================================================================

export async function getEmployeeWellness(employeeId?: string): Promise<{
    success: boolean;
    wellness?: WellnessScore;
    error?: string;
}> {
    try {
        const user = await currentUser();
        if (!user) return { success: false, error: "Unauthorized" };

        const employee = await prisma.employee.findUnique({
            where: { clerk_id: user.id },
            include: {
                company: true,
                attendances: {
                    where: {
                        date: { gte: new Date(new Date().setDate(new Date().getDate() - 30)) }
                    },
                    orderBy: { date: 'desc' }
                },
                leave_requests: {
                    where: {
                        created_at: { gte: new Date(new Date().setDate(new Date().getDate() - 90)) }
                    }
                },
                leave_balances: {
                    where: { year: new Date().getFullYear() }
                }
            }
        });

        if (!employee) {
            return { success: false, error: "Employee not found" };
        }

        const recommendations: string[] = [];

        // 1. Work-Life Balance Score
        const totalWorkDays = employee.attendances.length;
        const normalWorkDays = employee.attendances.filter((a: { check_in: Date | null; check_out: Date | null }) => {
            if (!a.check_in || !a.check_out) return false;
            const hours = (new Date(a.check_out).getTime() - new Date(a.check_in).getTime()) / (1000 * 60 * 60);
            return hours <= 9; // Normal is <= 9 hours
        }).length;
        
        const workLifeBalance = totalWorkDays > 0 
            ? Math.round((normalWorkDays / totalWorkDays) * 100)
            : 80;
        
        if (workLifeBalance < 70) {
            recommendations.push("Consider maintaining regular work hours to improve work-life balance");
        }

        // 2. Leave Utilization Score
        const balance = employee.leave_balances[0];
        let leaveUtilization = 80;
        if (balance) {
            const total = Number(balance.annual_entitlement) + Number(balance.carried_forward);
            const used = Number(balance.used_days);
            const utilizationPercent = (used / total) * 100;
            
            // Ideal is 40-60% by mid-year, proportional to time elapsed
            const monthOfYear = new Date().getMonth();
            const expectedUtilization = (monthOfYear / 12) * 60;
            
            if (utilizationPercent < expectedUtilization - 20) {
                recommendations.push("Consider taking some time off - you haven't used much of your leave balance");
                leaveUtilization = 60;
            } else if (utilizationPercent > expectedUtilization + 20) {
                recommendations.push("Your leave utilization is high - plan remaining leaves carefully");
                leaveUtilization = 70;
            } else {
                leaveUtilization = 90;
            }
        }

        // 3. Attendance Health
        const lateCount = employee.attendances.filter((a: { status: string }) => a.status === 'LATE').length;
        const latePercent = totalWorkDays > 0 ? (lateCount / totalWorkDays) * 100 : 0;
        const attendanceHealth = Math.max(50, Math.round(100 - (latePercent * 2)));
        
        if (latePercent > 20) {
            recommendations.push("Try to improve punctuality - consider adjusting your morning routine");
        }

        // 4. Stress Indicator (inverse - lower is better for display but we show as positive)
        const shortNoticeLeaves = employee.leave_requests.filter((l: { start_date: Date; created_at: Date }) => {
            const daysBefore = Math.ceil(
                (new Date(l.start_date).getTime() - new Date(l.created_at).getTime()) / (1000 * 60 * 60 * 24)
            );
            return daysBefore < 2;
        }).length;
        
        const stressScore = shortNoticeLeaves > 2 ? 40 : shortNoticeLeaves > 0 ? 60 : 85;
        
        if (shortNoticeLeaves > 2) {
            recommendations.push("Multiple short-notice leave requests may indicate stress - consider planning ahead");
        }

        // Overall score
        const overall = Math.round((workLifeBalance + leaveUtilization + attendanceHealth + stressScore) / 4);

        if (recommendations.length === 0) {
            recommendations.push("Great job! Your wellness metrics look healthy");
            recommendations.push("Keep maintaining your current work-life balance");
        }

        return {
            success: true,
            wellness: {
                overall,
                workLifeBalance,
                leaveUtilization,
                attendanceHealth,
                stressIndicator: stressScore,
                recommendations
            }
        };

    } catch (error) {
        console.error("Error fetching wellness score:", error);
        return { success: false, error: "Failed to calculate wellness" };
    }
}

// ============================================================================
// SMART CALENDAR - AI-suggested leave dates
// ============================================================================

export async function getSmartCalendarSuggestions(
    leaveDays: number = 1,
    preferredMonth?: number
): Promise<{
    success: boolean;
    suggestions?: SmartCalendarSuggestion[];
    error?: string;
}> {
    try {
        const user = await currentUser();
        if (!user) return { success: false, error: "Unauthorized" };

        const employee = await prisma.employee.findUnique({
            where: { clerk_id: user.id },
            include: { company: true }
        });

        if (!employee?.org_id) {
            return { success: false, error: "Employee not found" };
        }

        const orgId = employee.org_id;
        const department = employee.department || 'General';
        const today = new Date();
        
        // Look at next 60 days
        const endDate = new Date(today);
        endDate.setDate(endDate.getDate() + 60);

        // Fetch team leaves and company rules
        const [teamLeaves, leaveRules, companySettings] = await Promise.all([
            prisma.leaveRequest.findMany({
                where: {
                    status: 'approved',
                    start_date: { gte: today, lte: endDate },
                    employee: { org_id: orgId, department }
                }
            }),
            prisma.leaveRule.findMany({
                where: { company_id: orgId, is_active: true }
            }),
            prisma.company.findUnique({
                where: { id: orgId },
                select: { work_days: true }
            })
        ]);

        const workDays = (companySettings?.work_days as number[]) || [1, 2, 3, 4, 5];
        
        // Extract blackout dates and rules
        const blackoutDates: Set<string> = new Set();
        const blackoutDaysOfWeek: number[] = [];
        
        leaveRules.forEach(rule => {
            const config = rule.config as Record<string, any>;
            if (rule.rule_type === 'blackout') {
                config.dates?.forEach((d: string) => blackoutDates.add(d));
                config.days_of_week?.forEach((d: number) => blackoutDaysOfWeek.push(d));
            }
        });

        // Find team leaves per day
        const leavesPerDay: Record<string, number> = {};
        teamLeaves.forEach(leave => {
            const start = new Date(leave.start_date);
            const end = new Date(leave.end_date);
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const key = d.toISOString().split('T')[0];
                leavesPerDay[key] = (leavesPerDay[key] || 0) + 1;
            }
        });

        // Count team members
        const teamSize = await prisma.employee.count({
            where: { org_id: orgId, department }
        });

        // Generate suggestions
        const suggestions: SmartCalendarSuggestion[] = [];
        
        for (let i = 7; i < 60; i++) { // Start from 7 days ahead for proper notice
            const checkDate = new Date(today);
            checkDate.setDate(checkDate.getDate() + i);
            
            // Skip if month filter applied and doesn't match
            if (preferredMonth !== undefined && checkDate.getMonth() !== preferredMonth) {
                continue;
            }

            const dateStr = checkDate.toISOString().split('T')[0];
            const dayOfWeek = checkDate.getDay() === 0 ? 7 : checkDate.getDay();

            // Skip non-work days
            if (!workDays.includes(dayOfWeek)) continue;

            const conflicts: string[] = [];
            let score = 100;

            // Check blackout dates
            if (blackoutDates.has(dateStr)) {
                conflicts.push('Blackout date');
                score -= 50;
            }

            // Check blackout days of week
            if (blackoutDaysOfWeek.includes(dayOfWeek)) {
                conflicts.push('Restricted day of week');
                score -= 30;
            }

            // Check team availability
            const onLeave = leavesPerDay[dateStr] || 0;
            const availabilityPercent = teamSize > 0 ? ((teamSize - onLeave) / teamSize) * 100 : 100;
            
            if (availabilityPercent < 70) {
                conflicts.push(`Low team coverage (${Math.round(availabilityPercent)}%)`);
                score -= 20;
            } else if (availabilityPercent === 100) {
                score += 10; // Bonus for full availability
            }

            // Prefer Fridays/Mondays for long weekends
            if ((dayOfWeek === 1 || dayOfWeek === 5) && leaveDays === 1) {
                score += 15;
            }

            // Build reason
            let reason = '';
            if (score >= 90) {
                reason = 'Excellent date - high team availability';
            } else if (score >= 70) {
                reason = 'Good date with minor considerations';
            } else {
                reason = conflicts.join(', ');
            }

            if (score >= 50) { // Only suggest dates with score >= 50
                suggestions.push({
                    date: dateStr,
                    score: Math.min(100, Math.max(0, score)),
                    reason,
                    teamAvailability: Math.round(availabilityPercent),
                    conflicts
                });
            }
        }

        // Sort by score descending
        suggestions.sort((a, b) => b.score - a.score);

        return {
            success: true,
            suggestions: suggestions.slice(0, 10) // Top 10 suggestions
        };

    } catch (error) {
        console.error("Error generating calendar suggestions:", error);
        return { success: false, error: "Failed to generate suggestions" };
    }
}

// ============================================================================
// BURNOUT RISK ASSESSMENT
// ============================================================================

export async function getBurnoutRiskAssessment(): Promise<{
    success: boolean;
    riskEmployees?: BurnoutRisk[];
    summary?: {
        highRisk: number;
        mediumRisk: number;
        lowRisk: number;
        avgRiskScore: number;
    };
    error?: string;
}> {
    const result = await getPredictiveAnalytics();
    
    if (!result.success || !result.burnoutRisks) {
        return { success: false, error: result.error };
    }

    const risks = result.burnoutRisks;
    const highRisk = risks.filter(r => r.riskLevel === 'high').length;
    const mediumRisk = risks.filter(r => r.riskLevel === 'medium').length;
    const lowRisk = risks.filter(r => r.riskLevel === 'low').length;
    const avgRiskScore = risks.length > 0 
        ? Math.round(risks.reduce((sum, r) => sum + r.riskScore, 0) / risks.length)
        : 0;

    return {
        success: true,
        riskEmployees: risks,
        summary: { highRisk, mediumRisk, lowRisk, avgRiskScore }
    };
}
