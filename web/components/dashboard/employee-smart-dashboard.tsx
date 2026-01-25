"use client";

import { Suspense } from "react";
import { EmployeeWellness } from "./employee-wellness";
import { SmartLeaveCalendar } from "./smart-leave-calendar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
    Heart, 
    Calendar,
    Clock,
    FileText,
    ArrowRight,
    Sparkles,
    Coffee,
    Sun,
    Moon
} from "lucide-react";

function LoadingCard() {
    return (
        <Card className="bg-slate-900 border-slate-700 animate-pulse">
            <CardHeader>
                <div className="h-6 bg-slate-700 rounded w-1/3"></div>
            </CardHeader>
            <CardContent>
                <div className="h-48 bg-slate-800 rounded"></div>
            </CardContent>
        </Card>
    );
}

function QuickActionsCard() {
    const actions = [
        { 
            icon: FileText, 
            label: "Apply Leave", 
            href: "/employee/leave/apply",
            color: "text-indigo-400",
            bg: "bg-indigo-500/20"
        },
        { 
            icon: Clock, 
            label: "Clock In/Out", 
            href: "/employee/attendance",
            color: "text-emerald-400",
            bg: "bg-emerald-500/20"
        },
        { 
            icon: Calendar, 
            label: "My Calendar", 
            href: "/employee/calendar",
            color: "text-blue-400",
            bg: "bg-blue-500/20"
        },
        { 
            icon: FileText, 
            label: "Leave Balance", 
            href: "/employee/leave/balance",
            color: "text-amber-400",
            bg: "bg-amber-500/20"
        },
    ];

    return (
        <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-amber-400" />
                    Quick Actions
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 gap-3">
                    {actions.map((action) => {
                        const Icon = action.icon;
                        return (
                            <Button
                                key={action.label}
                                variant="outline"
                                className={`h-auto py-4 flex flex-col items-center gap-2 ${action.bg} border-slate-700 hover:border-slate-600`}
                                asChild
                            >
                                <a href={action.href}>
                                    <Icon className={`h-6 w-6 ${action.color}`} />
                                    <span className="text-xs">{action.label}</span>
                                </a>
                            </Button>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}

function DailyTipsCard() {
    const tips = [
        { icon: Coffee, text: "Take a short break every 90 minutes", type: "productivity" },
        { icon: Sun, text: "Step outside for 10 minutes of sunlight", type: "wellness" },
        { icon: Moon, text: "Plan your next day before leaving work", type: "planning" },
    ];

    const currentTip = tips[new Date().getDate() % tips.length];
    const TipIcon = currentTip.icon;

    return (
        <Card className="bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border-indigo-500/30">
            <CardContent className="p-4">
                <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-indigo-500/20">
                        <TipIcon className="h-5 w-5 text-indigo-400" />
                    </div>
                    <div>
                        <Badge variant="outline" className="text-indigo-400 border-indigo-400 mb-2">
                            Daily Tip
                        </Badge>
                        <p className="text-sm text-slate-300">{currentTip.text}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function UpcomingCard() {
    return (
        <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-blue-400" />
                    Upcoming
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium">Team Meeting</span>
                            <Badge variant="outline" className="text-xs">Today</Badge>
                        </div>
                        <p className="text-xs text-slate-400">10:00 AM - Weekly standup</p>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium">Project Deadline</span>
                            <Badge variant="outline" className="text-xs text-amber-400 border-amber-400">In 3 days</Badge>
                        </div>
                        <p className="text-xs text-slate-400">Q1 Report submission</p>
                    </div>
                    <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-emerald-400">Holiday</span>
                            <Badge variant="outline" className="text-xs text-emerald-400 border-emerald-400">Jan 26</Badge>
                        </div>
                        <p className="text-xs text-slate-400">Republic Day</p>
                    </div>
                </div>
                <Button variant="ghost" size="sm" className="w-full mt-3 text-indigo-400">
                    View Full Calendar <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
            </CardContent>
        </Card>
    );
}

export function EmployeeSmartDashboard() {
    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Heart className="h-6 w-6 text-rose-400" />
                        My Dashboard
                    </h1>
                    <p className="text-slate-400">
                        Your personalized workspace with AI-powered insights
                    </p>
                </div>
            </div>

            {/* Daily Tip */}
            <DailyTipsCard />

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Left Column - Wellness */}
                <div className="lg:col-span-1 space-y-4">
                    <Suspense fallback={<LoadingCard />}>
                        <EmployeeWellness />
                    </Suspense>
                </div>

                {/* Middle Column - Calendar */}
                <div className="lg:col-span-1 space-y-4">
                    <Suspense fallback={<LoadingCard />}>
                        <SmartLeaveCalendar leaveDays={1} />
                    </Suspense>
                </div>

                {/* Right Column - Actions & Upcoming */}
                <div className="lg:col-span-1 space-y-4">
                    <QuickActionsCard />
                    <UpcomingCard />
                </div>
            </div>
        </div>
    );
}

export default EmployeeSmartDashboard;
