"use client";

import { Suspense } from "react";
import { AIInsightsDashboard } from "./ai-insights";
import { TeamInsights } from "./team-insights";
import { PredictiveAnalytics } from "./predictive-analytics";
import { SmartLeaveCalendar } from "./smart-leave-calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
    Brain, 
    Users, 
    LineChart, 
    Calendar,
    Sparkles
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

export function HRSmartDashboard() {
    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Sparkles className="h-6 w-6 text-amber-400" />
                        AI-Powered HR Dashboard
                    </h1>
                    <p className="text-slate-400">
                        Real-time insights and predictive analytics for your team
                    </p>
                </div>
            </div>

            {/* Main Tab Content */}
            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList className="bg-slate-800/50 border border-slate-700">
                    <TabsTrigger value="overview" className="data-[state=active]:bg-indigo-500">
                        <Brain className="h-4 w-4 mr-2" />
                        Overview
                    </TabsTrigger>
                    <TabsTrigger value="team" className="data-[state=active]:bg-indigo-500">
                        <Users className="h-4 w-4 mr-2" />
                        Team Status
                    </TabsTrigger>
                    <TabsTrigger value="analytics" className="data-[state=active]:bg-indigo-500">
                        <LineChart className="h-4 w-4 mr-2" />
                        Analytics
                    </TabsTrigger>
                    <TabsTrigger value="calendar" className="data-[state=active]:bg-indigo-500">
                        <Calendar className="h-4 w-4 mr-2" />
                        Smart Calendar
                    </TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-4">
                    <Suspense fallback={<LoadingCard />}>
                        <AIInsightsDashboard />
                    </Suspense>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <Suspense fallback={<LoadingCard />}>
                            <TeamInsights />
                        </Suspense>
                        <Suspense fallback={<LoadingCard />}>
                            <SmartLeaveCalendar />
                        </Suspense>
                    </div>
                </TabsContent>

                {/* Team Tab */}
                <TabsContent value="team" className="space-y-4">
                    <Suspense fallback={<LoadingCard />}>
                        <TeamInsights />
                    </Suspense>
                </TabsContent>

                {/* Analytics Tab */}
                <TabsContent value="analytics" className="space-y-4">
                    <Suspense fallback={<LoadingCard />}>
                        <PredictiveAnalytics />
                    </Suspense>
                </TabsContent>

                {/* Calendar Tab */}
                <TabsContent value="calendar" className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <Suspense fallback={<LoadingCard />}>
                            <SmartLeaveCalendar leaveDays={1} />
                        </Suspense>
                        <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Calendar className="h-5 w-5 text-indigo-400" />
                                    Team Calendar View
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-slate-400 text-sm">
                                    Full team calendar visualization with leave overlay.
                                    Click on the smart calendar dates to see optimal leave recommendations.
                                </p>
                                <div className="mt-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                                    <div className="flex items-center justify-between text-sm mb-2">
                                        <span className="text-slate-400">This Week</span>
                                        <span className="text-indigo-400 font-medium">3 on leave</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm mb-2">
                                        <span className="text-slate-400">Next Week</span>
                                        <span className="text-emerald-400 font-medium">1 on leave</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-400">Pending Requests</span>
                                        <span className="text-amber-400 font-medium">2 pending</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}

export default HRSmartDashboard;
