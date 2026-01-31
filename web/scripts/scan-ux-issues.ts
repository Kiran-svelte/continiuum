/**
 * User Experience Issues Scanner
 * Scans for common issues that users might encounter
 */

import { prisma } from "../lib/prisma";

interface Issue {
    category: string;
    severity: "critical" | "high" | "medium" | "low";
    description: string;
    location?: string;
    fix?: string;
}

async function scanForIssues(): Promise<Issue[]> {
    const issues: Issue[] = [];
    const companyId = "e37dd688-393d-44f3-85a5-cdfc575de595";

    console.log("🔍 Scanning for User Experience Issues...\n");

    // 1. Check leave types for issues
    console.log("1️⃣ Checking Leave Types...");
    const leaveTypes = await prisma.leaveType.findMany({
        where: { company_id: companyId }
    });

    for (const lt of leaveTypes) {
        // Check for short/misspelled names
        if (lt.name.length < 5) {
            issues.push({
                category: "Leave Types",
                severity: "medium",
                description: `Leave type "${lt.name}" has a very short name - might be misspelled`,
                location: "LeaveType table",
                fix: "HR should update this in Settings"
            });
        }

        // Check for missing descriptions
        if (!lt.description || lt.description.length < 10) {
            issues.push({
                category: "Leave Types",
                severity: "low",
                description: `Leave type "${lt.name}" has no/short description`,
                location: "LeaveType table"
            });
        }

        // Check for default values that weren't customized
        if (lt.min_notice_days === 0) {
            issues.push({
                category: "Leave Types",
                severity: "low",
                description: `Leave type "${lt.name}" has 0 days notice requirement`,
                location: "LeaveType table"
            });
        }
    }

    console.log(`   Found ${leaveTypes.length} leave types`);

    // 2. Check employee leave balances
    console.log("2️⃣ Checking Leave Balances...");
    const employees = await prisma.employee.findMany({
        where: { org_id: companyId },
        include: {
            leave_balances: true
        }
    });

    for (const emp of employees) {
        // Employee with no balances at all
        if (emp.leave_balances.length === 0) {
            issues.push({
                category: "Leave Balances",
                severity: "high",
                description: `Employee "${emp.full_name}" has NO leave balances allocated`,
                location: `Employee ID: ${emp.emp_id}`,
                fix: "HR needs to allocate leave balances"
            });
        }

        // Check for mismatched leave types
        const balanceTypeIds = new Set(emp.leave_balances.map(b => b.leave_type_id));
        const leaveTypeIds = new Set(leaveTypes.map(lt => lt.id));

        for (const balance of emp.leave_balances) {
            if (!leaveTypeIds.has(balance.leave_type_id)) {
                issues.push({
                    category: "Leave Balances",
                    severity: "critical",
                    description: `Employee "${emp.full_name}" has balance for non-existent leave type`,
                    location: `Balance ID: ${balance.id}`
                });
            }
        }
    }

    console.log(`   Checked ${employees.length} employees`);

    // 3. Check Company Settings
    console.log("3️⃣ Checking Company Settings...");
    const company = await prisma.company.findUnique({
        where: { company_id: companyId },
        include: { settings: true }
    });

    if (!company) {
        issues.push({
            category: "Company",
            severity: "critical",
            description: "Company not found!",
            location: "Company table"
        });
    } else {
        if (!company.settings) {
            issues.push({
                category: "Company Settings",
                severity: "high",
                description: "Company has no settings configured",
                fix: "HR needs to complete setup"
            });
        }

        // Check work schedule
        if (!company.work_start_time || !company.work_end_time) {
            issues.push({
                category: "Work Schedule",
                severity: "medium",
                description: "Work hours not configured",
                fix: "HR needs to set work hours in Settings"
            });
        }

        // Check timezone
        if (!company.timezone) {
            issues.push({
                category: "Work Schedule",
                severity: "medium",
                description: "Timezone not configured"
            });
        }
    }

    // 4. Check HR user configuration
    console.log("4️⃣ Checking HR Users...");
    const hrUsers = await prisma.employee.findMany({
        where: { 
            org_id: companyId,
            role: 'hr'
        }
    });

    if (hrUsers.length === 0) {
        issues.push({
            category: "HR Configuration",
            severity: "critical",
            description: "No HR users configured for this company!",
            fix: "Create an HR user"
        });
    } else {
        for (const hr of hrUsers) {
            if (!hr.clerk_id) {
                issues.push({
                    category: "HR Configuration",
                    severity: "high",
                    description: `HR user "${hr.full_name}" has no Clerk ID (not linked to auth)`,
                    fix: "HR needs to sign up/link account"
                });
            }

            if (!hr.email) {
                issues.push({
                    category: "HR Configuration",
                    severity: "critical",
                    description: `HR user "${hr.full_name}" has no email - cannot receive OTP`,
                    fix: "Add email to HR user"
                });
            }
        }
    }

    console.log(`   Found ${hrUsers.length} HR users`);

    // 5. Check for pending leave requests without proper assignment
    console.log("5️⃣ Checking Leave Requests...");
    const pendingLeaves = await prisma.leaveRequest.findMany({
        where: { 
            employee: { org_id: companyId },
            status: 'pending'
        },
        include: { employee: true }
    });

    for (const leave of pendingLeaves) {
        // Check if leave type exists
        const leaveType = leaveTypes.find(lt => lt.name === leave.leave_type);
        if (!leaveType) {
            issues.push({
                category: "Leave Requests",
                severity: "high",
                description: `Pending leave request by "${leave.employee.full_name}" has invalid type "${leave.leave_type}"`,
                location: `Leave ID: ${leave.id}`
            });
        }
    }

    console.log(`   Found ${pendingLeaves.length} pending requests`);

    // 6. Check OTP configuration
    console.log("6️⃣ Checking OTP Configuration...");
    const recentOtps = await prisma.otpToken.findMany({
        where: {
            created_at: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
        },
        orderBy: { created_at: 'desc' },
        take: 10
    });

    console.log(`   Found ${recentOtps.length} recent OTP tokens`);

    // Check for failed OTP attempts (expired but not verified)
    const expiredUnverified = recentOtps.filter(otp => 
        otp.expires_at < new Date() && !otp.verified_at
    );

    if (expiredUnverified.length > 5) {
        issues.push({
            category: "OTP System",
            severity: "medium",
            description: `${expiredUnverified.length} OTP tokens expired without verification - users might have email issues`,
            fix: "Check email delivery configuration"
        });
    }

    return issues;
}

// Main
async function main() {
    console.log("========================================");
    console.log("🔎 USER EXPERIENCE ISSUES SCANNER");
    console.log("========================================\n");

    const issues = await scanForIssues();

    console.log("\n========================================");
    console.log("📋 ISSUES FOUND");
    console.log("========================================\n");

    // Group by severity
    const critical = issues.filter(i => i.severity === "critical");
    const high = issues.filter(i => i.severity === "high");
    const medium = issues.filter(i => i.severity === "medium");
    const low = issues.filter(i => i.severity === "low");

    if (critical.length > 0) {
        console.log("🔴 CRITICAL ISSUES:");
        critical.forEach((i, idx) => {
            console.log(`   ${idx + 1}. [${i.category}] ${i.description}`);
            if (i.fix) console.log(`      ⚡ Fix: ${i.fix}`);
        });
        console.log();
    }

    if (high.length > 0) {
        console.log("🟠 HIGH PRIORITY:");
        high.forEach((i, idx) => {
            console.log(`   ${idx + 1}. [${i.category}] ${i.description}`);
            if (i.fix) console.log(`      ⚡ Fix: ${i.fix}`);
        });
        console.log();
    }

    if (medium.length > 0) {
        console.log("🟡 MEDIUM PRIORITY:");
        medium.forEach((i, idx) => {
            console.log(`   ${idx + 1}. [${i.category}] ${i.description}`);
            if (i.fix) console.log(`      ⚡ Fix: ${i.fix}`);
        });
        console.log();
    }

    if (low.length > 0) {
        console.log("🟢 LOW PRIORITY:");
        low.forEach((i, idx) => {
            console.log(`   ${idx + 1}. [${i.category}] ${i.description}`);
        });
        console.log();
    }

    console.log("========================================");
    console.log(`📊 SUMMARY: ${critical.length} critical, ${high.length} high, ${medium.length} medium, ${low.length} low`);
    console.log("========================================\n");
}

main()
    .then(() => process.exit(0))
    .catch(e => {
        console.error("Error:", e);
        process.exit(1);
    });
