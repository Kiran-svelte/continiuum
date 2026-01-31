/**
 * 🔧 FIX AND SEED DYNAMIC SETTINGS
 * 
 * This script:
 * 1. Ensures all companies have CompanySettings records
 * 2. Creates varied settings to demonstrate isolation
 * 3. Ensures constraint policies have proper is_active flags
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function fixAndSeedSettings() {
    console.log("═".repeat(60));
    console.log("🔧 FIXING AND SEEDING DYNAMIC SETTINGS");
    console.log("═".repeat(60));

    // 1. Get all companies
    const companies = await prisma.company.findMany({
        include: { settings: true }
    });

    console.log(`\n📊 Found ${companies.length} companies\n`);

    // 2. Create settings for companies that don't have them
    let created = 0;
    let updated = 0;

    for (let i = 0; i < companies.length; i++) {
        const company = companies[i];
        
        // Create varied settings based on index to demonstrate isolation
        const variations = [
            // All enabled (default)
            {
                email_checkin_reminder: true,
                email_checkout_reminder: true,
                email_hr_missing_alerts: true,
                email_leave_notifications: true,
                email_approval_reminders: true,
                checkin_reminder_1_mins: 10,
                checkin_reminder_2_mins: 60,
                checkout_reminder_1_mins: 60,
                checkout_reminder_2_mins: 10,
                holiday_mode: "auto" as const,
                country_code: "IN",
            },
            // Check-in/out disabled (company prefers no attendance emails)
            {
                email_checkin_reminder: false,
                email_checkout_reminder: false,
                email_hr_missing_alerts: true,
                email_leave_notifications: true,
                email_approval_reminders: true,
                checkin_reminder_1_mins: 15,
                checkin_reminder_2_mins: 45,
                checkout_reminder_1_mins: 45,
                checkout_reminder_2_mins: 15,
                holiday_mode: "manual" as const,
                country_code: "US",
            },
            // Only leave notifications (minimal emails)
            {
                email_checkin_reminder: false,
                email_checkout_reminder: false,
                email_hr_missing_alerts: false,
                email_leave_notifications: true,
                email_approval_reminders: false,
                checkin_reminder_1_mins: 10,
                checkin_reminder_2_mins: 60,
                checkout_reminder_1_mins: 60,
                checkout_reminder_2_mins: 10,
                holiday_mode: "auto" as const,
                country_code: "GB",
            },
            // All enabled with different timing
            {
                email_checkin_reminder: true,
                email_checkout_reminder: true,
                email_hr_missing_alerts: true,
                email_leave_notifications: true,
                email_approval_reminders: true,
                checkin_reminder_1_mins: 5,
                checkin_reminder_2_mins: 30,
                checkout_reminder_1_mins: 30,
                checkout_reminder_2_mins: 5,
                holiday_mode: "auto" as const,
                country_code: "AU",
            },
        ];

        const variation = variations[i % variations.length];

        if (company.settings) {
            // Update existing
            await prisma.companySettings.update({
                where: { id: company.settings.id },
                data: variation
            });
            console.log(`🔄 Updated: ${company.name} (${variation.email_checkin_reminder ? '✉️' : '🚫'} checkin, ${variation.holiday_mode} holidays)`);
            updated++;
        } else {
            // Create new
            await prisma.companySettings.create({
                data: {
                    company_id: company.id,
                    ...variation
                }
            });
            console.log(`✨ Created: ${company.name} (${variation.email_checkin_reminder ? '✉️' : '🚫'} checkin, ${variation.holiday_mode} holidays)`);
            created++;
        }
    }

    console.log(`\n📊 Settings: ${created} created, ${updated} updated\n`);

    // 3. Fix constraint policies to have proper is_active flags
    console.log("🔧 Fixing constraint policies...\n");

    const policies = await prisma.constraintPolicy.findMany();
    
    for (const policy of policies) {
        const rules = policy.rules as Record<string, any>;
        
        if (rules && typeof rules === 'object') {
            let needsUpdate = false;
            const updatedRules: Record<string, any> = {};

            for (const [ruleId, rule] of Object.entries(rules)) {
                if (typeof rule === 'object' && rule !== null) {
                    updatedRules[ruleId] = {
                        ...rule,
                        is_active: rule.is_active ?? true, // Default to true if missing
                    };
                    if (!('is_active' in rule)) {
                        needsUpdate = true;
                    }
                } else {
                    // Rule is not an object (malformed), create proper structure
                    updatedRules[ruleId] = {
                        id: ruleId,
                        is_active: true,
                        value: rule
                    };
                    needsUpdate = true;
                }
            }

            if (needsUpdate) {
                await prisma.constraintPolicy.update({
                    where: { id: policy.id },
                    data: { rules: updatedRules }
                });
                console.log(`🔧 Fixed policy ${policy.id} for org ${policy.org_id}`);
            }
        }
    }

    // 4. Verify the results
    console.log("\n" + "═".repeat(60));
    console.log("📊 VERIFICATION");
    console.log("═".repeat(60));

    const verifyCompanies = await prisma.company.findMany({
        include: { settings: true },
        take: 10
    });

    console.log("\n📋 Company Settings Summary:\n");
    console.log("┌────────────────────────┬─────────┬──────────┬─────────┬──────────┐");
    console.log("│ Company                │ CheckIn │ CheckOut │ HRAlert │ Holidays │");
    console.log("├────────────────────────┼─────────┼──────────┼─────────┼──────────┤");

    for (const c of verifyCompanies) {
        const name = c.name.substring(0, 20).padEnd(22);
        const checkin = c.settings?.email_checkin_reminder ? '  ✅   ' : '  ❌   ';
        const checkout = c.settings?.email_checkout_reminder ? '   ✅   ' : '   ❌   ';
        const hrAlert = c.settings?.email_hr_missing_alerts ? '  ✅   ' : '  ❌   ';
        const holidays = (c.settings?.holiday_mode || 'none').padEnd(8);
        console.log(`│ ${name} │${checkin}│${checkout}│${hrAlert}│ ${holidays} │`);
    }

    console.log("└────────────────────────┴─────────┴──────────┴─────────┴──────────┘");

    console.log("\n✅ Dynamic settings configured!\n");
}

fixAndSeedSettings()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
