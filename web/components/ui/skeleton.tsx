"use client";

import { cn } from "@/lib/utils";

interface SkeletonProps {
    className?: string;
    variant?: 'text' | 'circular' | 'rectangular';
    width?: string | number;
    height?: string | number;
    lines?: number;
}

export function Skeleton({ 
    className, 
    variant = 'rectangular',
    width,
    height,
    lines = 1
}: SkeletonProps) {
    const baseClass = "animate-pulse bg-slate-800";
    
    const variantClasses = {
        text: "h-4 rounded",
        circular: "rounded-full",
        rectangular: "rounded-lg"
    };
    
    const style: React.CSSProperties = {};
    if (width) style.width = typeof width === 'number' ? `${width}px` : width;
    if (height) style.height = typeof height === 'number' ? `${height}px` : height;
    
    if (lines > 1) {
        return (
            <div className="space-y-2">
                {Array.from({ length: lines }).map((_, i) => (
                    <div 
                        key={i}
                        className={cn(baseClass, variantClasses.text, className)}
                        style={{ 
                            ...style, 
                            width: i === lines - 1 ? '80%' : style.width 
                        }}
                    />
                ))}
            </div>
        );
    }
    
    return (
        <div 
            className={cn(baseClass, variantClasses[variant], className)} 
            style={style}
        />
    );
}

// Pre-built skeleton patterns
export function SkeletonCard() {
    return (
        <div className="bg-slate-900/50 border border-white/10 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-4">
                <Skeleton variant="circular" width={48} height={48} />
                <div className="flex-1 space-y-2">
                    <Skeleton width="60%" height={20} />
                    <Skeleton width="40%" height={14} />
                </div>
            </div>
            <Skeleton lines={3} />
        </div>
    );
}

export function SkeletonTableRow() {
    return (
        <div className="flex items-center gap-4 py-4 px-6 border-b border-white/5">
            <Skeleton variant="circular" width={40} height={40} />
            <Skeleton width="20%" height={16} />
            <Skeleton width="25%" height={16} />
            <Skeleton width="15%" height={16} />
            <Skeleton width="10%" height={28} className="rounded-full" />
        </div>
    );
}

export function SkeletonDashboardStat() {
    return (
        <div className="bg-slate-900/50 border border-white/10 rounded-xl p-6">
            <Skeleton width="40%" height={14} className="mb-3" />
            <Skeleton width="60%" height={32} className="mb-2" />
            <Skeleton width="80%" height={12} />
        </div>
    );
}

export function SkeletonList({ count = 5 }: { count?: number }) {
    return (
        <div className="space-y-3">
            {Array.from({ length: count }).map((_, i) => (
                <SkeletonCard key={i} />
            ))}
        </div>
    );
}
