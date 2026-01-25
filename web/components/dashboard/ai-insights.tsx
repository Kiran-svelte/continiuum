"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
    AlertTriangle, 
    CheckCircle, 
    Info, 
    Zap, 
    TrendingUp, 
    TrendingDown, 
    Minus,
    ArrowRight,
    RefreshCw,
    Brain,
    Activity
} from "lucide-react";
import { getAIInsights, type AIInsight, type TeamHealthMetrics } from "@/app/actions/ai-features";

// Insight type to icon/color mapping
const insightConfig = {
    warning: { icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/30" },
    success: { icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
    info: { icon: Info, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/30" },
    action: { icon: Zap, color: "text-purple-500", bg: "bg-purple-500/10", border: "border-purple-500/30" },
};

const priorityBadge = {
    high: "bg-red-500/20 text-red-400 border-red-500/30",
    medium: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    low: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

function TeamHealthScore({ metrics }: { metrics: TeamHealthMetrics }) {
    const TrendIcon = metrics.trend === 'up' ? TrendingUp : metrics.trend === 'down' ? TrendingDown : Minus;
    const trendColor = metrics.trend === 'up' ? 'text-emerald-500' : metrics.trend === 'down' ? 'text-red-500' : 'text-slate-400';
    
    const getScoreColor = (score: number) => {
        if (score >= 80) return "text-emerald-500";
        if (score >= 60) return "text-amber-500";
        return "text-red-500";
    };

    const getProgressColor = (score: number) => {
        if (score >= 80) return "bg-emerald-500";
        if (score >= 60) return "bg-amber-500";
        return "bg-red-500";
    };

    return (
        <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                        <Activity className="h-5 w-5 text-indigo-400" />
                        Team Health Score
                    </CardTitle>
                    <div className={`flex items-center gap-1 ${trendColor}`}>
                        <TrendIcon className="h-4 w-4" />
                        <span className="text-xs font-medium">{metrics.trend}</span>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {/* Main Score Circle */}
                <div className="flex items-center justify-center mb-6">
                    <div className="relative w-32 h-32">
                        <svg className="w-32 h-32 transform -rotate-90">
                            <circle
                                cx="64"
                                cy="64"
                                r="56"
                                stroke="currentColor"
                                strokeWidth="8"
                                fill="none"
                                className="text-slate-700"
                            />
                            <circle
                                cx="64"
                                cy="64"
                                r="56"
                                stroke="currentColor"
                                strokeWidth="8"
                                fill="none"
                                strokeDasharray={`${metrics.overallScore * 3.52} 352`}
                                strokeLinecap="round"
                                className={getScoreColor(metrics.overallScore)}
                            />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center flex-col">
                            <span className={`text-3xl font-bold ${getScoreColor(metrics.overallScore)}`}>
                                {metrics.overallScore}
                            </span>
                            <span className="text-xs text-slate-400">/ 100</span>
                        </div>
                    </div>
                </div>

                {/* Metric Breakdown */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-400">Attendance</span>
                        <div className="flex items-center gap-2 w-1/2">
                            <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full rounded-full transition-all duration-500 ${getProgressColor(metrics.attendance)}`}
                                    style={{ width: `${metrics.attendance}%` }}
                                />
                            </div>
                            <span className="text-sm font-medium w-8">{metrics.attendance}%</span>
                        </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-400">Leave Balance</span>
                        <div className="flex items-center gap-2 w-1/2">
                            <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full rounded-full transition-all duration-500 ${getProgressColor(metrics.leaveBalance)}`}
                                    style={{ width: `${metrics.leaveBalance}%` }}
                                />
                            </div>
                            <span className="text-sm font-medium w-8">{metrics.leaveBalance}%</span>
                        </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-400">Team Morale</span>
                        <div className="flex items-center gap-2 w-1/2">
                            <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full rounded-full transition-all duration-500 ${getProgressColor(metrics.teamMorale)}`}
                                    style={{ width: `${metrics.teamMorale}%` }}
                                />
                            </div>
                            <span className="text-sm font-medium w-8">{metrics.teamMorale}%</span>
                        </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-400">Burnout Risk</span>
                        <div className="flex items-center gap-2 w-1/2">
                            <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full rounded-full transition-all duration-500 ${getProgressColor(100 - metrics.burnoutRisk)}`}
                                    style={{ width: `${metrics.burnoutRisk}%` }}
                                />
                            </div>
                            <span className="text-sm font-medium w-8">{metrics.burnoutRisk}%</span>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function InsightCard({ insight }: { insight: AIInsight }) {
    const config = insightConfig[insight.type];
    const Icon = config.icon;

    return (
        <div className={`p-4 rounded-lg border ${config.bg} ${config.border} transition-all duration-200 hover:scale-[1.02]`}>
            <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${config.bg}`}>
                    <Icon className={`h-5 w-5 ${config.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm">{insight.title}</h4>
                        <Badge variant="outline" className={`text-xs ${priorityBadge[insight.priority]}`}>
                            {insight.priority}
                        </Badge>
                    </div>
                    <p className="text-sm text-slate-400">{insight.message}</p>
                    {insight.actionUrl && (
                        <Button 
                            variant="link" 
                            size="sm" 
                            className={`p-0 h-auto mt-2 ${config.color}`}
                            asChild
                        >
                            <a href={insight.actionUrl}>
                                {insight.actionLabel || "View Details"} 
                                <ArrowRight className="h-3 w-3 ml-1" />
                            </a>
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}

export function AIInsightsDashboard() {
    const [insights, setInsights] = useState<AIInsight[]>([]);
    const [teamHealth, setTeamHealth] = useState<TeamHealthMetrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadInsights = async () => {
        setLoading(true);
        setError(null);
        
        const result = await getAIInsights();
        
        if (result.success) {
            setInsights(result.insights || []);
            setTeamHealth(result.teamHealth || null);
        } else {
            setError(result.error || "Failed to load insights");
        }
        
        setLoading(false);
    };

    useEffect(() => {
        loadInsights();
        
        // Refresh every 5 minutes
        const interval = setInterval(loadInsights, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className="grid gap-4 lg:grid-cols-2">
                <Card className="bg-slate-900 border-slate-700 animate-pulse">
                    <CardHeader>
                        <div className="h-6 bg-slate-700 rounded w-1/3"></div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            <div className="h-20 bg-slate-800 rounded"></div>
                            <div className="h-20 bg-slate-800 rounded"></div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-slate-900 border-slate-700 animate-pulse">
                    <CardHeader>
                        <div className="h-6 bg-slate-700 rounded w-1/3"></div>
                    </CardHeader>
                    <CardContent>
                        <div className="h-40 bg-slate-800 rounded"></div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (error) {
        return (
            <Card className="bg-red-500/10 border-red-500/30">
                <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                        <p className="text-red-400">{error}</p>
                        <Button variant="outline" size="sm" onClick={loadInsights}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Retry
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="grid gap-4 lg:grid-cols-2">
            {/* AI Insights List */}
            <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div>
                        <CardTitle className="text-lg font-semibold flex items-center gap-2">
                            <Brain className="h-5 w-5 text-purple-400" />
                            AI Insights
                        </CardTitle>
                        <CardDescription>Smart alerts based on real-time analysis</CardDescription>
                    </div>
                    <Button variant="ghost" size="icon" onClick={loadInsights}>
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                        {insights.length === 0 ? (
                            <div className="text-center py-8 text-slate-400">
                                <CheckCircle className="h-12 w-12 mx-auto mb-3 text-emerald-500/50" />
                                <p>No alerts at this time</p>
                            </div>
                        ) : (
                            insights.map((insight) => (
                                <InsightCard key={insight.id} insight={insight} />
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Team Health Score */}
            {teamHealth && <TeamHealthScore metrics={teamHealth} />}
        </div>
    );
}

export default AIInsightsDashboard;
