"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    FileText,
    Users,
    UserPlus,
    Wallet,
    BarChart3,
    MessageSquare,
    ShieldAlert
} from "lucide-react";
import { SignOutButton } from "@clerk/nextjs";

export default function Sidebar() {
    const { user } = useUser();
    const pathname = usePathname();
    const isHR = pathname.includes("/hr");

    const hrLinks = [
        { href: "/hr/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/hr/leave-requests", label: "Leave Requests", icon: FileText },
        { href: "/hr/employees", label: "Employees", icon: Users },
        { href: "/hr/onboarding", label: "Onboarding", icon: UserPlus }, // Redirects to our onboarding flow or legacy?
        { href: "/hr/payroll", label: "Payroll", icon: Wallet },
        { href: "/hr/reports", label: "Reports", icon: BarChart3 },
        { href: "/hr/policy-settings", label: "Policy Engine", icon: ShieldAlert },
    ];

    const empLinks = [
        { href: "/employee/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/employee/leave", label: "Apply Leave", icon: FileText },
        { href: "/employee/history", label: "My History", icon: BarChart3 },
    ];

    const links = isHR ? hrLinks : empLinks;

    return (
        <aside className="w-[280px] fixed h-screen bg-slate-900/80 backdrop-blur-xl border-r border-white/10 flex flex-col z-50">
            <div className="p-8">
                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-violet-500 mb-2">
                    Company.AI
                </h1>
                <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full border ${isHR ? 'border-pink-500/30 text-pink-500 bg-pink-500/10' : 'border-violet-500/30 text-violet-500 bg-violet-500/10'}`}>
                        {isHR ? 'HR PANEL' : 'EMPLOYEE'}
                    </span>
                    <span className="text-xs text-green-500 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                        Online
                    </span>
                </div>
            </div>

            <nav className="flex-1 px-4 space-y-2">
                {links.map((link) => {
                    const Icon = link.icon;
                    const isActive = pathname === link.href;

                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${isActive
                                    ? 'bg-gradient-to-r from-pink-500/10 to-violet-500/10 border border-white/5 text-white shadow-lg shadow-pink-500/5'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <Icon className={`w-5 h-5 ${isActive ? 'text-pink-500' : 'group-hover:text-pink-400 transition-colors'}`} />
                            <span className="font-medium">{link.label}</span>
                            {isActive && (
                                <motion-indicator />
                            )}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-white/5">
                <SignOutButton>
                    <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                        <span className="font-medium">Logout</span>
                    </button>
                </SignOutButton>
            </div>
        </aside>
    );
}

function motion_indicator() {
    return <div className="ml-auto w-1.5 h-1.5 rounded-full bg-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.5)]"></div>
}
