export default function EscalationDetailPage({ params }: { params: { id: string } }) {
    // In real app: fetch escalation details by ID
    const mockEscalation = {
        id: params.id,
        employee: "John Doe",
        requestType: "Annual Leave",
        dates: "Oct 12 - Oct 15 (4 days)",
        reason: "Family vacation planned months ago",
        violation: {
            rule_id: "RULE003",
            rule_name: "Minimum Team Coverage",
            message: "❌ Team understaffed! Only 2/5 would remain (need 3)",
            details: "Team: Engineering. Current leaves: 2."
        },
        ai_confidence: 0.85
    };

    return (
        <div className="p-8 max-w-4xl mx-auto min-h-screen">
            <div className="mb-8">
                <div className="flex items-center gap-2 text-slate-400 mb-2">
                    <span>← Back to Dashboard</span>
                </div>
                <h1 className="text-3xl font-bold text-white">Escalation Review #{mockEscalation.id}</h1>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
                {/* Left: Request Details */}
                <div className="md:col-span-2 space-y-6">
                    <div className="glass-panel p-6">
                        <h2 className="text-xl font-bold text-white mb-4">Request Details</h2>
                        <div className="grid grid-cols-2 gap-y-4 text-sm">
                            <div>
                                <span className="block text-slate-400">Employee</span>
                                <span className="text-white font-medium">{mockEscalation.employee}</span>
                            </div>
                            <div>
                                <span className="block text-slate-400">Leave Type</span>
                                <span className="text-white font-medium">{mockEscalation.requestType}</span>
                            </div>
                            <div>
                                <span className="block text-slate-400">Duration</span>
                                <span className="text-white font-medium">{mockEscalation.dates}</span>
                            </div>
                            <div className="col-span-2">
                                <span className="block text-slate-400">Reason</span>
                                <p className="text-white mt-1 bg-slate-800/50 p-3 rounded-lg border border-white/5">
                                    "{mockEscalation.reason}"
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Violation Analysis */}
                    <div className="glass-panel p-6 border border-red-500/30 bg-red-500/5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <svg className="w-24 h-24 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                        </div>

                        <h2 className="text-xl font-bold text-red-400 mb-4 flex items-center gap-2">
                            ⚠️ Policy Violation Detected
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <span className="text-xs uppercase tracking-wider text-red-400/70 font-bold">Triggered Rule</span>
                                <p className="text-lg font-bold text-white mt-1">{mockEscalation.violation.rule_name} <span className="text-sm font-mono text-slate-400">({mockEscalation.violation.rule_id})</span></p>
                            </div>

                            <div className="bg-black/30 p-4 rounded-lg border border-red-500/20">
                                <p className="text-red-300 font-medium">"{mockEscalation.violation.message}"</p>
                                <p className="text-sm text-slate-400 mt-2">{mockEscalation.violation.details}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Actions */}
                <div className="space-y-6">
                    <div className="glass-panel p-6">
                        <h2 className="text-lg font-bold text-white mb-4">AI Recommendation</h2>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="h-2 flex-grow bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-red-500 w-[85%]"></div>
                            </div>
                            <span className="text-red-400 font-bold">Reject (85%)</span>
                        </div>
                        <p className="text-sm text-slate-400 mb-6">
                            Based on strict adherence to the Minimum Team Coverage rule, the AI recommends rejection unless an exception is warranted.
                        </p>

                        <div className="flex flex-col gap-3">
                            <button className="w-full py-3 bg-red-500/10 border border-red-500/50 text-red-400 font-bold rounded-xl hover:bg-red-500/20 transition-colors">
                                Reject Request
                            </button>
                            <button className="w-full py-3 bg-green-500/10 border border-green-500/50 text-green-400 font-bold rounded-xl hover:bg-green-500/20 transition-colors">
                                Approve (Override)
                            </button>
                            <button className="w-full py-3 bg-slate-800 text-slate-300 font-bold rounded-xl hover:bg-slate-700 transition-colors">
                                Ask for Clarification
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
