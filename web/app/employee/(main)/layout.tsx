import Sidebar from "@/components/Sidebar";
import { getUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Server-side guard: Check auth and onboarding/approval status
    const user = await getUser();
    if (!user) {
        return redirect("/sign-in");
    }

    // Check employee exists and has completed onboarding
    const employee = await prisma.employee.findUnique({
        where: { clerk_id: user.id },
        select: {
            org_id: true,
            role: true,
            onboarding_status: true,
            onboarding_completed: true,
            approval_status: true,
            terms_accepted_at: true,
            company: {
                select: { id: true, name: true }
            }
        }
    });

    // No employee record - redirect to onboarding
    if (!employee) {
        return redirect("/onboarding?intent=employee");
    }

    // If HR/Admin, redirect to HR dashboard
    if (employee.role === "hr" || employee.role === "admin") {
        return redirect("/hr/dashboard");
    }

    // CRITICAL: Handle orphaned employees (company was deleted)
    // Employee has org_id but company doesn't exist - reset their state
    if (employee.org_id && !employee.company) {
        // Company was deleted, reset the employee's org affiliation
        await prisma.employee.update({
            where: { clerk_id: user.id },
            data: {
                org_id: null,
                approval_status: "pending",
                onboarding_status: "not_started",
                onboarding_completed: false
            }
        });
        return redirect("/onboarding?intent=employee&reason=company_deleted");
    }

    // CRITICAL: Employee MUST have joined a company (org_id)
    // This catches users who signed up but never entered a company code
    if (!employee.org_id || !employee.company) {
        return redirect("/onboarding?intent=employee");
    }

    // Check if rejected
    if (employee.approval_status === "rejected") {
        return redirect("/employee/rejected");
    }

    // If not approved yet (or in explicit pending flow), keep them on the pending page.
    // This MUST come after org_id check.
    if (employee.onboarding_status === "pending_approval" || employee.approval_status !== "approved") {
        return redirect("/employee/pending");
    }

    // Final check: tolerate legacy records where onboarding_completed may not be flipped,
    // as long as approval + onboarding_status indicate completion.
    const isOnboardingComplete =
        employee.approval_status === "approved" &&
        (employee.onboarding_completed === true || employee.onboarding_status === "completed" || employee.onboarding_status === "approved");

    if (!isOnboardingComplete) {
        return redirect("/employee/pending");
    }

    return (
        <div className="flex min-h-screen bg-gray-50 dark:bg-[#0f172a] transition-colors duration-300">
            <Sidebar />
            <main className="flex-1 ml-[280px] p-8 relative z-10">
                {/* Background Glow Effects - Dark mode only */}
                <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0 overflow-hidden dark:block hidden">
                    <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[100px]"></div>
                    <div className="absolute bottom-[-10%] left-[20%] w-[400px] h-[400px] bg-pink-500/10 rounded-full blur-[100px]"></div>
                </div>
                <div className="relative z-10">
                    {children}
                </div>
            </main>
        </div>
    );
}
