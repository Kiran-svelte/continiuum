"use client";

import React, { useEffect, useState } from 'react';
import { useSupabaseUser, useSupabaseAuth } from '@/lib/supabase/hooks';
import DashboardLayout from '@/components/hr/DashboardLayout';
import { Check, X, Clock, User, Calendar, AlertTriangle, Shield, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';
import { toast } from "sonner";
import { useConfirm } from "@/components/ui/confirm-provider";

export default function ApprovalsPage() {
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [rejectReasons, setRejectReasons] = useState<Record<string, string>>({});
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const { user } = useSupabaseUser();
    const { getToken } = useSupabaseAuth();
    const { confirmAction, confirmDanger } = useConfirm();

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        setError(null);
        try {
            const res = await fetch('/api/leaves/pending');
            if (res.ok) {
                const data = await res.json();
                setRequests(data.requests || []);
            } else {
                const errData = await res.json().catch(() => ({}));
                setError(errData.error || 'Failed to load pending requests');
            }
        } catch (err) {
            console.error('Failed to fetch requests', err);
            setError('Network error. Please check your connection.');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (requestId: string, employeeName: string) => {
        confirmAction('Approve Leave Request', `Approve leave request from ${employeeName}?`, async () => {
            setActionLoading(requestId);
            try {
                const res = await fetch(`/api/leaves/approve/${requestId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ comments: 'Approved by HR' })
                });
                const data = await res.json();
                if (res.ok && data.success) {
                    setRequests(prev => prev.filter(r => r.request_id !== requestId));
                    toast.success(`Leave request approved for ${employeeName}`);
                } else {
                    toast.error(data.error || 'Failed to approve request');
                }
            } catch (err) {
                toast.error('Error approving request. Please try again.');
            } finally {
                setActionLoading(null);
            }
        });
    };

    const handleReject = async (requestId: string, employeeName: string) => {
        const reason = rejectReasons[requestId]?.trim();
        if (!reason) {
            toast.error('Please provide a rejection reason');
            return;
        }

        confirmDanger('Reject Leave Request', `Reject leave request from ${employeeName}? Reason: "${reason}"`, async () => {
            setActionLoading(requestId);
            try {
                const res = await fetch(`/api/leaves/reject/${requestId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ reason, comments: reason })
                });
                const data = await res.json();
                if (res.ok && data.success) {
                    setRequests(prev => prev.filter(r => r.request_id !== requestId));
                    setRejectReasons(prev => { const n = { ...prev }; delete n[requestId]; return n; });
                    toast.success(`Leave request rejected for ${employeeName}`);
                } else {
                    toast.error(data.error || 'Failed to reject request');
                }
            } catch (err) {
                toast.error('Error rejecting request. Please try again.');
            } finally {
                setActionLoading(null);
            }
        });
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
        });
    };

    const getStatusBadge = (status: string) => {
        if (status === 'escalated') {
            return <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400 flex items-center gap-1"><AlertTriangle size={12} /> Escalated</span>;
        }
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 flex items-center gap-1"><Clock size={12} /> Pending</span>;
    };

    return (
        <DashboardLayout>
            <div className="max-w-6xl mx-auto">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Pending Approvals</h1>
                    <p className="text-slate-400">Review and act on leave requests that need your attention.</p>
                    {requests.length > 0 && (
                        <div className="mt-3 flex items-center gap-4 text-sm">
                            <span className="text-amber-400 font-medium">{requests.filter(r => r.status === 'escalated').length} escalated</span>
                            <span className="text-blue-400 font-medium">{requests.filter(r => r.status === 'pending').length} pending</span>
                        </div>
                    )}
                </header>

                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 animate-pulse">
                                <div className="h-4 bg-slate-700 rounded w-1/3 mb-3" />
                                <div className="h-3 bg-slate-700 rounded w-1/2" />
                            </div>
                        ))}
                    </div>
                ) : error ? (
                    <div className="text-center py-10 bg-red-900/10 border border-red-800/30 rounded-xl">
                        <AlertTriangle className="mx-auto mb-3 text-red-400" size={32} />
                        <p className="text-red-400 mb-4">{error}</p>
                        <button onClick={fetchRequests} className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600">
                            Retry
                        </button>
                    </div>
                ) : requests.length === 0 ? (
                    <div className="text-center py-16 bg-slate-800/30 rounded-xl border border-slate-700/50">
                        <Shield className="mx-auto mb-4 text-emerald-400" size={48} />
                        <h3 className="text-xl font-semibold text-white mb-2">All caught up!</h3>
                        <p className="text-slate-400">No pending leave requests to review.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {requests.map((req) => {
                            const isExpanded = expandedId === req.request_id;
                            const isLoading = actionLoading === req.request_id;
                            const aiAnalysis = req.ai_analysis_json ? (typeof req.ai_analysis_json === 'string' ? JSON.parse(req.ai_analysis_json) : req.ai_analysis_json) : null;

                            return (
                                <div key={req.request_id} className={`bg-slate-800/50 border rounded-xl overflow-hidden transition-colors ${req.status === 'escalated' ? 'border-amber-700/50' : 'border-slate-700'}`}>
                                    {/* Main row */}
                                    <div className="p-5 flex flex-col lg:flex-row gap-4 items-start lg:items-center">
                                        {/* Employee info */}
                                        <div className="flex items-center gap-3 min-w-[180px]">
                                            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center font-bold text-white text-sm shrink-0">
                                                {req.employee_name?.charAt(0) || 'U'}
                                            </div>
                                            <div>
                                                <div className="font-semibold text-white text-sm">{req.employee_name}</div>
                                                <div className="text-xs text-slate-400">{req.department || 'No Dept'} {req.position ? `- ${req.position}` : ''}</div>
                                            </div>
                                        </div>

                                        {/* Leave details */}
                                        <div className="flex-1 flex flex-wrap gap-3 items-center">
                                            <span className="px-3 py-1.5 bg-purple-500/10 text-purple-300 rounded-lg text-sm font-medium">
                                                {req.leave_type}
                                            </span>
                                            <span className="text-sm text-slate-300">
                                                {formatDate(req.start_date)} - {formatDate(req.end_date)}
                                            </span>
                                            <span className="text-sm font-semibold text-white bg-slate-700/50 px-2 py-1 rounded">
                                                {req.total_days} day{req.total_days !== 1 ? 's' : ''}
                                            </span>
                                            {getStatusBadge(req.status)}
                                            {req.sla_breached && (
                                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400">SLA Breached</span>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2 min-w-[160px]">
                                            <button
                                                onClick={() => handleApprove(req.request_id, req.employee_name)}
                                                disabled={isLoading}
                                                className="px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors text-sm font-medium flex items-center gap-1.5 disabled:opacity-50"
                                            >
                                                <Check size={16} /> Approve
                                            </button>
                                            <button
                                                onClick={() => setExpandedId(isExpanded ? null : req.request_id)}
                                                className="px-4 py-2 rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 transition-colors text-sm font-medium flex items-center gap-1.5"
                                            >
                                                <X size={16} /> Reject
                                            </button>
                                            <button
                                                onClick={() => setExpandedId(isExpanded ? null : req.request_id)}
                                                className="p-2 text-slate-400 hover:text-white"
                                            >
                                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Expanded details */}
                                    {isExpanded && (
                                        <div className="border-t border-slate-700/50 bg-slate-900/30 p-5">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                                {/* Reason */}
                                                <div>
                                                    <div className="text-xs text-slate-500 uppercase font-medium mb-1">Reason</div>
                                                    <div className="text-sm text-slate-300">{req.reason || 'No reason provided'}</div>
                                                </div>

                                                {/* AI Analysis */}
                                                {(req.ai_recommendation || req.ai_confidence !== null) && (
                                                    <div>
                                                        <div className="text-xs text-slate-500 uppercase font-medium mb-1">AI Analysis</div>
                                                        <div className="text-sm text-slate-300">
                                                            <span className={`font-medium ${req.ai_recommendation === 'approve' ? 'text-emerald-400' : req.ai_recommendation === 'escalate' ? 'text-amber-400' : 'text-rose-400'}`}>
                                                                {req.ai_recommendation?.toUpperCase() || 'N/A'}
                                                            </span>
                                                            {req.ai_confidence && (
                                                                <span className="ml-2 text-slate-400">({Math.round(req.ai_confidence * 100)}% confidence)</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Escalation Reason */}
                                                {req.escalation_reason && (
                                                    <div className="col-span-2">
                                                        <div className="text-xs text-slate-500 uppercase font-medium mb-1">Escalation Reason</div>
                                                        <div className="text-sm text-amber-300 bg-amber-500/10 rounded-lg p-3">{req.escalation_reason}</div>
                                                    </div>
                                                )}

                                                {/* AI Violations */}
                                                {aiAnalysis?.violations && aiAnalysis.violations.length > 0 && (
                                                    <div className="col-span-2">
                                                        <div className="text-xs text-slate-500 uppercase font-medium mb-1">Constraint Violations</div>
                                                        <ul className="text-sm text-rose-300 space-y-1">
                                                            {aiAnalysis.violations.map((v: any, i: number) => (
                                                                <li key={i} className="flex items-start gap-2">
                                                                    <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                                                                    {v.rule_name || v.message || v}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Rejection reason input */}
                                            <div className="border-t border-slate-700/30 pt-4">
                                                <label className="text-xs text-slate-500 uppercase font-medium mb-2 flex items-center gap-1">
                                                    <MessageSquare size={12} /> Rejection Reason (required)
                                                </label>
                                                <div className="flex gap-3">
                                                    <input
                                                        type="text"
                                                        placeholder="Enter reason for rejection..."
                                                        value={rejectReasons[req.request_id] || ''}
                                                        onChange={(e) => setRejectReasons(prev => ({ ...prev, [req.request_id]: e.target.value }))}
                                                        className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-rose-500"
                                                    />
                                                    <button
                                                        onClick={() => handleReject(req.request_id, req.employee_name)}
                                                        disabled={isLoading || !rejectReasons[req.request_id]?.trim()}
                                                        className="px-4 py-2 rounded-lg bg-rose-600 text-white hover:bg-rose-500 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        {isLoading ? 'Rejecting...' : 'Confirm Reject'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
