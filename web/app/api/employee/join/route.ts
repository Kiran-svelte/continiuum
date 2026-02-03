import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, rateLimitResponse } from "@/lib/security";

export async function POST(req: NextRequest) {
    try {
        // Rate limit: 10 join attempts per hour per IP (in case of typos)
        const rateLimit = await checkRateLimit(req, { windowMs: 3600000, maxRequests: 10 });
        if (!rateLimit.allowed) {
            return rateLimitResponse(rateLimit.resetTime);
        }

        const user = await getUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { companyCode } = await req.json();

        if (!companyCode || typeof companyCode !== 'string') {
            return NextResponse.json({ error: "Company code is required" }, { status: 400 });
        }

        // Find Company
        const company = await prisma.company.findUnique({
            where: { code: companyCode.toUpperCase() },
        });

        if (!company) {
            return NextResponse.json({ error: "Invalid Company Code" }, { status: 404 });
        }

        // Get current user details from Supabase
        const email = user.email;
        const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || email?.split('@')[0] || 'Employee';

        // Check if employee already exists
        const existingEmployee = await prisma.employee.findUnique({
            where: { clerk_id: userId }
        });

        if (existingEmployee) {
            // Update existing employee - link to company
            await prisma.employee.update({
                where: { clerk_id: userId },
                data: {
                    org_id: company.id,
                    onboarding_status: 'pending_approval',
                    approval_status: 'pending',
                }
            });
        } else {
            // Create new employee record with basic info
            const emp_id = `EMP-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
            
            await prisma.employee.create({
                data: {
                    emp_id,
                    clerk_id: userId,
                    full_name: fullName,
                    email: email || '',
                    org_id: company.id,
                    role: 'employee',
                    onboarding_status: 'pending_approval',
                    approval_status: 'pending',
                }
            });
        }

        return NextResponse.json({ 
            success: true, 
            org_name: company.name,
            message: "Successfully joined company. Awaiting HR approval."
        });
    } catch (error: any) {
        console.error("Join Org Error:", error);
        return NextResponse.json({ error: error.message || "Failed to join organization" }, { status: 500 });
    }
}
