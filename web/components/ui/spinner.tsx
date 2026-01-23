"use client";

import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface SpinnerProps {
    size?: 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
    label?: string;
}

const sizeMap = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
};

export function Spinner({ size = 'md', className, label }: SpinnerProps) {
    return (
        <div className={cn("flex items-center gap-2", className)}>
            <Loader2 className={cn(sizeMap[size], "animate-spin text-cyan-500")} />
            {label && <span className="text-slate-400 text-sm">{label}</span>}
        </div>
    );
}

// Full page loader
export function PageLoader({ label = "Loading..." }: { label?: string }) {
    return (
        <div className="fixed inset-0 bg-[#0a0a0f]/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="flex flex-col items-center gap-4">
                <div className="relative">
                    {/* Outer ring */}
                    <div className="w-16 h-16 rounded-full border-4 border-slate-800 animate-pulse" />
                    {/* Spinning ring */}
                    <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-transparent border-t-cyan-500 border-r-purple-500 animate-spin" />
                </div>
                <p className="text-slate-400 text-sm font-medium">{label}</p>
            </div>
        </div>
    );
}

// Inline loader for buttons/actions
export function InlineLoader({ label }: { label?: string }) {
    return (
        <span className="inline-flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle 
                    className="opacity-25" 
                    cx="12" cy="12" r="10" 
                    stroke="currentColor" 
                    strokeWidth="4" 
                    fill="none" 
                />
                <path 
                    className="opacity-75" 
                    fill="currentColor" 
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" 
                />
            </svg>
            {label}
        </span>
    );
}

// Dots loader for chat/typing indicators
export function DotsLoader() {
    return (
        <div className="flex gap-1">
            <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
    );
}

// Section loader - use inside content areas
export function SectionLoader({ label = "Loading..." }: { label?: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-12">
            <Spinner size="lg" />
            <p className="mt-4 text-slate-400 text-sm">{label}</p>
        </div>
    );
}
