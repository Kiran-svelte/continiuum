import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { sendLeaveApprovalEmail, sendPriorityLeaveNotification } from "@/lib/email-service";
import { checkApiRateLimit, rateLimitedResponse, addRateLimitHeaders } from "@/lib/api-rate-limit";
import { createAuditLog, AUDIT_ACTIONS } from "@/lib/audit-logger";
import { leaveLogger } from "@/lib/logger";

/**
 * Leave Request Submission API
 * 
 * Handles leave request submission with:
 * - Rate limiting (5 req/min per user)
 * - AI-based auto-approval or escalation
 * - Audit logging for all submissions
 * - Explainable decision reasoning
 * - Graceful error handling with fallback
 */
export async function POST(req: NextRequest) {
    // Rate limiting
    const rateLimit = await checkApiRateLimit(req, 'leaveSubmit');
    if (!rateLimit.allowed) {
        return rateLimitedResponse(rateLimit);
    }
    
    const explanations: string[] = [];
    
    try {
        const user = await getUser();
        const userId = user?.id;
        if (!userId) {
            return NextResponse.json({ 
                success: false, 
                error: "Unauthorized",
                explanation: "User authentication failed. Please sign in again."
            }, { status: 401 });
        }

        const body = await req.json();
        const { leaveType, startDate, endDate, days, reason, aiRecommendation, aiConfidence, aiAnalysis, isHalfDay } = body;

        // Validate required fields
        if (!leaveType || !startDate || !endDate || !days) {
            return NextResponse.json({ 
                success: false, 
                error: "Missing required fields",
                explanation: "Please provide leave type, start date, end date, and duration."
            }, { status: 400 });
        }

        explanations.push(`Processing ${days} day(s) ${leaveType} request from ${startDate} to ${endDate}`);

        // Get employee from database
        const employee = await prisma.employee.findUnique({
            where: { clerk_id: userId },
        });

        if (!employee) {
            return NextResponse.json({ 
                success: false, 
                error: "Employee not found",
                explanation: "Your employee profile was not found. Please contact HR to set up your account."
            }, { status: 404 });
        }

        // CRITICAL: Verify employee is approved and onboarded
        if ((employee as any).approval_status !== "approved") {
            return NextResponse.json({ 
                success: false, 
                error: "Account not approved",
                explanation: "Your account is pending HR approval. You cannot submit leave requests until approved."
            }, { status: 403 });
        }

        if (!(employee as any).onboarding_completed) {
            return NextResponse.json({ 
                success: false, 
                error: "Onboarding incomplete",
                explanation: "Please complete the onboarding process before submitting leave requests."
            }, { status: 403 });
        }

        explanations.push(`Employee: ${employee.full_name} (${employee.department || 'No Department'})`);

        // ===== SERVER-SIDE CONSTRAINT VALIDATION =====
        // Don't trust frontend's aiRecommendation. Validate constraints server-side.
        let serverApproved = true;
        let serverViolations: string[] = [];
        let serverDecisionReason = '';

        // 1. Fetch company's constraint rules
        let constraintRules: Record<string, any> = {};
        if (employee.org_id) {
            const policy = await prisma.constraintPolicy.findFirst({
                where: { org_id: employee.org_id, is_active: true }
            });
            if (policy?.rules) {
                constraintRules = policy.rules as Record<string, any>;
            }
        }

        // 2. Fetch company's leave type config for this leave type
        let leaveTypeConfig: any = null;
        if (employee.org_id) {
            leaveTypeConfig = await prisma.leaveType.findFirst({
                where: {
                    company_id: employee.org_id,
                    OR: [{ code: leaveType }, { name: leaveType }],
                    is_active: true,
                }
            });
        }

        // 3. Run server-side constraint checks
        // RULE001: Maximum Leave Duration
        const rule001 = constraintRules['RULE001'];
        if (rule001 && rule001.is_active !== false) {
            const maxDays = rule001.config?.limits?.[leaveType] || rule001.config?.default_max || 30;
            if (days > maxDays) {
                serverApproved = false;
                serverViolations.push(`Maximum ${maxDays} days allowed for ${leaveType}, requested ${days}`);
            }
        }

        // RULE006: Advance Notice
        const rule006 = constraintRules['RULE006'];
        if (rule006 && rule006.is_active !== false) {
            const noticeDays = rule006.config?.notice_days?.[leaveType] || 0;
            const startDateObj = new Date(startDate);
            const today = new Date();
            const daysDiff = Math.ceil((startDateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            if (daysDiff < noticeDays) {
                serverApproved = false;
                serverViolations.push(`${leaveType} requires ${noticeDays} days advance notice, only ${daysDiff} given`);
            }
        }

        // RULE007: Consecutive Leave Limit
        const rule007 = constraintRules['RULE007'];
        if (rule007 && rule007.is_active !== false) {
            const maxConsecutive = rule007.config?.max_consecutive?.[leaveType] || leaveTypeConfig?.max_consecutive;
            if (maxConsecutive && days > maxConsecutive) {
                serverApproved = false;
                serverViolations.push(`Maximum ${maxConsecutive} consecutive days for ${leaveType}`);
            }
        }

        // RULE003: Team Coverage - check if too many people already on leave
        const rule003 = constraintRules['RULE003'];
        if (rule003 && rule003.is_active !== false && employee.org_id) {
            const minCoverage = rule003.config?.min_team_present || 3;
            const department = employee.department || 'General';

            const teamCount = await prisma.employee.count({
                where: { org_id: employee.org_id, department, is_active: true }
            });

            const onLeaveCount = await prisma.leaveRequest.count({
                where: {
                    status: 'approved',
                    employee: { org_id: employee.org_id, department },
                    start_date: { lte: new Date(endDate) },
                    end_date: { gte: new Date(startDate) }
                }
            });

            const wouldRemain = teamCount - onLeaveCount - 1; // -1 for the requester
            if (wouldRemain < minCoverage) {
                serverApproved = false;
                serverViolations.push(`Team coverage too low: only ${wouldRemain} would remain (minimum ${minCoverage} required)`);
            }
        }

        // RULE013: Monthly Quota
        const rule013 = constraintRules['RULE013'];
        if (rule013 && rule013.is_active !== false) {
            const maxPerMonth = rule013.config?.max_per_month || 5;
            const exceptionTypes = rule013.config?.exception_types || [];
            if (!exceptionTypes.includes(leaveType) && days > maxPerMonth) {
                serverApproved = false;
                serverViolations.push(`Monthly quota is ${maxPerMonth} days, requested ${days}`);
            }
        }

        // Half-day requests always require HR approval
        const requiresHRApproval = isHalfDay === true;
        const requestStatus = (serverApproved && !requiresHRApproval && serverViolations.length === 0) ? "approved" : "escalated";

        // Build decision explanation
        if (requestStatus === 'approved') {
            const ruleCount = Object.keys(constraintRules).filter(k => constraintRules[k].is_active !== false).length;
            serverDecisionReason = `AUTO-APPROVED: All ${ruleCount || 'policy'} constraints passed. AI Confidence: ${Math.round((aiConfidence || 0.95) * 100)}%.`;
            explanations.push(serverDecisionReason);
        } else {
            if (requiresHRApproval) {
                serverDecisionReason = 'ESCALATED: Half-day leaves always require HR approval for accurate tracking.';
            } else if (serverViolations.length > 0) {
                serverDecisionReason = `ESCALATED: ${serverViolations.length} constraint(s) need HR review: ${serverViolations.join(', ')}`;
            } else {
                serverDecisionReason = 'ESCALATED: Request requires HR approval based on policy rules.';
            }
            explanations.push(serverDecisionReason);
        }

        const decisionReason = serverDecisionReason;

        leaveLogger.info(`${decisionReason}`, { userId, leaveType, days });

        // Look up approval hierarchy for this employee
        let currentApprover: string | null = null;
        if (requestStatus === 'escalated') {
            try {
                const hierarchy = await prisma.approvalHierarchy.findUnique({
                    where: { emp_id: employee.emp_id, is_active: true }
                });
                if (hierarchy) {
                    currentApprover = hierarchy.level1_approver;
                    explanations.push(`Assigned to approver: ${currentApprover}`);
                }
            } catch (err) {
                // No hierarchy set up - will go to general HR pool
                explanations.push('No approval hierarchy set - request goes to HR pool');
            }
        }

        // Perform atomic transaction
        const result = await prisma.$transaction(async (tx) => {
            // A. Check Balance
            const currentYear = new Date().getFullYear();
            let balance = await tx.leaveBalance.findUnique({
                where: {
                    emp_id_leave_type_year: {
                        emp_id: employee.emp_id,
                        leave_type: leaveType,
                        year: currentYear
                    }
                }
            });

            // If no balance record exists, create one from company's leave type config
            if (!balance) {
                // Look up the company's configured entitlement for this leave type
                let entitlement = 0;
                if (employee.org_id) {
                    const leaveTypeConfig = await tx.leaveType.findFirst({
                        where: {
                            company_id: employee.org_id,
                            OR: [
                                { code: leaveType },
                                { name: leaveType }
                            ],
                            is_active: true,
                        },
                        select: { annual_quota: true }
                    });
                    entitlement = leaveTypeConfig ? Number(leaveTypeConfig.annual_quota) : 0;
                }

                if (entitlement <= 0) {
                    throw new Error(`No leave entitlement configured for "${leaveType}". Please contact HR to set up leave types.`);
                }

                explanations.push(`No existing ${leaveType} balance found - creating with ${entitlement} day entitlement from company config`);
                balance = await tx.leaveBalance.create({
                    data: {
                        emp_id: employee.emp_id,
                        leave_type: leaveType,
                        year: currentYear,
                        country_code: employee.country_code || "IN",
                        annual_entitlement: entitlement,
                        used_days: 0,
                        pending_days: 0,
                        carried_forward: 0
                    }
                });
            }

            const stats = {
                entitled: Number(balance.annual_entitlement) + Number(balance.carried_forward),
                used: Number(balance.used_days),
                pending: Number(balance.pending_days)
            };
            const remaining = stats.entitled - stats.used - stats.pending;

            explanations.push(`Balance: ${remaining} days remaining (${stats.entitled} total - ${stats.used} used - ${stats.pending} pending)`);

            if (remaining < days) {
                throw new Error(`Insufficient Balance. You have ${remaining} days available but requested ${days} days.`);
            }

            // B. Update Balance
            if (requestStatus === 'approved') {
                await tx.leaveBalance.update({
                    where: { balance_id: balance.balance_id },
                    data: {
                        used_days: { increment: days }
                    }
                });
                explanations.push(`Deducted ${days} days from ${leaveType} balance`);
            } else {
                await tx.leaveBalance.update({
                    where: { balance_id: balance.balance_id },
                    data: {
                        pending_days: { increment: days }
                    }
                });
                explanations.push(`Reserved ${days} days as pending (will be deducted upon HR approval)`);
            }

            // C. Create Leave Request with explanation
            const requestId = `REQ-${Date.now()}`;
            const newRequest = await tx.leaveRequest.create({
                data: {
                    request_id: requestId,
                    emp_id: employee.emp_id,
                    country_code: employee.country_code || "IN",
                    leave_type: leaveType,
                    start_date: new Date(startDate),
                    end_date: new Date(endDate),
                    total_days: days,
                    working_days: days,
                    reason: reason || decisionReason, // Include decision reason in the request reason
                    status: requestStatus,
                    current_approver: currentApprover,
                    escalation_reason: requestStatus === 'escalated' ? serverDecisionReason : null,
                    is_half_day: isHalfDay || false,
                    ai_recommendation: serverApproved ? "approve" : "escalate",
                    ai_confidence: aiConfidence || 0.95,
                    ai_analysis_json: aiAnalysis ? JSON.stringify({
                        ...aiAnalysis,
                        decision_reason: decisionReason,
                        explanations
                    }) : undefined,
                    sla_deadline: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h SLA
                }
            });

            return newRequest;
        });

        // Send email notification for auto-approved requests
        if (requestStatus === 'approved') {
            sendLeaveApprovalEmail(
                { email: employee.email, full_name: employee.full_name },
                {
                    leaveType,
                    startDate: new Date(startDate).toLocaleDateString('en-US', { 
                        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
                    }),
                    endDate: new Date(endDate).toLocaleDateString('en-US', { 
                        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
                    }),
                    totalDays: days,
                    approvedBy: 'AI System',
                    reason: decisionReason
                }
            ).catch(err => leaveLogger.error('Email notification failed', err));
        } else {
            // Send priority notification to HR for escalated requests
            // Determine priority based on leave type and urgency
            const isUrgent = leaveType.toLowerCase().includes('emergency') || 
                             leaveType.toLowerCase().includes('sick') ||
                             new Date(startDate) <= new Date(Date.now() + 2 * 24 * 60 * 60 * 1000); // Within 2 days
            
            const isCritical = leaveType.toLowerCase().includes('emergency') && 
                               new Date(startDate) <= new Date(Date.now() + 24 * 60 * 60 * 1000); // Within 1 day

            const priority = isCritical ? 'CRITICAL' : isUrgent ? 'URGENT' : 'HIGH';

            // Get HR users to notify - ONLY from the same company
            const hrUsers = await prisma.employee.findMany({
                where: {
                    org_id: employee.org_id,
                    OR: [
                        { role: 'hr' },
                        { role: 'admin' }
                    ]
                },
                select: { email: true }
            });

            // Send notification to all HR users
            for (const hr of hrUsers) {
                sendPriorityLeaveNotification(
                    hr.email,
                    {
                        employeeName: employee.full_name,
                        leaveType,
                        startDate: new Date(startDate).toLocaleDateString('en-US', { 
                            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
                        }),
                        endDate: new Date(endDate).toLocaleDateString('en-US', { 
                            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
                        }),
                        days,
                        reason: reason || 'No reason provided',
                        priority
                    }
                ).catch(err => leaveLogger.error('HR notification failed', err));
            }
        }

        // Audit log the leave submission
        await createAuditLog({
            actor_id: employee.emp_id,
            actor_role: employee.role,
            action: AUDIT_ACTIONS.LEAVE_REQUEST_CREATED,
            entity_type: 'LeaveRequest',
            entity_id: result.request_id,
            resource_name: `${leaveType} - ${days} days`,
            new_state: {
                status: result.status,
                leave_type: leaveType,
                start_date: startDate,
                end_date: endDate,
                total_days: days,
                is_half_day: isHalfDay
            },
            details: {
                ai_recommendation: isAutoApprovable ? 'approve' : 'escalate',
                ai_confidence: aiConfidence,
                decision_reason: decisionReason
            },
            target_org: employee.org_id || 'unknown'
        }).catch(err => leaveLogger.error('Audit log failed', err));

        // Revalidate paths to update UI
        revalidatePath("/employee/dashboard");
        revalidatePath("/employee/request-leave");
        revalidatePath("/employee/my-history");
        revalidatePath("/hr/dashboard");
        revalidatePath("/hr/leave-requests");

        const userMessage = requestStatus === 'approved' 
            ? "✅ Leave request auto-approved! Check your email for confirmation." 
            : "📋 Leave request submitted for HR review. You'll be notified once reviewed.";

        return NextResponse.json({
            success: true,
            request: {
                request_id: result.request_id,
                status: result.status,
                leave_type: result.leave_type,
                start_date: result.start_date,
                end_date: result.end_date,
                total_days: result.total_days
            },
            message: userMessage,
            explanation: explanations.join(' → '),
            decision_reason: decisionReason
        });

    } catch (error) {
        leaveLogger.error("Leave Submit Error", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to submit leave request";
        
        return NextResponse.json(
            { 
                success: false, 
                error: errorMessage,
                explanation: `Request failed: ${errorMessage}. Please try again or contact HR for assistance.`,
                suggestions: [
                    "Check your leave balance",
                    "Verify the dates are correct",
                    "Try a different leave type",
                    "Contact HR for help"
                ]
            }, 
            { status: 500 }
        );
    }
}
