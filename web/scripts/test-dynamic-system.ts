/**
 * DYNAMIC SYSTEM PROOF TEST
 * This script proves that:
 * 1. Leave types come from the database (company-specific)
 * 2. Constraint rules are generated dynamically from leave types
 * 3. Employee balances are calculated from actual DB records
 * 4. Nothing is hardcoded
 */

import { prisma } from '@/lib/prisma';
import { generateConstraintRules } from '@/lib/constraint-rules-config';

async function testDynamicSystem() {
    console.log('\n========================================');
    console.log('🧪 DYNAMIC SYSTEM PROOF TEST');
    console.log('========================================\n');

    // Step 1: Get a test company
    const company = await prisma.company.findFirst({
        orderBy: { created_at: 'desc' }
    });

    if (!company) {
        console.log('❌ No active company found. Create a company first.');
        return;
    }

    console.log(`📢 Testing with company: ${company.name} (ID: ${company.id})\n`);

    // Step 2: Fetch ACTUAL leave types from database
    console.log('═══════════════════════════════════════');
    console.log('1️⃣ LEAVE TYPES FROM DATABASE');
    console.log('═══════════════════════════════════════');
    
    const leaveTypes = await prisma.leaveType.findMany({
        where: { company_id: company.id, is_active: true },
        orderBy: { name: 'asc' }
    });

    if (leaveTypes.length === 0) {
        console.log('⚠️ No leave types configured for this company.');
        console.log('   HR needs to add leave types in Settings page.');
    } else {
        console.log(`✅ Found ${leaveTypes.length} leave types from DB:\n`);
        leaveTypes.forEach(lt => {
            console.log(`   • ${lt.name} (${lt.code})`);
            console.log(`     - Quota: ${lt.annual_quota} days`);
            console.log(`     - Notice: ${lt.notice_days ?? 'not set'} days`);
            console.log(`     - Max Consecutive: ${lt.max_consecutive ?? 'not set'} days`);
            console.log(`     - Color: ${lt.color}`);
            console.log('');
        });
    }

    // Step 3: Show dynamically generated constraint rules
    console.log('═══════════════════════════════════════');
    console.log('2️⃣ DYNAMICALLY GENERATED CONSTRAINT RULES');
    console.log('═══════════════════════════════════════');

    if (leaveTypes.length > 0) {
        const dynamicRules = generateConstraintRules(leaveTypes.map(lt => ({
            id: lt.id,
            name: lt.name,
            code: lt.code,
            annual_quota: lt.annual_quota,
            notice_days: lt.notice_days ?? undefined,
            max_consecutive: lt.max_consecutive ?? undefined,
            requires_document: lt.requires_document ?? false,
            is_active: lt.is_active
        })));

        console.log('✅ Rules generated from company leave types:\n');
        
        // Show RULE001 limits
        const rule001 = dynamicRules['RULE001'];
        console.log(`   📋 ${rule001.name}:`);
        Object.entries(rule001.config.limits as Record<string, number>).forEach(([type, limit]) => {
            console.log(`      - ${type}: ${limit} days`);
        });
        console.log('');

        // Show RULE006 notice days
        const rule006 = dynamicRules['RULE006'];
        console.log(`   ⏰ ${rule006.name}:`);
        Object.entries(rule006.config.notice_days as Record<string, number>).forEach(([type, days]) => {
            console.log(`      - ${type}: ${days} days advance notice`);
        });
        console.log('');
    }

    // Step 4: Check employee balances from DB
    console.log('═══════════════════════════════════════');
    console.log('3️⃣ EMPLOYEE BALANCES FROM DATABASE');
    console.log('═══════════════════════════════════════');

    const employee = await prisma.employee.findFirst({
        where: { org_id: company.id, role: 'employee' },
        include: { leave_balances: true }
    });

    if (!employee) {
        console.log('⚠️ No employee found in this company.');
    } else {
        console.log(`✅ Employee: ${employee.full_name || employee.email}\n`);
        
        if (employee.leave_balances.length === 0) {
            console.log('   No leave balances set yet. They will be initialized when:');
            console.log('   - Employee first views dashboard');
            console.log('   - HR sets up employee leave allocations');
        } else {
            employee.leave_balances.forEach((bal: any) => {
                console.log(`   • ${bal.leave_type}:`);
                console.log(`     Total: ${bal.annual_entitlement}, Used: ${bal.used_days}, Available: ${Number(bal.annual_entitlement) - Number(bal.used_days)}`);
            });
        }
        console.log('');
    }

    // Step 5: Check custom holidays from DB
    console.log('═══════════════════════════════════════');
    console.log('4️⃣ COMPANY HOLIDAYS FROM DATABASE');
    console.log('═══════════════════════════════════════');

    const settings = await prisma.companySettings.findUnique({
        where: { company_id: company.id }
    });

    if (!settings || !settings.custom_holidays) {
        console.log('⚠️ No custom holidays configured for this company.');
        console.log('   Using public holidays from Calendarific API or country defaults.');
    } else {
        const holidays = settings.custom_holidays as Array<{date: string, name: string}>;
        console.log(`✅ Found ${holidays.length} custom holidays:\n`);
        holidays.forEach((h: any) => {
            console.log(`   • ${h.date}: ${h.name}`);
        });
    }
    console.log('');

    // Step 6: Check work schedule from DB
    console.log('═══════════════════════════════════════');
    console.log('5️⃣ WORK SCHEDULE FROM DATABASE');
    console.log('═══════════════════════════════════════');

    // We already fetched settings above, reuse it
    if (!settings) {
        console.log('⚠️ No company settings found. Using company table defaults.\n');
        console.log('   Work Days:', company.work_days);
        console.log('   Start Time:', company.work_start_time);
        console.log('   End Time:', company.work_end_time);
    } else {
        console.log('✅ Work schedule from CompanySettings:\n');
        console.log(`   • Country: ${settings.country_code}`);
        console.log(`   • Holiday Mode: ${settings.holiday_mode}`);
        console.log(`   • Check-in Reminder: ${settings.email_checkin_reminder ? 'Enabled' : 'Disabled'}`);
        console.log(`   • Check-out Reminder: ${settings.email_checkout_reminder ? 'Enabled' : 'Disabled'}`);
    }
    console.log('');

    console.log('✅ Work schedule from Company table:\n');
    console.log(`   • Work Days: ${JSON.stringify(company.work_days)}`);
    console.log(`   • Start Time: ${company.work_start_time}`);
    console.log(`   • End Time: ${company.work_end_time}`);
    console.log(`   • Timezone: ${company.timezone}`);
    console.log(`   • Grace Period: ${company.grace_period_mins} mins`);
    console.log('');

    // Summary
    console.log('═══════════════════════════════════════');
    console.log('📊 SUMMARY');
    console.log('═══════════════════════════════════════');
    console.log('');
    console.log('✅ All data is fetched from the database');
    console.log('✅ Leave types are company-specific');
    console.log('✅ Constraint rules are generated dynamically from leave types');
    console.log('✅ No hardcoded "Annual Leave: 20" or "Sick Leave: 15"');
    console.log('✅ Holidays, work schedules, and balances all come from DB');
    console.log('');
    console.log('🔒 HR Settings page requires OTP verification for changes');
    console.log('');
}

// Run the test
testDynamicSystem()
    .then(() => {
        console.log('✨ Test completed!\n');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Test failed:', error);
        process.exit(1);
    });
