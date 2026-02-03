"use server";

import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// Alias for compatibility during Clerk to Supabase migration
const currentUser = getUser;

// Types for notification settings
export interface NotificationSettings {
    email_checkin_reminder: boolean;
    email_checkout_reminder: boolean;
    email_hr_missing_alerts: boolean;
    email_leave_notifications: boolean;
    email_approval_reminders: boolean;
    checkin_reminder_1_mins: number;
    checkin_reminder_2_mins: number;
    checkout_reminder_1_mins: number;
    checkout_reminder_2_mins: number;
}

const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
    email_checkin_reminder: true,
    email_checkout_reminder: true,
    email_hr_missing_alerts: true,
    email_leave_notifications: true,
    email_approval_reminders: true,
    checkin_reminder_1_mins: 10,
    checkin_reminder_2_mins: 60,
    checkout_reminder_1_mins: 60,
    checkout_reminder_2_mins: 10,
};

// Verify HR/Admin access
async function verifyHRAccess() {
    const user = await currentUser();
    if (!user) return { success: false, error: "Unauthorized" };
    
    const employee = await prisma.employee.findUnique({
        where: { clerk_id: user.id },
        select: { emp_id: true, role: true, org_id: true }
    });
    
    if (!employee || (employee.role !== 'hr' && employee.role !== 'admin')) {
        return { success: false, error: "HR access required" };
    }
    
    if (!employee.org_id) {
        return { success: false, error: "No organization found" };
    }
    
    return { success: true, employee };
}

// Get notification settings for company
export async function getNotificationSettings(): Promise<{
    success: boolean;
    settings?: NotificationSettings;
    error?: string;
}> {
    const authResult = await verifyHRAccess();
    if (!authResult.success) return authResult as any;
    
    const { employee } = authResult;
    
    try {
        const companySettings = await prisma.companySettings.findUnique({
            where: { company_id: employee!.org_id! }
        });
        
        if (!companySettings) {
            // Return defaults if no settings exist
            return { success: true, settings: DEFAULT_NOTIFICATION_SETTINGS };
        }
        
        return { 
            success: true, 
            settings: {
                email_checkin_reminder: companySettings.email_checkin_reminder,
                email_checkout_reminder: companySettings.email_checkout_reminder,
                email_hr_missing_alerts: companySettings.email_hr_missing_alerts,
                email_leave_notifications: companySettings.email_leave_notifications,
                email_approval_reminders: companySettings.email_approval_reminders,
                checkin_reminder_1_mins: companySettings.checkin_reminder_1_mins,
                checkin_reminder_2_mins: companySettings.checkin_reminder_2_mins,
                checkout_reminder_1_mins: companySettings.checkout_reminder_1_mins,
                checkout_reminder_2_mins: companySettings.checkout_reminder_2_mins,
            }
        };
        
    } catch (error: any) {
        console.error("[getNotificationSettings] Error:", error);
        return { success: false, error: error.message || "Failed to fetch notification settings" };
    }
}

// Update notification settings
export async function updateNotificationSettings(settings: Partial<NotificationSettings>): Promise<{
    success: boolean;
    error?: string;
}> {
    const authResult = await verifyHRAccess();
    if (!authResult.success) return authResult as any;
    
    const { employee } = authResult;
    
    try {
        await prisma.companySettings.upsert({
            where: { company_id: employee!.org_id! },
            create: {
                company_id: employee!.org_id!,
                ...DEFAULT_NOTIFICATION_SETTINGS,
                ...settings,
            },
            update: settings
        });
        
        revalidatePath("/hr/settings");
        revalidatePath("/hr/notification-settings");
        
        return { success: true };
        
    } catch (error: any) {
        console.error("[updateNotificationSettings] Error:", error);
        return { success: false, error: error.message || "Failed to update notification settings" };
    }
}

// Toggle a specific email notification type
export async function toggleEmailNotification(
    type: keyof Pick<NotificationSettings, 
        'email_checkin_reminder' | 'email_checkout_reminder' | 
        'email_hr_missing_alerts' | 'email_leave_notifications' | 
        'email_approval_reminders'>,
    enabled: boolean
): Promise<{ success: boolean; error?: string }> {
    return updateNotificationSettings({ [type]: enabled });
}

// Update reminder timing
export async function updateReminderTiming(
    type: 'checkin_1' | 'checkin_2' | 'checkout_1' | 'checkout_2',
    minutes: number
): Promise<{ success: boolean; error?: string }> {
    const fieldMap = {
        'checkin_1': 'checkin_reminder_1_mins',
        'checkin_2': 'checkin_reminder_2_mins',
        'checkout_1': 'checkout_reminder_1_mins',
        'checkout_2': 'checkout_reminder_2_mins',
    } as const;
    
    // Validate minutes range
    if (minutes < 5 || minutes > 120) {
        return { success: false, error: "Minutes must be between 5 and 120" };
    }
    
    return updateNotificationSettings({ [fieldMap[type]]: minutes });
}
