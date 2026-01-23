"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, CheckCircle, Info, X } from "lucide-react";

type ConfirmType = "danger" | "warning" | "info";

interface ConfirmOptions {
    title: string;
    message: string;
    type?: ConfirmType;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => Promise<void> | void;
    onCancel?: () => void;
}

interface ConfirmContextType {
    confirm: (options: ConfirmOptions) => void;
    confirmDanger: (title: string, message: string, onConfirm: () => Promise<void> | void) => void;
    confirmAction: (title: string, message: string, onConfirm: () => Promise<void> | void) => void;
}

const ConfirmContext = createContext<ConfirmContextType | null>(null);

export function useConfirm() {
    const context = useContext(ConfirmContext);
    if (!context) {
        throw new Error("useConfirm must be used within a ConfirmProvider");
    }
    return context;
}

const icons = {
    danger: <AlertTriangle className="w-10 h-10 text-red-400" />,
    warning: <AlertTriangle className="w-10 h-10 text-amber-400" />,
    info: <Info className="w-10 h-10 text-blue-400" />,
};

const confirmButtonStyles = {
    danger: "bg-red-600 hover:bg-red-500 text-white",
    warning: "bg-amber-600 hover:bg-amber-500 text-white",
    info: "bg-purple-600 hover:bg-purple-500 text-white",
};

export function ConfirmProvider({ children }: { children: ReactNode }) {
    const [dialog, setDialog] = useState<ConfirmOptions | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const confirm = useCallback((options: ConfirmOptions) => {
        setDialog(options);
    }, []);

    const confirmDanger = useCallback(
        (title: string, message: string, onConfirm: () => Promise<void> | void) => {
            confirm({
                title,
                message,
                type: "danger",
                confirmLabel: "Delete",
                onConfirm,
            });
        },
        [confirm]
    );

    const confirmAction = useCallback(
        (title: string, message: string, onConfirm: () => Promise<void> | void) => {
            confirm({
                title,
                message,
                type: "info",
                confirmLabel: "Confirm",
                onConfirm,
            });
        },
        [confirm]
    );

    const handleConfirm = async () => {
        if (!dialog) return;
        setIsLoading(true);
        try {
            await dialog.onConfirm();
        } finally {
            setIsLoading(false);
            setDialog(null);
        }
    };

    const handleCancel = () => {
        dialog?.onCancel?.();
        setDialog(null);
    };

    return (
        <ConfirmContext.Provider value={{ confirm, confirmDanger, confirmAction }}>
            {children}

            <AnimatePresence>
                {dialog && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={handleCancel}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]"
                        />

                        {/* Dialog */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
                        >
                            <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl max-w-md w-full p-6">
                                {/* Close button */}
                                <button
                                    onClick={handleCancel}
                                    className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>

                                {/* Icon */}
                                <div className="flex justify-center mb-4">
                                    <div className={`p-4 rounded-full ${dialog.type === 'danger' ? 'bg-red-500/10' : dialog.type === 'warning' ? 'bg-amber-500/10' : 'bg-blue-500/10'}`}>
                                        {icons[dialog.type || "info"]}
                                    </div>
                                </div>

                                {/* Content */}
                                <h2 className="text-xl font-bold text-white text-center mb-2">{dialog.title}</h2>
                                <p className="text-slate-400 text-center mb-6">{dialog.message}</p>

                                {/* Actions */}
                                <div className="flex gap-3">
                                    <button
                                        onClick={handleCancel}
                                        disabled={isLoading}
                                        className="flex-1 px-4 py-3 rounded-lg bg-slate-800 text-slate-300 font-medium hover:bg-slate-700 transition-colors disabled:opacity-50"
                                    >
                                        {dialog.cancelLabel || "Cancel"}
                                    </button>
                                    <button
                                        onClick={handleConfirm}
                                        disabled={isLoading}
                                        className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${confirmButtonStyles[dialog.type || "info"]}`}
                                    >
                                        {isLoading ? (
                                            <>
                                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                </svg>
                                                Processing...
                                            </>
                                        ) : (
                                            dialog.confirmLabel || "Confirm"
                                        )}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </ConfirmContext.Provider>
    );
}
