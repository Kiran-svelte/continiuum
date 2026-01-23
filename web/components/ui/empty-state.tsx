"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";
import { FileQuestion, Users, Calendar, Clock, AlertCircle, Plus } from "lucide-react";

interface EmptyStateProps {
    icon?: ReactNode;
    title: string;
    description?: string;
    action?: {
        label: string;
        onClick: () => void;
    };
    variant?: 'default' | 'minimal' | 'card';
    className?: string;
}

const defaultIcons = {
    employees: <Users className="w-12 h-12 text-slate-600" />,
    calendar: <Calendar className="w-12 h-12 text-slate-600" />,
    clock: <Clock className="w-12 h-12 text-slate-600" />,
    alert: <AlertCircle className="w-12 h-12 text-slate-600" />,
    default: <FileQuestion className="w-12 h-12 text-slate-600" />,
};

export function EmptyState({
    icon,
    title,
    description,
    action,
    variant = 'default',
    className = ""
}: EmptyStateProps) {
    const content = (
        <>
            {/* Icon */}
            <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="w-24 h-24 rounded-full bg-slate-800/50 flex items-center justify-center mb-4"
            >
                {icon || defaultIcons.default}
            </motion.div>

            {/* Title */}
            <motion.h3 
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-lg font-semibold text-white mb-2"
            >
                {title}
            </motion.h3>

            {/* Description */}
            {description && (
                <motion.p 
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-sm text-slate-400 max-w-sm text-center mb-4"
                >
                    {description}
                </motion.p>
            )}

            {/* Action Button */}
            {action && (
                <motion.button
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={action.onClick}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-cyan-500 text-white rounded-lg font-medium text-sm hover:opacity-90 transition-opacity"
                >
                    <Plus className="w-4 h-4" />
                    {action.label}
                </motion.button>
            )}
        </>
    );

    if (variant === 'minimal') {
        return (
            <div className={`flex flex-col items-center justify-center py-8 ${className}`}>
                {content}
            </div>
        );
    }

    if (variant === 'card') {
        return (
            <div className={`bg-slate-900/50 border border-white/10 rounded-xl p-8 flex flex-col items-center justify-center ${className}`}>
                {content}
            </div>
        );
    }

    return (
        <div className={`flex flex-col items-center justify-center min-h-[300px] py-12 px-4 ${className}`}>
            {content}
        </div>
    );
}

// Pre-configured empty states for common scenarios
export function NoEmployeesEmpty({ onAdd }: { onAdd?: () => void }) {
    return (
        <EmptyState
            icon={<Users className="w-12 h-12 text-purple-400" />}
            title="No Employees Yet"
            description="Start building your team by adding your first employee."
            action={onAdd ? { label: "Add Employee", onClick: onAdd } : undefined}
            variant="card"
        />
    );
}

export function NoLeaveRequestsEmpty() {
    return (
        <EmptyState
            icon={<Calendar className="w-12 h-12 text-cyan-400" />}
            title="No Leave Requests"
            description="There are no pending leave requests to review."
            variant="card"
        />
    );
}

export function NoResultsEmpty({ searchTerm }: { searchTerm?: string }) {
    return (
        <EmptyState
            icon={<FileQuestion className="w-12 h-12 text-amber-400" />}
            title="No Results Found"
            description={searchTerm ? `No results match "${searchTerm}". Try a different search term.` : "No matching records found."}
            variant="minimal"
        />
    );
}

export function ErrorEmpty({ onRetry }: { onRetry?: () => void }) {
    return (
        <EmptyState
            icon={<AlertCircle className="w-12 h-12 text-red-400" />}
            title="Something Went Wrong"
            description="We couldn't load the data. Please try again."
            action={onRetry ? { label: "Try Again", onClick: onRetry } : undefined}
            variant="card"
        />
    );
}
