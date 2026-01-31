"use client";

import { motion } from "framer-motion";
import {
    Mail,
    Bell,
    LogIn,
    LogOut,
    Users,
    FileText,
    CheckCircle2,
    Info,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export interface NotificationSettingsData {
    email_checkin_reminder: boolean;
    email_checkout_reminder: boolean;
    email_hr_missing_alerts: boolean;
    email_leave_notifications: boolean;
    email_approval_reminders: boolean;
}

interface NotificationSettingsOnboardingProps {
    settings: NotificationSettingsData;
    onSettingsChange: (settings: NotificationSettingsData) => void;
}

const notificationTypes = [
    {
        key: "email_checkin_reminder" as const,
        icon: LogIn,
        iconBg: "bg-green-500/10",
        iconColor: "text-green-500",
        title: "Check-in Reminders",
        description: "Remind employees who haven't checked in after work starts",
        recommended: true,
    },
    {
        key: "email_checkout_reminder" as const,
        icon: LogOut,
        iconBg: "bg-orange-500/10",
        iconColor: "text-orange-500",
        title: "Check-out Reminders",
        description: "Remind employees to check out before leaving",
        recommended: true,
    },
    {
        key: "email_hr_missing_alerts" as const,
        icon: Users,
        iconBg: "bg-red-500/10",
        iconColor: "text-red-500",
        title: "HR Missing Check-in Alerts",
        description: "Alert HR about employees who haven't checked in",
        recommended: true,
    },
    {
        key: "email_leave_notifications" as const,
        icon: FileText,
        iconBg: "bg-blue-500/10",
        iconColor: "text-blue-500",
        title: "Leave Notifications",
        description: "Emails for leave requests, approvals, and rejections",
        recommended: true,
    },
    {
        key: "email_approval_reminders" as const,
        icon: CheckCircle2,
        iconBg: "bg-purple-500/10",
        iconColor: "text-purple-500",
        title: "Approval Reminders",
        description: "Remind HR about pending leave approvals",
        recommended: false,
    },
];

export function NotificationSettingsOnboarding({
    settings,
    onSettingsChange,
}: NotificationSettingsOnboardingProps) {
    const handleToggle = (key: keyof NotificationSettingsData) => {
        onSettingsChange({
            ...settings,
            [key]: !settings[key],
        });
    };

    const enableAll = () => {
        onSettingsChange({
            email_checkin_reminder: true,
            email_checkout_reminder: true,
            email_hr_missing_alerts: true,
            email_leave_notifications: true,
            email_approval_reminders: true,
        });
    };

    const enabledCount = Object.values(settings).filter(Boolean).length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="text-center space-y-2">
                <h3 className="text-xl font-semibold">Email Notification Preferences</h3>
                <p className="text-muted-foreground text-sm">
                    Choose which email notifications your company receives.
                    You can change these anytime in Settings.
                </p>
            </div>

            {/* Quick Enable All */}
            <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                    {enabledCount} of {notificationTypes.length} enabled
                </div>
                <button
                    onClick={enableAll}
                    className="text-sm text-primary hover:underline"
                >
                    Enable All Recommended
                </button>
            </div>

            {/* Notification Types */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Mail className="h-5 w-5" />
                        Email Notifications
                    </CardTitle>
                    <CardDescription>
                        Toggle each notification type on or off
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {notificationTypes.map((type, index) => {
                        const Icon = type.icon;
                        const isEnabled = settings[type.key];

                        return (
                            <motion.div key={type.key}>
                                <div
                                    className={cn(
                                        "flex items-center justify-between p-4 rounded-lg border transition-all cursor-pointer",
                                        isEnabled
                                            ? "bg-primary/5 border-primary/20"
                                            : "bg-muted/30 border-transparent hover:border-muted"
                                    )}
                                    onClick={() => handleToggle(type.key)}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={cn("p-2 rounded-lg", type.iconBg)}>
                                            <Icon className={cn("h-5 w-5", type.iconColor)} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <Label className="font-medium cursor-pointer">
                                                    {type.title}
                                                </Label>
                                                {type.recommended && (
                                                    <Badge variant="secondary" className="text-[10px]">
                                                        Recommended
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                {type.description}
                                            </p>
                                        </div>
                                    </div>
                                    <Switch
                                        checked={isEnabled}
                                        onCheckedChange={() => handleToggle(type.key)}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </div>
                                {index < notificationTypes.length - 1 && <Separator className="my-2" />}
                            </motion.div>
                        );
                    })}
                </CardContent>
            </Card>

            {/* Info */}
            <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                <div className="text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">About Email Notifications</p>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                        <li>Reminders are sent based on your work schedule timing</li>
                        <li>Employees on approved leave are automatically excluded</li>
                        <li>You can customize reminder timing in Settings later</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}

export default NotificationSettingsOnboarding;
