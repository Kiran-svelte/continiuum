import { getTeamAttendance } from "@/app/actions/manager-portal";
import { redirect } from "next/navigation";

export default async function ManagerAttendancePage() {
  const result = await getTeamAttendance();

  if (!result.success) redirect("/employee/dashboard");

  const attendance = "attendance" in result ? result.attendance : [];
  const summary = "summary" in result ? result.summary : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Team Attendance
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Today &mdash;{" "}
          {new Date().toLocaleDateString("en-IN", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-4 text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {summary.total}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
          </div>
          <div className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-4 text-center">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {summary.present}
            </p>
            <p className="text-xs text-green-600 dark:text-green-400">
              Present
            </p>
          </div>
          <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4 text-center">
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {summary.late}
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400">Late</p>
          </div>
          <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 text-center">
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              {summary.absent}
            </p>
            <p className="text-xs text-red-600 dark:text-red-400">Absent</p>
          </div>
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4 text-center">
            <p className="text-2xl font-bold text-gray-500 dark:text-gray-400">
              {summary.not_checked_in}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Not Checked In
            </p>
          </div>
        </div>
      )}

      {/* Attendance Table */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Employee
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Status
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Check In
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Check Out
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Hours
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {attendance.map((a: any) => (
                <tr
                  key={a.emp_id}
                  className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30"
                >
                  <td className="px-6 py-3">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {a.full_name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {a.department}
                    </p>
                  </td>
                  <td className="px-6 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        a.status === "PRESENT"
                          ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400"
                          : a.status === "LATE"
                          ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400"
                          : a.status === "ABSENT"
                          ? "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                      }`}
                    >
                      {a.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-600 dark:text-gray-300">
                    {a.check_in
                      ? new Date(a.check_in).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "-"}
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-600 dark:text-gray-300">
                    {a.check_out
                      ? new Date(a.check_out).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "-"}
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-600 dark:text-gray-300">
                    {a.total_hours ? `${a.total_hours}h` : "-"}
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex gap-1.5">
                      {a.is_wfh && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400">
                          WFH
                        </span>
                      )}
                      {a.late_minutes > 0 && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400">
                          {a.late_minutes}m late
                        </span>
                      )}
                      {a.overtime_minutes > 0 && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400">
                          {Math.round(a.overtime_minutes / 60 * 10) / 10}h OT
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {attendance.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    No attendance data for today.
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
