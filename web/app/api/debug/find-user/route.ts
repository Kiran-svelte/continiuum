import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    // Block in production
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: "Debug endpoints are disabled in production" }, { status: 403 });
    }

    // Require authentication
    const user = await getUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the calling employee to scope queries to their company
    const callerEmployee = await prisma.employee.findUnique({
        where: { clerk_id: user.id },
        select: { org_id: true, role: true }
    });

    if (!callerEmployee || !['hr', 'admin'].includes(callerEmployee.role)) {
        return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const email = req.nextUrl.searchParams.get('email');

    try {
        if (email) {
            // Only search within the caller's company
            const employee = await prisma.employee.findFirst({
                where: {
                    email: { contains: email, mode: 'insensitive' },
                    org_id: callerEmployee.org_id, // Scoped to own company
                },
                select: {
                    emp_id: true,
                    full_name: true,
                    email: true,
                    org_id: true,
                    role: true,
                    onboarding_completed: true,
                    onboarding_status: true,
                    company: { select: { id: true, name: true } }
                }
            });
            return NextResponse.json({ employee });
        }

        // Return HR users only from caller's company
        const hrUsers = await prisma.employee.findMany({
            where: {
                role: 'hr',
                org_id: callerEmployee.org_id, // Scoped to own company
            },
            select: {
                emp_id: true,
                full_name: true,
                email: true,
                org_id: true
            },
            take: 5
        });
        return NextResponse.json({ hrUsers });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
