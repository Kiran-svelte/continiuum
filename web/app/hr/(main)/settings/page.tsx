"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
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
    Bell,
    CalendarDays,
    Gauge,
    Save,
    Loader2,
    RefreshCw,
    Lock,
    Mail,
    KeyRound,
    ShieldCheck,
    RotateCcw,
    ToggleLeft,
    ToggleRight,
    Zap,
    ChevronRight
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
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@clerk/nextjs";
import {
    getCompanySettings,
    saveWorkSchedule,
    saveLeaveSettings,
    saveApprovalSettings,
    createLeaveType,
    updateLeaveType,
    deleteLeaveType,
    type WorkScheduleSettings,
    type LeaveSettings,
    type LeaveTypeInput,
    type ApprovalSettingsInput
} from "@/app/actions/company-settings";
import {
    getCompanyConstraintRules,
    toggleRuleStatus,
    updateRuleConfig,
    type ConstraintRule
} from "@/app/actions/constraint-rules";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

// =========================================================================
// OTP VERIFICATION TYPES
// =========================================================================
type OtpAction = 
    | "work_schedule_change" 
    | "leave_type_create" 
    | "leave_type_delete" 
    | "rule_change" 
    | "settings_change";

interface OtpState {
    isVerifying: boolean;
    isSending: boolean;
    action: OtpAction | null;
    pendingCallback: (() => Promise<void>) | null;
    expiresAt: Date | null;
    error: string | null;
}

// Track which sections have unsaved changes
interface PendingChanges {
    workSchedule: boolean;
    leaveSettings: boolean;
    approvalSettings: boolean;
    leaveTypes: {
        added: LeaveTypeInput[];
        updated: { id: string; data: Partial<LeaveTypeInput> }[];
        deleted: string[];
    };
}

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

interface LeaveSettingsType {
    leave_year_start: string;
    carry_forward_max: number;
    probation_leave: boolean;
    negative_balance: boolean;
}

interface LeaveType {
    id: string;
    code: string;
    name: string;
    description?: string | null;
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

interface ApprovalSettings {
    auto_approve_max_days: number;
    auto_approve_min_notice: number;
    auto_approve_leave_types: string[];
    escalate_above_days: number;
    escalate_consecutive_leaves: boolean;
    escalate_low_balance: boolean;
    max_concurrent_leaves: number;
    min_team_coverage: number;
    blackout_dates: string[];
    blackout_days_of_week: number[];
    require_document_above_days: number;
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

const DEFAULT_LEAVE_SETTINGS: LeaveSettingsType = {
    leave_year_start: "01-01",
    carry_forward_max: 5,
    probation_leave: false,
    negative_balance: false,
};

const DEFAULT_APPROVAL_SETTINGS: ApprovalSettings = {
    auto_approve_max_days: 3,
    auto_approve_min_notice: 1,
    auto_approve_leave_types: ["CL", "SL"],
    escalate_above_days: 5,
    escalate_consecutive_leaves: true,
    escalate_low_balance: true,
    max_concurrent_leaves: 3,
    min_team_coverage: 2,
    blackout_dates: [],
    blackout_days_of_week: [],
    require_document_above_days: 3,
};

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
    { value: "America/New_York", label: "Eastern (EST)" },
    { value: "America/Los_Angeles", label: "Pacific (PST)" },
    { value: "Europe/London", label: "London (GMT)" },
    { value: "Asia/Singapore", label: "Singapore (SGT)" },
    { value: "Asia/Dubai", label: "Dubai (GST)" },
];

const LEAVE_TYPE_COLORS = [
    "#6366f1", "#ef4444", "#10b981", "#f472b6", "#3b82f6", 
    "#8b5cf6", "#f59e0b", "#14b8a6", "#ec4899", "#6b7280"
];

// =========================================================================
// MAIN COMPONENT
// =========================================================================

export default function HRSettingsPage() {
    const { userId } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [companyId, setCompanyId] = useState<string>("");

    // Form state
    const [workSchedule, setWorkSchedule] = useState<WorkSchedule>(DEFAULT_WORK_SCHEDULE);
    const [leaveSettings, setLeaveSettings] = useState<LeaveSettingsType>(DEFAULT_LEAVE_SETTINGS);
    const [approvalSettings, setApprovalSettings] = useState<ApprovalSettings>(DEFAULT_APPROVAL_SETTINGS);
    const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);

    // Original values to track changes (set after loading)
    const [originalWorkSchedule, setOriginalWorkSchedule] = useState<WorkSchedule | null>(null);
    const [originalLeaveSettings, setOriginalLeaveSettings] = useState<LeaveSettingsType | null>(null);
    const [originalApprovalSettings, setOriginalApprovalSettings] = useState<ApprovalSettings | null>(null);
    const [originalLeaveTypes, setOriginalLeaveTypes] = useState<LeaveType[]>([]);
    
    // Track pending leave type changes
    const [pendingLeaveTypeChanges, setPendingLeaveTypeChanges] = useState<PendingChanges['leaveTypes']>({
        added: [],
        updated: [],
        deleted: []
    });
    
    // Unsaved changes dialog
    const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
    const [pendingTabChange, setPendingTabChange] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState("workSchedule");

    // Leave Type Dialog state
    const [showLeaveTypeDialog, setShowLeaveTypeDialog] = useState(false);
    const [editingLeaveType, setEditingLeaveType] = useState<LeaveType | null>(null);
    const [leaveTypeForm, setLeaveTypeForm] = useState<LeaveTypeInput>({
        code: "",
        name: "",
        description: "",
        color: "#6366f1",
        annual_quota: 12,
        max_consecutive: 5,
        min_notice_days: 1,
        requires_document: false,
        requires_approval: true,
        half_day_allowed: true,
        carry_forward: false,
        max_carry_forward: 0,
        is_paid: true,
    });

    // OTP Verification state
    const [showOtpDialog, setShowOtpDialog] = useState(false);
    const [otpCode, setOtpCode] = useState("");
    const [otpState, setOtpState] = useState<OtpState>({
        isVerifying: false,
        isSending: false,
        action: null,
        pendingCallback: null,
        expiresAt: null,
        error: null,
    });

    // Constraint Rules state
    const [constraintRules, setConstraintRules] = useState<ConstraintRule[]>([]);
    const [originalConstraintRules, setOriginalConstraintRules] = useState<ConstraintRule[]>([]);
    const [pendingRuleChanges, setPendingRuleChanges] = useState<{
        toggled: { rule_id: string; is_active: boolean }[];
        updated: { rule_id: string; config: Record<string, any> }[];
    }>({ toggled: [], updated: [] });
    const [expandedRuleCategories, setExpandedRuleCategories] = useState<Set<string>>(new Set(["limits", "balance", "coverage"]));

    // Grouped constraint rules by category
    const groupedConstraintRules = useMemo(() => {
        const groups: Record<string, ConstraintRule[]> = {};
        for (const rule of constraintRules) {
            if (!groups[rule.category]) groups[rule.category] = [];
            groups[rule.category].push(rule);
        }
        return groups;
    }, [constraintRules]);

    // Check if there are unsaved changes
    const hasUnsavedChanges = useCallback(() => {
        if (!originalWorkSchedule || !originalLeaveSettings || !originalApprovalSettings) {
            return false; // Still loading
        }
        
        // Check work schedule changes
        const workScheduleChanged = JSON.stringify(workSchedule) !== JSON.stringify(originalWorkSchedule);
        
        // Check leave settings changes
        const leaveSettingsChanged = JSON.stringify(leaveSettings) !== JSON.stringify(originalLeaveSettings);
        
        // Check approval settings changes
        const approvalSettingsChanged = JSON.stringify(approvalSettings) !== JSON.stringify(originalApprovalSettings);
        
        // Check constraint rule changes
        const constraintRulesChanged = pendingRuleChanges.toggled.length > 0 || pendingRuleChanges.updated.length > 0;
        
        // Check leave type changes
        const leaveTypesChanged = 
            pendingLeaveTypeChanges.added.length > 0 ||
            pendingLeaveTypeChanges.updated.length > 0 ||
            pendingLeaveTypeChanges.deleted.length > 0;
        
        return workScheduleChanged || leaveSettingsChanged || approvalSettingsChanged || leaveTypesChanged || constraintRulesChanged;
    }, [workSchedule, leaveSettings, approvalSettings, originalWorkSchedule, originalLeaveSettings, originalApprovalSettings, pendingLeaveTypeChanges, pendingRuleChanges]);

    // Send OTP for verification
    const sendOtp = useCallback(async (action: OtpAction, callback: () => Promise<void>) => {
        setOtpState(prev => ({ ...prev, isSending: true, error: null, action, pendingCallback: () => callback() }));
        setOtpCode("");
        
        try {
            const res = await fetch("/api/security/otp/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action }),
            });
            
            const data = await res.json();
            
            if (!res.ok || !data.success) {
                throw new Error(data.error || "Failed to send OTP");
            }
            
            setOtpState(prev => ({
                ...prev,
                isSending: false,
                expiresAt: new Date(data.expiresAt),
            }));
            setShowOtpDialog(true);
            
            // If email failed and we're in dev/preview, show the debug code
            if (data.debugCode) {
                setSuccess(`⚠️ Email service unavailable. For testing, use code: ${data.debugCode}`);
                // Auto-fill the OTP code for convenience
                setOtpCode(data.debugCode);
            } else {
                setSuccess("Verification code sent to your email!");
            }
        } catch (err: any) {
            setOtpState(prev => ({ ...prev, isSending: false, error: err.message }));
            setError(err.message || "Failed to send verification code");
        }
    }, []);

    // Verify OTP and execute pending callback
    const verifyOtpAndProceed = useCallback(async () => {
        if (!otpCode || otpCode.length !== 6) {
            setOtpState(prev => ({ ...prev, error: "Please enter a 6-digit code" }));
            return;
        }
        
        setOtpState(prev => ({ ...prev, isVerifying: true, error: null }));
        
        try {
            const res = await fetch("/api/security/otp/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    action: otpState.action, 
                    code: otpCode 
                }),
            });
            
            const data = await res.json();
            
            if (!res.ok || !data.success) {
                throw new Error(data.error || "Invalid verification code");
            }
            
            // OTP verified - execute the pending callback
            setShowOtpDialog(false);
            if (otpState.pendingCallback) {
                await otpState.pendingCallback();
            }
            
            setOtpState({
                isVerifying: false,
                isSending: false,
                action: null,
                pendingCallback: null,
                expiresAt: null,
                error: null,
            });
            setOtpCode("");
        } catch (err: any) {
            setOtpState(prev => ({ ...prev, isVerifying: false, error: err.message }));
        }
    }, [otpCode, otpState.action, otpState.pendingCallback]);

    // Fetch company settings on mount
    useEffect(() => {
        async function loadSettings() {
            try {
                // First get company ID from employee
                const empRes = await fetch("/api/employee/profile", {
                    cache: 'no-store',
                    headers: { 'Cache-Control': 'no-cache' }
                });
                const empData = await empRes.json();
                
                if (!empRes.ok) {
                    setError(empData.error || `Failed to fetch profile (${empRes.status})`);
                    setLoading(false);
                    return;
                }
                
                if (!empData.success) {
                    setError(empData.error || "Failed to fetch profile");
                    setLoading(false);
                    return;
                }
                
                if (!empData.employee?.org_id) {
                    setError("Company not found. Please complete onboarding first.");
                    setLoading(false);
                    return;
                }
                
                setCompanyId(empData.employee.org_id);
                
                // Now fetch company settings with error boundary
                let result;
                try {
                    result = await getCompanySettings(empData.employee.org_id);
                } catch (settingsErr: any) {
                    console.error("getCompanySettings error:", settingsErr);
                    setError("Failed to load company settings. Please try again.");
                    setLoading(false);
                    return;
                }
                
                if (!result.success) {
                    setError(result.error || "Failed to load settings");
                    setLoading(false);
                    return;
                }
                
                // Set all the state
                if (result.workSchedule) {
                    setWorkSchedule(result.workSchedule);
                    setOriginalWorkSchedule(JSON.parse(JSON.stringify(result.workSchedule)));
                }
                if (result.leaveSettings) {
                    setLeaveSettings(result.leaveSettings);
                    setOriginalLeaveSettings(JSON.parse(JSON.stringify(result.leaveSettings)));
                }
                if (result.leaveTypes) {
                    // Convert Decimal fields to numbers
                    const convertedLeaveTypes: LeaveType[] = result.leaveTypes.map((lt: any) => ({
                        id: lt.id,
                        code: lt.code,
                        name: lt.name,
                        description: lt.description,
                        color: lt.color,
                        annual_quota: Number(lt.annual_quota),
                        max_consecutive: lt.max_consecutive,
                        min_notice_days: lt.min_notice_days,
                        requires_document: lt.requires_document,
                        requires_approval: lt.requires_approval,
                        half_day_allowed: lt.half_day_allowed,
                        gender_specific: lt.gender_specific,
                        carry_forward: lt.carry_forward,
                        max_carry_forward: lt.max_carry_forward,
                        is_paid: lt.is_paid,
                    }));
                    setLeaveTypes(convertedLeaveTypes);
                    setOriginalLeaveTypes(JSON.parse(JSON.stringify(convertedLeaveTypes)));
                }
                
                // Set original approval settings
                setOriginalApprovalSettings(JSON.parse(JSON.stringify(DEFAULT_APPROVAL_SETTINGS)));
                
                // Fetch constraint rules
                try {
                    const rulesResult = await getCompanyConstraintRules();
                    if (rulesResult.success && rulesResult.rules) {
                        setConstraintRules(rulesResult.rules);
                        setOriginalConstraintRules(JSON.parse(JSON.stringify(rulesResult.rules)));
                    }
                } catch (rulesErr) {
                    console.warn("Failed to load constraint rules:", rulesErr);
                    // Don't block the page if rules fail to load
                }
                
            } catch (err: any) {
                console.error("Failed to load settings:", err);
                setError(err.message || "Failed to load settings");
            } finally {
                setLoading(false);
            }
        }
        
        loadSettings();
    }, []);

    // =========================================================================
    // SINGLE "SAVE ALL CHANGES" HANDLER - OTP ONLY ONCE
    // =========================================================================
    const handleSaveAllChanges = async () => {
        if (!hasUnsavedChanges()) {
            setSuccess("No changes to save");
            return;
        }
        
        // Send OTP for verification (only once for all changes)
        await sendOtp("settings_change", async () => {
            setSaving("all");
            setError(null);
            
            const errors: string[] = [];
            const successes: string[] = [];
            
            try {
                // Save work schedule if changed
                if (originalWorkSchedule && JSON.stringify(workSchedule) !== JSON.stringify(originalWorkSchedule)) {
                    const result = await saveWorkSchedule(companyId, workSchedule);
                    if (result.success) {
                        successes.push("Work schedule");
                        setOriginalWorkSchedule(JSON.parse(JSON.stringify(workSchedule)));
                    } else {
                        errors.push(`Work schedule: ${result.error}`);
                    }
                }
                
                // Save leave settings if changed
                if (originalLeaveSettings && JSON.stringify(leaveSettings) !== JSON.stringify(originalLeaveSettings)) {
                    const result = await saveLeaveSettings(companyId, leaveSettings);
                    if (result.success) {
                        successes.push("Leave settings");
                        setOriginalLeaveSettings(JSON.parse(JSON.stringify(leaveSettings)));
                    } else {
                        errors.push(`Leave settings: ${result.error}`);
                    }
                }
                
                // Save approval settings if changed
                if (originalApprovalSettings && JSON.stringify(approvalSettings) !== JSON.stringify(originalApprovalSettings)) {
                    const result = await saveApprovalSettings(companyId, approvalSettings);
                    if (result.success) {
                        successes.push("Approval settings");
                        setOriginalApprovalSettings(JSON.parse(JSON.stringify(approvalSettings)));
                    } else {
                        errors.push(`Approval settings: ${result.error}`);
                    }
                }
                
                // Process leave type changes
                // Add new leave types
                for (const lt of pendingLeaveTypeChanges.added) {
                    const result = await createLeaveType(companyId, lt);
                    if (result.success && result.leaveType) {
                        const newLt: LeaveType = {
                            id: result.leaveType.id,
                            code: result.leaveType.code,
                            name: result.leaveType.name,
                            description: result.leaveType.description,
                            color: result.leaveType.color,
                            annual_quota: Number(result.leaveType.annual_quota),
                            max_consecutive: result.leaveType.max_consecutive,
                            min_notice_days: result.leaveType.min_notice_days,
                            requires_document: result.leaveType.requires_document,
                            requires_approval: result.leaveType.requires_approval,
                            half_day_allowed: result.leaveType.half_day_allowed,
                            gender_specific: result.leaveType.gender_specific as 'M' | 'F' | 'O' | null,
                            carry_forward: result.leaveType.carry_forward,
                            max_carry_forward: result.leaveType.max_carry_forward ?? 0,
                            is_paid: result.leaveType.is_paid,
                        };
                        setLeaveTypes(prev => [...prev.filter(t => t.code !== lt.code), newLt]);
                        successes.push(`Added leave type: ${lt.name}`);
                    } else {
                        errors.push(`Add ${lt.name}: ${result.error}`);
                    }
                }
                
                // Update existing leave types
                for (const { id, data } of pendingLeaveTypeChanges.updated) {
                    const result = await updateLeaveType(id, data);
                    if (result.success) {
                        setLeaveTypes(prev => prev.map(lt => 
                            lt.id === id ? { ...lt, ...data } as LeaveType : lt
                        ));
                        successes.push(`Updated leave type`);
                    } else {
                        errors.push(`Update: ${result.error}`);
                    }
                }
                
                // Delete leave types
                for (const id of pendingLeaveTypeChanges.deleted) {
                    const result = await deleteLeaveType(id);
                    if (result.success) {
                        setLeaveTypes(prev => prev.filter(lt => lt.id !== id));
                        successes.push(`Deleted leave type`);
                    } else {
                        errors.push(`Delete: ${result.error}`);
                    }
                }
                
                // Save constraint rule changes
                for (const { rule_id, is_active } of pendingRuleChanges.toggled) {
                    const result = await toggleRuleStatus(rule_id, is_active);
                    if (result.success) {
                        successes.push(`${is_active ? 'Enabled' : 'Disabled'} rule`);
                    } else {
                        errors.push(`Rule toggle: ${result.error}`);
                    }
                }
                
                for (const { rule_id, config } of pendingRuleChanges.updated) {
                    const result = await updateRuleConfig(rule_id, { config });
                    if (result.success) {
                        successes.push(`Updated rule config`);
                    } else {
                        errors.push(`Rule update: ${result.error}`);
                    }
                }
                
                // Clear pending changes
                setPendingLeaveTypeChanges({ added: [], updated: [], deleted: [] });
                setPendingRuleChanges({ toggled: [], updated: [] });
                
                // Update original values
                setOriginalLeaveTypes(JSON.parse(JSON.stringify(leaveTypes)));
                setOriginalConstraintRules(JSON.parse(JSON.stringify(constraintRules)));
                
                // Show result
                if (errors.length === 0) {
                    setSuccess(`✅ All changes saved successfully! (${successes.length} items)`);
                } else if (successes.length > 0) {
                    setSuccess(`⚠️ Partially saved. Successes: ${successes.join(", ")}. Errors: ${errors.join("; ")}`);
                } else {
                    setError(`Failed to save: ${errors.join("; ")}`);
                }
            } catch (err: any) {
                setError(err.message || "Failed to save changes");
            } finally {
                setSaving(null);
            }
        });
    };

    // Discard all changes
    const handleDiscardChanges = () => {
        if (originalWorkSchedule) setWorkSchedule(JSON.parse(JSON.stringify(originalWorkSchedule)));
        if (originalLeaveSettings) setLeaveSettings(JSON.parse(JSON.stringify(originalLeaveSettings)));
        if (originalApprovalSettings) setApprovalSettings(JSON.parse(JSON.stringify(originalApprovalSettings)));
        setLeaveTypes(JSON.parse(JSON.stringify(originalLeaveTypes)));
        setConstraintRules(JSON.parse(JSON.stringify(originalConstraintRules)));
        setPendingLeaveTypeChanges({ added: [], updated: [], deleted: [] });
        setPendingRuleChanges({ toggled: [], updated: [] });
        setSuccess("Changes discarded");
    };

    // Handle constraint rule toggle (just update local state, save on "Save All")
    const handleToggleRule = (rule: ConstraintRule) => {
        const newStatus = !rule.is_active;
        
        // Update local state
        setConstraintRules(prev => prev.map(r => 
            r.rule_id === rule.rule_id ? { ...r, is_active: newStatus } : r
        ));
        
        // Track pending change (remove if reverting to original)
        const originalRule = originalConstraintRules.find(r => r.rule_id === rule.rule_id);
        if (originalRule?.is_active === newStatus) {
            // Reverted to original - remove from pending
            setPendingRuleChanges(prev => ({
                ...prev,
                toggled: prev.toggled.filter(t => t.rule_id !== rule.rule_id)
            }));
        } else {
            // Changed from original - add/update pending
            setPendingRuleChanges(prev => ({
                ...prev,
                toggled: [
                    ...prev.toggled.filter(t => t.rule_id !== rule.rule_id),
                    { rule_id: rule.rule_id, is_active: newStatus }
                ]
            }));
        }
    };

    // Handle tab change with unsaved changes check
    const handleTabChange = (newTab: string) => {
        if (hasUnsavedChanges()) {
            setPendingTabChange(newTab);
            setShowUnsavedDialog(true);
        } else {
            setActiveTab(newTab);
        }
    };

    // Leave Type handlers - NO OTP here, just update local state
    const handleAddLeaveType = () => {
        setEditingLeaveType(null);
        setLeaveTypeForm({
            code: "",
            name: "",
            description: "",
            color: "#6366f1",
            annual_quota: 12,
            max_consecutive: 5,
            min_notice_days: 1,
            requires_document: false,
            requires_approval: true,
            half_day_allowed: true,
            carry_forward: false,
            max_carry_forward: 0,
            is_paid: true,
        });
        setShowLeaveTypeDialog(true);
    };

    const handleEditLeaveType = (lt: LeaveType) => {
        setEditingLeaveType(lt);
        setLeaveTypeForm({
            code: lt.code,
            name: lt.name,
            description: lt.description || "",
            color: lt.color,
            annual_quota: lt.annual_quota,
            max_consecutive: lt.max_consecutive,
            min_notice_days: lt.min_notice_days,
            requires_document: lt.requires_document,
            requires_approval: lt.requires_approval,
            half_day_allowed: lt.half_day_allowed,
            gender_specific: lt.gender_specific,
            carry_forward: lt.carry_forward,
            max_carry_forward: lt.max_carry_forward,
            is_paid: lt.is_paid,
        });
        setShowLeaveTypeDialog(true);
    };

    // Save leave type to PENDING changes (not to DB yet)
    const handleSaveLeaveType = async () => {
        // Validate form
        if (!leaveTypeForm.code || !leaveTypeForm.name) {
            setError("Code and Name are required");
            return;
        }
        
        if (editingLeaveType) {
            // Mark as updated in pending changes
            setPendingLeaveTypeChanges(prev => ({
                ...prev,
                updated: [
                    ...prev.updated.filter(u => u.id !== editingLeaveType.id),
                    { id: editingLeaveType.id, data: leaveTypeForm }
                ]
            }));
            // Update local display
            setLeaveTypes(prev => prev.map(lt => 
                lt.id === editingLeaveType.id 
                    ? { ...lt, ...leaveTypeForm } as LeaveType
                    : lt
            ));
            setSuccess("Leave type updated (pending save)");
        } else {
            // Check for duplicate code
            if (leaveTypes.some(lt => lt.code === leaveTypeForm.code.toUpperCase())) {
                setError(`Leave type with code '${leaveTypeForm.code}' already exists`);
                return;
            }
            // Add to pending changes
            setPendingLeaveTypeChanges(prev => ({
                ...prev,
                added: [...prev.added, leaveTypeForm]
            }));
            // Add to local display with temp ID
            const tempLt: LeaveType = {
                id: `temp-${Date.now()}`,
                code: leaveTypeForm.code.toUpperCase(),
                name: leaveTypeForm.name,
                description: leaveTypeForm.description,
                color: leaveTypeForm.color || "#6366f1",
                annual_quota: leaveTypeForm.annual_quota,
                max_consecutive: leaveTypeForm.max_consecutive || 5,
                min_notice_days: leaveTypeForm.min_notice_days || 1,
                requires_document: leaveTypeForm.requires_document || false,
                requires_approval: leaveTypeForm.requires_approval ?? true,
                half_day_allowed: leaveTypeForm.half_day_allowed ?? true,
                gender_specific: leaveTypeForm.gender_specific || null,
                carry_forward: leaveTypeForm.carry_forward || false,
                max_carry_forward: leaveTypeForm.max_carry_forward || 0,
                is_paid: leaveTypeForm.is_paid ?? true,
            };
            setLeaveTypes(prev => [...prev, tempLt]);
            setSuccess("Leave type added (pending save)");
        }
        setShowLeaveTypeDialog(false);
    };

    // Mark leave type for deletion (pending)
    const handleDeleteLeaveType = async (id: string) => {
        if (!confirm("Are you sure you want to delete this leave type?")) return;
        
        // Check if it's a temp (newly added) item
        if (id.startsWith('temp-')) {
            // Just remove from pending added
            const ltToRemove = leaveTypes.find(lt => lt.id === id);
            if (ltToRemove) {
                setPendingLeaveTypeChanges(prev => ({
                    ...prev,
                    added: prev.added.filter(a => a.code !== ltToRemove.code)
                }));
            }
        } else {
            // Mark for deletion
            setPendingLeaveTypeChanges(prev => ({
                ...prev,
                deleted: [...prev.deleted, id]
            }));
        }
        
        // Remove from local display
        setLeaveTypes(prev => prev.filter(lt => lt.id !== id));
        setSuccess("Leave type marked for deletion (pending save)");
    };

    // Toggle work day
    const toggleWorkDay = (day: number) => {
        setWorkSchedule(prev => ({
            ...prev,
            work_days: prev.work_days.includes(day)
                ? prev.work_days.filter(d => d !== day)
                : [...prev.work_days, day].sort((a, b) => a - b)
        }));
    };

    // Toggle auto-approve leave type
    const toggleAutoApproveLeaveType = (code: string) => {
        setApprovalSettings(prev => ({
            ...prev,
            auto_approve_leave_types: prev.auto_approve_leave_types.includes(code)
                ? prev.auto_approve_leave_types.filter(c => c !== code)
                : [...prev.auto_approve_leave_types, code]
        }));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-24">
            {/* OTP Verification Dialog */}
            <Dialog open={showOtpDialog} onOpenChange={setShowOtpDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5 text-purple-500" />
                            Security Verification Required
                        </DialogTitle>
                        <DialogDescription>
                            For your security, please enter the 6-digit verification code sent to your email.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4 py-4">
                        {/* Security Badge */}
                        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3 flex items-start gap-3">
                            <Lock className="h-5 w-5 text-purple-500 mt-0.5" />
                            <div className="text-sm">
                                <p className="font-medium text-purple-700 dark:text-purple-300">
                                    Why verification?
                                </p>
                                <p className="text-purple-600 dark:text-purple-400 mt-1">
                                    Changing company settings affects all employees. OTP verification ensures only authorized personnel can make these changes.
                                </p>
                            </div>
                        </div>
                        
                        {/* OTP Input */}
                        <div className="space-y-2">
                            <Label htmlFor="otp-code" className="flex items-center gap-2">
                                <KeyRound className="h-4 w-4" />
                                Verification Code
                            </Label>
                            <Input
                                id="otp-code"
                                type="text"
                                maxLength={6}
                                placeholder="Enter 6-digit code"
                                value={otpCode}
                                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                className="text-center text-2xl tracking-[0.5em] font-mono"
                                autoFocus
                            />
                            {otpState.expiresAt && (
                                <p className="text-xs text-gray-500 flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    Code expires at {otpState.expiresAt.toLocaleTimeString()}
                                </p>
                            )}
                        </div>
                        
                        {/* Error Message */}
                        {otpState.error && (
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 text-red-500" />
                                <p className="text-sm text-red-700 dark:text-red-300">{otpState.error}</p>
                            </div>
                        )}
                    </div>
                    
                    <DialogFooter className="flex gap-2">
                        <Button 
                            variant="outline" 
                            onClick={() => {
                                setShowOtpDialog(false);
                                setOtpCode("");
                                setOtpState(prev => ({ ...prev, error: null }));
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={verifyOtpAndProceed}
                            disabled={otpState.isVerifying || otpCode.length !== 6}
                            className="bg-purple-600 hover:bg-purple-700"
                        >
                            {otpState.isVerifying ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    Verifying...
                                </>
                            ) : (
                                <>
                                    <Check className="h-4 w-4 mr-2" />
                                    Verify & Save
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Unsaved Changes Dialog */}
            <Dialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-amber-500" />
                            Unsaved Changes
                        </DialogTitle>
                        <DialogDescription>
                            You have unsaved changes. What would you like to do?
                        </DialogDescription>
                    </DialogHeader>
                    
                    <DialogFooter className="flex gap-2 sm:justify-between">
                        <Button 
                            variant="outline" 
                            onClick={() => {
                                setShowUnsavedDialog(false);
                                setPendingTabChange(null);
                            }}
                        >
                            Continue Editing
                        </Button>
                        <div className="flex gap-2">
                            <Button
                                variant="destructive"
                                onClick={() => {
                                    handleDiscardChanges();
                                    setShowUnsavedDialog(false);
                                    if (pendingTabChange) {
                                        setActiveTab(pendingTabChange);
                                        setPendingTabChange(null);
                                    }
                                }}
                            >
                                <RotateCcw className="h-4 w-4 mr-2" />
                                Discard
                            </Button>
                            <Button
                                className="bg-purple-600 hover:bg-purple-700"
                                onClick={() => {
                                    setShowUnsavedDialog(false);
                                    handleSaveAllChanges();
                                }}
                            >
                                <Save className="h-4 w-4 mr-2" />
                                Save All
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Company Settings</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Configure work schedules, leave types, and approval rules
                    </p>
                </div>
                {/* Security Badge */}
                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-full">
                    <ShieldCheck className="h-4 w-4 text-green-500" />
                    <span className="text-xs font-medium text-green-700 dark:text-green-300">OTP Protected</span>
                </div>
            </div>

            {/* Unsaved Changes Banner */}
            {hasUnsavedChanges() && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex items-center justify-between"
                >
                    <div className="flex items-center gap-3">
                        <AlertCircle className="h-5 w-5 text-amber-500" />
                        <p className="text-amber-700 dark:text-amber-300 font-medium">
                            You have unsaved changes
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={handleDiscardChanges}>
                            <RotateCcw className="h-4 w-4 mr-1" />
                            Discard
                        </Button>
                        <Button 
                            size="sm" 
                            className="bg-purple-600 hover:bg-purple-700"
                            onClick={handleSaveAllChanges}
                            disabled={saving === "all" || otpState.isSending}
                        >
                            {saving === "all" || otpState.isSending ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                            ) : (
                                <Save className="h-4 w-4 mr-1" />
                            )}
                            Save All Changes
                        </Button>
                    </div>
                </motion.div>
            )}

            {/* Alerts */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center gap-3"
                    >
                        <AlertCircle className="h-5 w-5 text-red-500" />
                        <p className="text-red-700 dark:text-red-300">{error}</p>
                        <button onClick={() => setError(null)} className="ml-auto" title="Dismiss error">
                            <X className="h-4 w-4 text-red-500" />
                        </button>
                    </motion.div>
                )}
                
                {success && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-center gap-3"
                    >
                        <Check className="h-5 w-5 text-green-500" />
                        <p className="text-green-700 dark:text-green-300">{success}</p>
                        <button onClick={() => setSuccess(null)} className="ml-auto" title="Dismiss message">
                            <X className="h-4 w-4 text-green-500" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Tabs */}
            <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
                <TabsList className="bg-gray-100 dark:bg-gray-800/50 p-1 rounded-lg flex-wrap">
                    <TabsTrigger value="workSchedule" className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Work Schedule
                    </TabsTrigger>
                    <TabsTrigger value="leaveSettings" className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Leave Settings
                    </TabsTrigger>
                    <TabsTrigger value="leaveTypes" className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Leave Types
                    </TabsTrigger>
                    <TabsTrigger value="constraintRules" className="flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        Constraint Rules
                    </TabsTrigger>
                    <TabsTrigger value="approval" className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Approval Rules
                    </TabsTrigger>
                </TabsList>

                {/* Work Schedule Tab */}
                <TabsContent value="workSchedule">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Clock className="h-5 w-5 text-purple-500" />
                                Work Schedule Configuration
                            </CardTitle>
                            <CardDescription>
                                Define your company's standard working hours and days
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Working Hours */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label>Work Start Time</Label>
                                    <Input
                                        type="time"
                                        value={workSchedule.work_start_time}
                                        onChange={(e) => setWorkSchedule(prev => ({ ...prev, work_start_time: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Work End Time</Label>
                                    <Input
                                        type="time"
                                        value={workSchedule.work_end_time}
                                        onChange={(e) => setWorkSchedule(prev => ({ ...prev, work_end_time: e.target.value }))}
                                    />
                                </div>
                            </div>

                            {/* Grace Period & Hours */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <Label>Grace Period (minutes)</Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        max={60}
                                        value={workSchedule.grace_period_mins}
                                        onChange={(e) => setWorkSchedule(prev => ({ ...prev, grace_period_mins: parseInt(e.target.value) || 0 }))}
                                    />
                                    <p className="text-xs text-gray-500">Allowed late arrival time</p>
                                </div>
                                <div className="space-y-2">
                                    <Label>Half Day Hours</Label>
                                    <Input
                                        type="number"
                                        min={1}
                                        max={12}
                                        value={workSchedule.half_day_hours}
                                        onChange={(e) => setWorkSchedule(prev => ({ ...prev, half_day_hours: parseInt(e.target.value) || 4 }))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Full Day Hours</Label>
                                    <Input
                                        type="number"
                                        min={1}
                                        max={24}
                                        value={workSchedule.full_day_hours}
                                        onChange={(e) => setWorkSchedule(prev => ({ ...prev, full_day_hours: parseInt(e.target.value) || 8 }))}
                                    />
                                </div>
                            </div>

                            {/* Work Days */}
                            <div className="space-y-2">
                                <Label>Working Days</Label>
                                <div className="flex flex-wrap gap-2">
                                    {DAYS_OF_WEEK.map((day) => (
                                        <button
                                            key={day.value}
                                            onClick={() => toggleWorkDay(day.value)}
                                            className={cn(
                                                "px-4 py-2 rounded-lg border transition-colors",
                                                workSchedule.work_days.includes(day.value)
                                                    ? "bg-purple-500 text-white border-purple-500"
                                                    : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-purple-500"
                                            )}
                                        >
                                            {day.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Timezone */}
                            <div className="space-y-2">
                                <Label>Timezone</Label>
                                <Select
                                    value={workSchedule.timezone}
                                    onValueChange={(value) => setWorkSchedule(prev => ({ ...prev, timezone: value }))}
                                >
                                    <SelectTrigger className="w-full md:w-[300px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {TIMEZONES.map(tz => (
                                            <SelectItem key={tz.value} value={tz.value}>
                                                {tz.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Leave Settings Tab */}
                <TabsContent value="leaveSettings">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Calendar className="h-5 w-5 text-purple-500" />
                                Leave Policy Settings
                            </CardTitle>
                            <CardDescription>
                                Configure leave year and carry forward policies
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label>Leave Year Start</Label>
                                    <Select
                                        value={leaveSettings.leave_year_start}
                                        onValueChange={(value) => setLeaveSettings(prev => ({ ...prev, leave_year_start: value }))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="01-01">January (Calendar Year)</SelectItem>
                                            <SelectItem value="04-01">April (Fiscal Year - India)</SelectItem>
                                            <SelectItem value="07-01">July</SelectItem>
                                            <SelectItem value="10-01">October</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-gray-500">When does your leave year reset?</p>
                                </div>
                                <div className="space-y-2">
                                    <Label>Maximum Carry Forward Days</Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        max={60}
                                        value={leaveSettings.carry_forward_max}
                                        onChange={(e) => setLeaveSettings(prev => ({ ...prev, carry_forward_max: parseInt(e.target.value) || 0 }))}
                                    />
                                    <p className="text-xs text-gray-500">Max days that can be carried to next year</p>
                                </div>
                            </div>

                            <div className="space-y-4 border-t pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label>Allow Leave During Probation</Label>
                                        <p className="text-sm text-gray-500">Employees can take leave during probation period</p>
                                    </div>
                                    <Switch
                                        checked={leaveSettings.probation_leave}
                                        onCheckedChange={(checked) => setLeaveSettings(prev => ({ ...prev, probation_leave: checked }))}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label>Allow Negative Balance</Label>
                                        <p className="text-sm text-gray-500">Employees can take leave beyond their quota</p>
                                    </div>
                                    <Switch
                                        checked={leaveSettings.negative_balance}
                                        onCheckedChange={(checked) => setLeaveSettings(prev => ({ ...prev, negative_balance: checked }))}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Leave Types Tab */}
                <TabsContent value="leaveTypes">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        <FileText className="h-5 w-5 text-purple-500" />
                                        Leave Types
                                    </CardTitle>
                                    <CardDescription>
                                        Manage different types of leave available to employees
                                    </CardDescription>
                                </div>
                                <Button onClick={handleAddLeaveType} className="bg-purple-500 hover:bg-purple-600">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Leave Type
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {leaveTypes.length === 0 ? (
                                    <div className="text-center py-12 text-gray-500">
                                        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                        <p>No leave types configured</p>
                                        <p className="text-sm">Add your first leave type to get started</p>
                                    </div>
                                ) : (
                                    leaveTypes.map((lt) => (
                                        <div
                                            key={lt.id}
                                            className="flex items-center justify-between p-4 rounded-lg border bg-white dark:bg-gray-800/50"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div
                                                    className="w-4 h-4 rounded-full"
                                                    style={{ backgroundColor: lt.color }}
                                                />
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium">{lt.name}</span>
                                                        <Badge variant="outline" className="text-xs">{lt.code}</Badge>
                                                        {lt.is_paid ? (
                                                            <Badge className="bg-green-100 text-green-700 text-xs">Paid</Badge>
                                                        ) : (
                                                            <Badge className="bg-gray-100 text-gray-700 text-xs">Unpaid</Badge>
                                                        )}
                                                        {lt.gender_specific && (
                                                            <Badge variant="outline" className="text-xs">
                                                                {lt.gender_specific === 'F' ? 'Female' : lt.gender_specific === 'M' ? 'Male' : 'Other'}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-gray-500 mt-1">
                                                        {lt.annual_quota} days/year • Max {lt.max_consecutive} consecutive • {lt.min_notice_days} days notice
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleEditLeaveType(lt)}
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDeleteLeaveType(lt.id)}
                                                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Approval Rules Tab */}
                <TabsContent value="approval">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Shield className="h-5 w-5 text-purple-500" />
                                Approval & Escalation Rules
                            </CardTitle>
                            <CardDescription>
                                Configure auto-approval and escalation policies
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Auto-Approve Settings */}
                            <div className="space-y-4">
                                <h3 className="font-semibold text-lg">Auto-Approval Settings</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label>Auto-Approve Up To (days)</Label>
                                        <Input
                                            type="number"
                                            min={0}
                                            max={30}
                                            value={approvalSettings.auto_approve_max_days}
                                            onChange={(e) => setApprovalSettings(prev => ({ ...prev, auto_approve_max_days: parseInt(e.target.value) || 0 }))}
                                        />
                                        <p className="text-xs text-gray-500">Requests up to this many days can be auto-approved</p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Minimum Notice Required (days)</Label>
                                        <Input
                                            type="number"
                                            min={0}
                                            max={30}
                                            value={approvalSettings.auto_approve_min_notice}
                                            onChange={(e) => setApprovalSettings(prev => ({ ...prev, auto_approve_min_notice: parseInt(e.target.value) || 0 }))}
                                        />
                                        <p className="text-xs text-gray-500">For auto-approval, must apply this many days in advance</p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Leave Types Eligible for Auto-Approval</Label>
                                    <div className="flex flex-wrap gap-2">
                                        {leaveTypes.map((lt) => (
                                            <button
                                                key={lt.code}
                                                onClick={() => toggleAutoApproveLeaveType(lt.code)}
                                                className={cn(
                                                    "px-3 py-1.5 rounded-full text-sm transition-colors",
                                                    approvalSettings.auto_approve_leave_types.includes(lt.code)
                                                        ? "bg-purple-500 text-white"
                                                        : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200"
                                                )}
                                            >
                                                {lt.code}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Escalation Settings */}
                            <div className="space-y-4 border-t pt-6">
                                <h3 className="font-semibold text-lg">Escalation Rules</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label>Escalate Requests Above (days)</Label>
                                        <Input
                                            type="number"
                                            min={1}
                                            max={90}
                                            value={approvalSettings.escalate_above_days}
                                            onChange={(e) => setApprovalSettings(prev => ({ ...prev, escalate_above_days: parseInt(e.target.value) || 5 }))}
                                        />
                                        <p className="text-xs text-gray-500">Requests longer than this require higher approval</p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Require Document Above (days)</Label>
                                        <Input
                                            type="number"
                                            min={0}
                                            max={30}
                                            value={approvalSettings.require_document_above_days}
                                            onChange={(e) => setApprovalSettings(prev => ({ ...prev, require_document_above_days: parseInt(e.target.value) || 3 }))}
                                        />
                                        <p className="text-xs text-gray-500">Supporting documents required for longer leaves</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <Label>Escalate Consecutive Leaves</Label>
                                            <p className="text-sm text-gray-500">Escalate if employee takes leave frequently</p>
                                        </div>
                                        <Switch
                                            checked={approvalSettings.escalate_consecutive_leaves}
                                            onCheckedChange={(checked) => setApprovalSettings(prev => ({ ...prev, escalate_consecutive_leaves: checked }))}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <Label>Escalate Low Balance</Label>
                                            <p className="text-sm text-gray-500">Escalate when remaining balance is low</p>
                                        </div>
                                        <Switch
                                            checked={approvalSettings.escalate_low_balance}
                                            onCheckedChange={(checked) => setApprovalSettings(prev => ({ ...prev, escalate_low_balance: checked }))}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Team Coverage Settings */}
                            <div className="space-y-4 border-t pt-6">
                                <h3 className="font-semibold text-lg">Team Coverage</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label>Maximum Concurrent Leaves</Label>
                                        <Input
                                            type="number"
                                            min={1}
                                            max={50}
                                            value={approvalSettings.max_concurrent_leaves}
                                            onChange={(e) => setApprovalSettings(prev => ({ ...prev, max_concurrent_leaves: parseInt(e.target.value) || 3 }))}
                                        />
                                        <p className="text-xs text-gray-500">Max employees on leave at the same time</p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Minimum Team Coverage</Label>
                                        <Input
                                            type="number"
                                            min={1}
                                            max={20}
                                            value={approvalSettings.min_team_coverage}
                                            onChange={(e) => setApprovalSettings(prev => ({ ...prev, min_team_coverage: parseInt(e.target.value) || 2 }))}
                                        />
                                        <p className="text-xs text-gray-500">Minimum team members must be present</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Constraint Rules Tab */}
                <TabsContent value="constraintRules">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Zap className="h-5 w-5 text-purple-500" />
                                Leave Constraint Rules
                            </CardTitle>
                            <CardDescription>
                                Configure validation rules for leave requests. Toggle rules on/off to enable/disable them.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {constraintRules.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                    <p>No constraint rules configured</p>
                                    <p className="text-sm">Rules are automatically created during onboarding</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Stats */}
                                    <div className="flex gap-4 mb-6 text-sm">
                                        <Badge variant="outline" className="px-3 py-1">
                                            {constraintRules.length} Total Rules
                                        </Badge>
                                        <Badge variant="outline" className="px-3 py-1 bg-green-50 text-green-700 border-green-200">
                                            {constraintRules.filter(r => r.is_active).length} Active
                                        </Badge>
                                        <Badge variant="outline" className="px-3 py-1 bg-amber-50 text-amber-700 border-amber-200">
                                            {constraintRules.filter(r => r.is_blocking).length} Blocking
                                        </Badge>
                                    </div>

                                    {/* Rules by Category */}
                                    {Object.entries(groupedConstraintRules).map(([category, rules]) => (
                                        <div key={category} className="border rounded-lg overflow-hidden">
                                            <button
                                                onClick={() => {
                                                    setExpandedRuleCategories(prev => {
                                                        const next = new Set(prev);
                                                        if (next.has(category)) next.delete(category);
                                                        else next.add(category);
                                                        return next;
                                                    });
                                                }}
                                                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium capitalize">{category}</span>
                                                    <Badge variant="secondary" className="text-xs">
                                                        {rules.length}
                                                    </Badge>
                                                </div>
                                                {expandedRuleCategories.has(category) ? (
                                                    <ChevronDown className="h-4 w-4" />
                                                ) : (
                                                    <ChevronRight className="h-4 w-4" />
                                                )}
                                            </button>
                                            
                                            {expandedRuleCategories.has(category) && (
                                                <div className="divide-y">
                                                    {rules.map(rule => (
                                                        <div 
                                                            key={rule.rule_id} 
                                                            className={cn(
                                                                "p-4 flex items-start justify-between gap-4",
                                                                !rule.is_active && "opacity-50 bg-gray-50 dark:bg-gray-900/50"
                                                            )}
                                                        >
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2">
                                                                    <h4 className="font-medium">{rule.name}</h4>
                                                                    {rule.is_blocking && (
                                                                        <Badge variant="destructive" className="text-xs">
                                                                            Blocking
                                                                        </Badge>
                                                                    )}
                                                                    {rule.is_custom && (
                                                                        <Badge variant="secondary" className="text-xs">
                                                                            Custom
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                                <p className="text-sm text-gray-500 mt-1">
                                                                    {rule.description}
                                                                </p>
                                                            </div>
                                                            <button
                                                                onClick={() => handleToggleRule(rule)}
                                                                className={cn(
                                                                    "flex-shrink-0 transition-colors",
                                                                    rule.is_active 
                                                                        ? "text-green-500 hover:text-green-600" 
                                                                        : "text-gray-400 hover:text-gray-500"
                                                                )}
                                                                title={rule.is_active ? "Disable rule" : "Enable rule"}
                                                            >
                                                                {rule.is_active ? (
                                                                    <ToggleRight className="h-8 w-8" />
                                                                ) : (
                                                                    <ToggleLeft className="h-8 w-8" />
                                                                )}
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Sticky Save Footer - Only show when there are unsaved changes */}
            {hasUnsavedChanges() && (
                <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 p-4 shadow-lg z-50">
                    <div className="max-w-5xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <AlertCircle className="h-5 w-5 text-amber-500" />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                You have unsaved changes
                            </span>
                        </div>
                        <div className="flex gap-3">
                            <Button variant="outline" onClick={handleDiscardChanges}>
                                <RotateCcw className="h-4 w-4 mr-2" />
                                Discard Changes
                            </Button>
                            <Button 
                                className="bg-purple-600 hover:bg-purple-700"
                                onClick={handleSaveAllChanges}
                                disabled={saving === "all" || otpState.isSending}
                            >
                                {saving === "all" || otpState.isSending ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save className="h-4 w-4 mr-2" />
                                        Save All Changes (OTP Required)
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Leave Type Dialog */}
            <Dialog open={showLeaveTypeDialog} onOpenChange={setShowLeaveTypeDialog}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {editingLeaveType ? "Edit Leave Type" : "Add Leave Type"}
                        </DialogTitle>
                        <DialogDescription>
                            Configure the properties for this leave type
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Leave Code</Label>
                                <Input
                                    value={leaveTypeForm.code}
                                    onChange={(e) => setLeaveTypeForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                                    placeholder="CL"
                                    maxLength={5}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Leave Name</Label>
                                <Input
                                    value={leaveTypeForm.name}
                                    onChange={(e) => setLeaveTypeForm(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="Casual Leave"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea
                                value={leaveTypeForm.description || ""}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setLeaveTypeForm(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="For personal matters and emergencies"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Color</Label>
                            <div className="flex gap-2">
                                {LEAVE_TYPE_COLORS.map(color => (
                                    <button
                                        key={color}
                                        onClick={() => setLeaveTypeForm(prev => ({ ...prev, color }))}
                                        className={cn(
                                            "w-8 h-8 rounded-full transition-transform",
                                            leaveTypeForm.color === color && "ring-2 ring-offset-2 ring-purple-500 scale-110"
                                        )}
                                        style={{ backgroundColor: color }}
                                        title={`Select color ${color}`}
                                        aria-label={`Select color ${color}`}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>Annual Quota</Label>
                                <Input
                                    type="number"
                                    min={0}
                                    value={leaveTypeForm.annual_quota}
                                    onChange={(e) => setLeaveTypeForm(prev => ({ ...prev, annual_quota: parseInt(e.target.value) || 0 }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Max Consecutive</Label>
                                <Input
                                    type="number"
                                    min={1}
                                    value={leaveTypeForm.max_consecutive || 5}
                                    onChange={(e) => setLeaveTypeForm(prev => ({ ...prev, max_consecutive: parseInt(e.target.value) || 5 }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Min Notice Days</Label>
                                <Input
                                    type="number"
                                    min={0}
                                    value={leaveTypeForm.min_notice_days || 0}
                                    onChange={(e) => setLeaveTypeForm(prev => ({ ...prev, min_notice_days: parseInt(e.target.value) || 0 }))}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Gender Specific</Label>
                            <Select
                                value={leaveTypeForm.gender_specific || "all"}
                                onValueChange={(value) => setLeaveTypeForm(prev => ({ 
                                    ...prev, 
                                    gender_specific: value === "all" ? null : value as 'M' | 'F' | 'O'
                                }))}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Employees</SelectItem>
                                    <SelectItem value="F">Female Only</SelectItem>
                                    <SelectItem value="M">Male Only</SelectItem>
                                    <SelectItem value="O">Other Only</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center justify-between p-3 border rounded-lg">
                                <Label>Paid Leave</Label>
                                <Switch
                                    checked={leaveTypeForm.is_paid}
                                    onCheckedChange={(checked) => setLeaveTypeForm(prev => ({ ...prev, is_paid: checked }))}
                                />
                            </div>
                            <div className="flex items-center justify-between p-3 border rounded-lg">
                                <Label>Requires Document</Label>
                                <Switch
                                    checked={leaveTypeForm.requires_document}
                                    onCheckedChange={(checked) => setLeaveTypeForm(prev => ({ ...prev, requires_document: checked }))}
                                />
                            </div>
                            <div className="flex items-center justify-between p-3 border rounded-lg">
                                <Label>Requires Approval</Label>
                                <Switch
                                    checked={leaveTypeForm.requires_approval}
                                    onCheckedChange={(checked) => setLeaveTypeForm(prev => ({ ...prev, requires_approval: checked }))}
                                />
                            </div>
                            <div className="flex items-center justify-between p-3 border rounded-lg">
                                <Label>Half Day Allowed</Label>
                                <Switch
                                    checked={leaveTypeForm.half_day_allowed}
                                    onCheckedChange={(checked) => setLeaveTypeForm(prev => ({ ...prev, half_day_allowed: checked }))}
                                />
                            </div>
                        </div>

                        <div className="space-y-4 border-t pt-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label>Allow Carry Forward</Label>
                                    <p className="text-xs text-gray-500">Unused days can be carried to next year</p>
                                </div>
                                <Switch
                                    checked={leaveTypeForm.carry_forward}
                                    onCheckedChange={(checked) => setLeaveTypeForm(prev => ({ ...prev, carry_forward: checked }))}
                                />
                            </div>
                            {leaveTypeForm.carry_forward && (
                                <div className="space-y-2">
                                    <Label>Max Carry Forward Days</Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        value={leaveTypeForm.max_carry_forward || 0}
                                        onChange={(e) => setLeaveTypeForm(prev => ({ ...prev, max_carry_forward: parseInt(e.target.value) || 0 }))}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowLeaveTypeDialog(false)}>
                            Cancel
                        </Button>
                        <Button 
                            onClick={handleSaveLeaveType}
                            disabled={saving === "leaveType" || !leaveTypeForm.code || !leaveTypeForm.name}
                            className="bg-purple-500 hover:bg-purple-600"
                        >
                            {saving === "leaveType" ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <Check className="h-4 w-4 mr-2" />
                            )}
                            {editingLeaveType ? "Update" : "Create"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
