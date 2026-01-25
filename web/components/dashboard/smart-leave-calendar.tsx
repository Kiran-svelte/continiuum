"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
    Calendar,
    ChevronLeft,
    ChevronRight,
    Star,
    Users,
    AlertCircle,
    CheckCircle,
    Sparkles,
    RefreshCw
} from "lucide-react";
import { getSmartCalendarSuggestions, type SmartCalendarSuggestion } from "@/app/actions/ai-features";

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
    'July', 'August', 'September', 'October', 'November', 'December'];

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getScoreColor(score: number) {
    if (score >= 85) return "bg-emerald-500";
    if (score >= 70) return "bg-blue-500";
    if (score >= 50) return "bg-amber-500";
    return "bg-red-500";
}

function getScoreBg(score: number) {
    if (score >= 85) return "bg-emerald-500/20 border-emerald-500/30 hover:bg-emerald-500/30";
    if (score >= 70) return "bg-blue-500/20 border-blue-500/30 hover:bg-blue-500/30";
    if (score >= 50) return "bg-amber-500/20 border-amber-500/30 hover:bg-amber-500/30";
    return "bg-red-500/20 border-red-500/30 hover:bg-red-500/30";
}

type CalendarDay = {
    date: Date;
    day: number;
    isCurrentMonth: boolean;
    isToday: boolean;
    suggestion?: SmartCalendarSuggestion;
};

export function SmartLeaveCalendar({ leaveDays = 1 }: { leaveDays?: number }) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [suggestions, setSuggestions] = useState<SmartCalendarSuggestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState<SmartCalendarSuggestion | null>(null);

    const loadSuggestions = async (month?: number) => {
        setLoading(true);
        const result = await getSmartCalendarSuggestions(leaveDays, month);
        if (result.success && result.suggestions) {
            setSuggestions(result.suggestions);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadSuggestions();
    }, [leaveDays]);

    // Generate calendar days
    const generateCalendarDays = (): CalendarDay[] => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        
        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);
        const startDate = new Date(firstDayOfMonth);
        startDate.setDate(startDate.getDate() - firstDayOfMonth.getDay());
        
        const days: CalendarDay[] = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        for (let i = 0; i < 42; i++) {
            const date = new Date(startDate);
            date.setDate(date.getDate() + i);
            
            const dateStr = date.toISOString().split('T')[0];
            const suggestion = suggestions.find(s => s.date === dateStr);
            
            days.push({
                date,
                day: date.getDate(),
                isCurrentMonth: date.getMonth() === month,
                isToday: date.getTime() === today.getTime(),
                suggestion
            });
        }
        
        return days;
    };

    const calendarDays = generateCalendarDays();

    const prevMonth = () => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() - 1);
        setCurrentDate(newDate);
    };

    const nextMonth = () => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + 1);
        setCurrentDate(newDate);
    };

    return (
        <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-lg font-semibold flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-amber-400" />
                            Smart Leave Calendar
                        </CardTitle>
                        <CardDescription>AI-suggested optimal dates for leave</CardDescription>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => loadSuggestions()}>
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {/* Month Navigation */}
                <div className="flex items-center justify-between mb-4">
                    <Button variant="ghost" size="icon" onClick={prevMonth}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="font-semibold">
                        {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                    </span>
                    <Button variant="ghost" size="icon" onClick={nextMonth}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>

                {/* Day Headers */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                    {dayNames.map(day => (
                        <div key={day} className="text-center text-xs text-slate-400 font-medium py-1">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1">
                    {calendarDays.map((day, idx) => {
                        const hasRecommendation = day.suggestion && day.suggestion.score >= 50;
                        
                        return (
                            <button
                                key={idx}
                                onClick={() => hasRecommendation && setSelectedDate(day.suggestion!)}
                                disabled={!hasRecommendation}
                                className={`
                                    relative p-2 text-sm rounded-lg transition-all
                                    ${!day.isCurrentMonth ? 'text-slate-600' : 'text-slate-200'}
                                    ${day.isToday ? 'ring-2 ring-indigo-500' : ''}
                                    ${hasRecommendation 
                                        ? `border ${getScoreBg(day.suggestion!.score)} cursor-pointer` 
                                        : 'hover:bg-slate-800'}
                                `}
                            >
                                <span>{day.day}</span>
                                {hasRecommendation && (
                                    <div className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${getScoreColor(day.suggestion!.score)}`} />
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Legend */}
                <div className="flex items-center justify-center gap-4 mt-4 text-xs">
                    <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-slate-400">Excellent</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                        <span className="text-slate-400">Good</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-amber-500" />
                        <span className="text-slate-400">Fair</span>
                    </div>
                </div>

                {/* Selected Date Details */}
                {selectedDate && (
                    <div className="mt-4 p-3 rounded-lg bg-slate-800 border border-slate-700">
                        <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">
                                {new Date(selectedDate.date).toLocaleDateString('en-US', { 
                                    weekday: 'long', 
                                    month: 'short', 
                                    day: 'numeric' 
                                })}
                            </span>
                            <Badge className={getScoreBg(selectedDate.score)}>
                                Score: {selectedDate.score}
                            </Badge>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm text-slate-400 mb-2">
                            <Users className="h-4 w-4" />
                            <span>Team Availability: {selectedDate.teamAvailability}%</span>
                        </div>
                        
                        <p className="text-sm text-slate-300">{selectedDate.reason}</p>
                        
                        {selectedDate.conflicts.length > 0 && (
                            <div className="mt-2 space-y-1">
                                {selectedDate.conflicts.map((conflict, i) => (
                                    <div key={i} className="flex items-center gap-2 text-xs text-amber-400">
                                        <AlertCircle className="h-3 w-3" />
                                        {conflict}
                                    </div>
                                ))}
                            </div>
                        )}
                        
                        <Button size="sm" className="w-full mt-3" variant="outline">
                            Apply for Leave on This Date
                        </Button>
                    </div>
                )}

                {/* Top Suggestions */}
                <div className="mt-4">
                    <h4 className="text-sm font-medium text-slate-400 mb-2 flex items-center gap-2">
                        <Star className="h-4 w-4 text-amber-400" />
                        Top Recommended Dates
                    </h4>
                    <div className="space-y-2">
                        {suggestions.slice(0, 3).map((suggestion, idx) => (
                            <button
                                key={suggestion.date}
                                onClick={() => setSelectedDate(suggestion)}
                                className={`w-full p-2 rounded-lg border flex items-center justify-between transition-all ${getScoreBg(suggestion.score)}`}
                            >
                                <div className="flex items-center gap-2">
                                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${getScoreColor(suggestion.score)} text-white`}>
                                        {idx + 1}
                                    </span>
                                    <span className="text-sm">
                                        {new Date(suggestion.date).toLocaleDateString('en-US', { 
                                            weekday: 'short', 
                                            month: 'short', 
                                            day: 'numeric' 
                                        })}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1 text-xs text-slate-400">
                                        <Users className="h-3 w-3" />
                                        {suggestion.teamAvailability}%
                                    </div>
                                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export default SmartLeaveCalendar;
