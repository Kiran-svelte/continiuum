"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Download, Lock, Search } from 'lucide-react';

export default function DocumentsPage() {
    const docs = [
        { name: 'Employment Contract.pdf', size: '1.2 MB', date: 'Jan 12, 2024' },
        { name: 'Q4 Performance Review.pdf', size: '0.8 MB', date: 'Dec 15, 2024' },
        { name: 'IT Policy v2.1.pdf', size: '2.4 MB', date: 'Feb 20, 2024' },
    ];

    return (
        <div className="max-w-5xl mx-auto">
            <header className="mb-12">
                <h1 className="text-4xl font-bold text-white mb-2">Secure Docs</h1>
                <p className="text-slate-400">Verified identity and document vault.</p>
            </header>

            <div className="relative mb-8">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                <input
                    type="text"
                    placeholder="Search documents..."
                    className="w-full bg-slate-900/50 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-pink-500/30 transition-colors"
                />
            </div>

            <div className="space-y-4">
                {docs.map((doc, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="glass-panel p-6 flex items-center justify-between group cursor-pointer hover:bg-white/5 transition-all"
                    >
                        <div className="flex items-center gap-6">
                            <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-pink-500 transition-colors border border-white/5">
                                <FileText size={24} />
                            </div>
                            <div>
                                <h3 className="text-white font-bold">{doc.name}</h3>
                                <p className="text-xs text-slate-500">{doc.date} • {doc.size}</p>
                            </div>
                        </div>
                        <button className="p-3 rounded-xl bg-slate-800 text-slate-400 hover:bg-white/10 hover:text-white transition-all">
                            <Download size={20} />
                        </button>
                    </motion.div>
                ))}
            </div>

            <div className="mt-12 p-8 border border-white/5 rounded-3xl bg-slate-900/40 flex items-center gap-6">
                <div className="p-4 rounded-2xl bg-violet-500/10 text-violet-500">
                    <Lock size={32} />
                </div>
                <div>
                    <h4 className="text-white font-bold opacity-50">Identity Protection Active</h4>
                    <p className="text-sm text-slate-600">Your documents are encrypted using Enterprise-grade AES-256 protocols.</p>
                </div>
            </div>
        </div>
    );
}
