/**
 * 📊 HR ATTENDANCE ALERT CRON
 * 
 * Vercel Cron Schedule: 30 10 * * 1-5 (Mon-Fri at 10:30 AM)
 * 
 * Notifies HR about employees who haven't checked in and aren't on leave.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendHRMissingCheckInsEmail } from '@/lib/email-service';

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
    const todayStr = now.toISOString().split('T')[0];
    const today = new Date(todayStr + 'T00:00:00.000Z');

    try {
        // Get all HR users grouped by org
        const hrUsers = await prisma.employee.findMany({
            where: { 
                role: { in: ['hr', 'admin'] }, 
                is_active: true 
            },
            select: { email: true, full_name: true, org_id: true }
        });

        if (hrUsers.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'No HR users found in system',
                stats: { hrNotified: 0, missingEmployees: 0 }
            });
        }

        // Group HR by organization
        const hrByOrg = new Map<string, typeof hrUsers>();
        for (const hr of hrUsers) {
            const orgId = hr.org_id || 'default';
            if (!hrByOrg.has(orgId)) hrByOrg.set(orgId, []);
            hrByOrg.get(orgId)!.push(hr);
        }

        let totalMissing = 0;
        let hrNotified = 0;

        for (const [orgId, orgHrUsers] of hrByOrg) {
            // Get all active employees for this org
            const allEmployees = await prisma.employee.findMany({
                where: { 
                    is_active: true,
                    ...(orgId !== 'default' ? { org_id: orgId } : {})
                },
                select: { emp_id: true, full_name: true, department: true }
            });

            // Get employees who checked in
            const checkedIn = await prisma.attendance.findMany({
                where: { date: today, check_in: { not: null } },
                select: { emp_id: true }
            });

            // Get employees on leave
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

            // Find missing employees (not checked in, not on leave, not HR/admin)
            const missingEmployees = allEmployees.filter(e => 
                !checkedInIds.has(e.emp_id) && 
                !onLeaveIds.has(e.emp_id)
            );

            if (missingEmployees.length === 0) continue;

            totalMissing += missingEmployees.length;

            // Send to all HR in this org
            for (const hr of orgHrUsers) {
                try {
                    const result = await sendHRMissingCheckInsEmail(
                        hr.email,
                        missingEmployees.map(e => ({ 
                            name: e.full_name, 
                            department: e.department 
                        }))
                    );
                    if (result.success) hrNotified++;
                } catch (err) {
                    console.error(`Failed to notify ${hr.email}:`, err);
                }
            }
        }

        return NextResponse.json({
            success: true,
            time: now.toISOString(),
            stats: {
                organizations: hrByOrg.size,
                missingEmployees: totalMissing,
                hrNotified
            },
            message: totalMissing > 0 
                ? `Notified ${hrNotified} HR staff about ${totalMissing} missing employees`
                : 'All employees accounted for'
        });

    } catch (error: any) {
        console.error('HR attendance alert cron error:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
