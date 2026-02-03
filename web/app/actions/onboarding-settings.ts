"use server";

import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/supabase/server";
import { DEFAULT_CONSTRAINT_RULES } from "@/lib/constraint-rules-config";

// Alias for compatibility during Clerk to Supabase migration
const currentUser = getUser;

// Types
interface HolidaySettingsData {
    holiday_mode: "auto" | "manual";
    country_code: string;
    custom_holidays: Array<{ date: string; name: string }>;
}

interface NotificationSettingsData {
    email_checkin_reminder: boolean;
    email_checkout_reminder: boolean;
    email_hr_missing_alerts: boolean;
    email_leave_notifications: boolean;
    email_approval_reminders: boolean;
}

// Helper to verify access
async function verifyCompanyAccess(companyId: string) {
    const user = await currentUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const employee = await prisma.employee.findUnique({
        where: { clerk_id: user.id },
        select: { org_id: true, role: true }
    });

    if (!employee) {
        return { success: false, error: "Employee not found" };
    }

    // Check if employee belongs to this company
    if (employee.org_id !== companyId) {
        return { success: false, error: "Not authorized for this company" };
    }

    // Check role
    if (employee.role !== "hr" && employee.role !== "admin") {
        return { success: false, error: "HR access required" };
    }

    return { success: true, employee };
}

/**
 * Save constraint rules with selected active states
 * HR can choose which rules to enable during onboarding
 */
export async function saveConstraintRulesSelection(
    companyId: string,
    selectedRules: Record<string, boolean>
): Promise<{ success: boolean; error?: string }> {
    try {
        const authResult = await verifyCompanyAccess(companyId);
        if (!authResult.success) return authResult;

        const nowIso = new Date().toISOString();

        // Build rules object with selected active states
        const rulesWithMetadata = Object.entries(DEFAULT_CONSTRAINT_RULES).reduce(
            (acc, [ruleId, rule]) => {
                acc[ruleId] = {
                    ...rule,
                    is_active: selectedRules[ruleId] ?? true, // Use selected state
                    is_custom: false,
                    created_at: nowIso,
                    updated_at: nowIso
                };
                return acc;
            },
            {} as Record<string, any>
        );

        // Upsert the constraint policy
        await prisma.constraintPolicy.upsert({
            where: {
                // Find by org_id - we need a unique constraint or findFirst
                id: await getOrCreatePolicyId(companyId)
            },
            create: {
                org_id: companyId,
                name: "Company Policy",
                rules: rulesWithMetadata,
                is_active: true,
            },
            update: {
                rules: rulesWithMetadata,
                updated_at: new Date()
            }
        });

        return { success: true };
    } catch (error: any) {
        console.error("[saveConstraintRulesSelection] Error:", error);
        return { success: false, error: error.message || "Failed to save constraint rules" };
    }
}

// Helper to get or create policy ID
async function getOrCreatePolicyId(companyId: string): Promise<string> {
    const existing = await prisma.constraintPolicy.findFirst({
        where: { org_id: companyId },
        select: { id: true }
    });

    if (existing) return existing.id;

    // Create a new one and return the id
    const created = await prisma.constraintPolicy.create({
        data: {
            org_id: companyId,
            name: "Company Policy",
            rules: {},
            is_active: true,
        },
        select: { id: true }
    });

    return created.id;
}

/**
 * Save holiday settings during onboarding
 */
export async function saveHolidaySettingsOnboarding(
    companyId: string,
    settings: HolidaySettingsData
): Promise<{ success: boolean; error?: string }> {
    try {
        const authResult = await verifyCompanyAccess(companyId);
        if (!authResult.success) return authResult;

        await prisma.companySettings.upsert({
            where: { company_id: companyId },
            create: {
                company_id: companyId,
                holiday_mode: settings.holiday_mode,
                country_code: settings.country_code,
                custom_holidays: settings.custom_holidays,
            },
            update: {
                holiday_mode: settings.holiday_mode,
                country_code: settings.country_code,
                custom_holidays: settings.custom_holidays,
            }
        });

        return { success: true };
    } catch (error: any) {
        console.error("[saveHolidaySettingsOnboarding] Error:", error);
        return { success: false, error: error.message || "Failed to save holiday settings" };
    }
}

/**
 * Save notification settings during onboarding
 */
export async function saveNotificationSettingsOnboarding(
    companyId: string,
    settings: NotificationSettingsData
): Promise<{ success: boolean; error?: string }> {
    try {
        const authResult = await verifyCompanyAccess(companyId);
        if (!authResult.success) return authResult;

        await prisma.companySettings.upsert({
            where: { company_id: companyId },
            create: {
                company_id: companyId,
                email_checkin_reminder: settings.email_checkin_reminder,
                email_checkout_reminder: settings.email_checkout_reminder,
                email_hr_missing_alerts: settings.email_hr_missing_alerts,
                email_leave_notifications: settings.email_leave_notifications,
                email_approval_reminders: settings.email_approval_reminders,
            },
            update: {
                email_checkin_reminder: settings.email_checkin_reminder,
                email_checkout_reminder: settings.email_checkout_reminder,
                email_hr_missing_alerts: settings.email_hr_missing_alerts,
                email_leave_notifications: settings.email_leave_notifications,
                email_approval_reminders: settings.email_approval_reminders,
            }
        });

        return { success: true };
    } catch (error: any) {
        console.error("[saveNotificationSettingsOnboarding] Error:", error);
        return { success: false, error: error.message || "Failed to save notification settings" };
    }
}
