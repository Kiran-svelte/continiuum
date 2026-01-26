/**
 * ⏰ TRIAL EXPIRATION CRON
 * 
 * Vercel Cron Schedule: 0 9 * * * (Daily at 9:00 AM)
 * 
 * Handles trial expirations and sends reminder emails.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email-service';

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

    try {
        // Find subscriptions with active trials
        const subsWithTrials = await prisma.subscription.findMany({
            where: {
                status: 'trialing',
                trial_end: { not: null }
            },
            include: {
                company: {
                    include: {
                        employees: {
                            where: { role: { in: ['hr', 'admin'] } },
                            select: { email: true, full_name: true }
                        }
                    }
                }
            }
        });

        let expiringSoon = 0;
        let expired = 0;
        let notified = 0;

        for (const sub of subsWithTrials) {
            const trialEnd = sub.trial_end!;
            const daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

            // Trial expired
            if (daysLeft <= 0) {
                expired++;
                
                // Downgrade to FREE tier
                await prisma.subscription.update({
                    where: { id: sub.id },
                    data: {
                        status: 'active',
                        plan: 'FREE',
                        plan_tier: 'FREE'
                    }
                });

                // Update company tier
                await prisma.company.update({
                    where: { id: sub.org_id },
                    data: {
                        subscription_tier: 'FREE'
                    }
                });

                // Notify admins
                for (const admin of sub.company.employees) {
                    await sendEmail(
                        admin.email,
                        '⚠️ Your Continuum Trial Has Expired',
                        `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <div style="background: linear-gradient(135deg, #ef4444, #dc2626); padding: 25px; text-align: center;">
                                <h1 style="color: white; margin: 0;">Trial Expired</h1>
                            </div>
                            <div style="padding: 30px; background: #1e293b; color: #e2e8f0;">
                                <h2 style="color: #fff;">Hi ${admin.full_name},</h2>
                                <p>Your 14-day trial of Continuum Growth features has ended.</p>
                                <p>Your account has been moved to the <strong>Free tier</strong>.</p>
                                
                                <div style="background: #334155; padding: 20px; border-radius: 8px; margin: 20px 0;">
                                    <p style="margin: 0; color: #94a3b8;">To continue using premium features:</p>
                                    <ul style="color: #e2e8f0; margin-top: 10px;">
                                        <li>AI Leave Management</li>
                                        <li>Advanced Analytics</li>
                                        <li>Priority Support</li>
                                        <li>Custom Workflows</li>
                                    </ul>
                                </div>
                                
                                <div style="text-align: center; margin-top: 25px;">
                                    <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/hr/settings/billing" style="display: inline-block; background: #10b981; color: white; padding: 14px 35px; border-radius: 8px; text-decoration: none; font-weight: bold;">Upgrade Now</a>
                                </div>
                            </div>
                        </div>
                        `
                    ).catch(console.error);
                    notified++;
                }
            }
            // Trial expiring in 3 days
            else if (daysLeft === 3) {
                expiringSoon++;
                
                for (const admin of sub.company.employees) {
                    await sendEmail(
                        admin.email,
                        '⏳ Your Continuum Trial Expires in 3 Days',
                        `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <div style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 25px; text-align: center;">
                                <h1 style="color: white; margin: 0;">⏳ 3 Days Left</h1>
                            </div>
                            <div style="padding: 30px; background: #1e293b; color: #e2e8f0;">
                                <h2 style="color: #fff;">Hi ${admin.full_name},</h2>
                                <p>Your trial of Continuum Growth features expires in <strong>3 days</strong>.</p>
                                <p>Upgrade now to keep access to all premium features!</p>
                                
                                <div style="text-align: center; margin-top: 25px;">
                                    <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/hr/settings/billing" style="display: inline-block; background: #10b981; color: white; padding: 14px 35px; border-radius: 8px; text-decoration: none; font-weight: bold;">Upgrade Now - 20% Off Yearly</a>
                                </div>
                            </div>
                        </div>
                        `
                    ).catch(console.error);
                    notified++;
                }
            }
            // Trial expiring in 1 day (final warning)
            else if (daysLeft === 1) {
                expiringSoon++;
                
                for (const admin of sub.company.employees) {
                    await sendEmail(
                        admin.email,
                        '🚨 FINAL WARNING: Trial Expires Tomorrow!',
                        `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <div style="background: linear-gradient(135deg, #ef4444, #b91c1c); padding: 25px; text-align: center;">
                                <h1 style="color: white; margin: 0;">🚨 Last Chance!</h1>
                            </div>
                            <div style="padding: 30px; background: #1e293b; color: #e2e8f0;">
                                <h2 style="color: #fff;">Hi ${admin.full_name},</h2>
                                <p style="font-size: 18px;"><strong>Your trial expires TOMORROW!</strong></p>
                                <p>After tomorrow, you'll lose access to:</p>
                                
                                <div style="background: #7f1d1d; padding: 15px; border-radius: 8px; margin: 20px 0;">
                                    <ul style="color: #fecaca; margin: 0;">
                                        <li>AI-Powered Leave Decisions</li>
                                        <li>Advanced Reporting</li>
                                        <li>Email Notifications</li>
                                        <li>Priority Support</li>
                                    </ul>
                                </div>
                                
                                <div style="text-align: center; margin-top: 25px;">
                                    <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/hr/settings/billing" style="display: inline-block; background: #10b981; color: white; padding: 16px 40px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 18px;">Upgrade Now - Don't Lose Access!</a>
                                </div>
                            </div>
                        </div>
                        `
                    ).catch(console.error);
                    notified++;
                }
            }
        }

        return NextResponse.json({
            success: true,
            time: now.toISOString(),
            stats: {
                activeTrials: subsWithTrials.length,
                expiringSoon,
                expired,
                notified
            },
            message: `Processed ${subsWithTrials.length} trials: ${expired} expired, ${expiringSoon} expiring soon`
        });

    } catch (error: any) {
        console.error('Trial expiration cron error:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
