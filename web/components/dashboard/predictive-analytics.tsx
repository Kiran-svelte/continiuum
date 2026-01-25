"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
    TrendingUp,
    TrendingDown,
    LineChart as LineChartIcon,
    AlertTriangle,
    RefreshCw,
    Calendar,
    Users,
    ChevronRight,
    Activity
} from "lucide-react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    BarChart,
    Bar,
    AreaChart,
    Area
} from 'recharts';
import { getPredictiveAnalytics, type PredictiveData, type BurnoutRisk } from "@/app/actions/ai-features";

function BurnoutRiskCard({ risk }: { risk: BurnoutRisk }) {
    const riskColors = {
        high: { bg: "bg-red-500/20", border: "border-red-500/30", text: "text-red-400", badge: "bg-red-500" },
        medium: { bg: "bg-amber-500/20", border: "border-amber-500/30", text: "text-amber-400", badge: "bg-amber-500" },
        low: { bg: "bg-blue-500/20", border: "border-blue-500/30", text: "text-blue-400", badge: "bg-blue-500" },
    };
    
    const colors = riskColors[risk.riskLevel];

    return (
        <div className={`p-3 rounded-lg ${colors.bg} border ${colors.border}`}>
            <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full ${colors.badge} flex items-center justify-center text-white text-xs font-bold`}>
                        {risk.riskScore}
                    </div>
                    <div>
                        <div className="font-medium text-sm">{risk.employeeName}</div>
                        <div className={`text-xs ${colors.text}`}>{risk.riskLevel.toUpperCase()} RISK</div>
                    </div>
                </div>
            </div>
            
            <div className="space-y-1 mb-2">
                {risk.factors.map((factor, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-slate-400">
                        <AlertTriangle className="h-3 w-3" />
                        {factor}
                    </div>
                ))}
            </div>
            
            <div className="p-2 bg-slate-800/50 rounded text-xs text-slate-300">
                💡 {risk.recommendation}
            </div>
        </div>
    );
}

export function PredictiveAnalytics() {
    const [predictions, setPredictions] = useState<PredictiveData[]>([]);
    const [seasonalPatterns, setSeasonalPatterns] = useState<{ month: string; avgLeaves: number }[]>([]);
    const [burnoutRisks, setBurnoutRisks] = useState<BurnoutRisk[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        
        const result = await getPredictiveAnalytics();
        
        if (result.success) {
            setPredictions(result.predictions || []);
            setSeasonalPatterns(result.seasonalPatterns || []);
            setBurnoutRisks(result.burnoutRisks || []);
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
                    <div className="h-64 bg-slate-800 rounded mb-4"></div>
                    <div className="grid grid-cols-3 gap-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-32 bg-slate-800 rounded"></div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Calculate summary stats
    const currentMonth = new Date().getMonth();
    const predictedNextMonth = predictions[currentMonth + 1]?.predicted || 0;
    const actualThisMonth = predictions[currentMonth]?.actual || 0;
    const trend = predictedNextMonth > actualThisMonth ? 'up' : predictedNextMonth < actualThisMonth ? 'down' : 'stable';
    
    const highRiskCount = burnoutRisks.filter(r => r.riskLevel === 'high').length;

    return (
        <div className="space-y-4">
            {/* Main Chart Card */}
            <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div>
                        <CardTitle className="text-lg font-semibold flex items-center gap-2">
                            <LineChartIcon className="h-5 w-5 text-indigo-400" />
                            Leave Trend Forecast
                        </CardTitle>
                        <CardDescription>Predicted vs actual leave patterns</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className={trend === 'up' ? 'text-amber-400 border-amber-400' : 'text-emerald-400 border-emerald-400'}>
                            {trend === 'up' ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                            {trend === 'up' ? 'Increasing' : 'Decreasing'}
                        </Badge>
                        <Button variant="ghost" size="icon" onClick={loadData}>
                            <RefreshCw className="h-4 w-4" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {/* Stats Row */}
                    <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                            <div className="text-xs text-slate-400 mb-1">This Month (Actual)</div>
                            <div className="text-2xl font-bold text-indigo-400">{actualThisMonth}</div>
                        </div>
                        <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                            <div className="text-xs text-slate-400 mb-1">Next Month (Predicted)</div>
                            <div className="text-2xl font-bold text-purple-400">{predictedNextMonth}</div>
                        </div>
                        <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                            <div className="text-xs text-slate-400 mb-1">Burnout Alerts</div>
                            <div className={`text-2xl font-bold ${highRiskCount > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                {highRiskCount}
                            </div>
                        </div>
                    </div>
                    
                    {/* Line Chart */}
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={predictions}>
                                <defs>
                                    <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                <XAxis 
                                    dataKey="month" 
                                    stroke="#64748b"
                                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                                />
                                <YAxis 
                                    stroke="#64748b"
                                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                                />
                                <Tooltip 
                                    contentStyle={{ 
                                        backgroundColor: '#1e293b', 
                                        border: '1px solid #334155',
                                        borderRadius: '8px'
                                    }}
                                    labelStyle={{ color: '#f1f5f9' }}
                                />
                                <Legend />
                                <Area 
                                    type="monotone" 
                                    dataKey="predicted" 
                                    stroke="#8b5cf6" 
                                    fillOpacity={1}
                                    fill="url(#colorPredicted)"
                                    strokeWidth={2}
                                    name="Predicted"
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="actual" 
                                    stroke="#10b981" 
                                    fillOpacity={1}
                                    fill="url(#colorActual)"
                                    strokeWidth={2}
                                    name="Actual"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Seasonal Patterns */}
                <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-semibold flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-blue-400" />
                            Seasonal Patterns
                        </CardTitle>
                        <CardDescription>Monthly leave distribution (last year)</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-48">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={seasonalPatterns}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                    <XAxis 
                                        dataKey="month" 
                                        stroke="#64748b"
                                        tick={{ fill: '#94a3b8', fontSize: 10 }}
                                    />
                                    <YAxis 
                                        stroke="#64748b"
                                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                                    />
                                    <Tooltip 
                                        contentStyle={{ 
                                            backgroundColor: '#1e293b', 
                                            border: '1px solid #334155',
                                            borderRadius: '8px'
                                        }}
                                    />
                                    <Bar 
                                        dataKey="avgLeaves" 
                                        fill="#6366f1" 
                                        radius={[4, 4, 0, 0]}
                                        name="Leaves"
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Burnout Risk Monitor */}
                <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                    <Activity className="h-5 w-5 text-red-400" />
                                    Burnout Risk Monitor
                                </CardTitle>
                                <CardDescription>Employees needing attention</CardDescription>
                            </div>
                            {highRiskCount > 0 && (
                                <Badge className="bg-red-500/20 text-red-400 border border-red-500/30">
                                    {highRiskCount} high risk
                                </Badge>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        {burnoutRisks.length === 0 ? (
                            <div className="text-center py-8 text-slate-400">
                                <Users className="h-12 w-12 mx-auto mb-3 text-emerald-500/50" />
                                <p>No burnout risks detected</p>
                                <p className="text-xs mt-1">Your team is healthy!</p>
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2">
                                {burnoutRisks.slice(0, 5).map((risk) => (
                                    <BurnoutRiskCard key={risk.employeeId} risk={risk} />
                                ))}
                            </div>
                        )}
                        
                        {burnoutRisks.length > 5 && (
                            <Button variant="ghost" size="sm" className="w-full mt-3 text-indigo-400">
                                View All ({burnoutRisks.length}) <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export default PredictiveAnalytics;
