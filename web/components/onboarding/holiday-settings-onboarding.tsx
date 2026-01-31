"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
    Calendar,
    Globe,
    Plus,
    Trash2,
    Info,
    AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// Common country codes
const COUNTRIES = [
    { code: "IN", name: "India" },
    { code: "US", name: "United States" },
    { code: "GB", name: "United Kingdom" },
    { code: "CA", name: "Canada" },
    { code: "AU", name: "Australia" },
    { code: "SG", name: "Singapore" },
    { code: "AE", name: "United Arab Emirates" },
    { code: "DE", name: "Germany" },
    { code: "FR", name: "France" },
    { code: "JP", name: "Japan" },
];

export interface HolidaySettingsData {
    holiday_mode: "auto" | "manual";
    country_code: string;
    custom_holidays: Array<{ date: string; name: string }>;
}

interface HolidaySettingsOnboardingProps {
    settings: HolidaySettingsData;
    onSettingsChange: (settings: HolidaySettingsData) => void;
}

export function HolidaySettingsOnboarding({
    settings,
    onSettingsChange,
}: HolidaySettingsOnboardingProps) {
    const [newHoliday, setNewHoliday] = useState({ date: "", name: "" });

    const handleModeChange = (mode: "auto" | "manual") => {
        onSettingsChange({ ...settings, holiday_mode: mode });
    };

    const handleCountryChange = (code: string) => {
        onSettingsChange({ ...settings, country_code: code });
    };

    const addCustomHoliday = () => {
        if (!newHoliday.date || !newHoliday.name) return;
        
        const exists = settings.custom_holidays.some(h => h.date === newHoliday.date);
        if (exists) return;

        onSettingsChange({
            ...settings,
            custom_holidays: [...settings.custom_holidays, { ...newHoliday }],
        });
        setNewHoliday({ date: "", name: "" });
    };

    const removeCustomHoliday = (date: string) => {
        onSettingsChange({
            ...settings,
            custom_holidays: settings.custom_holidays.filter(h => h.date !== date),
        });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="text-center space-y-2">
                <h3 className="text-xl font-semibold">Holiday Calendar Settings</h3>
                <p className="text-muted-foreground text-sm">
                    Configure how holidays are handled for leave requests
                </p>
            </div>

            {/* Holiday Mode Selection */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Holiday Mode
                    </CardTitle>
                    <CardDescription>
                        Choose how public holidays are treated
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <RadioGroup
                        value={settings.holiday_mode}
                        onValueChange={(v) => handleModeChange(v as "auto" | "manual")}
                        className="space-y-3"
                    >
                        <div
                            className={cn(
                                "flex items-start space-x-3 p-4 rounded-lg border cursor-pointer transition-all",
                                settings.holiday_mode === "auto"
                                    ? "border-primary bg-primary/5"
                                    : "border-muted hover:border-primary/50"
                            )}
                            onClick={() => handleModeChange("auto")}
                        >
                            <RadioGroupItem value="auto" id="auto" className="mt-1" />
                            <div className="flex-1">
                                <Label htmlFor="auto" className="font-medium cursor-pointer">
                                    Automatic Mode
                                </Label>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Employees <strong>cannot</strong> request leave on public holidays.
                                    The system automatically blocks these dates.
                                </p>
                                <Badge variant="secondary" className="mt-2">Recommended</Badge>
                            </div>
                        </div>

                        <div
                            className={cn(
                                "flex items-start space-x-3 p-4 rounded-lg border cursor-pointer transition-all",
                                settings.holiday_mode === "manual"
                                    ? "border-primary bg-primary/5"
                                    : "border-muted hover:border-primary/50"
                            )}
                            onClick={() => handleModeChange("manual")}
                        >
                            <RadioGroupItem value="manual" id="manual" className="mt-1" />
                            <div className="flex-1">
                                <Label htmlFor="manual" className="font-medium cursor-pointer">
                                    Manual Mode
                                </Label>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Employees <strong>can</strong> request leave on holidays.
                                    Useful if some staff work on holidays.
                                </p>
                            </div>
                        </div>
                    </RadioGroup>
                </CardContent>
            </Card>

            {/* Country Selection */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Globe className="h-5 w-5" />
                        Country for Public Holidays
                    </CardTitle>
                    <CardDescription>
                        Select your country to auto-fetch public holidays
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Select value={settings.country_code} onValueChange={handleCountryChange}>
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                        <SelectContent>
                            {COUNTRIES.map((country) => (
                                <SelectItem key={country.code} value={country.code}>
                                    {country.name} ({country.code})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-2">
                        Public holidays for {COUNTRIES.find(c => c.code === settings.country_code)?.name || settings.country_code} will be automatically loaded
                    </p>
                </CardContent>
            </Card>

            {/* Custom Holidays */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Plus className="h-5 w-5" />
                        Custom Holidays (Optional)
                    </CardTitle>
                    <CardDescription>
                        Add company-specific holidays like foundation day
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Add new holiday */}
                    <div className="flex gap-2">
                        <div className="flex-1">
                            <Input
                                type="date"
                                value={newHoliday.date}
                                onChange={(e) => setNewHoliday({ ...newHoliday, date: e.target.value })}
                                placeholder="Date"
                            />
                        </div>
                        <div className="flex-[2]">
                            <Input
                                value={newHoliday.name}
                                onChange={(e) => setNewHoliday({ ...newHoliday, name: e.target.value })}
                                placeholder="Holiday name"
                            />
                        </div>
                        <Button
                            onClick={addCustomHoliday}
                            disabled={!newHoliday.date || !newHoliday.name}
                        >
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Custom holidays list */}
                    {settings.custom_holidays.length > 0 ? (
                        <div className="space-y-2">
                            {settings.custom_holidays.map((holiday) => (
                                <motion.div
                                    key={holiday.date}
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                                >
                                    <div>
                                        <span className="font-medium">{holiday.name}</span>
                                        <span className="text-muted-foreground ml-2 text-sm">
                                            {new Date(holiday.date).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeCustomHoliday(holiday.date)}
                                    >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </motion.div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">
                            No custom holidays added. You can add them later.
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* Info */}
            <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                <div className="text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">How holidays work</p>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                        <li>Public holidays are fetched automatically for your selected country</li>
                        <li>Custom holidays are added to the public holiday list</li>
                        <li>You can manage holidays anytime in HR Settings</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}

export default HolidaySettingsOnboarding;
