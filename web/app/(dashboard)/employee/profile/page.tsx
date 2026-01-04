"use client";

import React from 'react';
import { useUser } from '@clerk/nextjs';
import { User, Mail, Shield, BadgeCheck, MapPin, Briefcase } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ProfilePage() {
    const { user } = useUser();

    return (
        <div className="max-w-4xl mx-auto">
            <header className="mb-12">
                <h1 className="text-4xl font-bold text-white mb-2">My Profile</h1>
                <p className="text-slate-400">Identity and professional credentials.</p>
            </header>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel p-8 mb-8 relative overflow-hidden"
            >
                <div className="absolute top-0 right-0 p-12 opacity-5 text-white">
                    <User size={160} />
                </div>

                <div className="flex flex-col md:flex-row items-center gap-8 mb-12 relative z-10">
                    <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-pink-500 to-violet-600 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                        <img
                            src={user?.imageUrl}
                            alt={user?.firstName || 'User'}
                            className="w-32 h-32 rounded-full border-2 border-white/10 relative"
                        />
                    </div>
                    <div className="text-center md:text-left">
                        <h2 className="text-3xl font-bold text-white flex items-center gap-2 justify-center md:justify-start">
                            {user?.fullName} <BadgeCheck className="text-blue-400" size={24} />
                        </h2>
                        <div className="flex items-center gap-2 text-slate-400 mt-2 justify-center md:justify-start">
                            <Mail size={16} /> {user?.primaryEmailAddress?.emailAddress}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                    <div className="bg-slate-900/60 p-6 rounded-2xl border border-white/5 group hover:border-pink-500/20 transition-colors">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-lg bg-pink-500/10 text-pink-500">
                                <Briefcase size={20} />
                            </div>
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Employment</span>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <div className="text-xs text-slate-600">Employee ID</div>
                                <div className="text-white font-mono">EMP-{user?.id.slice(-6).toUpperCase()}</div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-600">Department</div>
                                <div className="text-white">Engineering</div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-900/60 p-6 rounded-2xl border border-white/5 group hover:border-violet-500/20 transition-colors">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-lg bg-violet-500/10 text-violet-500">
                                <Shield size={20} />
                            </div>
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Security</span>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <div className="text-xs text-slate-600">Verification Level</div>
                                <div className="text-white">Enterprise Tier 1</div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-600">Last Login</div>
                                <div className="text-white text-sm">Today, 14:02 GMT</div>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
