/**
 * 📊 HR MISSING CHECK-IN NOTIFICATION CRON
 * 
 * Vercel Cron Schedule: 0 11 * * 1-5 (Mon-Fri at 11 AM UTC)
 * 
 * Notifies HR about employees who haven't checked in.
 * Per-company settings control whether emails are sent.
 */

import { NextRequest, NextResponse } from 'next/server';
import { processAttendanceReminder } from '@/lib/attendance-reminders';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(req: NextRequest) {
    // Verify cron secret (Vercel sets this automatically)
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        if (process.env.NODE_ENV === 'production') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
    }

    try {
        const result = await processAttendanceReminder("hr_notification", { now: new Date() });
        return NextResponse.json(result);

    } catch (error: any) {
        console.error('HR notification cron error:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
