/**
 * Complete System Audit
 * Scans for ALL issues a user might encounter
 */

import { prisma } from "../lib/prisma";

async function main() {
    const companyId = "e37dd688-393d-44f3-85a5-cdfc575de595";

    console.log("========================================");
    console.log("🔎 COMPLETE SYSTEM AUDIT");
    console.log("========================================\n");

    // 1. Company Details
    console.log("1️⃣ COMPANY DETAILS");
    const company = await prisma.company.findUnique({
        where: { company_id: companyId },
        include: { settings: true }
    });
    
    if (!company) {
        console.log("   ❌ Company NOT FOUND!");
        // Try to find by ID
        const companyById = await prisma.company.findFirst({
            where: { 
                OR: [
                    { company_id: companyId },
                    { id: companyId }
                ]
            }
        });
        if (companyById) {
            console.log(`   ✅ Found company by alt ID: ${companyById.name}`);
            console.log(`   - ID: ${companyById.id}`);
            console.log(`   - company_id: ${companyById.company_id}`);
        }
    } else {
        console.log(`   ✅ Company: ${company.name}`);
        console.log(`   - Work hours: ${company.work_start_time} - ${company.work_end_time}`);
        console.log(`   - Timezone: ${company.timezone}`);
        console.log(`   - Settings: ${company.settings ? 'Configured' : 'MISSING'}`);
    }

    // 2. Leave Types
    console.log("\n2️⃣ LEAVE TYPES");
    const leaveTypes = await prisma.leaveType.findMany({
        where: { company_id: companyId }
    });
    
    if (leaveTypes.length === 0) {
        console.log("   ❌ NO leave types configured!");
    } else {
        for (const lt of leaveTypes) {
            console.log(`   • ${lt.name} (${lt.code})`);
            console.log(`     - Quota: ${lt.annual_quota}, Notice: ${lt.min_notice_days} days`);
            if (lt.name !== lt.name.trim() || lt.name.length < 5) {
                console.log(`     ⚠️  Name might be misspelled or incomplete`);
            }
        }
    }

    // 3. Leave Balances
    console.log("\n3️⃣ LEAVE BALANCES");
    const employees = await prisma.employee.findMany({
        where: { org_id: companyId },
        select: { emp_id: true, full_name: true, email: true, role: true }
    });

    for (const emp of employees) {
        console.log(`   ${emp.full_name} (${emp.role})`);
        
        const balances = await prisma.leaveBalance.findMany({
            where: { emp_id: emp.emp_id }
        });
        
        if (balances.length === 0) {
            console.log(`     ❌ NO balances allocated!`);
        } else {
            for (const b of balances) {
                // Check if leave_type matches any LeaveType name
                const matchingType = leaveTypes.find(lt => 
                    lt.name === b.leave_type || lt.code === b.leave_type
                );
                
                const status = matchingType ? '✅' : '⚠️ TYPE NOT FOUND';
                console.log(`     ${status} ${b.leave_type}: ${Number(b.annual_entitlement)} days`);
            }
        }
    }

    // 4. HR User Auth
    console.log("\n4️⃣ HR USER AUTHENTICATION");
    const hrUser = await prisma.employee.findFirst({
        where: { org_id: companyId, role: 'hr' }
    });

    if (!hrUser) {
        console.log("   ❌ No HR user found!");
    } else {
        console.log(`   HR: ${hrUser.full_name} (${hrUser.email})`);
        console.log(`   - Clerk ID: ${hrUser.clerk_id || 'NOT LINKED'}`);
        console.log(`   - Org ID: ${hrUser.org_id}`);
        
        if (!hrUser.clerk_id) {
            console.log("   ⚠️  HR not linked to Clerk auth - will get Unauthorized error!");
        }
    }

    // 5. OTP Tokens
    console.log("\n5️⃣ RECENT OTP ACTIVITY");
    if (hrUser?.clerk_id) {
        const recentOtps = await prisma.otpToken.findMany({
            where: { user_id: hrUser.clerk_id },
            orderBy: { created_at: 'desc' },
            take: 5
        });

        if (recentOtps.length === 0) {
            console.log("   No OTP tokens generated yet");
        } else {
            for (const otp of recentOtps) {
                const status = otp.verified_at ? '✅ VERIFIED' : (otp.expires_at < new Date() ? '❌ EXPIRED' : '⏳ PENDING');
                console.log(`   ${status} Action: ${otp.action}, Created: ${otp.created_at.toISOString()}`);
            }
        }
    }

    // 6. Find all companies to understand the data
    console.log("\n6️⃣ ALL COMPANIES IN SYSTEM");
    const allCompanies = await prisma.company.findMany({
        take: 5,
        select: { id: true, company_id: true, name: true, code: true }
    });
    
    for (const c of allCompanies) {
        console.log(`   • ${c.name} (code: ${c.code})`);
        console.log(`     id: ${c.id}`);
        console.log(`     company_id: ${c.company_id}`);
    }

    // 7. Check if the HR user's company exists
    console.log("\n7️⃣ HR USER'S COMPANY CHECK");
    if (hrUser?.org_id) {
        const hrCompany = await prisma.company.findFirst({
            where: { 
                OR: [
                    { company_id: hrUser.org_id },
                    { id: hrUser.org_id }
                ]
            }
        });
        
        if (hrCompany) {
            console.log(`   ✅ HR's company found: ${hrCompany.name}`);
        } else {
            console.log(`   ❌ HR's org_id (${hrUser.org_id}) doesn't match any company!`);
        }
    }

    console.log("\n========================================");
    console.log("🏁 AUDIT COMPLETE");
    console.log("========================================\n");
}

main()
    .then(() => process.exit(0))
    .catch(e => {
        console.error("Error:", e);
        process.exit(1);
    });
