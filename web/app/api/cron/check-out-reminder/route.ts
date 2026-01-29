/**
 * 🕓 CHECK-OUT REMINDER CRON
 * 
 * Vercel Cron Schedule: 0 15,16 * * 1-5 (Mon-Fri at 3:00 PM and 4:00 PM)
 * 
 * Sends reminders to employees who checked in but haven't checked out.
 */

import { NextRequest, NextResponse } from 'next/server';
import { processAttendanceReminder } from '@/lib/attendance-reminders';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(req: NextRequest) {
    // Verify cron secret
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        if (process.env.NODE_ENV === 'production') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
    }

    try {
        const result = await processAttendanceReminder("check_out_reminder", { now: new Date() });
        return NextResponse.json(result);

    } catch (error: any) {
        console.error('Check-out reminder cron error:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
