/**
 * Attendance Reminder API Route
 * 
 * Schedule:
 * - Check-in time: 9:00 AM
 * - Check-out time: 4:00 PM (16:00)
 * - Check-in reminders: 9:10 AM (first), 10:00 AM (final)
 * - Check-out reminders: 3:00 PM (early), 4:10 PM (final)
 */

import { NextRequest, NextResponse } from "next/server";
import { processAttendanceReminder } from "@/lib/attendance-reminders";

/**
 * API Route Handler
 */
export async function POST(req: NextRequest) {
    try {
        // Verify cron secret for security
        const authHeader = req.headers.get("authorization");
        const cronSecret = process.env.CRON_SECRET;
        
        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ 
                error: "Unauthorized",
                explanation: "Invalid or missing CRON_SECRET authentication" 
            }, { status: 401 });
        }

        const body = await req.json();
        const { action, forceReminderNumber } = body;

        // Get today's date (UTC for consistency)
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const today = new Date(todayStr + 'T00:00:00.000Z');
        
        explanation.push(`Processing ${action} at ${now.toLocaleTimeString()}`);

        // ============================================================
        // CHECK-IN REMINDER
        // Triggers at 9:10 AM (first) and 10:00 AM (final)
        // ============================================================
        if (action === "check_in_reminder") {
            const reminderNumber = forceReminderNumber || getCheckInReminderNumber(now);
            
            if (!reminderNumber) {
                const body = await req.json();
                const { action, forceReminderNumber } = body;

                if (!action || !["check_in_reminder", "check_out_reminder", "hr_notification"].includes(action)) {
                    return NextResponse.json(
                        { error: "Invalid action", validActions: ["check_in_reminder", "check_out_reminder", "hr_notification"] },
                        { status: 400 }
                    );
                }

                const result = await processAttendanceReminder(action, {
                    forceReminderNumber,
                });

                return NextResponse.json(result);

    return NextResponse.json({
        status: "Attendance reminder service active",
        currentTime: now.toLocaleTimeString(),
        schedule: {
            standardCheckIn: `${STANDARD_CHECK_IN_HOUR}:00 AM`,
            standardCheckOut: `${STANDARD_CHECK_OUT_HOUR > 12 ? STANDARD_CHECK_OUT_HOUR - 12 : STANDARD_CHECK_OUT_HOUR}:00 PM`,
            checkInReminders: [
                { time: "9:10 AM", type: "First reminder", triggered: checkInReminder === 1 },
                { time: "10:00 AM", type: "Final reminder", triggered: checkInReminder === 2 }
            ],
            checkOutReminders: [
                { time: "3:00 PM", type: "Early reminder", triggered: checkOutReminder === 1 },
                { time: "4:10 PM", type: "Final reminder", triggered: checkOutReminder === 2 }
            ]
        },
        endpoints: {
            check_in_reminder: "POST with action='check_in_reminder' - Send check-in reminders (9:10 AM / 10:00 AM)",
            check_out_reminder: "POST with action='check_out_reminder' - Send check-out reminders (3:00 PM / 4:10 PM)",
            hr_notification: "POST with action='hr_notification' - Notify HR about missing employees"
        },
        explanation: "This service sends automated attendance reminders. Set up a cron job to call these endpoints at the specified times."
    });
}
