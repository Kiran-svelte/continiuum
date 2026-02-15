import Sidebar from "@/components/Sidebar";
import { getUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hasRole } from "@/lib/rbac";

export default async function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  if (!user) {
    return redirect("/sign-in");
  }

  let employee;
  try {
    employee = await prisma.employee.findUnique({
      where: { clerk_id: user.id },
      select: {
        org_id: true,
        role: true,
        primary_role: true,
        secondary_roles: true,
        onboarding_status: true,
        onboarding_completed: true,
        approval_status: true,
        company: {
          select: { id: true, name: true },
        },
      },
    });
  } catch (error) {
    console.error("[Manager Layout] Database error:", error);
    return redirect("/employee/dashboard");
  }

  if (!employee) {
    return redirect("/onboarding");
  }

  // Manager portal is accessible to: team_lead, manager, director, hr, admin
  const isManager = hasRole(employee, [
    "team_lead",
    "manager",
    "director",
    "hr",
    "admin",
  ]);

  if (!isManager) {
    return redirect("/employee/dashboard");
  }

  if (!employee.org_id || !employee.company) {
    return redirect("/employee/dashboard");
  }

  const isOnboardingComplete =
    employee.onboarding_completed === true ||
    employee.onboarding_status === "completed";

  if (!isOnboardingComplete) {
    return redirect("/onboarding");
  }

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-[#0f172a] transition-colors duration-300">
      <Sidebar />
      <main className="flex-1 ml-[280px] p-8 relative z-10">
        <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0 overflow-hidden dark:block hidden">
          <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[100px]"></div>
          <div className="absolute bottom-[-10%] left-[20%] w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px]"></div>
        </div>
        <div className="relative z-10">{children}</div>
      </main>
    </div>
  );
}
