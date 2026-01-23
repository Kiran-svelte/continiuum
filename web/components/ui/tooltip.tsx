"use client";

import { ReactNode, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface TooltipProps {
    children: ReactNode;
    content: string | ReactNode;
    position?: 'top' | 'bottom' | 'left' | 'right';
    delay?: number;
    className?: string;
}

export function Tooltip({
    children,
    content,
    position = 'top',
    delay = 200,
    className = ""
}: TooltipProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

    const showTooltip = () => {
        const id = setTimeout(() => setIsVisible(true), delay);
        setTimeoutId(id);
    };

    const hideTooltip = () => {
        if (timeoutId) {
            clearTimeout(timeoutId);
            setTimeoutId(null);
        }
        setIsVisible(false);
    };

    const positionClasses = {
        top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
        bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
        left: 'right-full top-1/2 -translate-y-1/2 mr-2',
        right: 'left-full top-1/2 -translate-y-1/2 ml-2'
    };

    const arrowClasses = {
        top: 'top-full left-1/2 -translate-x-1/2 border-t-slate-800 border-x-transparent border-b-transparent',
        bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-slate-800 border-x-transparent border-t-transparent',
        left: 'left-full top-1/2 -translate-y-1/2 border-l-slate-800 border-y-transparent border-r-transparent',
        right: 'right-full top-1/2 -translate-y-1/2 border-r-slate-800 border-y-transparent border-l-transparent'
    };

    const motionVariants = {
        top: { initial: { opacity: 0, y: 5 }, animate: { opacity: 1, y: 0 } },
        bottom: { initial: { opacity: 0, y: -5 }, animate: { opacity: 1, y: 0 } },
        left: { initial: { opacity: 0, x: 5 }, animate: { opacity: 1, x: 0 } },
        right: { initial: { opacity: 0, x: -5 }, animate: { opacity: 1, x: 0 } }
    };

    return (
        <div 
            className="relative inline-block"
            onMouseEnter={showTooltip}
            onMouseLeave={hideTooltip}
            onFocus={showTooltip}
            onBlur={hideTooltip}
        >
            {children}
            <AnimatePresence>
                {isVisible && (
                    <motion.div
                        initial={motionVariants[position].initial}
                        animate={motionVariants[position].animate}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className={`absolute ${positionClasses[position]} z-50 pointer-events-none ${className}`}
                    >
                        <div className="relative">
                            <div className="px-3 py-2 text-xs font-medium text-white bg-slate-800 rounded-lg shadow-lg whitespace-nowrap border border-white/10">
                                {content}
                            </div>
                            {/* Arrow */}
                            <div 
                                className={`absolute w-0 h-0 border-[6px] ${arrowClasses[position]}`}
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// Icon button with built-in tooltip
interface IconButtonProps {
    icon: ReactNode;
    tooltip: string;
    onClick?: () => void;
    variant?: 'default' | 'danger' | 'success';
    disabled?: boolean;
    className?: string;
}

export function IconButton({
    icon,
    tooltip,
    onClick,
    variant = 'default',
    disabled = false,
    className = ""
}: IconButtonProps) {
    const variantClasses = {
        default: 'bg-slate-800 hover:bg-slate-700 text-slate-300',
        danger: 'bg-red-500/10 hover:bg-red-500/20 text-red-400',
        success: 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400'
    };

    return (
        <Tooltip content={tooltip}>
            <button
                onClick={onClick}
                disabled={disabled}
                className={`p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${className}`}
                aria-label={tooltip}
            >
                {icon}
            </button>
        </Tooltip>
    );
}
