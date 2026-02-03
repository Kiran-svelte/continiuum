import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getPusherServer } from "@/lib/realtime/pusher-server";
import { hrOrgChannelName } from "@/lib/realtime/channels";

const HR_ROLES = new Set(["hr", "hr_manager", "admin", "super_admin", "manager"]);

export async function POST(request: NextRequest) {
    const pusher = getPusherServer();
    if (!pusher) {
        return NextResponse.json({ error: "Pusher not configured" }, { status: 501 });
    }

    const user = await getUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const bodyText = await request.text();
    const params = new URLSearchParams(bodyText);
    const socketId = params.get("socket_id") || undefined;
    const channelName = params.get("channel_name") || undefined;

    if (!socketId || !channelName) {
        return NextResponse.json({ error: "Missing socket_id or channel_name" }, { status: 400 });
    }

    const employee = await prisma.employee.findFirst({
        where: { clerk_id: user.id },
        select: { org_id: true, role: true },
    });

    if (!employee?.org_id) {
        return NextResponse.json({ error: "No organization found" }, { status: 403 });
    }

    if (!HR_ROLES.has(employee.role || "")) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const expected = hrOrgChannelName(employee.org_id);
    if (channelName !== expected) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const authResponse = pusher.authorizeChannel(socketId, channelName);
    return NextResponse.json(authResponse);
}
