import { getTeamPendingLeaves } from "@/app/actions/manager-portal";
import { redirect } from "next/navigation";
import { ApprovalActions } from "./approval-actions";

export default async function ApprovalsPage() {
  const result = await getTeamPendingLeaves();

  if (!result.success) redirect("/employee/dashboard");

  const requests = "requests" in result ? result.requests : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Pending Approvals
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          {requests.length} pending request{requests.length !== 1 ? "s" : ""}
        </p>
      </div>

      {requests.length === 0 ? (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            No pending leave requests to review.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request: any) => (
            <div
              key={request.request_id}
              className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-sm font-medium text-indigo-600 dark:text-indigo-400">
                    {request.employee.full_name
                      .split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {request.employee.full_name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {request.employee.department} &middot;{" "}
                      {request.employee.designation}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {request.sla_breached && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400">
                      SLA Breached
                    </span>
                  )}
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      request.status === "escalated"
                        ? "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400"
                        : "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400"
                    }`}
                  >
                    {request.status}
                  </span>
                </div>
              </div>

              {/* Leave Details */}
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Leave Type
                  </p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {request.leave_type}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Duration
                  </p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {request.total_days} day{request.total_days > 1 ? "s" : ""}
                    {request.is_half_day ? " (Half day)" : ""}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    From
                  </p>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {new Date(request.start_date).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    To
                  </p>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {new Date(request.end_date).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Reason */}
              {request.reason && (
                <div className="mt-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Reason
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5">
                    {request.reason}
                  </p>
                </div>
              )}

              {/* AI Violations */}
              {request.ai_violations &&
                Array.isArray(request.ai_violations) &&
                request.ai_violations.length > 0 && (
                  <div className="mt-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                    <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1">
                      Constraint Violations
                    </p>
                    <ul className="text-xs text-amber-600 dark:text-amber-300 space-y-0.5">
                      {(request.ai_violations as string[]).map(
                        (v: string, i: number) => (
                          <li key={i}>&bull; {v}</li>
                        )
                      )}
                    </ul>
                  </div>
                )}

              {/* Actions */}
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                <ApprovalActions requestId={request.request_id} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
