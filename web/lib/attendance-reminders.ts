import { prisma } from "@/lib/prisma";
import {
    sendCheckInReminderEmail,
    sendCheckOutReminderEmail,
    sendHRMissingCheckInsEmail,
} from "@/lib/email-service";

export type ReminderAction = "check_in_reminder" | "check_out_reminder" | "hr_notification";

export type ReminderResult = {
    success: boolean;
    message: string;
    stats: {
        organizations: number;
        employeesConsidered: number;
        remindersSent: number;
        missingEmployees: number;
        hrNotified: number;
    };
    details?: Array<{ orgId: string; sent: number; missing: number }>;
};

const REMINDER_WINDOW_MINS = 5;

function parseTime(time: string, fallback: string) {
    const value = time || fallback;
    const [hourStr, minuteStr] = value.split(":");
    const hour = Number(hourStr);
    const minute = Number(minuteStr || "0");
    return { hour, minute };
}

function getLocalNow(now: Date, timeZone: string) {
    return new Date(now.toLocaleString("en-US", { timeZone }));
}

function isWithinWindow(currentMinutes: number, targetMinutes: number) {
    return Math.abs(currentMinutes - targetMinutes) <= REMINDER_WINDOW_MINS;
}

function getReminderNumber(
    localMinutes: number,
    primaryMinutes: number,
    secondaryMinutes: number,
    forced?: 1 | 2
): 1 | 2 | null {
    if (forced) return forced;
    if (isWithinWindow(localMinutes, primaryMinutes)) return 1;
    if (isWithinWindow(localMinutes, secondaryMinutes)) return 2;
    return null;
}

function toLocalDayOfWeek(localDate: Date): number {
    const day = localDate.getDay();
    return day === 0 ? 7 : day; // Mon=1..Sun=7
}

function getLocalDayStartUtc(localDate: Date) {
    return new Date(Date.UTC(localDate.getFullYear(), localDate.getMonth(), localDate.getDate()));
}

export async function processAttendanceReminder(
    action: ReminderAction,
    options?: { now?: Date; forceReminderNumber?: 1 | 2 }
): Promise<ReminderResult> {
    const now = options?.now ?? new Date();
    const companies = await prisma.company.findMany({
        include: {
            // Include company settings for email configuration
            settings: true
        },
    });

    let totalSent = 0;
    let totalMissing = 0;
    let totalEmployees = 0;
    let totalHrNotified = 0;
    const details: Array<{ orgId: string; sent: number; missing: number; skipped?: string }> = [];

    for (const company of companies) {
        // Get email settings with defaults
        const emailSettings = company.settings ?? {
            email_checkin_reminder: true,
            email_checkout_reminder: true,
            email_hr_missing_alerts: true,
            checkin_reminder_1_mins: 10,
            checkin_reminder_2_mins: 60,
            checkout_reminder_1_mins: 60,
            checkout_reminder_2_mins: 10,
        };

        // Check if this company has disabled the relevant email type
        if (action === "check_in_reminder" && !emailSettings.email_checkin_reminder) {
            details.push({ orgId: company.id, sent: 0, missing: 0, skipped: "check-in reminders disabled" });
            continue;
        }
        if (action === "check_out_reminder" && !emailSettings.email_checkout_reminder) {
            details.push({ orgId: company.id, sent: 0, missing: 0, skipped: "check-out reminders disabled" });
            continue;
        }
        if (action === "hr_notification" && !emailSettings.email_hr_missing_alerts) {
            details.push({ orgId: company.id, sent: 0, missing: 0, skipped: "HR alerts disabled" });
            continue;
        }

        const timeZone = company.timezone || "UTC";
        const localNow = getLocalNow(now, timeZone);
        const localMinutes = localNow.getHours() * 60 + localNow.getMinutes();
        const localDay = toLocalDayOfWeek(localNow);
        const workDays = (company.work_days as number[]) || [1, 2, 3, 4, 5];

        if (!workDays.includes(localDay)) {
            continue;
        }

        const { hour: startHour, minute: startMinute } = parseTime(company.work_start_time, "09:00");
        const { hour: endHour, minute: endMinute } = parseTime(company.work_end_time, "18:00");

        const startMinutes = startHour * 60 + startMinute;
        const endMinutes = endHour * 60 + endMinute;
        
        // Use company-specific reminder timing
        const checkInPrimary = startMinutes + (emailSettings.checkin_reminder_1_mins ?? 10);
        const checkInSecondary = startMinutes + (emailSettings.checkin_reminder_2_mins ?? 60);
        const checkOutPrimary = Math.max(0, endMinutes - (emailSettings.checkout_reminder_1_mins ?? 60));
        const checkOutSecondary = endMinutes + (emailSettings.checkout_reminder_2_mins ?? 10);

        const reminderNumber =
            action === "check_in_reminder"
                ? getReminderNumber(localMinutes, checkInPrimary, checkInSecondary, options?.forceReminderNumber)
                : action === "check_out_reminder"
                    ? getReminderNumber(localMinutes, checkOutPrimary, checkOutSecondary, options?.forceReminderNumber)
                    : null;

        if ((action === "check_in_reminder" || action === "check_out_reminder") && !reminderNumber) {
            continue;
        }

        const today = getLocalDayStartUtc(localNow);

        const employees = await prisma.employee.findMany({
            where: {
                org_id: company.id,
                is_active: true,
                approval_status: "approved",
            },
            select: { emp_id: true, email: true, full_name: true, department: true },
        });

        if (employees.length === 0) {
            continue;
        }

        totalEmployees += employees.length;

        const checkedIn = await prisma.attendance.findMany({
            where: {
                date: today,
                check_in: { not: null },
                employee: { org_id: company.id, is_active: true, approval_status: "approved" },
            },
            select: { emp_id: true },
        });

        const onLeave = await prisma.leaveRequest.findMany({
            where: {
                status: "approved",
                start_date: { lte: today },
                end_date: { gte: today },
                employee: { org_id: company.id, is_active: true, approval_status: "approved" },
            },
            select: { emp_id: true },
        });

        const checkedInIds = new Set(checkedIn.map((entry) => entry.emp_id));
        const onLeaveIds = new Set(onLeave.map((entry) => entry.emp_id));

        const missingEmployees = employees.filter(
            (employee) => !checkedInIds.has(employee.emp_id) && !onLeaveIds.has(employee.emp_id)
        );

        totalMissing += missingEmployees.length;

        if (action === "check_in_reminder") {
            let sent = 0;
            for (const employee of missingEmployees) {
                const result = await sendCheckInReminderEmail(employee, reminderNumber!);
                if (result.success) {
                    sent++;
                }
            }
            totalSent += sent;
            details.push({ orgId: company.id, sent, missing: missingEmployees.length });
        }

        if (action === "check_out_reminder") {
            const missingCheckouts = await prisma.attendance.findMany({
                where: {
                    date: today,
                    check_in: { not: null },
                    check_out: null,
                    employee: { org_id: company.id, is_active: true, approval_status: "approved" },
                },
                include: {
                    employee: { select: { email: true, full_name: true } },
                },
            });

            let sent = 0;
            for (const att of missingCheckouts) {
                const checkInTime = att.check_in!.toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                });

                const result = await sendCheckOutReminderEmail(
                    {
                        email: att.employee.email,
                        full_name: att.employee.full_name,
                        check_in_time: checkInTime,
                    },
                    reminderNumber!
                );

                if (result.success) {
                    sent++;
                }
            }

            totalSent += sent;
            details.push({ orgId: company.id, sent, missing: missingCheckouts.length });
        }

        if (action === "hr_notification") {
            if (missingEmployees.length === 0) {
                continue;
            }

            const hrUsers = await prisma.employee.findMany({
                where: {
                    org_id: company.id,
                    role: { in: ["hr", "admin", "manager"] },
                    is_active: true,
                },
                select: { email: true },
            });

            if (hrUsers.length === 0) {
                continue;
            }

            const payload = missingEmployees.map((employee) => ({
                name: employee.full_name,
                department: employee.department ?? null,
            }));

            for (const hr of hrUsers) {
                const result = await sendHRMissingCheckInsEmail(hr.email, payload);
                if (result.success) {
                    totalHrNotified++;
                }
            }
        }
    }

    return {
        success: true,
        message: `Processed ${action} reminders`,
        stats: {
            organizations: companies.length,
            employeesConsidered: totalEmployees,
            remindersSent: totalSent,
            missingEmployees: totalMissing,
            hrNotified: totalHrNotified,
        },
        details,
    };
}
