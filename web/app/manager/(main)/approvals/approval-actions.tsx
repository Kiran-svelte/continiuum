"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { approveLeaveRequest, rejectLeaveRequest } from "@/app/actions/leave-engine";

export function ApprovalActions({ requestId }: { requestId: string }) {
  const [loading, setLoading] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const router = useRouter();

  const handleApprove = async () => {
    setLoading(true);
    setMessage(null);
    const result = await approveLeaveRequest(requestId);
    if (result.success) {
      setMessage({ type: "success", text: "Leave approved successfully" });
      setTimeout(() => router.refresh(), 1000);
    } else {
      setMessage({ type: "error", text: result.error || "Failed to approve" });
    }
    setLoading(false);
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      setMessage({ type: "error", text: "Please provide a reason for rejection" });
      return;
    }
    setLoading(true);
    setMessage(null);
    const result = await rejectLeaveRequest(requestId, rejectReason);
    if (result.success) {
      setMessage({ type: "success", text: "Leave rejected" });
      setTimeout(() => router.refresh(), 1000);
    } else {
      setMessage({ type: "error", text: result.error || "Failed to reject" });
    }
    setLoading(false);
  };

  if (message?.type === "success") {
    return (
      <p className="text-sm text-green-600 dark:text-green-400">
        {message.text}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {message?.type === "error" && (
        <p className="text-sm text-red-600 dark:text-red-400">{message.text}</p>
      )}

      {showReject ? (
        <div className="space-y-2">
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Reason for rejection..."
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            rows={2}
          />
          <div className="flex gap-2">
            <button
              onClick={handleReject}
              disabled={loading}
              className="px-4 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50 transition-colors"
            >
              {loading ? "Rejecting..." : "Confirm Reject"}
            </button>
            <button
              onClick={() => {
                setShowReject(false);
                setRejectReason("");
              }}
              className="px-4 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={handleApprove}
            disabled={loading}
            className="px-4 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50 transition-colors"
          >
            {loading ? "Approving..." : "Approve"}
          </button>
          <button
            onClick={() => setShowReject(true)}
            disabled={loading}
            className="px-4 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg disabled:opacity-50 transition-colors"
          >
            Reject
          </button>
        </div>
      )}
    </div>
  );
}
