"use client";

import { ReactNode } from "react";
import { ArrowLeft, ChevronRight, Home } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface BreadcrumbItem {
    label: string;
    href?: string;
}

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    backHref?: string;
    backLabel?: string;
    showBack?: boolean;
    breadcrumbs?: BreadcrumbItem[];
    actions?: ReactNode;
    className?: string;
}

export function PageHeader({
    title,
    subtitle,
    backHref,
    backLabel = "Back",
    showBack = false,
    breadcrumbs,
    actions,
    className = ""
}: PageHeaderProps) {
    const router = useRouter();

    const handleBack = () => {
        if (backHref) {
            router.push(backHref);
        } else {
            router.back();
        }
    };

    return (
        <header className={`mb-8 ${className}`}>
            {/* Breadcrumbs */}
            {breadcrumbs && breadcrumbs.length > 0 && (
                <nav className="flex items-center gap-1 text-sm text-slate-500 mb-4" aria-label="Breadcrumb">
                    <Link 
                        href="/dashboard" 
                        className="hover:text-slate-300 transition-colors flex items-center gap-1"
                    >
                        <Home className="w-3.5 h-3.5" />
                        <span className="sr-only">Home</span>
                    </Link>
                    {breadcrumbs.map((item, index) => (
                        <span key={index} className="flex items-center gap-1">
                            <ChevronRight className="w-3.5 h-3.5" />
                            {item.href ? (
                                <Link 
                                    href={item.href}
                                    className="hover:text-slate-300 transition-colors"
                                >
                                    {item.label}
                                </Link>
                            ) : (
                                <span className="text-slate-300">{item.label}</span>
                            )}
                        </span>
                    ))}
                </nav>
            )}

            {/* Back Button */}
            {showBack && (
                <button
                    onClick={handleBack}
                    className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4 group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    <span className="text-sm font-medium">{backLabel}</span>
                </button>
            )}

            {/* Title Row */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-white">{title}</h1>
                    {subtitle && (
                        <p className="text-slate-400 mt-1">{subtitle}</p>
                    )}
                </div>
                
                {/* Actions */}
                {actions && (
                    <div className="flex items-center gap-2">
                        {actions}
                    </div>
                )}
            </div>
        </header>
    );
}

// Simple back button for use anywhere
export function BackButton({ 
    href, 
    label = "Back" 
}: { 
    href?: string; 
    label?: string;
}) {
    const router = useRouter();

    const handleClick = () => {
        if (href) {
            router.push(href);
        } else {
            router.back();
        }
    };

    return (
        <button
            onClick={handleClick}
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors group text-sm"
        >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            {label}
        </button>
    );
}
