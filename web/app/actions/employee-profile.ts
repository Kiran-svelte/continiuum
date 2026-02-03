"use server";

import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/supabase/server";

// Alias for compatibility during Clerk to Supabase migration
const currentUser = getUser;

/**
 * =========================================================================
 * EMPLOYEE PROFILE ACTIONS
 * 
 * These actions provide company-specific settings to employees.
 * Each employee sees their OWN company's:
 * - Work schedule (check-in/check-out times)
 * - Leave types and quotas
 * - Leave balances
 * - Company branding/name
 * =========================================================================
 */

export interface EmployeeProfile {
    employee: {
        emp_id: string;
        name: string;
        email: string;
        department: string | null;
        position: string | null;
        role: string;
    };
    company: {
        id: string;
        name: string;
        code: string;
        work_start_time: string;
        work_end_time: string;
        grace_period_mins: number;
        half_day_hours: number;
        full_day_hours: number;
        work_days: number[];
        timezone: string;
    };
    leaveTypes: Array<{
        code: string;
        name: string;
        color: string;
        annual_quota: number;
        max_consecutive: number;
        min_notice_days: number;
        half_day_allowed: boolean;
        is_paid: boolean;
        balance: number;
        used: number;
        pending: number;
    }>;
}

/**
 * Get complete employee profile with company-specific settings
 * This is the main function employees use to see their dashboard
 */
export async function getEmployeeProfile(): Promise<{ success: boolean; profile?: EmployeeProfile; error?: string }> {
    const user = await currentUser();
    if (!user) {
        return { success: false, error: "Unauthorized" };
    }

    try {
        // 1. Get employee with company
        const employee = await prisma.employee.findUnique({
            where: { clerk_id: user.id },
            include: {
                company: true
            }
        });

        if (!employee || !employee.company) {
            return { success: false, error: "Employee not linked to company" };
        }

        // 2. Get company-specific leave types
        const leaveTypes = await prisma.leaveType.findMany({
            where: { 
                company_id: employee.org_id!, 
                is_active: true 
            },
            orderBy: { sort_order: 'asc' }
        });

        // 3. Get employee's leave balances for this year
        const currentYear = new Date().getFullYear();
        const balances = await prisma.leaveBalance.findMany({
            where: {
                emp_id: employee.emp_id,
                year: currentYear
            }
        });

        // Create balance lookup map
        const balanceMap = new Map(balances.map(b => [b.leave_type.toUpperCase(), b]));

        // 4. Combine leave types with balances
        const leaveTypesWithBalance: Array<{
            code: string;
            name: string;
            color: string;
            annual_quota: number;
            max_consecutive: number;
            min_notice_days: number;
            half_day_allowed: boolean;
            is_paid: boolean;
            balance: number;
            used: number;
            pending: number;
        }> = leaveTypes.map(lt => {
            const balance = balanceMap.get(lt.code.toUpperCase());
            const annualQuota = Number(lt.annual_quota);
            const quota = balance 
                ? Number(balance.annual_entitlement) + Number(balance.carried_forward)
                : annualQuota;
            const used = balance ? Number(balance.used_days) : 0;
            const pending = balance ? Number(balance.pending_days) : 0;

            return {
                code: lt.code,
                name: lt.name,
                color: lt.color,
                annual_quota: annualQuota,
                max_consecutive: lt.max_consecutive,
                min_notice_days: lt.min_notice_days,
                half_day_allowed: lt.half_day_allowed,
                is_paid: lt.is_paid,
                balance: quota - used - pending,
                used: used,
                pending: pending,
            };
        });

        // 5. If no leave types configured, return error - HR must set them up
        if (leaveTypesWithBalance.length === 0) {
            return {
                success: false,
                error: "No leave types configured for this company. Please contact HR to configure leave types.",
                needsSetup: true
            };
        }

        const company = employee.company;

        return {
            success: true,
            profile: {
                employee: {
                    emp_id: employee.emp_id,
                    name: employee.full_name,
                    email: employee.email,
                    department: employee.department,
                    position: employee.position,
                    role: employee.role,
                },
                company: {
                    id: company.id,
                    name: company.name,
                    code: company.code,
                    work_start_time: company.work_start_time || "09:00",
                    work_end_time: company.work_end_time || "18:00",
                    grace_period_mins: company.grace_period_mins || 15,
                    half_day_hours: Number(company.half_day_hours) || 4,
                    full_day_hours: Number(company.full_day_hours) || 8,
                    work_days: (company.work_days as number[]) || [1, 2, 3, 4, 5],
                    timezone: company.timezone || "Asia/Kolkata",
                },
                leaveTypes: leaveTypesWithBalance,
            }
        };
    } catch (error: any) {
        console.error("[getEmployeeProfile] Error:", error);
        return { success: false, error: error.message || "Failed to load profile" };
    }
}

/**
 * Get available leave types for employee's company
 * Used in leave request forms
 */
export async function getAvailableLeaveTypes() {
    const user = await currentUser();
    if (!user) {
        return { success: false, error: "Unauthorized" };
    }

    try {
        const employee = await prisma.employee.findUnique({
            where: { clerk_id: user.id },
            select: { org_id: true, emp_id: true }
        });

        if (!employee?.org_id) {
            return { success: false, error: "Not linked to company" };
        }

        const leaveTypes = await prisma.leaveType.findMany({
            where: { 
                company_id: employee.org_id, 
                is_active: true 
            },
            select: {
                id: true,
                code: true,
                name: true,
                color: true,
                annual_quota: true,
                max_consecutive: true,
                min_notice_days: true,
                requires_document: true,
                half_day_allowed: true,
                gender_specific: true,
                is_paid: true,
            },
            orderBy: { sort_order: 'asc' }
        });

        // Get balances
        const currentYear = new Date().getFullYear();
        const balances = await prisma.leaveBalance.findMany({
            where: {
                emp_id: employee.emp_id,
                year: currentYear
            }
        });

        const balanceMap = new Map(balances.map(b => [b.leave_type.toUpperCase(), b]));

        const typesWithBalance = leaveTypes.map(lt => {
            const balance = balanceMap.get(lt.code.toUpperCase());
            const annualQuota = Number(lt.annual_quota);
            const quota = balance 
                ? Number(balance.annual_entitlement) + Number(balance.carried_forward)
                : annualQuota;
            const used = balance ? Number(balance.used_days) : 0;
            const pending = balance ? Number(balance.pending_days) : 0;

            return {
                id: lt.id,
                code: lt.code,
                name: lt.name,
                color: lt.color,
                annual_quota: annualQuota,
                max_consecutive: lt.max_consecutive,
                min_notice_days: lt.min_notice_days,
                half_day_allowed: lt.half_day_allowed,
                is_paid: lt.is_paid,
                balance: quota - used - pending,
                used,
                pending,
            };
        });

        return { success: true, leaveTypes: typesWithBalance };
    } catch (error: any) {
        console.error("[getAvailableLeaveTypes] Error:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Get work schedule for current employee's company
 * Used for attendance/check-in features
 */
export async function getWorkSchedule() {
    const user = await currentUser();
    if (!user) {
        return { success: false, error: "Unauthorized" };
    }

    try {
        const employee = await prisma.employee.findUnique({
            where: { clerk_id: user.id },
            include: { company: true }
        });

        if (!employee?.company) {
            return { success: false, error: "Not linked to company" };
        }

        const company = employee.company;

        return {
            success: true,
            schedule: {
                companyName: company.name,
                work_start_time: company.work_start_time || "09:00",
                work_end_time: company.work_end_time || "18:00",
                grace_period_mins: company.grace_period_mins || 15,
                half_day_hours: Number(company.half_day_hours) || 4,
                full_day_hours: Number(company.full_day_hours) || 8,
                work_days: (company.work_days as number[]) || [1, 2, 3, 4, 5],
                timezone: company.timezone || "Asia/Kolkata",
            }
        };
    } catch (error: any) {
        console.error("[getWorkSchedule] Error:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Calculate if current time is within working hours for employee's company
 */
export async function isWithinWorkingHours() {
    const scheduleResult = await getWorkSchedule();
    if (!scheduleResult.success || !scheduleResult.schedule) {
        return { success: false, error: scheduleResult.error };
    }

    const schedule = scheduleResult.schedule;
    
    // Get current time in company timezone
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = { 
        timeZone: schedule.timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    };
    const currentTime = now.toLocaleTimeString('en-US', options);
    
    // Parse times
    const [currentHour, currentMinute] = currentTime.split(':').map(Number);
    const [startHour, startMinute] = schedule.work_start_time.split(':').map(Number);
    const [endHour, endMinute] = schedule.work_end_time.split(':').map(Number);
    
    const currentMinutes = currentHour * 60 + currentMinute;
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;
    
    // Check if within work hours (with grace period for late)
    const isWithinHours = currentMinutes >= (startMinutes - schedule.grace_period_mins) && 
                          currentMinutes <= endMinutes;
    
    // Check if it's a work day
    const dayOfWeek = now.getDay() || 7; // Convert Sunday from 0 to 7
    const isWorkDay = schedule.work_days.includes(dayOfWeek);

    return {
        success: true,
        isWithinWorkingHours: isWithinHours && isWorkDay,
        isWorkDay,
        currentTime,
        schedule: {
            start: schedule.work_start_time,
            end: schedule.work_end_time,
            gracePeriod: schedule.grace_period_mins,
        },
        message: !isWorkDay 
            ? "Today is not a working day"
            : !isWithinHours 
                ? `Working hours are ${schedule.work_start_time} - ${schedule.work_end_time}`
                : "Within working hours"
    };
}
