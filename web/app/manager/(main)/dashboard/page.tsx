import { getManagerDashboard } from "@/app/actions/manager-portal";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function ManagerDashboardPage() {
  const result = await getManagerDashboard();

  if (!result.success || !result.dashboard) {
    redirect("/employee/dashboard");
  }

  const { dashboard } = result;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Team Dashboard
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Overview of your team&apos;s status and pending actions
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Team Size */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400">Team Size</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
            {dashboard.team_size}
          </p>
          {dashboard.on_probation > 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
              {dashboard.on_probation} on probation
            </p>
          )}
        </div>

        {/* Today's Attendance */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Checked In Today
          </p>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-1">
            {dashboard.today.checked_in}
            <span className="text-base font-normal text-gray-400">
              /{dashboard.team_size}
            </span>
          </p>
          <div className="flex gap-3 text-xs text-gray-500 dark:text-gray-400 mt-2">
            {dashboard.today.wfh > 0 && <span>WFH: {dashboard.today.wfh}</span>}
            {dashboard.today.late > 0 && (
              <span className="text-amber-600">Late: {dashboard.today.late}</span>
            )}
          </div>
        </div>

        {/* Pending Approvals */}
        <Link
          href="/manager/approvals"
          className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-5 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors"
        >
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Pending Approvals
          </p>
          <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
            {dashboard.pending_approvals.total}
          </p>
          <div className="flex gap-3 text-xs text-gray-500 dark:text-gray-400 mt-2">
            <span>Leaves: {dashboard.pending_approvals.leave_requests}</span>
            <span>
              Regularizations: {dashboard.pending_approvals.regularizations}
            </span>
          </div>
        </Link>

        {/* Not Checked In */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Not Checked In
          </p>
          <p className="text-3xl font-bold text-red-500 dark:text-red-400 mt-1">
            {dashboard.today.not_checked_in}
          </p>
          {dashboard.today.absent > 0 && (
            <p className="text-xs text-red-500 mt-2">
              {dashboard.today.absent} marked absent
            </p>
          )}
        </div>
      </div>

      {/* Upcoming Leaves */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Upcoming Team Leaves (Next 7 Days)
          </h2>
          <Link
            href="/manager/team"
            className="text-sm text-indigo-600 hover:text-indigo-800 dark:text-indigo-400"
          >
            View Team
          </Link>
        </div>
        <div className="p-6">
          {dashboard.upcoming_leaves.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No upcoming leaves in the next 7 days.
            </p>
          ) : (
            <div className="space-y-3">
              {dashboard.upcoming_leaves.map((leave, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-b-0"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {leave.employee_name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {leave.leave_type} &middot; {leave.total_days} day(s)
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {new Date(leave.start_date).toLocaleDateString()}
                    </p>
                    {leave.total_days > 1 && (
                      <p className="text-xs text-gray-400">
                        to {new Date(leave.end_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/manager/approvals"
          className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-4 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors"
        >
          <div className="h-10 w-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-lg">
            &#x2713;
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              Leave Approvals
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Review pending requests
            </p>
          </div>
        </Link>

        <Link
          href="/manager/attendance"
          className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-4 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors"
        >
          <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400 text-lg">
            &#x231A;
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              Team Attendance
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              View today&apos;s status
            </p>
          </div>
        </Link>

        <Link
          href="/manager/team"
          className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-4 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors"
        >
          <div className="h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 text-lg">
            &#x1F465;
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              My Team
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Members &amp; balances
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
