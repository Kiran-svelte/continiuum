"use client";

import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    LayoutDashboard,
    FileText,
    Users,
    UserPlus,
    Wallet,
    BarChart3,
    MessageSquare,
    ShieldAlert,
    Building2,
    User,
    CalendarPlus,
    Calendar,
    Clock,
    Shield,
    Cpu,
    ScrollText,
    ChevronDown,
    ChevronRight,
    Sparkles,
    LogOut,
    Settings,
    Sun,
    Moon,
    Bell
} from "lucide-react";
import { useState, useEffect } from "react";
import { formatDisplayName, getInitials } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import type { User as SupabaseUser } from "@supabase/supabase-js";

export default function Sidebar() {
    const [user, setUser] = useState<SupabaseUser | null>(null);
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClient();
    const isHR = pathname.includes("/hr");
    const [securityExpanded, setSecurityExpanded] = useState(pathname.includes("/hr/security"));

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
        };
        getUser();
    }, [supabase.auth]);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/sign-in');
    };

    const hrLinks = [
        { href: "/hr/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/hr/company", label: "Profile", icon: Building2 },
        { href: "/hr/employee-registrations", label: "New Registrations", icon: UserPlus },
        { href: "/hr/leave-requests", label: "Leave Requests", icon: FileText },
        { href: "/hr/attendance", label: "Attendance", icon: Clock },
        { href: "/hr/employees", label: "Employees", icon: Users },
        { href: "/hr/payroll", label: "Payroll", icon: Wallet },
        { href: "/hr/settings", label: "Settings", icon: Settings },
        { href: "/hr/holiday-settings", label: "Holiday Calendar", icon: Calendar },
        { href: "/hr/notification-settings", label: "Email Notifications", icon: Bell },
    ];

    const securityLinks = [
        { href: "/hr/security/ai-services", label: "AI Services", icon: Cpu },
        { href: "/hr/security/audit-logs", label: "Audit Logs", icon: ScrollText },
    ];

    const empLinks = [
        { href: "/employee/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/employee/request-leave", label: "Request Leave", icon: CalendarPlus },
        { href: "/employee/history", label: "My History", icon: BarChart3 },
        { href: "/employee/profile", label: "My Profile", icon: User },
    ];

    const links = isHR ? hrLinks : empLinks;
    const accentColor = isHR ? 'purple' : 'cyan';

    return (
        <aside className="w-[280px] fixed h-screen bg-white dark:bg-[#08080c]/95 backdrop-blur-2xl border-r border-gray-200 dark:border-white/[0.04] flex flex-col z-50 transition-colors duration-300">
            {/* Ambient Glow - Only in dark mode */}
            <div className={`absolute top-0 left-0 w-full h-32 bg-gradient-to-b ${isHR ? 'from-purple-500/5' : 'from-cyan-500/5'} to-transparent pointer-events-none dark:block hidden`} />
            
            {/* Logo Section */}
            <div className="relative p-6 pb-4">
                <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${isHR ? 'from-purple-500 to-pink-500' : 'from-cyan-500 to-blue-500'} flex items-center justify-center shadow-lg ${isHR ? 'shadow-purple-500/20' : 'shadow-cyan-500/20'}`}>
                        <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">Continuum</h1>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${isHR ? 'border-purple-500/30 text-purple-600 dark:text-purple-400 bg-purple-500/10' : 'border-cyan-500/30 text-cyan-600 dark:text-cyan-400 bg-cyan-500/10'} uppercase tracking-wider`}>
                                {isHR ? 'HR Panel' : 'Employee'}
                            </span>
                        </div>
                    </div>
                </div>
                
                {/* Status Indicator */}
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-white/[0.02] border border-gray-200 dark:border-white/[0.04]">
                    <div className="relative">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400"></div>
                        <div className="absolute inset-0 w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-ping opacity-75"></div>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-white/50">System Online</span>
                    <span className="ml-auto text-[10px] text-gray-400 dark:text-white/30">v2.0</span>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 space-y-1 overflow-y-auto scrollbar-thin">
                <div className="text-[10px] font-semibold text-gray-400 dark:text-white/30 uppercase tracking-wider px-3 mb-2">
                    Main Menu
                </div>
                
                {links.map((link, index) => {
                    const Icon = link.icon;
                    const isActive = pathname === link.href;

                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 relative ${isActive
                                ? `${isHR ? 'bg-purple-100 dark:bg-gradient-to-r dark:from-purple-500/15 dark:to-purple-500/5' : 'bg-cyan-100 dark:bg-gradient-to-r dark:from-cyan-500/15 dark:to-cyan-500/5'} text-gray-900 dark:text-white`
                                : 'text-gray-600 dark:text-white/50 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/[0.03]'
                            }`}
                            style={{ animationDelay: `${index * 30}ms` }}
                        >
                            {/* Active Indicator Bar */}
                            {isActive && (
                                <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full ${isHR ? 'bg-purple-500' : 'bg-cyan-500'} shadow-[0_0_8px_rgba(168,85,247,0.5)]`} />
                            )}
                            
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 ${isActive 
                                ? `${isHR ? 'bg-purple-200 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400' : 'bg-cyan-200 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400'}` 
                                : 'bg-gray-100 dark:bg-white/[0.03] text-gray-500 dark:text-white/40 group-hover:text-gray-700 dark:group-hover:text-white/70 group-hover:bg-gray-200 dark:group-hover:bg-white/[0.05]'
                            }`}>
                                <Icon className="w-[18px] h-[18px]" />
                            </div>
                            
                            <span className="text-sm font-medium flex-1">{link.label}</span>
                            
                            {isActive && (
                                <div className={`w-1.5 h-1.5 rounded-full ${isHR ? 'bg-purple-600 dark:bg-purple-400' : 'bg-cyan-600 dark:bg-cyan-400'} shadow-[0_0_6px_currentColor]`} />
                            )}
                        </Link>
                    );
                })}

                {/* Security Section - HR Only */}
                {isHR && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-white/[0.04]">
                        <div className="text-[10px] font-semibold text-gray-400 dark:text-white/30 uppercase tracking-wider px-3 mb-2">
                            Security
                        </div>
                        <button
                            onClick={() => setSecurityExpanded(!securityExpanded)}
                            className={`w-full group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                                pathname.includes("/hr/security")
                                    ? 'bg-amber-100 dark:bg-gradient-to-r dark:from-amber-500/15 dark:to-amber-500/5 text-gray-900 dark:text-white'
                                    : 'text-gray-600 dark:text-white/50 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/[0.03]'
                            }`}
                        >
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                                pathname.includes("/hr/security") 
                                    ? 'bg-amber-200 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400' 
                                    : 'bg-gray-100 dark:bg-white/[0.03] text-gray-500 dark:text-white/40 group-hover:text-gray-700 dark:group-hover:text-white/70'
                            }`}>
                                <Shield className="w-[18px] h-[18px]" />
                            </div>
                            <span className="text-sm font-medium flex-1 text-left">Security</span>
                            <ChevronDown className={`w-4 h-4 text-gray-400 dark:text-white/30 transition-transform duration-200 ${securityExpanded ? 'rotate-180' : ''}`} />
                        </button>

                        <div className={`overflow-hidden transition-all duration-200 ${securityExpanded ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
                            <div className="ml-6 mt-1 space-y-0.5 pl-3 border-l border-gray-200 dark:border-white/[0.06]">
                                {securityLinks.map((link) => {
                                    const Icon = link.icon;
                                    const isActive = pathname === link.href;

                                    return (
                                        <Link
                                            key={link.href}
                                            href={link.href}
                                            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all text-sm ${isActive
                                                ? 'bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                                : 'text-gray-500 dark:text-white/40 hover:text-gray-700 dark:hover:text-white/70 hover:bg-gray-100 dark:hover:bg-white/[0.02]'
                                            }`}
                                        >
                                            <Icon className="w-4 h-4" />
                                            <span className="font-medium">{link.label}</span>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </nav>

            {/* User Section & Logout */}
            <div className="p-3 border-t border-gray-200 dark:border-white/[0.04]">
                {/* Theme Toggle */}
                <div className="flex items-center justify-between px-3 py-2 mb-2">
                    <span className="text-xs text-gray-500 dark:text-white/40">Theme</span>
                    <ThemeToggle size="sm" />
                </div>
                
                {/* User Info */}
                <div className="flex items-center gap-3 px-3 py-2.5 mb-2">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-gray-200 to-gray-100 dark:from-white/10 dark:to-white/5 flex items-center justify-center text-gray-600 dark:text-white/60 text-sm font-semibold">
                        {getInitials(user?.user_metadata?.full_name || user?.email)}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {formatDisplayName(user?.user_metadata?.full_name || user?.email)}
                        </p>
                        <p className="text-[11px] text-gray-400 dark:text-white/30 truncate">
                            {user?.email || ''}
                        </p>
                    </div>
                </div>
                
                <button 
                    onClick={handleSignOut}
                    className="w-full group flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-500 dark:text-white/40 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all duration-200"
                >
                    <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-white/[0.02] group-hover:bg-red-100 dark:group-hover:bg-red-500/10 flex items-center justify-center transition-all">
                        <LogOut className="w-[18px] h-[18px]" />
                    </div>
                    <span className="text-sm font-medium">Sign Out</span>
                </button>
            </div>
        </aside>
    );
}
