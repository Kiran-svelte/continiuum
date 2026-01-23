"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, AlertTriangle, Info, X, RefreshCw } from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
    id: string;
    message: string;
    type: ToastType;
    action?: {
        label: string;
        onClick: () => void;
    };
    duration?: number;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType, options?: { action?: Toast["action"]; duration?: number }) => void;
    showSuccess: (message: string) => void;
    showError: (message: string, retryAction?: () => void) => void;
    showWarning: (message: string) => void;
    showInfo: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error("useToast must be used within a ToastProvider");
    }
    return context;
}

const icons = {
    success: <CheckCircle className="w-5 h-5 text-emerald-400" />,
    error: <XCircle className="w-5 h-5 text-red-400" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-400" />,
    info: <Info className="w-5 h-5 text-blue-400" />,
};

const backgrounds = {
    success: "bg-emerald-500/10 border-emerald-500/30",
    error: "bg-red-500/10 border-red-500/30",
    warning: "bg-amber-500/10 border-amber-500/30",
    info: "bg-blue-500/10 border-blue-500/30",
};

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const showToast = useCallback(
        (message: string, type: ToastType = "info", options?: { action?: Toast["action"]; duration?: number }) => {
            const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const duration = options?.duration ?? (type === "error" ? 8000 : 5000);

            setToasts((prev) => [...prev, { id, message, type, action: options?.action, duration }]);

            if (duration > 0) {
                setTimeout(() => removeToast(id), duration);
            }
        },
        [removeToast]
    );

    const showSuccess = useCallback((message: string) => showToast(message, "success"), [showToast]);
    const showError = useCallback(
        (message: string, retryAction?: () => void) => {
            showToast(message, "error", {
                action: retryAction ? { label: "Retry", onClick: retryAction } : undefined,
                duration: retryAction ? 10000 : 8000,
            });
        },
        [showToast]
    );
    const showWarning = useCallback((message: string) => showToast(message, "warning"), [showToast]);
    const showInfo = useCallback((message: string) => showToast(message, "info"), [showToast]);

    return (
        <ToastContext.Provider value={{ showToast, showSuccess, showError, showWarning, showInfo }}>
            {children}
            
            {/* Toast Container */}
            <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 max-w-md">
                <AnimatePresence>
                    {toasts.map((toast) => (
                        <motion.div
                            key={toast.id}
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 100, scale: 0.95 }}
                            className={`flex items-start gap-3 p-4 rounded-xl border backdrop-blur-xl shadow-xl ${backgrounds[toast.type]}`}
                        >
                            <div className="flex-shrink-0 mt-0.5">{icons[toast.type]}</div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-white">{toast.message}</p>
                                {toast.action && (
                                    <button
                                        onClick={() => {
                                            toast.action?.onClick();
                                            removeToast(toast.id);
                                        }}
                                        className="mt-2 flex items-center gap-1 text-xs font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
                                    >
                                        <RefreshCw className="w-3 h-3" />
                                        {toast.action.label}
                                    </button>
                                )}
                            </div>
                            <button
                                onClick={() => removeToast(toast.id)}
                                className="flex-shrink-0 text-slate-400 hover:text-white transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
}
