"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
    Mail,
    Bell,
    Clock,
    CheckCircle2,
    AlertCircle,
    Loader2,
    LogIn,
    LogOut,
    Users,
    FileText,
    Timer,
    Save,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    getNotificationSettings,
    updateNotificationSettings,
    type NotificationSettings,
} from "@/app/actions/notification-settings";

export default function NotificationSettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState<NotificationSettings | null>(null);
    const [hasChanges, setHasChanges] = useState(false);
    const [originalSettings, setOriginalSettings] = useState<NotificationSettings | null>(null);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const result = await getNotificationSettings();
            if (result.success && result.settings) {
                setSettings(result.settings);
                setOriginalSettings(result.settings);
            } else {
                toast.error(result.error || "Failed to load settings");
            }
        } catch (error) {
            toast.error("Failed to load notification settings");
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = (key: keyof NotificationSettings, value: boolean) => {
        if (!settings) return;
        const newSettings = { ...settings, [key]: value };
        setSettings(newSettings);
        setHasChanges(JSON.stringify(newSettings) !== JSON.stringify(originalSettings));
    };

    const handleTimingChange = (key: keyof NotificationSettings, value: number) => {
        if (!settings) return;
        const clampedValue = Math.max(5, Math.min(120, value));
        const newSettings = { ...settings, [key]: clampedValue };
        setSettings(newSettings);
        setHasChanges(JSON.stringify(newSettings) !== JSON.stringify(originalSettings));
    };

    const handleSave = async () => {
        if (!settings) return;
        setSaving(true);
        try {
            const result = await updateNotificationSettings(settings);
            if (result.success) {
                toast.success("Notification settings saved");
                setOriginalSettings(settings);
                setHasChanges(false);
            } else {
                toast.error(result.error || "Failed to save settings");
            }
        } catch (error) {
            toast.error("Failed to save settings");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!settings) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <p className="text-muted-foreground">Failed to load settings</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-3">
                        <Bell className="h-7 w-7 text-primary" />
                        Notification Settings
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Configure email notifications and reminder timing for your company
                    </p>
                </div>
                {hasChanges && (
                    <Button onClick={handleSave} disabled={saving}>
                        {saving ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                            <Save className="h-4 w-4 mr-2" />
                        )}
                        Save Changes
                    </Button>
                )}
            </div>

            {/* Email Notification Toggles */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Mail className="h-5 w-5" />
                        Email Notifications
                    </CardTitle>
                    <CardDescription>
                        Choose which email notifications your company receives
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Check-in Reminders */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-500/10 rounded-lg">
                                <LogIn className="h-5 w-5 text-green-500" />
                            </div>
                            <div>
                                <Label className="text-base font-medium">Check-in Reminders</Label>
                                <p className="text-sm text-muted-foreground">
                                    Remind employees who haven't checked in
                                </p>
                            </div>
                        </div>
                        <Switch
                            checked={settings.email_checkin_reminder}
                            onCheckedChange={(v) => handleToggle("email_checkin_reminder", v)}
                        />
                    </div>

                    <Separator />

                    {/* Check-out Reminders */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-orange-500/10 rounded-lg">
                                <LogOut className="h-5 w-5 text-orange-500" />
                            </div>
                            <div>
                                <Label className="text-base font-medium">Check-out Reminders</Label>
                                <p className="text-sm text-muted-foreground">
                                    Remind employees who haven't checked out
                                </p>
                            </div>
                        </div>
                        <Switch
                            checked={settings.email_checkout_reminder}
                            onCheckedChange={(v) => handleToggle("email_checkout_reminder", v)}
                        />
                    </div>

                    <Separator />

                    {/* HR Missing Alerts */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-red-500/10 rounded-lg">
                                <Users className="h-5 w-5 text-red-500" />
                            </div>
                            <div>
                                <Label className="text-base font-medium">HR Missing Check-in Alerts</Label>
                                <p className="text-sm text-muted-foreground">
                                    Alert HR about employees missing check-ins
                                </p>
                            </div>
                        </div>
                        <Switch
                            checked={settings.email_hr_missing_alerts}
                            onCheckedChange={(v) => handleToggle("email_hr_missing_alerts", v)}
                        />
                    </div>

                    <Separator />

                    {/* Leave Notifications */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500/10 rounded-lg">
                                <FileText className="h-5 w-5 text-blue-500" />
                            </div>
                            <div>
                                <Label className="text-base font-medium">Leave Notifications</Label>
                                <p className="text-sm text-muted-foreground">
                                    Emails for leave requests and approvals
                                </p>
                            </div>
                        </div>
                        <Switch
                            checked={settings.email_leave_notifications}
                            onCheckedChange={(v) => handleToggle("email_leave_notifications", v)}
                        />
                    </div>

                    <Separator />

                    {/* Approval Reminders */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-500/10 rounded-lg">
                                <CheckCircle2 className="h-5 w-5 text-purple-500" />
                            </div>
                            <div>
                                <Label className="text-base font-medium">Approval Reminders</Label>
                                <p className="text-sm text-muted-foreground">
                                    Remind HR about pending leave approvals
                                </p>
                            </div>
                        </div>
                        <Switch
                            checked={settings.email_approval_reminders}
                            onCheckedChange={(v) => handleToggle("email_approval_reminders", v)}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Reminder Timing */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Timer className="h-5 w-5" />
                        Reminder Timing
                    </CardTitle>
                    <CardDescription>
                        Configure when reminders are sent relative to work hours
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Check-in Timing */}
                    <div className="space-y-4">
                        <h4 className="font-medium flex items-center gap-2">
                            <LogIn className="h-4 w-4 text-green-500" />
                            Check-in Reminders
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
                            <div className="space-y-2">
                                <Label className="text-sm">First Reminder</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="number"
                                        min={5}
                                        max={120}
                                        value={settings.checkin_reminder_1_mins}
                                        onChange={(e) =>
                                            handleTimingChange("checkin_reminder_1_mins", parseInt(e.target.value) || 10)
                                        }
                                        className="w-24"
                                        disabled={!settings.email_checkin_reminder}
                                    />
                                    <span className="text-sm text-muted-foreground">
                                        minutes after work start
                                    </span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm">Second Reminder</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="number"
                                        min={5}
                                        max={120}
                                        value={settings.checkin_reminder_2_mins}
                                        onChange={(e) =>
                                            handleTimingChange("checkin_reminder_2_mins", parseInt(e.target.value) || 60)
                                        }
                                        className="w-24"
                                        disabled={!settings.email_checkin_reminder}
                                    />
                                    <span className="text-sm text-muted-foreground">
                                        minutes after work start
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* Check-out Timing */}
                    <div className="space-y-4">
                        <h4 className="font-medium flex items-center gap-2">
                            <LogOut className="h-4 w-4 text-orange-500" />
                            Check-out Reminders
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
                            <div className="space-y-2">
                                <Label className="text-sm">First Reminder</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="number"
                                        min={5}
                                        max={120}
                                        value={settings.checkout_reminder_1_mins}
                                        onChange={(e) =>
                                            handleTimingChange("checkout_reminder_1_mins", parseInt(e.target.value) || 60)
                                        }
                                        className="w-24"
                                        disabled={!settings.email_checkout_reminder}
                                    />
                                    <span className="text-sm text-muted-foreground">
                                        minutes before work end
                                    </span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm">Second Reminder</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="number"
                                        min={5}
                                        max={120}
                                        value={settings.checkout_reminder_2_mins}
                                        onChange={(e) =>
                                            handleTimingChange("checkout_reminder_2_mins", parseInt(e.target.value) || 10)
                                        }
                                        className="w-24"
                                        disabled={!settings.email_checkout_reminder}
                                    />
                                    <span className="text-sm text-muted-foreground">
                                        minutes after work end
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Info Box */}
            <Card className="border-blue-500/20 bg-blue-500/5">
                <CardContent className="flex items-start gap-3 pt-6">
                    <AlertCircle className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                    <div className="text-sm text-muted-foreground">
                        <p className="font-medium text-foreground mb-1">How reminders work</p>
                        <ul className="list-disc list-inside space-y-1">
                            <li>Reminders are only sent on configured work days</li>
                            <li>Employees on approved leave are automatically excluded</li>
                            <li>Times are calculated based on your company's timezone</li>
                            <li>Changes apply immediately to all future reminders</li>
                        </ul>
                    </div>
                </CardContent>
            </Card>

            {/* Save Button (Bottom) */}
            {hasChanges && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-end"
                >
                    <Button onClick={handleSave} disabled={saving} size="lg">
                        {saving ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                            <Save className="h-4 w-4 mr-2" />
                        )}
                        Save All Changes
                    </Button>
                </motion.div>
            )}
        </div>
    );
}
