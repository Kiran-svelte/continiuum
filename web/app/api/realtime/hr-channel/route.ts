import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { hrOrgChannelName } from "@/lib/realtime/channels";

const HR_ROLES = new Set(["hr", "hr_manager", "admin", "super_admin", "manager"]);

export async function GET() {
    const user = await getUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const employee = await prisma.employee.findFirst({
        where: { clerk_id: user.id },
        select: { org_id: true, role: true },
    });

    if (!employee?.org_id) {
        return NextResponse.json({ error: "No organization found" }, { status: 404 });
    }

    if (!HR_ROLES.has(employee.role || "")) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    return NextResponse.json({
        orgId: employee.org_id,
        channelName: hrOrgChannelName(employee.org_id),
    });
}
