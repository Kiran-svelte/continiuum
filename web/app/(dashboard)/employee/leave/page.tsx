"use client";

import React, { useState } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2, CheckCircle, AlertTriangle, Calendar, FileText, Sparkles } from 'lucide-react';

export default function LeavePage() {
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);

    const { user } = useUser();
    const { getToken } = useAuth();

    const handleAnalyze = async () => {
        if (!input.trim()) return;
        setLoading(true);
        setResult(null);

        try {
            const token = await getToken();
            const res = await fetch('http://localhost:5000/api/leaves/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ request: input })
            });

            if (!res.ok) throw new Error('Analysis failed');
            const data = await res.json();
            setResult(data);
        } catch (error) {
            console.error(error);
            alert('Error analyzing request. Please ensure the backend is running.');
        } finally {
            setLoading(false);
        }
    };

    const handleConfirm = async () => {
        if (!result) return;
        setLoading(true);
        try {
            const token = await getToken();
            const payload = {
                type: result.extractedInfo?.leave_type || 'Annual',
                start_date: result.extractedInfo?.start_date,
                end_date: result.extractedInfo?.end_date,
                reason: input,
                half_day: result.extractedInfo?.is_half_day || false
            };

            const res = await fetch('http://localhost:5000/api/leaves/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error('Failed to create request');

            alert('Leave Request Created Successfully!');
            setInput('');
            setResult(null);
        } catch (error) {
            console.error(error);
            alert('Error creating leave request');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            <header className="mb-12">
                <motion.h1
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-4xl font-bold text-white mb-2 flex items-center gap-3"
                >
                    <Sparkles className="text-pink-500" /> AI Leave Assistant
                </motion.h1>
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-slate-400"
                >
                    Describe your leave request naturally. Our engine checks 14+ business rules instantly.
                </motion.p>
            </header>

            {/* Input Section */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="glass-panel p-8 mb-12 relative overflow-hidden group"
            >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 via-purple-500 to-violet-500"></div>

                <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="E.g., I need sick leave tomorrow for a dentist appointment"
                    className="w-full bg-slate-900/50 border border-white/5 rounded-2xl p-6 text-white placeholder:text-slate-500 focus:outline-none focus:border-pink-500/30 transition-all min-h-[160px] resize-none text-lg"
                />

                <div className="flex flex-col md:flex-row justify-between items-center mt-6 gap-4">
                    <div className="text-sm text-slate-500 flex items-center gap-2 italic">
                        <FileText size={14} /> Try: "Vacation next Mon to Wed" or "Emergency leave today"
                    </div>
                    <button
                        onClick={handleAnalyze}
                        disabled={loading || !input.trim()}
                        className="bg-gradient-to-r from-pink-500 to-violet-600 hover:opacity-90 text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-pink-500/20"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : <Send size={20} />}
                        Analyze with HR-AI
                    </button>
                </div>
            </motion.div>

            {/* Results Section */}
            <AnimatePresence>
                {result && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className={`rounded-3xl border-2 p-8 ${result.approved
                            ? 'bg-emerald-500/5 border-emerald-500/20'
                            : 'bg-amber-500/5 border-amber-500/20'
                            }`}
                    >
                        <div className="flex items-start gap-6">
                            <div className={`p-4 rounded-2xl ${result.approved ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                                } shadow-xl`}>
                                {result.approved ? <CheckCircle size={32} /> : <AlertTriangle size={32} />}
                            </div>

                            <div className="flex-1">
                                <h3 className={`text-2xl font-bold mb-3 ${result.approved ? 'text-emerald-400' : 'text-amber-400'
                                    }`}>
                                    {result.approved ? 'Policy Compliant' : 'Review Required'}
                                </h3>
                                <p className="text-lg text-slate-300 mb-8 leading-relaxed">
                                    {result.message}
                                </p>

                                {/* Extracted Details */}
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
                                    <div className="bg-slate-900/80 p-4 rounded-2xl border border-white/5">
                                        <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Type</div>
                                        <div className="font-bold text-white">{result.extracted_info?.leave_type || 'Annual'}</div>
                                    </div>
                                    <div className="bg-slate-900/80 p-4 rounded-2xl border border-white/5">
                                        <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Duration</div>
                                        <div className="font-bold text-white">{result.extracted_info?.days || 0} Days</div>
                                    </div>
                                    <div className="bg-slate-900/80 p-4 rounded-2xl border border-white/5 lg:col-span-2">
                                        <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Evaluation Period</div>
                                        <div className="font-bold text-white truncate">
                                            {result.extracted_info?.start_date} → {result.extracted_info?.end_date}
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-4">
                                    <button
                                        onClick={handleConfirm}
                                        className="bg-white text-slate-900 hover:bg-slate-100 px-8 py-4 rounded-2xl font-black transition-all shadow-xl"
                                    >
                                        Confirm & Submit
                                    </button>
                                    <button
                                        onClick={() => setResult(null)}
                                        className="px-8 py-4 rounded-2xl font-bold text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                                    >
                                        Discard
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
