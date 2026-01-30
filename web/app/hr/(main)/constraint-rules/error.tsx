"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to console in development
        console.error("[Constraint Rules Error]:", error);
    }, [error]);

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Constraint Rules</h1>
                <p className="text-slate-400">Configure leave request validation rules.</p>
            </header>
            <div className="glass-panel p-12 text-center">
                <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-white mb-2">
                    Something went wrong
                </h2>
                <p className="text-slate-400 mb-6 max-w-md mx-auto">
                    We encountered an error loading the constraint rules. This may be due to a temporary connection issue.
                </p>
                {error.digest && (
                    <p className="text-xs text-slate-500 mb-4 font-mono">
                        Error ID: {error.digest}
                    </p>
                )}
                <div className="flex gap-3 justify-center">
                    <button 
                        onClick={reset}
                        className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors flex items-center gap-2"
                    >
                        <RefreshCw size={16} />
                        Try Again
                    </button>
                    <a 
                        href="/hr/dashboard"
                        className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors flex items-center gap-2"
                    >
                        <Home size={16} />
                        Go to Dashboard
                    </a>
                </div>
            </div>
        </div>
    );
}
