import { getMyTeamMembers, getTeamLeaveBalances } from "@/app/actions/manager-portal";
import { redirect } from "next/navigation";

export default async function TeamPage() {
  const [teamResult, balanceResult] = await Promise.all([
    getMyTeamMembers(),
    getTeamLeaveBalances(),
  ]);

  if (!teamResult.success) redirect("/employee/dashboard");

  const members = "members" in teamResult ? teamResult.members : [];
  const balances =
    balanceResult.success && "balances" in balanceResult
      ? balanceResult.balances
      : [];

  const balanceMap = new Map(balances.map((b: any) => [b.emp_id, b.balances]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          My Team
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          {members.length} team member{members.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Team Members Table */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Employee
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Department
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Role
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Leave Balance
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {members.map((member: any) => {
                const memberBalances = balanceMap.get(member.emp_id) || [];
                const totalRemaining = memberBalances.reduce(
                  (sum: number, b: any) => sum + b.remaining,
                  0
                );

                return (
                  <tr
                    key={member.emp_id}
                    className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-sm font-medium text-indigo-600 dark:text-indigo-400">
                          {member.full_name
                            .split(" ")
                            .map((n: string) => n[0])
                            .join("")
                            .slice(0, 2)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {member.full_name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {member.designation || member.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                      {member.department || "-"}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                        {member.primary_role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          member.status === "active"
                            ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400"
                            : member.status === "probation"
                            ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400"
                            : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {member.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                      {memberBalances.length > 0 ? (
                        <span
                          className={
                            totalRemaining <= 2
                              ? "text-red-500"
                              : "text-gray-600 dark:text-gray-300"
                          }
                        >
                          {totalRemaining} days remaining
                        </span>
                      ) : (
                        <span className="text-gray-400">Not configured</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {members.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    No team members found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
