/**
 * 🔧 FIX CONSTRAINT POLICIES
 * 
 * Migrates policies with custom keys (like 'maxConsecutiveDays') 
 * to proper RULE### format
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Default constraint rules with proper keys
const DEFAULT_RULES = {
    "RULE001": {
        id: "RULE001",
        name: "Maximum Leave Duration",
        description: "Check if requested days exceed maximum allowed per leave type",
        category: "limits",
        is_blocking: true,
        priority: 100,
        config: { limits: { "Annual Leave": 20, "Sick Leave": 15, "Emergency Leave": 5 } }
    },
    "RULE002": {
        id: "RULE002",
        name: "Leave Balance Check",
        description: "Verify sufficient leave balance available before approval",
        category: "balance",
        is_blocking: true,
        priority: 99,
        config: { allow_negative: false }
    },
    "RULE003": {
        id: "RULE003",
        name: "Minimum Team Coverage",
        description: "Ensure minimum team members present during leave period",
        category: "coverage",
        is_blocking: true,
        priority: 90,
        config: { min_coverage_percent: 60 }
    },
    "RULE004": {
        id: "RULE004",
        name: "Maximum Concurrent Leave",
        description: "Limit simultaneous leaves in a team/department",
        category: "coverage",
        is_blocking: true,
        priority: 89,
        config: { max_concurrent: 2 }
    },
    "RULE005": {
        id: "RULE005",
        name: "Blackout Period Check",
        description: "No leaves during specified blackout dates",
        category: "blackout",
        is_blocking: true,
        priority: 95,
        config: { blackout_dates: [] }
    },
    "RULE006": {
        id: "RULE006",
        name: "Advance Notice Requirement",
        description: "Minimum notice period required for leave requests",
        category: "notice",
        is_blocking: false,
        priority: 80,
        config: { notice_days: { "Annual Leave": 7, "Sick Leave": 0 } }
    },
    "RULE007": {
        id: "RULE007",
        name: "Weekend & Holiday Calculation",
        description: "Auto-exclude weekends/holidays from leave count",
        category: "calculation",
        is_blocking: false,
        priority: 70,
        config: { exclude_weekends: true, exclude_holidays: true }
    },
    "RULE008": {
        id: "RULE008",
        name: "Probation Period Restriction",
        description: "Restrict certain leave types during probation",
        category: "eligibility",
        is_blocking: true,
        priority: 85,
        config: { probation_days: 90 }
    },
    "RULE009": {
        id: "RULE009",
        name: "Medical Certificate Requirement",
        description: "Require medical proof for extended sick leave",
        category: "documentation",
        is_blocking: false,
        priority: 75,
        config: { sick_leave_threshold_days: 3 }
    },
    "RULE010": {
        id: "RULE010",
        name: "Auto-Escalation Trigger",
        description: "Auto-escalate long leave requests to higher management",
        category: "escalation",
        is_blocking: false,
        priority: 60,
        config: { escalate_above_days: 10 }
    },
    "RULE011": {
        id: "RULE011",
        name: "Consecutive Leave Limit",
        description: "Limit maximum consecutive leave days",
        category: "limits",
        is_blocking: true,
        priority: 88,
        config: { max_consecutive: 14 }
    },
    "RULE012": {
        id: "RULE012",
        name: "Monthly Leave Cap",
        description: "Maximum leaves allowed per month",
        category: "limits",
        is_blocking: false,
        priority: 65,
        config: { max_per_month: 5 }
    },
    "RULE013": {
        id: "RULE013",
        name: "Quarterly Balance Review",
        description: "Flag employees with high unused balances",
        category: "balance",
        is_blocking: false,
        priority: 40,
        config: { threshold_percent: 75 }
    },
    "RULE014": {
        id: "RULE014",
        name: "Leave Type Restrictions",
        description: "Restrict specific leave types to certain roles/departments",
        category: "eligibility",
        is_blocking: true,
        priority: 82,
        config: { restrictions: {} }
    }
};

// Mapping from custom keys to RULE IDs
const KEY_TO_RULE_MAPPING: Record<string, string> = {
    // Common custom key names
    "maxConsecutiveDays": "RULE011",
    "maxConsecutive": "RULE011",
    "minNoticePeriod": "RULE006",
    "noticePeriod": "RULE006",
    "maxLeavePerMonth": "RULE012",
    "teamCoverageRequired": "RULE003",
    "blackoutPeriods": "RULE005",
    "blackoutDates": "RULE005",
    "balanceRequired": "RULE002",
    "documentRequired": "RULE009",
    "maxDuration": "RULE001",
    "maxConcurrent": "RULE004",
    "probationRestriction": "RULE008",
    "autoEscalation": "RULE010",
    "weekendCalculation": "RULE007",
    "leaveTypeRestrictions": "RULE014",
    "quarterlyReview": "RULE013",
};

async function fixPolicies() {
    console.log("═".repeat(60));
    console.log("🔧 FIXING CONSTRAINT POLICIES");
    console.log("═".repeat(60));

    const policies = await prisma.constraintPolicy.findMany();
    console.log(`\nFound ${policies.length} policies to check\n`);

    let fixed = 0;

    for (const policy of policies) {
        const rules = policy.rules as Record<string, any> | null;
        if (!rules) continue;

        const keys = Object.keys(rules).filter(k => k !== '_auto_approve_config');
        const hasRulePrefix = keys.some(k => k.startsWith('RULE'));

        if (hasRulePrefix) {
            console.log(`✅ Policy ${policy.org_id.substring(0, 8)}: Already has proper RULE format`);
            continue;
        }

        console.log(`🔄 Policy ${policy.org_id.substring(0, 8)}: Converting custom keys...`);
        console.log(`   Keys found: ${keys.join(', ')}`);

        // Build new rules object with proper format
        const nowIso = new Date().toISOString();
        const newRules: Record<string, any> = {};

        // Start with all default rules
        for (const [ruleId, ruleDef] of Object.entries(DEFAULT_RULES)) {
            // Check if this rule was active in the old format
            let isActive = true;

            // Try to find matching custom key
            for (const [customKey, mappedRuleId] of Object.entries(KEY_TO_RULE_MAPPING)) {
                if (mappedRuleId === ruleId && customKey in rules) {
                    const oldValue = rules[customKey];
                    isActive = typeof oldValue === 'boolean' ? oldValue : oldValue?.is_active !== false;
                    break;
                }
            }

            // Also check if the rule ID itself exists as a key with boolean value
            if (ruleId in rules) {
                const oldValue = rules[ruleId];
                isActive = typeof oldValue === 'boolean' ? oldValue : oldValue?.is_active !== false;
            }

            newRules[ruleId] = {
                ...ruleDef,
                is_active: isActive,
                is_custom: false,
                created_at: nowIso,
                updated_at: nowIso
            };
        }

        // Preserve _auto_approve_config if it exists
        if (rules._auto_approve_config) {
            newRules._auto_approve_config = rules._auto_approve_config;
        }

        // Update the policy
        await prisma.constraintPolicy.update({
            where: { id: policy.id },
            data: { rules: newRules }
        });

        console.log(`   ✅ Converted to ${Object.keys(newRules).filter(k => k.startsWith('RULE')).length} rules`);
        fixed++;
    }

    console.log(`\n${"═".repeat(60)}`);
    console.log(`📊 MIGRATION COMPLETE: Fixed ${fixed} policies`);
    console.log("═".repeat(60));
}

fixPolicies()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
