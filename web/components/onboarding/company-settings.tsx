"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Clock,
    Calendar,
    Settings2,
    Plus,
    Trash2,
    Edit2,
    Check,
    X,
    AlertCircle,
    Info,
    ChevronDown,
    ChevronUp,
    Building,
    FileText,
    Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// =========================================================================
// TYPE DEFINITIONS
// =========================================================================

interface WorkSchedule {
    work_start_time: string;
    work_end_time: string;
    grace_period_mins: number;
    half_day_hours: number;
    full_day_hours: number;
    work_days: number[];
    timezone: string;
}

interface LeaveSettings {
    leave_year_start: string;
    carry_forward_max: number;
    probation_leave: boolean;
    negative_balance: boolean;
}

interface LeaveType {
    id?: string;
    code: string;
    name: string;
    description?: string;
    color: string;
    annual_quota: number;
    max_consecutive: number;
    min_notice_days: number;
    requires_document: boolean;
    requires_approval: boolean;
    half_day_allowed: boolean;
    gender_specific?: 'M' | 'F' | 'O' | null;
    carry_forward: boolean;
    max_carry_forward: number;
    is_paid: boolean;
}

interface LeaveRule {
    id?: string;
    name: string;
    description?: string;
    rule_type: string;
    config: Record<string, any>;
    is_blocking: boolean;
    priority: number;
    applies_to_all: boolean;
}

interface CompanySettingsProps {
    companyId: string;
    initialWorkSchedule?: WorkSchedule;
    initialLeaveSettings?: LeaveSettings;
    initialLeaveTypes?: LeaveType[];
    initialLeaveRules?: LeaveRule[];
    onComplete: () => void;
    onBack?: () => void;
}

// =========================================================================
// DEFAULT VALUES
// =========================================================================

const DEFAULT_WORK_SCHEDULE: WorkSchedule = {
    work_start_time: "09:00",
    work_end_time: "18:00",
    grace_period_mins: 15,
    half_day_hours: 4,
    full_day_hours: 8,
    work_days: [1, 2, 3, 4, 5],
    timezone: "Asia/Kolkata",
};

const DEFAULT_LEAVE_SETTINGS: LeaveSettings = {
    leave_year_start: "01-01",
    carry_forward_max: 5,
    probation_leave: false,
    negative_balance: false,
};

const DEFAULT_LEAVE_TYPES: LeaveType[] = [
    {
        code: "CL",
        name: "Casual Leave",
        description: "For personal matters and emergencies",
        color: "#6366f1",
        annual_quota: 12,
        max_consecutive: 3,
        min_notice_days: 1,
        requires_document: false,
        requires_approval: true,
        half_day_allowed: true,
        carry_forward: false,
        max_carry_forward: 0,
        is_paid: true,
    },
    {
        code: "SL",
        name: "Sick Leave",
        description: "For health-related absences",
        color: "#ef4444",
        annual_quota: 12,
        max_consecutive: 7,
        min_notice_days: 0,
        requires_document: true,
        requires_approval: true,
        half_day_allowed: true,
        carry_forward: false,
        max_carry_forward: 0,
        is_paid: true,
    },
    {
        code: "PL",
        name: "Privilege Leave",
        description: "Earned leave for vacations",
        color: "#10b981",
        annual_quota: 15,
        max_consecutive: 15,
        min_notice_days: 7,
        requires_document: false,
        requires_approval: true,
        half_day_allowed: false,
        carry_forward: true,
        max_carry_forward: 30,
        is_paid: true,
    },
    {
        code: "ML",
        name: "Maternity Leave",
        description: "For expecting mothers",
        color: "#f472b6",
        annual_quota: 182,
        max_consecutive: 182,
        min_notice_days: 30,
        requires_document: true,
        requires_approval: true,
        half_day_allowed: false,
        gender_specific: 'F',
        carry_forward: false,
        max_carry_forward: 0,
        is_paid: true,
    },
    {
        code: "PTL",
        name: "Paternity Leave",
        description: "For new fathers",
        color: "#3b82f6",
        annual_quota: 15,
        max_consecutive: 15,
        min_notice_days: 7,
        requires_document: true,
        requires_approval: true,
        half_day_allowed: false,
        gender_specific: 'M',
        carry_forward: false,
        max_carry_forward: 0,
        is_paid: true,
    },
    {
        code: "LWP",
        name: "Leave Without Pay",
        description: "Unpaid leave when quota exhausted",
        color: "#6b7280",
        annual_quota: 0,
        max_consecutive: 30,
        min_notice_days: 7,
        requires_document: false,
        requires_approval: true,
        half_day_allowed: true,
        carry_forward: false,
        max_carry_forward: 0,
        is_paid: false,
    },
];

const DAYS_OF_WEEK = [
    { value: 1, label: "Mon" },
    { value: 2, label: "Tue" },
    { value: 3, label: "Wed" },
    { value: 4, label: "Thu" },
    { value: 5, label: "Fri" },
    { value: 6, label: "Sat" },
    { value: 7, label: "Sun" },
];

const TIMEZONES = [
    { value: "Asia/Kolkata", label: "India (IST)" },
    { value: "America/New_York", label: "US Eastern" },
    { value: "America/Los_Angeles", label: "US Pacific" },
    { value: "Europe/London", label: "UK (GMT)" },
    { value: "Asia/Singapore", label: "Singapore" },
    { value: "Asia/Dubai", label: "Dubai (GST)" },
    { value: "Australia/Sydney", label: "Australia Eastern" },
];

const LEAVE_COLORS = [
    "#6366f1", // indigo
    "#ef4444", // red
    "#10b981", // emerald
    "#f59e0b", // amber
    "#3b82f6", // blue
    "#8b5cf6", // violet
    "#ec4899", // pink
    "#14b8a6", // teal
    "#f97316", // orange
    "#6b7280", // gray
];

// =========================================================================
// MAIN COMPONENT
// =========================================================================

export function CompanySettings({
    companyId,
    initialWorkSchedule,
    initialLeaveSettings,
    initialLeaveTypes,
    initialLeaveRules,
    onComplete,
    onBack,
}: CompanySettingsProps) {
    const [activeTab, setActiveTab] = useState("schedule");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Work Schedule State
    const [workSchedule, setWorkSchedule] = useState<WorkSchedule>(
        initialWorkSchedule || DEFAULT_WORK_SCHEDULE
    );

    // Leave Settings State
    const [leaveSettings, setLeaveSettings] = useState<LeaveSettings>(
        initialLeaveSettings || DEFAULT_LEAVE_SETTINGS
    );

    // Leave Types State
    const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>(
        initialLeaveTypes || DEFAULT_LEAVE_TYPES
    );
    const [editingLeaveType, setEditingLeaveType] = useState<LeaveType | null>(null);
    const [showAddLeaveType, setShowAddLeaveType] = useState(false);

    // Leave Rules State
    const [leaveRules, setLeaveRules] = useState<LeaveRule[]>(initialLeaveRules || []);

    // =====================================================================
    // HANDLERS
    // =====================================================================

    const toggleWorkDay = (day: number) => {
        setWorkSchedule((prev) => ({
            ...prev,
            work_days: prev.work_days.includes(day)
                ? prev.work_days.filter((d) => d !== day)
                : [...prev.work_days, day].sort(),
        }));
    };

    const handleAddLeaveType = (newType: LeaveType) => {
        // Check for duplicate code
        if (leaveTypes.some((lt) => lt.code.toUpperCase() === newType.code.toUpperCase())) {
            setError(`Leave type code '${newType.code}' already exists`);
            return;
        }
        setLeaveTypes((prev) => [...prev, { ...newType, code: newType.code.toUpperCase() }]);
        setShowAddLeaveType(false);
        setError(null);
    };

    const handleUpdateLeaveType = (updatedType: LeaveType) => {
        setLeaveTypes((prev) =>
            prev.map((lt) => (lt.code === updatedType.code ? updatedType : lt))
        );
        setEditingLeaveType(null);
    };

    const handleDeleteLeaveType = (code: string) => {
        setLeaveTypes((prev) => prev.filter((lt) => lt.code !== code));
    };

    const handleComplete = async () => {
        setIsLoading(true);
        setError(null);

        try {
            // Import actions dynamically to avoid SSR issues
            const { saveWorkSchedule, saveLeaveSettings, createLeaveType, completeCompanySetup } =
                await import("@/app/actions/company-settings");

            // Save work schedule
            const scheduleResult = await saveWorkSchedule(companyId, workSchedule);
            if (!scheduleResult.success) {
                throw new Error(scheduleResult.error || "Failed to save work schedule");
            }

            // Save leave settings
            const settingsResult = await saveLeaveSettings(companyId, leaveSettings);
            if (!settingsResult.success) {
                throw new Error(settingsResult.error || "Failed to save leave settings");
            }

            // Create leave types
            for (const lt of leaveTypes) {
                if (!lt.id) {
                    // Only create new ones
                    const result = await createLeaveType(companyId, lt);
                    if (!result.success && !result.error?.includes("already exists")) {
                        throw new Error(result.error || `Failed to create leave type ${lt.code}`);
                    }
                }
            }

            // Complete setup
            const completeResult = await completeCompanySetup(companyId);
            if (!completeResult.success) {
                throw new Error(completeResult.error || "Failed to complete setup");
            }

            onComplete();
        } catch (err: any) {
            console.error("Setup error:", err);
            setError(err.message || "Failed to save settings");
        } finally {
            setIsLoading(false);
        }
    };

    // =====================================================================
    // RENDER
    // =====================================================================

    return (
        <div className="w-full max-w-4xl mx-auto">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
            >
                {/* Header */}
                <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold">Configure Your Company</h2>
                    <p className="text-muted-foreground">
                        Set up work schedules, leave policies, and rules for your organization
                    </p>
                </div>

                {/* Error Display */}
                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-center gap-3"
                        >
                            <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
                            <p className="text-sm text-destructive">{error}</p>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setError(null)}
                                className="ml-auto"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="schedule" className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span className="hidden sm:inline">Work Schedule</span>
                            <span className="sm:hidden">Schedule</span>
                        </TabsTrigger>
                        <TabsTrigger value="leaves" className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span className="hidden sm:inline">Leave Types</span>
                            <span className="sm:hidden">Leaves</span>
                        </TabsTrigger>
                        <TabsTrigger value="policies" className="flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            <span className="hidden sm:inline">Policies</span>
                            <span className="sm:hidden">Rules</span>
                        </TabsTrigger>
                    </TabsList>

                    {/* Work Schedule Tab */}
                    <TabsContent value="schedule" className="space-y-6 mt-6">
                        <WorkScheduleSection
                            schedule={workSchedule}
                            onChange={setWorkSchedule}
                        />
                    </TabsContent>

                    {/* Leave Types Tab */}
                    <TabsContent value="leaves" className="space-y-6 mt-6">
                        <LeaveTypesSection
                            leaveTypes={leaveTypes}
                            editingType={editingLeaveType}
                            showAdd={showAddLeaveType}
                            onAdd={handleAddLeaveType}
                            onEdit={setEditingLeaveType}
                            onUpdate={handleUpdateLeaveType}
                            onDelete={handleDeleteLeaveType}
                            onShowAdd={setShowAddLeaveType}
                        />
                    </TabsContent>

                    {/* Policies Tab */}
                    <TabsContent value="policies" className="space-y-6 mt-6">
                        <LeavePoliciesSection
                            settings={leaveSettings}
                            onChange={setLeaveSettings}
                        />
                    </TabsContent>
                </Tabs>

                {/* Navigation Buttons */}
                <div className="flex justify-between pt-6 border-t">
                    {onBack && (
                        <Button variant="outline" onClick={onBack}>
                            Back
                        </Button>
                    )}
                    <div className="flex gap-3 ml-auto">
                        <Button
                            variant="outline"
                            onClick={() => {
                                // Skip with defaults
                                onComplete();
                            }}
                        >
                            Skip for Now
                        </Button>
                        <Button onClick={handleComplete} disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Check className="h-4 w-4 mr-2" />
                                    Complete Setup
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

// =========================================================================
// WORK SCHEDULE SECTION
// =========================================================================

function WorkScheduleSection({
    schedule,
    onChange,
}: {
    schedule: WorkSchedule;
    onChange: (s: WorkSchedule) => void;
}) {
    return (
        <div className="space-y-6">
            {/* Working Hours */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Working Hours
                    </CardTitle>
                    <CardDescription>
                        Define your company's standard working hours
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Start Time</Label>
                            <Input
                                type="time"
                                value={schedule.work_start_time}
                                onChange={(e) =>
                                    onChange({ ...schedule, work_start_time: e.target.value })
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>End Time</Label>
                            <Input
                                type="time"
                                value={schedule.work_end_time}
                                onChange={(e) =>
                                    onChange({ ...schedule, work_end_time: e.target.value })
                                }
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>Grace Period (mins)</Label>
                            <Input
                                type="number"
                                min={0}
                                max={60}
                                value={schedule.grace_period_mins}
                                onChange={(e) =>
                                    onChange({ ...schedule, grace_period_mins: parseInt(e.target.value) || 0 })
                                }
                            />
                            <p className="text-xs text-muted-foreground">
                                Time after start for check-in
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label>Half Day Hours</Label>
                            <Input
                                type="number"
                                min={1}
                                max={12}
                                step={0.5}
                                value={schedule.half_day_hours}
                                onChange={(e) =>
                                    onChange({ ...schedule, half_day_hours: parseFloat(e.target.value) || 4 })
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Full Day Hours</Label>
                            <Input
                                type="number"
                                min={1}
                                max={24}
                                step={0.5}
                                value={schedule.full_day_hours}
                                onChange={(e) =>
                                    onChange({ ...schedule, full_day_hours: parseFloat(e.target.value) || 8 })
                                }
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Working Days */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Working Days
                    </CardTitle>
                    <CardDescription>
                        Select which days are working days
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-2">
                        {DAYS_OF_WEEK.map((day) => (
                            <Button
                                key={day.value}
                                variant={schedule.work_days.includes(day.value) ? "default" : "outline"}
                                size="sm"
                                onClick={() =>
                                    onChange({
                                        ...schedule,
                                        work_days: schedule.work_days.includes(day.value)
                                            ? schedule.work_days.filter((d) => d !== day.value)
                                            : [...schedule.work_days, day.value].sort(),
                                    })
                                }
                                className="w-16"
                            >
                                {day.label}
                            </Button>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Timezone */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Building className="h-5 w-5" />
                        Timezone
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Select
                        value={schedule.timezone}
                        onValueChange={(v) => onChange({ ...schedule, timezone: v })}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {TIMEZONES.map((tz) => (
                                <SelectItem key={tz.value} value={tz.value}>
                                    {tz.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </CardContent>
            </Card>
        </div>
    );
}

// =========================================================================
// LEAVE TYPES SECTION
// =========================================================================

function LeaveTypesSection({
    leaveTypes,
    editingType,
    showAdd,
    onAdd,
    onEdit,
    onUpdate,
    onDelete,
    onShowAdd,
}: {
    leaveTypes: LeaveType[];
    editingType: LeaveType | null;
    showAdd: boolean;
    onAdd: (lt: LeaveType) => void;
    onEdit: (lt: LeaveType | null) => void;
    onUpdate: (lt: LeaveType) => void;
    onDelete: (code: string) => void;
    onShowAdd: (show: boolean) => void;
}) {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold">Leave Types</h3>
                    <p className="text-sm text-muted-foreground">
                        Configure the types of leaves available to employees
                    </p>
                </div>
                <Button onClick={() => onShowAdd(true)} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Leave Type
                </Button>
            </div>

            {/* Add New Leave Type Form */}
            <AnimatePresence>
                {showAdd && (
                    <LeaveTypeForm
                        onSave={onAdd}
                        onCancel={() => onShowAdd(false)}
                    />
                )}
            </AnimatePresence>

            {/* Leave Types List */}
            <div className="space-y-3">
                {leaveTypes.map((lt) => (
                    <motion.div
                        key={lt.code}
                        layout
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        {editingType?.code === lt.code ? (
                            <LeaveTypeForm
                                initialData={lt}
                                onSave={onUpdate}
                                onCancel={() => onEdit(null)}
                                isEditing
                            />
                        ) : (
                            <LeaveTypeCard
                                leaveType={lt}
                                onEdit={() => onEdit(lt)}
                                onDelete={() => onDelete(lt.code)}
                            />
                        )}
                    </motion.div>
                ))}
            </div>
        </div>
    );
}

function LeaveTypeCard({
    leaveType,
    onEdit,
    onDelete,
}: {
    leaveType: LeaveType;
    onEdit: () => void;
    onDelete: () => void;
}) {
    const [expanded, setExpanded] = useState(false);

    return (
        <Card>
            <CardContent className="p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: leaveType.color }}
                        />
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-medium">{leaveType.name}</span>
                                <Badge variant="secondary" className="text-xs">
                                    {leaveType.code}
                                </Badge>
                                {!leaveType.is_paid && (
                                    <Badge variant="outline" className="text-xs">
                                        Unpaid
                                    </Badge>
                                )}
                                {leaveType.gender_specific && (
                                    <Badge variant="outline" className="text-xs">
                                        {leaveType.gender_specific === 'F' ? 'Female' : 'Male'} Only
                                    </Badge>
                                )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                                {leaveType.annual_quota} days/year
                                {leaveType.carry_forward && ` • Carry forward up to ${leaveType.max_carry_forward}`}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)}>
                            {expanded ? (
                                <ChevronUp className="h-4 w-4" />
                            ) : (
                                <ChevronDown className="h-4 w-4" />
                            )}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={onEdit}>
                            <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={onDelete} className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                <AnimatePresence>
                    {expanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="pt-4 mt-4 border-t grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                    <span className="text-muted-foreground">Max Consecutive</span>
                                    <p className="font-medium">{leaveType.max_consecutive} days</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Min Notice</span>
                                    <p className="font-medium">{leaveType.min_notice_days} days</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Half Day</span>
                                    <p className="font-medium">{leaveType.half_day_allowed ? "Allowed" : "Not Allowed"}</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Document Required</span>
                                    <p className="font-medium">{leaveType.requires_document ? "Yes" : "No"}</p>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </CardContent>
        </Card>
    );
}

function LeaveTypeForm({
    initialData,
    onSave,
    onCancel,
    isEditing = false,
}: {
    initialData?: LeaveType;
    onSave: (lt: LeaveType) => void;
    onCancel: () => void;
    isEditing?: boolean;
}) {
    const [formData, setFormData] = useState<LeaveType>(
        initialData || {
            code: "",
            name: "",
            description: "",
            color: LEAVE_COLORS[0],
            annual_quota: 12,
            max_consecutive: 5,
            min_notice_days: 1,
            requires_document: false,
            requires_approval: true,
            half_day_allowed: true,
            gender_specific: null,
            carry_forward: false,
            max_carry_forward: 0,
            is_paid: true,
        }
    );

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.code || !formData.name) return;
        onSave(formData);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
        >
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">
                        {isEditing ? "Edit Leave Type" : "Add Leave Type"}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Basic Info */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="space-y-2">
                                <Label>Code *</Label>
                                <Input
                                    value={formData.code}
                                    onChange={(e) =>
                                        setFormData({ ...formData, code: e.target.value.toUpperCase() })
                                    }
                                    placeholder="CL"
                                    maxLength={5}
                                    disabled={isEditing}
                                />
                            </div>
                            <div className="space-y-2 col-span-2">
                                <Label>Name *</Label>
                                <Input
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Casual Leave"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Color</Label>
                                <div className="flex flex-wrap gap-1">
                                    {LEAVE_COLORS.map((color) => (
                                        <button
                                            key={color}
                                            type="button"
                                            className={cn(
                                                "w-6 h-6 rounded-full transition-transform",
                                                formData.color === color && "ring-2 ring-offset-2 ring-primary scale-110"
                                            )}
                                            style={{ backgroundColor: color }}
                                            onClick={() => setFormData({ ...formData, color })}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Input
                                value={formData.description || ""}
                                onChange={(e) =>
                                    setFormData({ ...formData, description: e.target.value })
                                }
                                placeholder="For personal matters and emergencies"
                            />
                        </div>

                        {/* Quota Settings */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="space-y-2">
                                <Label>Annual Quota</Label>
                                <Input
                                    type="number"
                                    min={0}
                                    value={formData.annual_quota}
                                    onChange={(e) =>
                                        setFormData({ ...formData, annual_quota: parseInt(e.target.value) || 0 })
                                    }
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Max Consecutive</Label>
                                <Input
                                    type="number"
                                    min={1}
                                    value={formData.max_consecutive}
                                    onChange={(e) =>
                                        setFormData({ ...formData, max_consecutive: parseInt(e.target.value) || 1 })
                                    }
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Min Notice (days)</Label>
                                <Input
                                    type="number"
                                    min={0}
                                    value={formData.min_notice_days}
                                    onChange={(e) =>
                                        setFormData({ ...formData, min_notice_days: parseInt(e.target.value) || 0 })
                                    }
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Gender</Label>
                                <Select
                                    value={formData.gender_specific || "all"}
                                    onValueChange={(v) =>
                                        setFormData({
                                            ...formData,
                                            gender_specific: v === "all" ? null : (v as 'M' | 'F'),
                                        })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All</SelectItem>
                                        <SelectItem value="M">Male Only</SelectItem>
                                        <SelectItem value="F">Female Only</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Toggle Options */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div className="flex items-center justify-between p-3 rounded-lg border">
                                <Label>Paid Leave</Label>
                                <Switch
                                    checked={formData.is_paid}
                                    onCheckedChange={(v) => setFormData({ ...formData, is_paid: v })}
                                />
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-lg border">
                                <Label>Half Day Allowed</Label>
                                <Switch
                                    checked={formData.half_day_allowed}
                                    onCheckedChange={(v) => setFormData({ ...formData, half_day_allowed: v })}
                                />
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-lg border">
                                <Label>Document Required</Label>
                                <Switch
                                    checked={formData.requires_document}
                                    onCheckedChange={(v) => setFormData({ ...formData, requires_document: v })}
                                />
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-lg border">
                                <Label>Carry Forward</Label>
                                <Switch
                                    checked={formData.carry_forward}
                                    onCheckedChange={(v) => setFormData({ ...formData, carry_forward: v })}
                                />
                            </div>
                            {formData.carry_forward && (
                                <div className="space-y-2 col-span-2">
                                    <Label>Max Carry Forward</Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        value={formData.max_carry_forward}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                max_carry_forward: parseInt(e.target.value) || 0,
                                            })
                                        }
                                    />
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-2 pt-4">
                            <Button type="button" variant="outline" onClick={onCancel}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={!formData.code || !formData.name}>
                                {isEditing ? "Update" : "Add"} Leave Type
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </motion.div>
    );
}

// =========================================================================
// LEAVE POLICIES SECTION
// =========================================================================

function LeavePoliciesSection({
    settings,
    onChange,
}: {
    settings: LeaveSettings;
    onChange: (s: LeaveSettings) => void;
}) {
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Leave Year Settings
                    </CardTitle>
                    <CardDescription>
                        Configure when your leave year starts and carry forward policies
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Leave Year Start</Label>
                            <Select
                                value={settings.leave_year_start}
                                onValueChange={(v) =>
                                    onChange({ ...settings, leave_year_start: v })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="01-01">January 1st (Calendar Year)</SelectItem>
                                    <SelectItem value="04-01">April 1st (Indian Fiscal)</SelectItem>
                                    <SelectItem value="07-01">July 1st</SelectItem>
                                    <SelectItem value="10-01">October 1st</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                Leave balances reset on this date
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label>Max Carry Forward (days)</Label>
                            <Input
                                type="number"
                                min={0}
                                value={settings.carry_forward_max}
                                onChange={(e) =>
                                    onChange({
                                        ...settings,
                                        carry_forward_max: parseInt(e.target.value) || 0,
                                    })
                                }
                            />
                            <p className="text-xs text-muted-foreground">
                                Maximum days that can be carried forward to next year
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        Leave Policies
                    </CardTitle>
                    <CardDescription>
                        Additional leave policy configurations
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 rounded-lg border">
                            <div>
                                <Label className="text-base">Allow Leave During Probation</Label>
                                <p className="text-sm text-muted-foreground">
                                    Allow employees to take leave during their probation period
                                </p>
                            </div>
                            <Switch
                                checked={settings.probation_leave}
                                onCheckedChange={(v) =>
                                    onChange({ ...settings, probation_leave: v })
                                }
                            />
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-lg border">
                            <div>
                                <Label className="text-base">Allow Negative Balance</Label>
                                <p className="text-sm text-muted-foreground">
                                    Allow employees to take leave even if balance is zero (will be adjusted from next allocation)
                                </p>
                            </div>
                            <Switch
                                checked={settings.negative_balance}
                                onCheckedChange={(v) =>
                                    onChange({ ...settings, negative_balance: v })
                                }
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Info Box */}
            <div className="bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex gap-3">
                <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800 dark:text-blue-200">
                    <p className="font-medium">These settings can be changed later</p>
                    <p className="mt-1">
                        You can modify all company settings from the HR Settings page after completing the onboarding process.
                    </p>
                </div>
            </div>
        </div>
    );
}

export default CompanySettings;
