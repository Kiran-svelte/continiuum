"use client";

import { useUser } from "@clerk/nextjs";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function OnboardingPage() {
    const { user } = useUser();
    const router = useRouter();
    const [role, setRole] = useState<"HR" | "EMPLOYEE" | null>(null);
    const [formData, setFormData] = useState({
        companyName: "",
        industry: "",
        companyCode: "",
    });

    const handleCreateOrg = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch("/api/organization", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            console.log("Org Created:", data);
            router.push("/hr/dashboard");
        } catch (err: any) {
            console.error("Error creating org:", err);
            alert("Failed to create organization: " + err.message);
        }
    };

    const handleJoinOrg = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch("/api/employee/join", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ companyCode: formData.companyCode }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            console.log("Joined Org:", data);
            router.push("/employee/dashboard");
        } catch (err: any) {
            console.error("Error joining org:", err);
            alert("Failed to join organization: " + err.message);
        }
    };

    if (!role) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="glass-panel p-8 max-w-2xl w-full text-center">
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 mb-2">
                        Welcome, {user?.firstName}
                    </h1>
                    <p className="text-slate-400 mb-12">Select your role to continue</p>

                    <div className="grid md:grid-cols-2 gap-6">
                        <motion.div
                            whileHover={{ scale: 1.02 }}
                            onClick={() => setRole("HR")}
                            className="glass-panel p-8 cursor-pointer hover:border-pink-500/50 transition-colors group"
                        >
                            <div className="w-16 h-16 rounded-full bg-pink-500/20 flex items-center justify-center mx-auto mb-6 group-hover:bg-pink-500/30 transition-colors">
                                <svg
                                    className="w-8 h-8 text-pink-500"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                                    />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold mb-2">HR Admin</h3>
                            <p className="text-sm text-slate-400">
                                Create a new organization and manage employees
                            </p>
                        </motion.div>

                        <motion.div
                            whileHover={{ scale: 1.02 }}
                            onClick={() => setRole("EMPLOYEE")}
                            className="glass-panel p-8 cursor-pointer hover:border-violet-500/50 transition-colors group"
                        >
                            <div className="w-16 h-16 rounded-full bg-violet-500/20 flex items-center justify-center mx-auto mb-6 group-hover:bg-violet-500/30 transition-colors">
                                <svg
                                    className="w-8 h-8 text-violet-500"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                    />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold mb-2">Employee</h3>
                            <p className="text-sm text-slate-400">
                                Join an existing organization with a company code
                            </p>
                        </motion.div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="glass-panel p-8 max-w-md w-full">
                <button
                    onClick={() => setRole(null)}
                    className="text-sm text-slate-400 hover:text-white mb-6 flex items-center gap-2"
                >
                    ← Back
                </button>

                {role === "HR" ? (
                    <form onSubmit={handleCreateOrg}>
                        <h2 className="text-2xl font-bold mb-6">Create Organization</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Company Name
                                </label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-pink-500/50 transition-colors"
                                    value={formData.companyName}
                                    onChange={(e) =>
                                        setFormData({ ...formData, companyName: e.target.value })
                                    }
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Industry
                                </label>
                                <select
                                    className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-pink-500/50 transition-colors"
                                    value={formData.industry}
                                    onChange={(e) =>
                                        setFormData({ ...formData, industry: e.target.value })
                                    }
                                >
                                    <option value="">Select Industry</option>
                                    <option value="tech">Technology</option>
                                    <option value="finance">Finance</option>
                                    <option value="healthcare">Healthcare</option>
                                    <option value="retail">Retail</option>
                                </select>
                            </div>
                            <button
                                type="submit"
                                className="w-full bg-gradient-to-r from-pink-500 to-violet-600 text-white font-bold py-3 rounded-xl hover:opacity-90 transition-opacity mt-4"
                            >
                                Create & Continue
                            </button>
                        </div>
                    </form>
                ) : (
                    <form onSubmit={handleJoinOrg}>
                        <h2 className="text-2xl font-bold mb-6">Join Organization</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Company Code
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. COMP-1234"
                                    className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-violet-500/50 transition-colors"
                                    value={formData.companyCode}
                                    onChange={(e) =>
                                        setFormData({ ...formData, companyCode: e.target.value })
                                    }
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full bg-gradient-to-r from-violet-600 to-blue-600 text-white font-bold py-3 rounded-xl hover:opacity-90 transition-opacity mt-4"
                            >
                                Join Organization
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
