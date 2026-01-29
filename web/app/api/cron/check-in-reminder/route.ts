/**
 * 🕘 CHECK-IN REMINDER CRON
 * 
 * Vercel Cron Schedule: 10,30 9,10 * * 1-5 (Mon-Fri at 9:10, 9:30, 10:10, 10:30)
 * 
 * Sends reminders to employees who haven't checked in yet.
 */

import { NextRequest, NextResponse } from 'next/server';
import { processAttendanceReminder } from '@/lib/attendance-reminders';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(req: NextRequest) {
    // Verify cron secret (Vercel sets this automatically)
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        // In production, require auth. In dev, allow for testing
        if (process.env.NODE_ENV === 'production') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
    }

    try {
        const result = await processAttendanceReminder("check_in_reminder", { now: new Date() });
        return NextResponse.json(result);

    } catch (error: any) {
        console.error('Check-in reminder cron error:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
