"use client";

import React from 'react';
import { useUser } from '@clerk/nextjs';
import { Clock, Calendar, FileText, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

export default function EmployeeDashboard() {
    const { user } = useUser();

    const stats = [
        { label: 'Leave Balance', value: '12 Days', icon: <Calendar />, color: 'from-blue-500 to-blue-600' },
        { label: 'Attendance', value: '98%', icon: <Clock />, color: 'from-emerald-500 to-emerald-600' },
        { label: 'Pending Requests', value: '2', icon: <FileText />, color: 'from-amber-500 to-amber-600' },
        { label: 'Performance', value: 'On Track', icon: <Activity />, color: 'from-purple-500 to-purple-600' },
    ];

    return (
        <div className="max-w-6xl mx-auto">
            <header className="mb-12">
                <motion.h1
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-4xl font-bold text-white mb-2"
                >
                    Welcome back, {user?.firstName}
                </motion.h1>
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-slate-400"
                >
                    Here's your daily overview and performance metrics.
                </motion.p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                {stats.map((stat, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.1 }}
                        className="glass-panel p-6 group hover:border-white/20 transition-all cursor-default"
                    >
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color} text-white shadow-lg`}>
                                {React.cloneElement(stat.icon as any, { size: 24 })}
                            </div>
                            <div>
                                <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">{stat.label}</div>
                                <div className="text-2xl font-bold text-white">{stat.value}</div>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="grid md:grid-cols-3 gap-8">
                {/* AI Assistant Quick Access */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                    className="glass-panel p-8 md:col-span-2 relative overflow-hidden group"
                >
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Activity size={120} className="text-white" />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-4">AI Leave Assistant</h2>
                    <p className="text-slate-400 mb-8 max-w-md">
                        Ask our AI about your leave eligibility, company policies, or apply for leave using natural language.
                    </p>
                    <div className="flex bg-slate-900/50 rounded-2xl p-2 border border-white/5 focus-within:border-pink-500/30 transition-colors">
                        <input
                            type="text"
                            placeholder="I need sick leave tomorrow..."
                            className="flex-1 bg-transparent px-4 py-3 text-white outline-none"
                        />
                        <button className="bg-gradient-to-r from-pink-500 to-violet-600 text-white font-bold px-8 rounded-xl hover:opacity-90 transition-opacity whitespace-nowrap">
                            Ask AI
                        </button>
                    </div>
                </motion.div>

                {/* Holiday Bank Mini */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                    className="glass-panel p-8 md:col-span-1"
                >
                    <h2 className="text-xl font-bold text-white mb-6">Holiday Bank</h2>
                    <div className="space-y-6">
                        <div className="p-4 bg-slate-900/50 rounded-2xl border border-white/5">
                            <div className="flex justify-between items-end mb-3">
                                <span className="text-sm font-medium text-slate-400">Annual Leave</span>
                                <span className="text-2xl font-bold text-white">12<span className="text-sm text-slate-500 font-normal ml-1">/ 20 Days</span></span>
                            </div>
                            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-pink-500 rounded-full w-[60%] shadow-[0_0_10px_rgba(236,72,153,0.5)]"></div>
                            </div>
                        </div>
                        <div className="p-4 bg-slate-900/50 rounded-2xl border border-white/5 opacity-50">
                            <div className="flex justify-between items-end mb-3">
                                <span className="text-sm font-medium text-slate-400">Sick Leave</span>
                                <span className="text-2xl font-bold text-white">4<span className="text-sm text-slate-500 font-normal ml-1">/ 10 Days</span></span>
                            </div>
                            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 rounded-full w-[40%]"></div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
