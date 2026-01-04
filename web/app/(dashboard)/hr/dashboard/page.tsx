export default function HRDashboard() {
    return (
        <div>
            <header className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Operations Center</h1>
                    <p className="text-slate-400">Welcome back, Administrator</p>
                </div>
                <div className="glass-panel px-4 py-2 flex gap-4 text-sm font-mono text-slate-300">
                    <span>Server: <span className="text-green-400">User-1</span></span>
                    <span>Latency: <span className="text-green-400">24ms</span></span>
                </div>
            </header>

            {/* Needs Attention Queue */}
            <section className="mb-8">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
                    Needs Attention (3)
                </h2>
                <div className="grid gap-4">
                    {/* Mock Item */}
                    <div className="glass-panel p-4 flex justify-between items-center border-l-4 border-l-orange-500">
                        <div>
                            <h3 className="font-bold text-white">Escalation #4291</h3>
                            <p className="text-sm text-slate-400">Rule Violation: Minimum Team Coverage</p>
                        </div>
                        <button className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 font-medium">Review</button>
                    </div>
                </div>
            </section>

            {/* Metrics Grid */}
            <div className="grid md:grid-cols-4 gap-6">
                {['Total Employees', 'On Leave Today', 'Pending Approvals', 'New Joiners'].map((metric) => (
                    <div key={metric} className="glass-panel p-6">
                        <p className="text-slate-400 text-sm mb-2">{metric}</p>
                        <p className="text-3xl font-bold text-white">24</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
