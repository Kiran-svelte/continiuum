import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { getPusherServer } from "@/lib/realtime/pusher-server";
import { hrOrgChannelName } from "@/lib/realtime/channels";

// Helper to extract enhanced fields from details JSON (backward compatible)
function extractFromDetails(details: any) {
    return {
        actor_type: details?.actor_type || 'user',
        actor_role: details?.actor_role,
        resource_name: details?.resource_name,
        previous_state: details?.previous_state,
        new_state: details?.new_state,
        decision: details?.decision,
        decision_reason: details?.decision_reason,
        confidence_score: details?.confidence_score,
        model_version: details?.model_version,
        ip_address: details?.ip_address,
        user_agent: details?.user_agent,
        request_id: details?.request_id || `req_${crypto.randomUUID().split('-')[0]}`,
        integrity_hash: details?.integrity_hash || `sha256:${crypto.randomBytes(16).toString('hex')}`
    };
}

// GET - Fetch audit logs with filtering
export async function GET(request: NextRequest) {
    try {
        const user = await getUser();
        const userId = user?.id;
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get employee and verify HR role
        const employee = await prisma.employee.findFirst({
            where: { clerk_id: userId },
            select: {
                emp_id: true,
                org_id: true,
                role: true,
                full_name: true
            }
        });

        if (!employee) {
            return NextResponse.json({ error: "Employee not found" }, { status: 404 });
        }

        // Only HR and admins can access audit logs
        if (!["hr", "hr_manager", "admin", "super_admin", "manager"].includes(employee.role || "")) {
            return NextResponse.json({ error: "Access denied - HR role required" }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "50");
        const actorType = searchParams.get("actor_type");
        const action = searchParams.get("action");
        const entityType = searchParams.get("entity_type");
        const fromDate = searchParams.get("from");
        const toDate = searchParams.get("to");
        const search = searchParams.get("search");
        const since = searchParams.get("since"); // For real-time polling

        // Build where clause
        const where: any = {
            target_org: employee.org_id
        };

        if (action && action !== "all") {
            where.action = action;
        }

        if (entityType && entityType !== "all") {
            where.entity_type = entityType;
        }

        if (fromDate) {
            where.created_at = { ...where.created_at, gte: new Date(fromDate) };
        }

        if (toDate) {
            const endDate = new Date(toDate);
            endDate.setHours(23, 59, 59, 999);
            where.created_at = { ...where.created_at, lte: endDate };
        }

        // For real-time updates - fetch only logs since a timestamp
        if (since) {
            where.created_at = { ...where.created_at, gt: new Date(since) };
        }

        if (search) {
            where.OR = [
                { action: { contains: search, mode: "insensitive" } },
                { entity_type: { contains: search, mode: "insensitive" } },
                { entity_id: { contains: search, mode: "insensitive" } }
            ];
        }

        // Fetch logs
        const [logs, total] = await Promise.all([
            prisma.auditLog.findMany({
                where,
                orderBy: { created_at: "desc" },
                skip: (page - 1) * limit,
                take: limit
            }),
            prisma.auditLog.count({ where })
        ]);

        // Get actor names for user actors
        const actorIds = logs.map(l => l.actor_id).filter(Boolean);
        const actors = await prisma.employee.findMany({
            where: { emp_id: { in: actorIds } },
            select: { emp_id: true, full_name: true, role: true }
        });
        const actorMap = new Map(actors.map(a => [a.emp_id, a]));

        // Format logs for response (backward compatible with enhanced schema)
        const formattedLogs = logs.map(log => {
            const details = log.details as Record<string, any> || {};
            const enhanced = extractFromDetails(details);
            const actor = actorMap.get(log.actor_id);
            
            // Prefer DB columns, fallback to legacy details JSON
            const actorType = (log as any).actor_type || enhanced.actor_type || 'user';
            
            // Get actor name - from details for AI/system, from employee for users
            let actorName = actor?.full_name || details.actor_name || "Unknown";
            if (actorType === 'ai') actorName = details.actor_name || actorName || "Constraint Engine";
            if (actorType === 'system') actorName = details.actor_name || actorName || "System Scheduler";
            
            return {
                id: log.id,
                timestamp: log.created_at.toISOString(),
                actor_type: actorType,
                actor_id: log.actor_id,
                actor_name: actorName,
                actor_role: (log as any).actor_role || enhanced.actor_role || actor?.role || "system",
                action: log.action,
                resource_type: log.entity_type,
                resource_id: log.entity_id,
                resource_name: (log as any).resource_name || enhanced.resource_name,
                previous_state: (log as any).previous_state ?? enhanced.previous_state,
                new_state: (log as any).new_state ?? enhanced.new_state,
                decision: (log as any).decision ?? enhanced.decision,
                decision_reason: (log as any).decision_reason ?? enhanced.decision_reason,
                confidence_score: (log as any).confidence_score ?? enhanced.confidence_score,
                model_version: (log as any).model_version ?? enhanced.model_version,
                ip_address: (log as any).ip_address ?? enhanced.ip_address,
                user_agent: (log as any).user_agent ?? enhanced.user_agent,
                request_id: (log as any).request_id || enhanced.request_id,
                integrity_hash: (log as any).integrity_hash || enhanced.integrity_hash,
                org_id: log.target_org,
                details: details
            };
        });

        // Filter by actor type (post-query since it's in details JSON)
        let filteredLogs = formattedLogs;
        if (actorType && actorType !== "all") {
            filteredLogs = formattedLogs.filter(log => log.actor_type === actorType);
        }

        return NextResponse.json({
            logs: filteredLogs,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error("Audit log fetch error:", error);
        return NextResponse.json(
            { error: "Failed to fetch audit logs" },
            { status: 500 }
        );
    }
}

// POST - Create new audit log entry (internal use only)
// Requires either: valid user session OR internal API secret
export async function POST(request: NextRequest) {
    try {
        // Security: Require authentication or internal secret
        const authHeader = request.headers.get('x-internal-secret');
        const internalSecret = process.env.INTERNAL_API_SECRET;
        
        // Allow if internal secret matches OR user is authenticated with HR role
        if (authHeader !== internalSecret) {
            const { userId } = await auth();
            if (!userId) {
                return NextResponse.json({ error: "Unauthorized - authentication required" }, { status: 401 });
            }
            
            // Verify user has permission to create audit logs
            const employee = await prisma.employee.findFirst({
                where: { clerk_id: userId },
                select: { role: true }
            });
            
            if (!employee || !["hr", "admin", "super_admin"].includes(employee.role || "")) {
                return NextResponse.json({ error: "Forbidden - insufficient permissions" }, { status: 403 });
            }
        }

        const body = await request.json();
        const {
            actor_type,
            actor_id,
            actor_role,
            action,
            entity_type,
            entity_id,
            resource_name,
            previous_state,
            new_state,
            details: additionalDetails,
            decision,
            decision_reason,
            confidence_score,
            model_version,
            rules_evaluated,
            ip_address,
            user_agent,
            target_org
        } = body;

        // Validate required fields
        if (!action || !entity_type || !entity_id || !target_org) {
            return NextResponse.json(
                { error: "Missing required fields: action, entity_type, entity_id, target_org" },
                { status: 400 }
            );
        }

        // Generate request ID and integrity hash
        const request_id = `req_${crypto.randomUUID().split('-')[0]}`;
        
        // Create log content for hashing
        const logContent = JSON.stringify({
            timestamp: new Date().toISOString(),
            actor_type,
            actor_id,
            action,
            entity_type,
            entity_id
        });

        // Generate integrity hash
        const integrity_hash = `sha256:${crypto
            .createHash("sha256")
            .update(logContent)
            .digest("hex")}`;

        // Store enhanced fields in details JSON until schema migration
        const enhancedDetails = {
            ...additionalDetails,
            actor_type: actor_type || "system",
            actor_role,
            resource_name,
            previous_state,
            new_state,
            decision,
            decision_reason,
            confidence_score,
            model_version,
            rules_evaluated,
            ip_address,
            user_agent,
            request_id,
            integrity_hash
        };

        // Create audit log using existing schema
        const auditLog = await prisma.auditLog.create({
            data: {
                actor_id: actor_id || "system",
                action,
                entity_type,
                entity_id,
                target_org,
                details: enhancedDetails
            }
        });

        // Best-effort realtime broadcast
        try {
            const pusher = getPusherServer();
            if (pusher) {
                let actorName = typeof enhancedDetails.actor_name === "string" ? enhancedDetails.actor_name : "System";
                if ((enhancedDetails.actor_type || "user") === "user" && actor_id) {
                    const actor = await prisma.employee.findUnique({
                        where: { emp_id: actor_id },
                        select: { full_name: true },
                    });
                    actorName = actor?.full_name || actorName;
                }

                await pusher.trigger(hrOrgChannelName(target_org), "audit_log.created", {
                    log: {
                        id: auditLog.id,
                        timestamp: auditLog.created_at.toISOString(),
                        actor_type: enhancedDetails.actor_type || "system",
                        actor_id: actor_id || "system",
                        actor_name: actorName,
                        actor_role: enhancedDetails.actor_role || "system",
                        action,
                        resource_type: entity_type,
                        resource_id: entity_id,
                        resource_name: resource_name,
                        previous_state,
                        new_state,
                        decision,
                        decision_reason,
                        confidence_score,
                        model_version,
                        ip_address,
                        user_agent,
                        request_id,
                        integrity_hash,
                        org_id: target_org,
                    },
                    activity: {
                        id: auditLog.id,
                        action,
                        created_at: auditLog.created_at,
                        actor_name: actorName,
                        change_summary: (typeof (enhancedDetails as Record<string, unknown>)["summary"] === "string" ? ((enhancedDetails as Record<string, unknown>)["summary"] as string) : action),
                    }
                });
            }
        } catch (realtimeError) {
            console.warn("Audit log realtime broadcast error (POST):", realtimeError);
        }

        return NextResponse.json({
            success: true,
            log_id: auditLog.id,
            request_id,
            integrity_hash
        }, { status: 201 });
    } catch (error) {
        console.error("Audit log creation error:", error);
        return NextResponse.json(
            { error: "Failed to create audit log" },
            { status: 500 }
        );
    }
}
