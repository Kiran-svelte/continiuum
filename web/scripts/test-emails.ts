/**
 * 📧 EMAIL TESTING SCRIPT
 * 
 * Tests all email scenarios to verify they send correctly.
 * 
 * Run: npx ts-node scripts/test-emails.ts
 */

import { 
    sendEmail,
    sendCheckInReminderEmail,
    sendCheckOutReminderEmail,
    sendLeaveApprovalEmail,
    sendLeaveRejectionEmail,
    sendLeaveSubmissionEmail,
    sendHRMissingCheckInsEmail,
    sendPriorityLeaveNotification,
    sendSecurityAlertEmail,
    sendWelcomeEmail,
    sendRegistrationApprovalEmail,
    sendRegistrationRejectionEmail,
    sendHRNewRegistrationEmail,
    sendHRNewLeaveRequestEmail
} from '../lib/email-service';

// Test recipient - change this to your email
const TEST_EMAIL = process.env.TEST_EMAIL || 'traderlighter11@gmail.com';

interface TestResult {
    name: string;
    success: boolean;
    error?: string;
    explanation?: string;
}

async function runEmailTests(): Promise<TestResult[]> {
    const results: TestResult[] = [];
    
    console.log('\n📧 EMAIL TESTING SUITE');
    console.log('='.repeat(50));
    console.log(`Sending test emails to: ${TEST_EMAIL}\n`);

    // 1. Basic Email Test
    console.log('1️⃣ Testing basic email...');
    try {
        const result = await sendEmail(
            TEST_EMAIL,
            '🧪 Test Email - Continuum HR',
            '<h1>Test Email</h1><p>This is a test email from Continuum HR.</p>'
        );
        results.push({ name: 'Basic Email', success: result.success, error: result.error, explanation: result.explanation });
        console.log(`   ${result.success ? '✅' : '❌'} Basic Email: ${result.success ? 'SENT' : result.error}`);
    } catch (e: any) {
        results.push({ name: 'Basic Email', success: false, error: e.message });
        console.log(`   ❌ Basic Email: ${e.message}`);
    }

    // 2. Check-In Reminder
    console.log('2️⃣ Testing check-in reminder...');
    try {
        const result = await sendCheckInReminderEmail(
            { email: TEST_EMAIL, full_name: 'Test Employee' },
            1
        );
        results.push({ name: 'Check-In Reminder', success: result.success, error: result.error });
        console.log(`   ${result.success ? '✅' : '❌'} Check-In Reminder: ${result.success ? 'SENT' : result.error}`);
    } catch (e: any) {
        results.push({ name: 'Check-In Reminder', success: false, error: e.message });
        console.log(`   ❌ Check-In Reminder: ${e.message}`);
    }

    // 3. Check-Out Reminder
    console.log('3️⃣ Testing check-out reminder...');
    try {
        const result = await sendCheckOutReminderEmail(
            { email: TEST_EMAIL, full_name: 'Test Employee', check_in_time: '9:00 AM' },
            1
        );
        results.push({ name: 'Check-Out Reminder', success: result.success, error: result.error });
        console.log(`   ${result.success ? '✅' : '❌'} Check-Out Reminder: ${result.success ? 'SENT' : result.error}`);
    } catch (e: any) {
        results.push({ name: 'Check-Out Reminder', success: false, error: e.message });
        console.log(`   ❌ Check-Out Reminder: ${e.message}`);
    }

    // 4. Leave Submission Confirmation
    console.log('4️⃣ Testing leave submission...');
    try {
        const result = await sendLeaveSubmissionEmail(
            { email: TEST_EMAIL, full_name: 'Test Employee' },
            {
                requestId: 'REQ-TEST-001',
                leaveType: 'Annual Leave',
                startDate: 'February 1, 2026',
                endDate: 'February 5, 2026',
                totalDays: 5,
                reason: 'Family vacation'
            }
        );
        results.push({ name: 'Leave Submission', success: result.success, error: result.error });
        console.log(`   ${result.success ? '✅' : '❌'} Leave Submission: ${result.success ? 'SENT' : result.error}`);
    } catch (e: any) {
        results.push({ name: 'Leave Submission', success: false, error: e.message });
        console.log(`   ❌ Leave Submission: ${e.message}`);
    }

    // 5. Leave Approval
    console.log('5️⃣ Testing leave approval...');
    try {
        const result = await sendLeaveApprovalEmail(
            { email: TEST_EMAIL, full_name: 'Test Employee' },
            {
                leaveType: 'Annual Leave',
                startDate: 'February 1, 2026',
                endDate: 'February 5, 2026',
                totalDays: 5,
                approvedBy: 'HR Manager',
                reason: 'Request meets all policy requirements. Enjoy your vacation!'
            }
        );
        results.push({ name: 'Leave Approval', success: result.success, error: result.error });
        console.log(`   ${result.success ? '✅' : '❌'} Leave Approval: ${result.success ? 'SENT' : result.error}`);
    } catch (e: any) {
        results.push({ name: 'Leave Approval', success: false, error: e.message });
        console.log(`   ❌ Leave Approval: ${e.message}`);
    }

    // 6. Leave Rejection
    console.log('6️⃣ Testing leave rejection...');
    try {
        const result = await sendLeaveRejectionEmail(
            { email: TEST_EMAIL, full_name: 'Test Employee' },
            {
                leaveType: 'Annual Leave',
                startDate: 'February 1, 2026',
                endDate: 'February 5, 2026',
                rejectedBy: 'HR Manager',
                reason: 'Insufficient team coverage during requested dates. Please try different dates.'
            }
        );
        results.push({ name: 'Leave Rejection', success: result.success, error: result.error });
        console.log(`   ${result.success ? '✅' : '❌'} Leave Rejection: ${result.success ? 'SENT' : result.error}`);
    } catch (e: any) {
        results.push({ name: 'Leave Rejection', success: false, error: e.message });
        console.log(`   ❌ Leave Rejection: ${e.message}`);
    }

    // 7. HR New Leave Request
    console.log('7️⃣ Testing HR leave notification...');
    try {
        const result = await sendHRNewLeaveRequestEmail(
            TEST_EMAIL,
            {
                employeeName: 'John Doe',
                leaveType: 'Sick Leave',
                startDate: 'January 25, 2026',
                endDate: 'January 26, 2026',
                totalDays: 2,
                reason: 'Feeling unwell',
                requestedAt: new Date().toLocaleString()
            }
        );
        results.push({ name: 'HR Leave Notification', success: result.success, error: result.error });
        console.log(`   ${result.success ? '✅' : '❌'} HR Leave Notification: ${result.success ? 'SENT' : result.error}`);
    } catch (e: any) {
        results.push({ name: 'HR Leave Notification', success: false, error: e.message });
        console.log(`   ❌ HR Leave Notification: ${e.message}`);
    }

    // 8. HR Missing Check-Ins
    console.log('8️⃣ Testing HR missing check-ins alert...');
    try {
        const result = await sendHRMissingCheckInsEmail(
            TEST_EMAIL,
            [
                { name: 'Alice Johnson', department: 'Engineering' },
                { name: 'Bob Smith', department: 'Marketing' },
                { name: 'Carol White', department: null }
            ]
        );
        results.push({ name: 'HR Missing Check-Ins', success: result.success, error: result.error });
        console.log(`   ${result.success ? '✅' : '❌'} HR Missing Check-Ins: ${result.success ? 'SENT' : result.error}`);
    } catch (e: any) {
        results.push({ name: 'HR Missing Check-Ins', success: false, error: e.message });
        console.log(`   ❌ HR Missing Check-Ins: ${e.message}`);
    }

    // 9. Priority Leave Request
    console.log('9️⃣ Testing priority leave notification...');
    try {
        const result = await sendPriorityLeaveNotification(
            TEST_EMAIL,
            {
                employeeName: 'Jane Doe',
                leaveType: 'Emergency Leave',
                startDate: 'January 23, 2026',
                endDate: 'January 24, 2026',
                days: 2,
                reason: 'Family emergency - urgent medical situation',
                priority: 'URGENT'
            }
        );
        results.push({ name: 'Priority Leave', success: result.success, error: result.error });
        console.log(`   ${result.success ? '✅' : '❌'} Priority Leave: ${result.success ? 'SENT' : result.error}`);
    } catch (e: any) {
        results.push({ name: 'Priority Leave', success: false, error: e.message });
        console.log(`   ❌ Priority Leave: ${e.message}`);
    }

    // 10. Registration Approval
    console.log('🔟 Testing registration approval...');
    try {
        const result = await sendRegistrationApprovalEmail(
            TEST_EMAIL,
            {
                employeeName: 'New Employee',
                companyName: 'Test Company',
                position: 'Software Engineer',
                department: 'Engineering',
                approvedBy: 'HR Manager'
            }
        );
        results.push({ name: 'Registration Approval', success: result.success, error: result.error });
        console.log(`   ${result.success ? '✅' : '❌'} Registration Approval: ${result.success ? 'SENT' : result.error}`);
    } catch (e: any) {
        results.push({ name: 'Registration Approval', success: false, error: e.message });
        console.log(`   ❌ Registration Approval: ${e.message}`);
    }

    // 11. Registration Rejection
    console.log('1️⃣1️⃣ Testing registration rejection...');
    try {
        const result = await sendRegistrationRejectionEmail(
            TEST_EMAIL,
            {
                employeeName: 'Test Applicant',
                companyName: 'Test Company',
                rejectedBy: 'HR Manager',
                reason: 'Invalid company code. Please verify the code and try again.'
            }
        );
        results.push({ name: 'Registration Rejection', success: result.success, error: result.error });
        console.log(`   ${result.success ? '✅' : '❌'} Registration Rejection: ${result.success ? 'SENT' : result.error}`);
    } catch (e: any) {
        results.push({ name: 'Registration Rejection', success: false, error: e.message });
        console.log(`   ❌ Registration Rejection: ${e.message}`);
    }

    // 12. HR New Registration
    console.log('1️⃣2️⃣ Testing HR new registration notification...');
    try {
        const result = await sendHRNewRegistrationEmail(
            TEST_EMAIL,
            {
                employeeName: 'New Applicant',
                employeeEmail: 'new.applicant@example.com',
                position: 'Product Manager',
                department: 'Product',
                registeredAt: new Date().toLocaleString()
            }
        );
        results.push({ name: 'HR New Registration', success: result.success, error: result.error });
        console.log(`   ${result.success ? '✅' : '❌'} HR New Registration: ${result.success ? 'SENT' : result.error}`);
    } catch (e: any) {
        results.push({ name: 'HR New Registration', success: false, error: e.message });
        console.log(`   ❌ HR New Registration: ${e.message}`);
    }

    // 13. Security Alert
    console.log('1️⃣3️⃣ Testing security alert...');
    try {
        const result = await sendSecurityAlertEmail(
            TEST_EMAIL,
            {
                alertType: 'SUSPICIOUS_LOGIN',
                severity: 'HIGH',
                details: 'Multiple failed login attempts detected from unknown IP address.',
                ipAddress: '192.168.1.100',
                userAgent: 'Mozilla/5.0 (Windows NT 10.0)',
                timestamp: new Date().toLocaleString(),
                affectedUser: 'admin@company.com'
            }
        );
        results.push({ name: 'Security Alert', success: result.success, error: result.error });
        console.log(`   ${result.success ? '✅' : '❌'} Security Alert: ${result.success ? 'SENT' : result.error}`);
    } catch (e: any) {
        results.push({ name: 'Security Alert', success: false, error: e.message });
        console.log(`   ❌ Security Alert: ${e.message}`);
    }

    // 14. Welcome Email
    console.log('1️⃣4️⃣ Testing welcome email...');
    try {
        const result = await sendWelcomeEmail(
            TEST_EMAIL,
            {
                employeeName: 'New Hire',
                email: TEST_EMAIL,
                position: 'Software Developer',
                department: 'Engineering',
                startDate: 'February 1, 2026',
                managerName: 'John Manager'
            }
        );
        results.push({ name: 'Welcome Email', success: result.success, error: result.error });
        console.log(`   ${result.success ? '✅' : '❌'} Welcome Email: ${result.success ? 'SENT' : result.error}`);
    } catch (e: any) {
        results.push({ name: 'Welcome Email', success: false, error: e.message });
        console.log(`   ❌ Welcome Email: ${e.message}`);
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(50));
    
    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📧 Total: ${results.length}`);
    
    if (failed > 0) {
        console.log('\n❌ Failed Tests:');
        results.filter(r => !r.success).forEach(r => {
            console.log(`   - ${r.name}: ${r.error}`);
        });
    }

    return results;
}

// Run tests
runEmailTests().then(results => {
    console.log('\n✨ Email testing complete!\n');
    process.exit(results.every(r => r.success) ? 0 : 1);
}).catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
});
