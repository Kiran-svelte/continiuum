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

// Constants
const STANDARD_CHECK_IN_HOUR = 9;
const STANDARD_CHECK_OUT_HOUR = 16;

/**
 * Determine which check-in reminder to send based on current time
 */
function getCheckInReminderNumber(now: Date): number | null {
    const hours = now.getHours();
    const minutes = now.getMinutes();
    
    // First reminder at 9:10 AM
    if (hours === 9 && minutes >= 10 && minutes < 30) return 1;
    // Final reminder at 10:00 AM
    if (hours === 10 && minutes < 30) return 2;
    
    return null;
}

/**
 * Determine which check-out reminder to send based on current time
 */
function getCheckOutReminderNumber(now: Date): number | null {
    const hours = now.getHours();
    const minutes = now.getMinutes();
    
    // Early reminder at 3:00 PM (15:00)
    if (hours === 15 && minutes < 30) return 1;
    // Final reminder at 4:10 PM (16:10)
    if (hours === 16 && minutes >= 10 && minutes < 30) return 2;
    
    return null;
}

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

        if (!action || !["check_in_reminder", "check_out_reminder", "hr_notification"].includes(action)) {
            return NextResponse.json(
                { error: "Invalid action", validActions: ["check_in_reminder", "check_out_reminder", "hr_notification"] },
                { status: 400 }
            );
        }

        const now = new Date();
        const messages: string[] = [];
        let reminderNumber: number | null = null;

        if (action === "check_in_reminder") {
            reminderNumber = forceReminderNumber || getCheckInReminderNumber(now);
            if (!reminderNumber) {
                return NextResponse.json({
                    success: false,
                    message: "Not within check-in reminder window",
                    currentTime: now.toLocaleTimeString()
                });
            }
            messages.push(`Check-in reminder #${reminderNumber} processed at ${now.toLocaleTimeString()}`);
        } else if (action === "check_out_reminder") {
            reminderNumber = forceReminderNumber || getCheckOutReminderNumber(now);
            if (!reminderNumber) {
                return NextResponse.json({
                    success: false,
                    message: "Not within check-out reminder window",
                    currentTime: now.toLocaleTimeString()
                });
            }
            messages.push(`Check-out reminder #${reminderNumber} processed at ${now.toLocaleTimeString()}`);
        } else if (action === "hr_notification") {
            messages.push(`HR notification processed at ${now.toLocaleTimeString()}`);
        }

        return NextResponse.json({
            success: true,
            action,
            reminderNumber,
            messages,
            timestamp: now.toISOString()
        });

    } catch (error) {
        console.error("[Attendance Reminder] Error:", error);
        return NextResponse.json(
            { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 }
        );
    }
}

/**
 * GET endpoint - returns service status
 */
export async function GET() {
    const now = new Date();
    const checkInReminder = getCheckInReminderNumber(now);
    const checkOutReminder = getCheckOutReminderNumber(now);

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
