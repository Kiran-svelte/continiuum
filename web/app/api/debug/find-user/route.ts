import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const email = req.nextUrl.searchParams.get('email');
    
    try {
        if (email) {
            const employee = await prisma.employee.findFirst({
                where: { email: { contains: email, mode: 'insensitive' } },
                select: {
                    emp_id: true,
                    full_name: true,
                    email: true,
                    clerk_id: true,
                    org_id: true,
                    role: true,
                    onboarding_completed: true,
                    onboarding_status: true,
                    company: { select: { id: true, name: true } }
                }
            });
            return NextResponse.json({ employee });
        }
        
        // Return a few HR users
        const hrUsers = await prisma.employee.findMany({
            where: { role: 'hr', org_id: { not: null } },
            select: {
                emp_id: true,
                full_name: true,
                email: true,
                clerk_id: true,
                org_id: true
            },
            take: 5
        });
        return NextResponse.json({ hrUsers });
    } catch (error: any) {
        return NextResponse.json({ error: error.message });
    }
}
