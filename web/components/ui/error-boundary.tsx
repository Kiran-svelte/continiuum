"use client";

import React, { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home, MessageCircle } from "lucide-react";

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: React.ErrorInfo | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        // Log to console for debugging
        console.error("[GlobalErrorBoundary] Caught error:", error);
        console.error("[GlobalErrorBoundary] Error info:", errorInfo);

        this.setState({ errorInfo });

        // Report error to backend (fire and forget)
        this.reportError(error, errorInfo);
    }

    private async reportError(error: Error, errorInfo: React.ErrorInfo) {
        try {
            // Store in localStorage as backup
            const errorLog = {
                timestamp: new Date().toISOString(),
                message: error.message,
                stack: error.stack,
                componentStack: errorInfo.componentStack,
                url: typeof window !== 'undefined' ? window.location.href : 'unknown',
                userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
            };

            // Store locally first (in case API fails)
            const existingErrors = JSON.parse(localStorage.getItem('error_logs') || '[]');
            existingErrors.push(errorLog);
            // Keep only last 10 errors
            if (existingErrors.length > 10) existingErrors.shift();
            localStorage.setItem('error_logs', JSON.stringify(existingErrors));

            // Try to report to API
            await fetch('/api/error-report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(errorLog),
            }).catch(() => {
                // Silently fail - we have localStorage backup
            });
        } catch (e) {
            // Final fallback - at least log to console
            console.error('[GlobalErrorBoundary] Failed to report error:', e);
        }
    }

    private handleReload = () => {
        window.location.reload();
    };

    private handleGoHome = () => {
        window.location.href = '/';
    };

    private handleReset = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
    };

    render() {
        if (this.state.hasError) {
            // Check if there's a custom fallback
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
                    <div className="max-w-lg w-full text-center">
                        {/* Icon */}
                        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-amber-500/10 flex items-center justify-center">
                            <AlertTriangle className="w-12 h-12 text-amber-400" />
                        </div>

                        {/* Message */}
                        <h1 className="text-2xl font-bold text-white mb-2">Something went wrong</h1>
                        <p className="text-slate-400 mb-6">
                            We apologize for the inconvenience. The error has been logged and our team will look into it.
                        </p>

                        {/* Error details (only in development) */}
                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <details className="mb-6 text-left">
                                <summary className="text-sm text-slate-500 cursor-pointer hover:text-slate-400">
                                    Technical details (dev only)
                                </summary>
                                <div className="mt-2 p-4 bg-black/50 rounded-lg border border-white/5 text-xs font-mono text-red-400 overflow-auto max-h-40">
                                    <p className="font-bold mb-2">{this.state.error.message}</p>
                                    <pre className="text-slate-500 whitespace-pre-wrap">
                                        {this.state.error.stack?.split('\n').slice(0, 5).join('\n')}
                                    </pre>
                                </div>
                            </details>
                        )}

                        {/* Actions */}
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <button
                                onClick={this.handleReset}
                                className="flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-colors font-medium"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Try Again
                            </button>
                            <button
                                onClick={this.handleGoHome}
                                className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium"
                            >
                                <Home className="w-4 h-4" />
                                Go Home
                            </button>
                        </div>

                        {/* Support link */}
                        <p className="mt-8 text-sm text-slate-500">
                            Need help?{" "}
                            <a
                                href="mailto:support@continuum.hr"
                                className="text-cyan-400 hover:text-cyan-300"
                            >
                                Contact support
                            </a>
                        </p>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

/**
 * Functional wrapper for use in specific components
 */
export function ErrorBoundary({ 
    children, 
    fallback 
}: { 
    children: ReactNode; 
    fallback?: ReactNode;
}) {
    return (
        <GlobalErrorBoundary fallback={fallback}>
            {children}
        </GlobalErrorBoundary>
    );
}

/**
 * HOC to wrap any component with error boundary
 */
export function withErrorBoundary<P extends object>(
    WrappedComponent: React.ComponentType<P>,
    fallback?: ReactNode
) {
    return function WithErrorBoundaryWrapper(props: P) {
        return (
            <GlobalErrorBoundary fallback={fallback}>
                <WrappedComponent {...props} />
            </GlobalErrorBoundary>
        );
    };
}
