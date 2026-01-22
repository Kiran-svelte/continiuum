/**
 * 🕓 CHECK-OUT REMINDER CRON
 * 
 * Vercel Cron Schedule: 0 15,16 * * 1-5 (Mon-Fri at 3:00 PM and 4:00 PM)
 * 
 * Sends reminders to employees who checked in but haven't checked out.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendCheckOutReminderEmail } from '@/lib/email-service';

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

    const now = new Date();
    const hour = now.getHours();
    
    // Reminder 1 at 3PM, Reminder 2 at 4PM+
    const reminderNumber: 1 | 2 = hour >= 16 ? 2 : 1;
    
    const todayStr = now.toISOString().split('T')[0];
    const today = new Date(todayStr + 'T00:00:00.000Z');

    try {
        // Get employees who checked in but haven't checked out
        const missingCheckouts = await prisma.attendance.findMany({
            where: {
                date: today,
                check_in: { not: null },
                check_out: null
            },
            include: {
                employee: {
                    select: { email: true, full_name: true }
                }
            }
        });

        let sent = 0;
        const errors: string[] = [];

        for (const att of missingCheckouts) {
            try {
                const checkInTime = att.check_in!.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                });

                const result = await sendCheckOutReminderEmail({
                    email: att.employee.email,
                    full_name: att.employee.full_name,
                    check_in_time: checkInTime
                }, reminderNumber);

                if (result.success) sent++;
                else errors.push(`${att.employee.full_name}: ${result.error}`);
            } catch (err: any) {
                errors.push(`${att.employee.full_name}: ${err.message}`);
            }
        }

        return NextResponse.json({
            success: true,
            time: now.toISOString(),
            reminderNumber,
            stats: {
                missingCheckouts: missingCheckouts.length,
                emailsSent: sent,
                errors: errors.length
            },
            message: `Sent ${sent} check-out reminders (reminder #${reminderNumber})`
        });

    } catch (error: any) {
        console.error('Check-out reminder cron error:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
