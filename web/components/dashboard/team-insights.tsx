"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
    Users, 
    Building2, 
    UserCheck, 
    UserX,
    Clock,
    AlertTriangle,
    RefreshCw,
    ChevronRight
} from "lucide-react";
import { getTeamInsights, type DepartmentInsight } from "@/app/actions/ai-features";

function DepartmentCard({ dept }: { dept: DepartmentInsight }) {
    const getCoverageColor = (coverage: number) => {
        if (coverage >= 80) return "text-emerald-500";
        if (coverage >= 60) return "text-amber-500";
        return "text-red-500";
    };

    const getCoverageBg = (coverage: number) => {
        if (coverage >= 80) return "bg-emerald-500";
        if (coverage >= 60) return "bg-amber-500";
        return "bg-red-500";
    };

    return (
        <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 hover:bg-slate-800 transition-colors">
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-indigo-400" />
                    <span className="font-medium">{dept.department}</span>
                </div>
                <Badge 
                    variant="outline" 
                    className={`${getCoverageColor(dept.coveragePercent)} border-current`}
                >
                    {dept.coveragePercent}% coverage
                </Badge>
            </div>
            
            <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="text-center">
                    <div className="text-lg font-semibold">{dept.headcount}</div>
                    <div className="text-xs text-slate-400">Total</div>
                </div>
                <div className="text-center">
                    <div className="text-lg font-semibold text-amber-400">{dept.onLeaveToday}</div>
                    <div className="text-xs text-slate-400">On Leave</div>
                </div>
                <div className="text-center">
                    <div className="text-lg font-semibold text-emerald-400">{dept.headcount - dept.onLeaveToday}</div>
                    <div className="text-xs text-slate-400">Available</div>
                </div>
            </div>
            
            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden mb-2">
                <div 
                    className={`h-full rounded-full transition-all duration-500 ${getCoverageBg(dept.coveragePercent)}`}
                    style={{ width: `${dept.coveragePercent}%` }}
                />
            </div>
            
            <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Avg Balance: {dept.avgLeaveBalance} days</span>
                {dept.burnoutRiskCount > 0 && (
                    <span className="flex items-center gap-1 text-amber-400">
                        <AlertTriangle className="h-3 w-3" />
                        {dept.burnoutRiskCount} at risk
                    </span>
                )}
            </div>
        </div>
    );
}

function TodayOverview({ overview }: { overview: { totalPresent: number; totalOnLeave: number; totalAbsent: number; coverage: number } }) {
    const total = overview.totalPresent + overview.totalOnLeave + overview.totalAbsent;
    
    return (
        <div className="grid grid-cols-4 gap-3 mb-4">
            <div className="p-3 rounded-lg bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30">
                <div className="flex items-center gap-2 mb-1">
                    <UserCheck className="h-4 w-4 text-emerald-400" />
                    <span className="text-xs text-slate-400">Present</span>
                </div>
                <div className="text-2xl font-bold text-emerald-400">{overview.totalPresent}</div>
            </div>
            
            <div className="p-3 rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30">
                <div className="flex items-center gap-2 mb-1">
                    <Clock className="h-4 w-4 text-amber-400" />
                    <span className="text-xs text-slate-400">On Leave</span>
                </div>
                <div className="text-2xl font-bold text-amber-400">{overview.totalOnLeave}</div>
            </div>
            
            <div className="p-3 rounded-lg bg-gradient-to-br from-red-500/20 to-red-600/10 border border-red-500/30">
                <div className="flex items-center gap-2 mb-1">
                    <UserX className="h-4 w-4 text-red-400" />
                    <span className="text-xs text-slate-400">Absent</span>
                </div>
                <div className="text-2xl font-bold text-red-400">{overview.totalAbsent}</div>
            </div>
            
            <div className="p-3 rounded-lg bg-gradient-to-br from-indigo-500/20 to-indigo-600/10 border border-indigo-500/30">
                <div className="flex items-center gap-2 mb-1">
                    <Users className="h-4 w-4 text-indigo-400" />
                    <span className="text-xs text-slate-400">Coverage</span>
                </div>
                <div className="text-2xl font-bold text-indigo-400">{overview.coverage}%</div>
            </div>
        </div>
    );
}

export function TeamInsights() {
    const [departments, setDepartments] = useState<DepartmentInsight[]>([]);
    const [todayOverview, setTodayOverview] = useState<{
        totalPresent: number;
        totalOnLeave: number;
        totalAbsent: number;
        coverage: number;
    } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        
        const result = await getTeamInsights();
        
        if (result.success) {
            setDepartments(result.departments || []);
            setTodayOverview(result.todayOverview || null);
        } else {
            setError(result.error || "Failed to load");
        }
        
        setLoading(false);
    };

    useEffect(() => {
        loadData();
        
        // Refresh every 2 minutes
        const interval = setInterval(loadData, 2 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <Card className="bg-slate-900 border-slate-700 animate-pulse">
                <CardHeader>
                    <div className="h-6 bg-slate-700 rounded w-1/3"></div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-4 gap-3 mb-4">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-20 bg-slate-800 rounded"></div>
                        ))}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        {[1, 2].map(i => (
                            <div key={i} className="h-32 bg-slate-800 rounded"></div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                        <Users className="h-5 w-5 text-blue-400" />
                        Team Insights
                    </CardTitle>
                    <CardDescription>Real-time team availability & coverage</CardDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={loadData}>
                    <RefreshCw className="h-4 w-4" />
                </Button>
            </CardHeader>
            <CardContent>
                {/* Today's Overview */}
                {todayOverview && <TodayOverview overview={todayOverview} />}
                
                {/* Department Grid */}
                <h4 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Department Breakdown
                </h4>
                
                {departments.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                        <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>No department data available</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2">
                        {departments.map((dept) => (
                            <DepartmentCard key={dept.department} dept={dept} />
                        ))}
                    </div>
                )}
                
                {/* Quick Stats */}
                <div className="mt-4 p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm">
                            <AlertTriangle className="h-4 w-4 text-amber-400" />
                            <span className="text-slate-400">
                                Departments below 70% coverage: {' '}
                                <span className="font-semibold text-amber-400">
                                    {departments.filter(d => d.coveragePercent < 70).length}
                                </span>
                            </span>
                        </div>
                        <Button variant="ghost" size="sm" className="text-indigo-400">
                            View Details <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export default TeamInsights;
