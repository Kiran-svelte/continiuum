"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

// Types for our rules
type RuleConfig = {
    name: string;
    description?: string;
    enabled?: boolean;
    limits?: Record<string, number>;
    min_coverage_percent?: number;
    max_concurrent?: number;
    notice_days?: Record<string, number>;
    max_consecutive?: Record<string, number>;
    max_per_month?: number;
};

type PolicyRules = Record<string, RuleConfig>;

export default function PolicySettingsPage() {
    const [rules, setRules] = useState<PolicyRules>({});
    const [loading, setLoading] = useState(true);

    // Mock initial load (In real app: fetch from DB/API)
    useEffect(() => {
        // Simulated fetch
        setTimeout(() => {
            setRules({
                "RULE001": {
                    name: "Maximum Leave Duration",
                    enabled: true,
                    limits: { "Annual Leave": 20, "Sick Leave": 15 }
                },
                "RULE003": {
                    name: "Minimum Team Coverage",
                    enabled: true,
                    min_coverage_percent: 60
                }
            });
            setLoading(false);
        }, 1000);
    }, []);

    const handleSave = async () => {
        // Save to DB via Server Action or API
        console.log("Saving rules:", rules);
        alert("Policy settings saved successfully!");
    };

    const toggleRule = (ruleId: string) => {
        setRules(prev => ({
            ...prev,
            [ruleId]: { ...prev[ruleId], enabled: !prev[ruleId].enabled }
        }));
    };

    if (loading) return <div className="p-8 text-white">Loading policies...</div>;

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Policy Constraint Engine</h1>
                    <p className="text-slate-400">Configure business rules for the AI Agent</p>
                </div>
                <button
                    onClick={handleSave}
                    className="bg-gradient-to-r from-pink-500 to-violet-600 px-6 py-2 rounded-xl text-white font-bold hover:shadow-lg hover:shadow-pink-500/25 transition-all"
                >
                    Save Changes
                </button>
            </div>

            <div className="grid gap-6">
                {Object.entries(rules).map(([id, config]) => (
                    <motion.div
                        key={id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`glass-panel p-6 border-l-4 ${config.enabled ? 'border-l-pink-500' : 'border-l-slate-600'}`}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${config.enabled ? 'bg-pink-500/20 text-pink-500' : 'bg-slate-800 text-slate-500'}`}>
                                    <span className="font-mono font-bold">{id.replace('RULE', '')}</span>
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white">{config.name}</h3>
                                    <p className="text-sm text-slate-400">{config.enabled ? 'Active' : 'Disabled'}</p>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => toggleRule(id)}
                                    className={`p-2 rounded-lg transition-colors ${config.enabled ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20' : 'bg-slate-800 text-slate-400'}`}
                                    title={config.enabled ? "Disable Rule" : "Enable Rule"}
                                >
                                    {config.enabled ? 'Active' : 'Enable'}
                                </button>
                                <button className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white">
                                    ✏️
                                </button>
                            </div>
                        </div>

                        {/* Configuration Fields (Dynamic based on rule type) */}
                        {config.enabled && (
                            <div className="grid md:grid-cols-2 gap-4 mt-4 pl-16">
                                {config.limits && (
                                    <div className="col-span-2">
                                        <h4 className="text-sm font-semibold text-slate-300 mb-2">Leave Limits (Days)</h4>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            {Object.entries(config.limits).map(([type, limit]) => (
                                                <div key={type}>
                                                    <label className="text-xs text-slate-500 block mb-1">{type}</label>
                                                    <input
                                                        type="number"
                                                        value={limit}
                                                        onChange={(e) => {
                                                            const newLimits = { ...config.limits, [type]: parseInt(e.target.value) };
                                                            setRules(prev => ({ ...prev, [id]: { ...prev[id], limits: newLimits } }));
                                                        }}
                                                        className="w-full bg-slate-900 border border-white/10 rounded px-3 py-2 text-white text-sm"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {config.min_coverage_percent !== undefined && (
                                    <div>
                                        <label className="text-sm font-semibold text-slate-300 block mb-2">Minimum Team Coverage (%)</label>
                                        <input
                                            type="number"
                                            value={config.min_coverage_percent}
                                            onChange={(e) => setRules(prev => ({ ...prev, [id]: { ...prev[id], min_coverage_percent: parseInt(e.target.value) } }))}
                                            className="w-full bg-slate-900 border border-white/10 rounded px-3 py-2 text-white text-sm"
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                    </motion.div>
                ))}
            </div>
        </div>
    );
}
