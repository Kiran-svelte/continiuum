/**
 * 🕘 CHECK-IN REMINDER CRON
 * 
 * Vercel Cron Schedule: 10,30 9,10 * * 1-5 (Mon-Fri at 9:10, 9:30, 10:10, 10:30)
 * 
 * Sends reminders to employees who haven't checked in yet.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendCheckInReminderEmail } from '@/lib/email-service';

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

    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    
    // Determine reminder number based on time
    const reminderNumber: 1 | 2 = hour >= 10 ? 2 : 1;
    
    const todayStr = now.toISOString().split('T')[0];
    const today = new Date(todayStr + 'T00:00:00.000Z');

    try {
        // Get all active employees
        const allEmployees = await prisma.employee.findMany({
            where: { is_active: true },
            select: { emp_id: true, email: true, full_name: true, org_id: true }
        });

        // Get employees who already checked in today
        const checkedIn = await prisma.attendance.findMany({
            where: { date: today, check_in: { not: null } },
            select: { emp_id: true }
        });

        // Get employees on approved leave today
        const onLeave = await prisma.leaveRequest.findMany({
            where: {
                status: 'approved',
                start_date: { lte: today },
                end_date: { gte: today }
            },
            select: { emp_id: true }
        });

        const checkedInIds = new Set(checkedIn.map(a => a.emp_id));
        const onLeaveIds = new Set(onLeave.map(l => l.emp_id));

        // Filter to employees needing reminders
        const needsReminder = allEmployees.filter(e => 
            !checkedInIds.has(e.emp_id) && !onLeaveIds.has(e.emp_id)
        );

        // Send reminders
        let sent = 0;
        const errors: string[] = [];

        for (const emp of needsReminder) {
            try {
                const result = await sendCheckInReminderEmail(emp, reminderNumber);
                if (result.success) sent++;
                else errors.push(`${emp.full_name}: ${result.error}`);
            } catch (err: any) {
                errors.push(`${emp.full_name}: ${err.message}`);
            }
        }

        return NextResponse.json({
            success: true,
            time: now.toISOString(),
            reminderNumber,
            stats: {
                totalEmployees: allEmployees.length,
                checkedIn: checkedIn.length,
                onLeave: onLeave.length,
                needsReminder: needsReminder.length,
                emailsSent: sent,
                errors: errors.length
            },
            message: `Sent ${sent} check-in reminders (reminder #${reminderNumber})`
        });

    } catch (error: any) {
        console.error('Check-in reminder cron error:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
