"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
    Heart,
    Activity,
    Moon,
    Sun,
    Brain,
    TrendingUp,
    TrendingDown,
    Lightbulb,
    RefreshCw,
    CheckCircle,
    AlertTriangle
} from "lucide-react";
import { getEmployeeWellness, type WellnessScore } from "@/app/actions/ai-features";

function WellnessGauge({ value, label, icon: Icon, color }: { value: number; label: string; icon: any; color: string }) {
    const getColor = (val: number) => {
        if (val >= 80) return "text-emerald-500";
        if (val >= 60) return "text-amber-500";
        return "text-red-500";
    };

    const getProgressColor = (val: number) => {
        if (val >= 80) return "bg-emerald-500";
        if (val >= 60) return "bg-amber-500";
        return "bg-red-500";
    };

    return (
        <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
            <div className="flex items-center gap-2 mb-3">
                <Icon className={`h-4 w-4 ${color}`} />
                <span className="text-sm text-slate-400">{label}</span>
            </div>
            <div className="flex items-end gap-2 mb-2">
                <span className={`text-2xl font-bold ${getColor(value)}`}>{value}</span>
                <span className="text-xs text-slate-500 mb-1">/100</span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div 
                    className={`h-full rounded-full transition-all duration-700 ${getProgressColor(value)}`}
                    style={{ width: `${value}%` }}
                />
            </div>
        </div>
    );
}

export function EmployeeWellness() {
    const [wellness, setWellness] = useState<WellnessScore | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        
        const result = await getEmployeeWellness();
        
        if (result.success && result.wellness) {
            setWellness(result.wellness);
        } else {
            setError(result.error || "Failed to load");
        }
        
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    if (loading) {
        return (
            <Card className="bg-slate-900 border-slate-700 animate-pulse">
                <CardHeader>
                    <div className="h-6 bg-slate-700 rounded w-1/3"></div>
                </CardHeader>
                <CardContent>
                    <div className="h-32 bg-slate-800 rounded mb-4"></div>
                    <div className="grid grid-cols-2 gap-3">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-24 bg-slate-800 rounded"></div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (error || !wellness) {
        return (
            <Card className="bg-red-500/10 border-red-500/30">
                <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                        <p className="text-red-400">{error || "No wellness data"}</p>
                        <Button variant="outline" size="sm" onClick={loadData}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Retry
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const getOverallStatus = (score: number) => {
        if (score >= 80) return { label: "Excellent", color: "text-emerald-400", icon: CheckCircle };
        if (score >= 60) return { label: "Good", color: "text-blue-400", icon: TrendingUp };
        if (score >= 40) return { label: "Fair", color: "text-amber-400", icon: TrendingDown };
        return { label: "Needs Attention", color: "text-red-400", icon: AlertTriangle };
    };

    const status = getOverallStatus(wellness.overall);
    const StatusIcon = status.icon;

    return (
        <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                        <Heart className="h-5 w-5 text-rose-400" />
                        Your Wellness Score
                    </CardTitle>
                    <CardDescription>AI-powered health & balance analysis</CardDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={loadData}>
                    <RefreshCw className="h-4 w-4" />
                </Button>
            </CardHeader>
            <CardContent>
                {/* Overall Score Circle */}
                <div className="flex items-center justify-center mb-6">
                    <div className="relative w-36 h-36">
                        {/* Background circle */}
                        <svg className="w-36 h-36 transform -rotate-90">
                            <circle
                                cx="72"
                                cy="72"
                                r="64"
                                stroke="currentColor"
                                strokeWidth="10"
                                fill="none"
                                className="text-slate-700"
                            />
                            <circle
                                cx="72"
                                cy="72"
                                r="64"
                                stroke="currentColor"
                                strokeWidth="10"
                                fill="none"
                                strokeDasharray={`${wellness.overall * 4.02} 402`}
                                strokeLinecap="round"
                                className={status.color}
                                style={{ transition: 'stroke-dasharray 1s ease-out' }}
                            />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center flex-col">
                            <span className={`text-4xl font-bold ${status.color}`}>
                                {wellness.overall}
                            </span>
                            <div className="flex items-center gap-1 mt-1">
                                <StatusIcon className={`h-4 w-4 ${status.color}`} />
                                <span className={`text-sm ${status.color}`}>{status.label}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Metric Grid */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                    <WellnessGauge 
                        value={wellness.workLifeBalance} 
                        label="Work-Life Balance" 
                        icon={Sun} 
                        color="text-amber-400"
                    />
                    <WellnessGauge 
                        value={wellness.leaveUtilization} 
                        label="Leave Utilization" 
                        icon={Moon} 
                        color="text-indigo-400"
                    />
                    <WellnessGauge 
                        value={wellness.attendanceHealth} 
                        label="Attendance Health" 
                        icon={Activity} 
                        color="text-emerald-400"
                    />
                    <WellnessGauge 
                        value={wellness.stressIndicator} 
                        label="Stress Level" 
                        icon={Brain} 
                        color="text-rose-400"
                    />
                </div>

                {/* Recommendations */}
                <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                    <h4 className="text-sm font-medium flex items-center gap-2 mb-3">
                        <Lightbulb className="h-4 w-4 text-amber-400" />
                        AI Recommendations
                    </h4>
                    <div className="space-y-2">
                        {wellness.recommendations.map((rec, i) => (
                            <div 
                                key={i} 
                                className="flex items-start gap-2 text-sm text-slate-300"
                            >
                                <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs flex-shrink-0">
                                    {i + 1}
                                </span>
                                {rec}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Quick Tips */}
                <div className="mt-4 grid grid-cols-3 gap-2">
                    <Button variant="outline" size="sm" className="text-xs">
                        📅 Plan Leave
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs">
                        🏃 Take Break
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs">
                        📊 View Stats
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

export default EmployeeWellness;
