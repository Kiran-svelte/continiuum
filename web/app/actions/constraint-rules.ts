"use server";

import { prisma } from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";
import { 
    DEFAULT_CONSTRAINT_RULES, 
    RULE_CATEGORIES,
    type ConstraintRule 
} from "@/lib/constraint-rules-config";

const POLICY_ADMIN_ROLES = new Set(["hr", "hr_manager", "admin", "super_admin"]);
const hasPolicyAccess = (role?: string | null) => POLICY_ADMIN_ROLES.has((role || "").toLowerCase());

// Re-export for backward compatibility
export { DEFAULT_CONSTRAINT_RULES, RULE_CATEGORIES };
export type { ConstraintRule };

// ============================================================================
// GET ACTIVE RULES FOR COMPANY
// ============================================================================

export async function getCompanyConstraintRules(): Promise<{
    success: boolean;
    rules?: ConstraintRule[];
    error?: string;
}> {
    try {
        const user = await currentUser();
        if (!user) return { success: false, error: "Unauthorized" };

        const employee = await prisma.employee.findUnique({
            where: { clerk_id: user.id },
            include: { company: true }
        });

        if (!employee) {
            return { success: false, error: "Employee profile not found. Please complete onboarding first." };
        }
        
        if (!employee.org_id) {
            return { success: false, error: "No organization found. Please complete company setup in onboarding." };
        }

        // Get company's custom rules from ConstraintPolicy
        const policy = await prisma.constraintPolicy.findFirst({
            where: { org_id: employee.org_id, is_active: true }
        });

        if (policy && policy.rules) {
            const customRules = policy.rules as Record<string, any>;
            const hasValidRules = Object.keys(customRules).some((key) => key.startsWith("RULE"));

            if (hasValidRules) {
                const rules: ConstraintRule[] = Object.entries(customRules).map(([ruleId, ruleData]: [string, any]) => ({
                    id: ruleId,
                    rule_id: ruleId,
                    name: ruleData.name,
                    description: ruleData.description,
                    category: ruleData.category,
                    is_active: ruleData.is_active !== false,
                    is_blocking: ruleData.is_blocking ?? true,
                    priority: ruleData.priority ?? 50,
                    config: ruleData.config || {},
                    is_custom: ruleData.is_custom ?? false,
                    created_at: new Date(ruleData.created_at || Date.now()),
                    updated_at: new Date(ruleData.updated_at || Date.now())
                }));

                return { success: true, rules };
            }
        }

        // No custom policy - return all default rules as active
        const defaultRules: ConstraintRule[] = Object.entries(DEFAULT_CONSTRAINT_RULES).map(
            ([ruleId, rule]) => ({
                id: ruleId,
                rule_id: ruleId,
                name: rule.name,
                description: rule.description,
                category: rule.category,
                is_active: true,
                is_blocking: rule.is_blocking,
                priority: rule.priority,
                config: rule.config,
                is_custom: false,
                created_at: new Date(),
                updated_at: new Date()
            })
        );

        return { success: true, rules: defaultRules };

    } catch (error) {
        console.error("Error fetching constraint rules:", error);
        return { success: false, error: "Failed to fetch rules" };
    }
}

// ============================================================================
// INITIALIZE DEFAULT RULES FOR COMPANY (First time setup)
// ============================================================================

export async function initializeCompanyRules(): Promise<{
    success: boolean;
    message?: string;
    error?: string;
}> {
    try {
        const user = await currentUser();
        if (!user) return { success: false, error: "Unauthorized" };

        const employee = await prisma.employee.findUnique({
            where: { clerk_id: user.id },
            include: { company: true }
        });

        if (!employee?.org_id) {
            return { success: false, error: "Employee not found" };
        }

        // Check if policy already exists
        const existing = await prisma.constraintPolicy.findFirst({
            where: { org_id: employee.org_id }
        });

        if (existing) {
            return { success: true, message: "Rules already initialized" };
        }

        // Create new policy with all default rules
        const rulesWithMetadata = Object.entries(DEFAULT_CONSTRAINT_RULES).reduce(
            (acc, [ruleId, rule]) => {
                acc[ruleId] = {
                    ...rule,
                    is_active: true,
                    is_custom: false,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };
                return acc;
            },
            {} as Record<string, any>
        );

        await prisma.constraintPolicy.create({
            data: {
                org_id: employee.org_id,
                name: "Default Leave Policy",
                rules: rulesWithMetadata,
                is_active: true
            }
        });

        return { success: true, message: "Default rules initialized successfully" };

    } catch (error) {
        console.error("Error initializing rules:", error);
        return { success: false, error: "Failed to initialize rules" };
    }
}

// ============================================================================
// TOGGLE RULE ACTIVE STATUS
// ============================================================================

export async function toggleRuleStatus(
    ruleId: string,
    isActive: boolean
): Promise<{
    success: boolean;
    error?: string;
}> {
    try {
        const user = await currentUser();
        if (!user) return { success: false, error: "Unauthorized" };

        const employee = await prisma.employee.findUnique({
            where: { clerk_id: user.id },
            include: { company: true }
        });

        if (!employee?.org_id) {
            return { success: false, error: "Employee not found" };
        }

        // Check role
        if (!hasPolicyAccess(employee.role)) {
            return { success: false, error: "Insufficient permissions" };
        }

        // Get or create policy
        let policy = await prisma.constraintPolicy.findFirst({
            where: { org_id: employee.org_id, is_active: true }
        });

        if (!policy) {
            // Initialize with defaults first
            await initializeCompanyRules();
            policy = await prisma.constraintPolicy.findFirst({
                where: { org_id: employee.org_id, is_active: true }
            });
        }

        if (!policy) {
            return { success: false, error: "Could not find or create policy" };
        }

        const rules = policy.rules as Record<string, any>;
        
        if (!rules[ruleId]) {
            return { success: false, error: "Rule not found" };
        }

        rules[ruleId].is_active = isActive;
        rules[ruleId].updated_at = new Date().toISOString();

        await prisma.constraintPolicy.update({
            where: { id: policy.id },
            data: { 
                rules,
                updated_at: new Date()
            }
        });

        return { success: true };

    } catch (error) {
        console.error("Error toggling rule:", error);
        return { success: false, error: "Failed to toggle rule" };
    }
}

// ============================================================================
// UPDATE RULE CONFIGURATION
// ============================================================================

export async function updateRuleConfig(
    ruleId: string,
    updates: {
        name?: string;
        description?: string;
        is_blocking?: boolean;
        priority?: number;
        config?: Record<string, any>;
    }
): Promise<{
    success: boolean;
    error?: string;
}> {
    try {
        const user = await currentUser();
        if (!user) return { success: false, error: "Unauthorized" };

        const employee = await prisma.employee.findUnique({
            where: { clerk_id: user.id },
            include: { company: true }
        });

        if (!employee?.org_id) {
            return { success: false, error: "Employee not found" };
        }

        if (!hasPolicyAccess(employee.role)) {
            return { success: false, error: "Insufficient permissions" };
        }

        let policy = await prisma.constraintPolicy.findFirst({
            where: { org_id: employee.org_id, is_active: true }
        });

        if (!policy) {
            await initializeCompanyRules();
            policy = await prisma.constraintPolicy.findFirst({
                where: { org_id: employee.org_id, is_active: true }
            });
        }

        if (!policy) {
            return { success: false, error: "Could not find policy" };
        }

        const rules = policy.rules as Record<string, any>;
        
        if (!rules[ruleId]) {
            return { success: false, error: "Rule not found" };
        }

        // Update fields
        if (updates.name) rules[ruleId].name = updates.name;
        if (updates.description) rules[ruleId].description = updates.description;
        if (updates.is_blocking !== undefined) rules[ruleId].is_blocking = updates.is_blocking;
        if (updates.priority !== undefined) rules[ruleId].priority = updates.priority;
        if (updates.config) {
            rules[ruleId].config = {
                ...rules[ruleId].config,
                ...updates.config
            };
        }
        rules[ruleId].updated_at = new Date().toISOString();

        await prisma.constraintPolicy.update({
            where: { id: policy.id },
            data: { 
                rules,
                updated_at: new Date()
            }
        });

        return { success: true };

    } catch (error) {
        console.error("Error updating rule:", error);
        return { success: false, error: "Failed to update rule" };
    }
}

// ============================================================================
// CREATE CUSTOM RULE
// ============================================================================

export async function createCustomRule(
    ruleData: {
        name: string;
        description: string;
        category: string;
        is_blocking: boolean;
        priority: number;
        config: Record<string, any>;
    }
): Promise<{
    success: boolean;
    ruleId?: string;
    error?: string;
}> {
    try {
        const user = await currentUser();
        if (!user) return { success: false, error: "Unauthorized" };

        const employee = await prisma.employee.findUnique({
            where: { clerk_id: user.id },
            include: { company: true }
        });

        if (!employee?.org_id) {
            return { success: false, error: "Employee not found" };
        }

        if (!hasPolicyAccess(employee.role)) {
            return { success: false, error: "Insufficient permissions" };
        }

        let policy = await prisma.constraintPolicy.findFirst({
            where: { org_id: employee.org_id, is_active: true }
        });

        if (!policy) {
            await initializeCompanyRules();
            policy = await prisma.constraintPolicy.findFirst({
                where: { org_id: employee.org_id, is_active: true }
            });
        }

        if (!policy) {
            return { success: false, error: "Could not find policy" };
        }

        const rules = policy.rules as Record<string, any>;
        
        // Generate custom rule ID
        const customRuleCount = Object.keys(rules).filter(k => k.startsWith('CUSTOM')).length;
        const newRuleId = `CUSTOM${String(customRuleCount + 1).padStart(3, '0')}`;

        rules[newRuleId] = {
            id: newRuleId,
            ...ruleData,
            is_active: true,
            is_custom: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        await prisma.constraintPolicy.update({
            where: { id: policy.id },
            data: { 
                rules,
                updated_at: new Date()
            }
        });

        return { success: true, ruleId: newRuleId };

    } catch (error) {
        console.error("Error creating rule:", error);
        return { success: false, error: "Failed to create rule" };
    }
}

// ============================================================================
// DELETE RULE (Only custom rules can be deleted, default rules can only be deactivated)
// ============================================================================

export async function deleteRule(ruleId: string): Promise<{
    success: boolean;
    error?: string;
}> {
    try {
        const user = await currentUser();
        if (!user) return { success: false, error: "Unauthorized" };

        const employee = await prisma.employee.findUnique({
            where: { clerk_id: user.id },
            include: { company: true }
        });

        if (!employee?.org_id) {
            return { success: false, error: "Employee not found" };
        }

        if (!hasPolicyAccess(employee.role)) {
            return { success: false, error: "Insufficient permissions" };
        }

        const policy = await prisma.constraintPolicy.findFirst({
            where: { org_id: employee.org_id, is_active: true }
        });

        if (!policy) {
            return { success: false, error: "No policy found" };
        }

        const rules = policy.rules as Record<string, any>;
        
        if (!rules[ruleId]) {
            return { success: false, error: "Rule not found" };
        }

        // Only allow deleting custom rules
        if (!rules[ruleId].is_custom) {
            return { success: false, error: "Cannot delete default rules. Deactivate them instead." };
        }

        delete rules[ruleId];

        await prisma.constraintPolicy.update({
            where: { id: policy.id },
            data: { 
                rules,
                updated_at: new Date()
            }
        });

        return { success: true };

    } catch (error) {
        console.error("Error deleting rule:", error);
        return { success: false, error: "Failed to delete rule" };
    }
}

// ============================================================================
// RESET TO DEFAULT RULES
// ============================================================================

export async function resetToDefaultRules(): Promise<{
    success: boolean;
    error?: string;
}> {
    try {
        const user = await currentUser();
        if (!user) return { success: false, error: "Unauthorized" };

        const employee = await prisma.employee.findUnique({
            where: { clerk_id: user.id },
            include: { company: true }
        });

        if (!employee?.org_id) {
            return { success: false, error: "Employee not found" };
        }

        if (!hasPolicyAccess(employee.role)) {
            return { success: false, error: "Insufficient permissions" };
        }

        const policy = await prisma.constraintPolicy.findFirst({
            where: { org_id: employee.org_id, is_active: true }
        });

        const rulesWithMetadata = Object.entries(DEFAULT_CONSTRAINT_RULES).reduce(
            (acc, [ruleId, rule]) => {
                acc[ruleId] = {
                    ...rule,
                    is_active: true,
                    is_custom: false,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };
                return acc;
            },
            {} as Record<string, any>
        );

        if (policy) {
            await prisma.constraintPolicy.update({
                where: { id: policy.id },
                data: {
                    rules: rulesWithMetadata,
                    updated_at: new Date()
                }
            });
        } else {
            await prisma.constraintPolicy.create({
                data: {
                    org_id: employee.org_id,
                    name: "Default Leave Policy",
                    rules: rulesWithMetadata,
                    is_active: true
                }
            });
        }

        return { success: true };

    } catch (error) {
        console.error("Error resetting rules:", error);
        return { success: false, error: "Failed to reset rules" };
    }
}

// ============================================================================
// GET ACTIVE RULES FOR CONSTRAINT ENGINE (API endpoint for Python backend)
// ============================================================================

export async function getActiveRulesForEngine(orgId: string): Promise<{
    success: boolean;
    rules?: Record<string, any>;
    error?: string;
}> {
    try {
        const policy = await prisma.constraintPolicy.findFirst({
            where: { org_id: orgId, is_active: true }
        });

        if (!policy || !policy.rules) {
            // Return default rules if no custom policy
            return { 
                success: true, 
                rules: DEFAULT_CONSTRAINT_RULES 
            };
        }

        const allRules = policy.rules as Record<string, any>;
        
        // Filter to only active rules
        const activeRules: Record<string, any> = {};
        for (const [ruleId, rule] of Object.entries(allRules)) {
            if (rule.is_active !== false) {
                activeRules[ruleId] = {
                    id: ruleId,
                    name: rule.name,
                    description: rule.description,
                    category: rule.category,
                    is_blocking: rule.is_blocking,
                    priority: rule.priority,
                    config: rule.config,
                    is_custom: rule.is_custom
                };
            }
        }

        return { success: true, rules: activeRules };

    } catch (error) {
        console.error("Error getting active rules:", error);
        return { success: false, error: "Failed to get rules" };
    }
}

// ============================================================================
// BULK UPDATE RULES (For scenarios like "keep only 5 rules")
// ============================================================================

export async function bulkUpdateRuleStatus(
    ruleStatuses: Record<string, boolean>
): Promise<{
    success: boolean;
    error?: string;
}> {
    try {
        const user = await currentUser();
        if (!user) return { success: false, error: "Unauthorized" };

        const employee = await prisma.employee.findUnique({
            where: { clerk_id: user.id },
            include: { company: true }
        });

        if (!employee?.org_id) {
            return { success: false, error: "Employee not found" };
        }

        if (!hasPolicyAccess(employee.role)) {
            return { success: false, error: "Insufficient permissions" };
        }

        let policy = await prisma.constraintPolicy.findFirst({
            where: { org_id: employee.org_id, is_active: true }
        });

        if (!policy) {
            await initializeCompanyRules();
            policy = await prisma.constraintPolicy.findFirst({
                where: { org_id: employee.org_id, is_active: true }
            });
        }

        if (!policy) {
            return { success: false, error: "Could not find policy" };
        }

        const rules = policy.rules as Record<string, any>;
        
        for (const [ruleId, isActive] of Object.entries(ruleStatuses)) {
            if (rules[ruleId]) {
                rules[ruleId].is_active = isActive;
                rules[ruleId].updated_at = new Date().toISOString();
            }
        }

        await prisma.constraintPolicy.update({
            where: { id: policy.id },
            data: { 
                rules,
                updated_at: new Date()
            }
        });

        return { success: true };

    } catch (error) {
        console.error("Error bulk updating rules:", error);
        return { success: false, error: "Failed to update rules" };
    }
}
