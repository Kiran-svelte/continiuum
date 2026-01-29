"use client";

import React, { useEffect, useState, useCallback } from 'react';
import DashboardLayout from '@/components/hr/DashboardLayout';
import { Users, UserCheck, UserX, Clock, CheckCircle, AlertCircle, Search, Filter, RefreshCw, Mail } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { getOnboardingEmployees, approveEmployee, rejectEmployee } from '@/app/actions/onboarding';

type Employee = {
    emp_id: string;
    full_name: string;
    email: string;
    department: string | null;
    position: string | null;
    approval_status: string;
    onboarding_status: string;
    onboarding_completed: boolean;
    created_at?: string;
    terms_accepted_at?: string | null;
};

type OnboardingStats = {
    pending: number;
    approved: number;
    rejected: number;
    total: number;
};

export default function OnboardingPage() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [stats, setStats] = useState<OnboardingStats>({ pending: 0, approved: 0, rejected: 0, total: 0 });
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
    const [search, setSearch] = useState('');
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [rejectModal, setRejectModal] = useState<{ open: boolean; empId: string | null; reason: string }>({
        open: false,
        empId: null,
        reason: ''
    });

    const loadEmployees = useCallback(async () => {
        setLoading(true);
        try {
            const result = await getOnboardingEmployees();
            if (result.success && result.employees) {
                setEmployees(result.employees);
                // Calculate stats
                const pending = result.employees.filter(e => e.approval_status === 'pending').length;
                const approved = result.employees.filter(e => e.approval_status === 'approved').length;
                const rejected = result.employees.filter(e => e.approval_status === 'rejected').length;
                setStats({ pending, approved, rejected, total: result.employees.length });
            }
        } catch (error) {
            console.error('Failed to load employees:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadEmployees();
    }, [loadEmployees]);

    const handleApprove = async (empId: string) => {
        setProcessingId(empId);
        try {
            const result = await approveEmployee(empId);
            if (result.success) {
                toast.success('Employee approved successfully');
                await loadEmployees();
            } else {
                toast.error(result.error || 'Failed to approve employee');
            }
        } catch (error) {
            console.error('Approval failed:', error);
            toast.error('An unexpected error occurred');
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async () => {
        if (!rejectModal.empId) return;
        setProcessingId(rejectModal.empId);
        try {
            const result = await rejectEmployee(rejectModal.empId, rejectModal.reason);
            if (result.success) {
                toast.success('Employee registration rejected');
                setRejectModal({ open: false, empId: null, reason: '' });
                await loadEmployees();
            } else {
                toast.error(result.error || 'Failed to reject employee');
            }
        } catch (error) {
            console.error('Rejection failed:', error);
            toast.error('An unexpected error occurred');
        } finally {
            setProcessingId(null);
        }
    };

    const filteredEmployees = employees.filter(emp => {
        const matchesFilter = filter === 'all' || emp.approval_status === filter;
        const matchesSearch = search === '' ||
            emp.full_name.toLowerCase().includes(search.toLowerCase()) ||
            emp.email.toLowerCase().includes(search.toLowerCase()) ||
            (emp.department?.toLowerCase() || '').includes(search.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'approved':
                return <span className="px-2 py-1 text-xs rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Approved</span>;
            case 'rejected':
                return <span className="px-2 py-1 text-xs rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">Rejected</span>;
            default:
                return <span className="px-2 py-1 text-xs rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">Pending</span>;
        }
    };

    const getOnboardingProgress = (emp: Employee) => {
        if (emp.onboarding_completed) return 100;
        if (emp.approval_status === 'approved') return 75;
        if (emp.terms_accepted_at) return 50;
        if (emp.onboarding_status === 'in_progress') return 25;
        return 10;
    };

    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <header className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Employee Onboarding</h1>
                    <p className="text-slate-400">Track and manage new hire registrations and approvals.</p>
                </header>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700 rounded-xl p-5"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500/20 rounded-lg">
                                <Users className="w-5 h-5 text-blue-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-white">{stats.total}</p>
                                <p className="text-sm text-slate-400">Total Registrations</p>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-amber-500/30 rounded-xl p-5"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-500/20 rounded-lg">
                                <Clock className="w-5 h-5 text-amber-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-amber-400">{stats.pending}</p>
                                <p className="text-sm text-slate-400">Pending Approval</p>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-emerald-500/30 rounded-xl p-5"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-500/20 rounded-lg">
                                <UserCheck className="w-5 h-5 text-emerald-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-emerald-400">{stats.approved}</p>
                                <p className="text-sm text-slate-400">Approved</p>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-rose-500/30 rounded-xl p-5"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-rose-500/20 rounded-lg">
                                <UserX className="w-5 h-5 text-rose-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-rose-400">{stats.rejected}</p>
                                <p className="text-sm text-slate-400">Rejected</p>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Filters & Search */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 mb-6">
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="flex gap-2 flex-wrap">
                            {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                        filter === f
                                            ? 'bg-cyan-600 text-white'
                                            : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
                                    }`}
                                >
                                    {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                                    {f === 'pending' && stats.pending > 0 && (
                                        <span className="ml-2 px-1.5 py-0.5 text-xs bg-amber-500 text-white rounded-full">{stats.pending}</span>
                                    )}
                                </button>
                            ))}
                        </div>

                        <div className="flex gap-3 items-center">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search by name, email, dept..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-10 pr-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 w-64"
                                />
                            </div>
                            <button
                                onClick={loadEmployees}
                                disabled={loading}
                                title="Refresh employee list"
                                className="p-2 bg-slate-700/50 hover:bg-slate-600/50 rounded-lg text-slate-300 transition-all disabled:opacity-50"
                            >
                                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Employee Table */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
                    {loading ? (
                        <div className="p-10 text-center">
                            <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-4" />
                            <p className="text-slate-400">Loading employees...</p>
                        </div>
                    ) : filteredEmployees.length === 0 ? (
                        <div className="p-10 text-center">
                            <Users className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                            <p className="text-slate-400">No employees found matching your criteria.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-900/50">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Employee</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Department</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Progress</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700/50">
                                    <AnimatePresence>
                                        {filteredEmployees.map((emp) => {
                                            const progress = getOnboardingProgress(emp);
                                            return (
                                                <motion.tr
                                                    key={emp.emp_id}
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    className="hover:bg-slate-700/20 transition-colors"
                                                >
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold">
                                                                {emp.full_name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                                                            </div>
                                                            <div>
                                                                <p className="text-white font-medium">{emp.full_name}</p>
                                                                <p className="text-sm text-slate-400">{emp.email}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <p className="text-slate-300">{emp.department || 'Not specified'}</p>
                                                        <p className="text-sm text-slate-500">{emp.position || 'Role pending'}</p>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="w-32">
                                                            <div className="flex justify-between text-xs mb-1">
                                                                <span className="text-slate-400">Progress</span>
                                                                <span className="text-cyan-400">{progress}%</span>
                                                            </div>
                                                            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-full transition-all"
                                                                    style={{ width: `${progress}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {getStatusBadge(emp.approval_status)}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex justify-end gap-2">
                                                            {emp.approval_status === 'pending' && (
                                                                <>
                                                                    <button
                                                                        onClick={() => handleApprove(emp.emp_id)}
                                                                        disabled={processingId === emp.emp_id}
                                                                        className="px-3 py-1.5 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-lg hover:bg-emerald-600 hover:text-white transition-all text-sm font-medium disabled:opacity-50"
                                                                    >
                                                                        {processingId === emp.emp_id ? '...' : 'Approve'}
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setRejectModal({ open: true, empId: emp.emp_id, reason: '' })}
                                                                        disabled={processingId === emp.emp_id}
                                                                        className="px-3 py-1.5 bg-rose-600/20 text-rose-400 border border-rose-500/30 rounded-lg hover:bg-rose-600 hover:text-white transition-all text-sm font-medium disabled:opacity-50"
                                                                    >
                                                                        Reject
                                                                    </button>
                                                                </>
                                                            )}
                                                            {emp.approval_status === 'approved' && (
                                                                <a
                                                                    href={`mailto:${emp.email}?subject=Welcome to the team!`}
                                                                    className="px-3 py-1.5 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-600 hover:text-white transition-all text-sm font-medium flex items-center gap-1"
                                                                >
                                                                    <Mail className="w-3 h-3" /> Email
                                                                </a>
                                                            )}
                                                        </div>
                                                    </td>
                                                </motion.tr>
                                            );
                                        })}
                                    </AnimatePresence>
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Reject Modal */}
                <AnimatePresence>
                    {rejectModal.open && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
                            onClick={() => setRejectModal({ open: false, empId: null, reason: '' })}
                        >
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.95, opacity: 0 }}
                                onClick={(e) => e.stopPropagation()}
                                className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-md w-full"
                            >
                                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                    <AlertCircle className="w-5 h-5 text-rose-400" />
                                    Reject Employee Registration
                                </h3>
                                <p className="text-slate-400 mb-4">
                                    Please provide a reason for rejection. This will be communicated to the employee.
                                </p>
                                <textarea
                                    value={rejectModal.reason}
                                    onChange={(e) => setRejectModal(prev => ({ ...prev, reason: e.target.value }))}
                                    placeholder="Enter rejection reason..."
                                    className="w-full h-24 px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/50 resize-none mb-4"
                                />
                                <div className="flex gap-3 justify-end">
                                    <button
                                        onClick={() => setRejectModal({ open: false, empId: null, reason: '' })}
                                        className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleReject}
                                        disabled={!rejectModal.reason.trim() || processingId === rejectModal.empId}
                                        className="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-500 transition-all disabled:opacity-50"
                                    >
                                        {processingId === rejectModal.empId ? 'Processing...' : 'Confirm Rejection'}
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </DashboardLayout>
    );
}
