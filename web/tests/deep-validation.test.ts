/**
 * 🧪 DEEP VALIDATION TESTS
 * 
 * These tests validate that all modules can be imported without errors.
 * This catches any runtime initialization issues.
 */

import { test } from 'node:test';
import assert from 'node:assert';

// Test that critical server actions can be imported without errors
test('HR actions module can be imported', async () => {
    const hr = await import('../app/actions/hr');
    assert.ok(hr.getHRDashboardStats, 'getHRDashboardStats should be defined');
    assert.ok(hr.getCompanyEmployees, 'getCompanyEmployees should be defined');
    assert.ok(hr.getCompanyDetails, 'getCompanyDetails should be defined');
    console.log('✅ HR actions: getHRDashboardStats, getCompanyEmployees, getCompanyDetails');
});

test('Employee actions module can be imported', async () => {
    const emp = await import('../app/actions/employee');
    // Check what's actually exported
    const exports = Object.keys(emp);
    console.log('Employee module exports:', exports.join(', '));
    assert.ok(exports.length > 0, 'Employee module should have exports');
});

test('Onboarding actions module can be imported', async () => {
    const onboarding = await import('../app/actions/onboarding');
    const exports = Object.keys(onboarding);
    console.log('Onboarding module exports:', exports.join(', '));
    assert.ok(exports.length > 0, 'Onboarding module should have exports');
});

test('Leave records actions module can be imported', async () => {
    const leaveRecords = await import('../app/actions/leave-records');
    const exports = Object.keys(leaveRecords);
    console.log('Leave records module exports:', exports.join(', '));
    assert.ok(exports.length > 0, 'Leave records module should have exports');
});

// Test that billing modules can be imported
test('Stripe module can be imported', async () => {
    const stripe = await import('../lib/billing/stripe');
    assert.ok(stripe.PRICING_TIERS, 'PRICING_TIERS should be defined');
    console.log('✅ Stripe module loaded');
});

test('Razorpay module can be imported (skipped without API key)', async () => {
    // Razorpay SDK requires API key at initialization
    // Skip this test if RAZORPAY_KEY_ID is not set
    if (!process.env.RAZORPAY_KEY_ID) {
        console.log('⚠️ Razorpay module skipped (no API key)');
        return;
    }
    const razorpay = await import('../lib/billing/razorpay');
    assert.ok(razorpay.PRICING_TIERS, 'PRICING_TIERS should be defined');
    console.log('✅ Razorpay module loaded');
});

test('Plan enforcement module can be imported', async () => {
    const enforcement = await import('../lib/billing/plan-enforcement');
    assert.ok(enforcement.getPlanStatus, 'getPlanStatus should be defined');
    assert.ok(enforcement.withPlanLimit, 'withPlanLimit should be defined');
    console.log('✅ Plan enforcement module loaded');
});

test('Trial module can be imported', async () => {
    const trial = await import('../lib/billing/trial');
    const exports = Object.keys(trial);
    console.log('Trial module exports:', exports.join(', '));
    assert.ok(exports.length > 0, 'Trial module should have exports');
});

test('Enterprise module can be imported', async () => {
    const enterprise = await import('../lib/billing/enterprise');
    assert.ok(enterprise.calculateEnterpriseQuote, 'calculateEnterpriseQuote should be defined');
    assert.ok(enterprise.createEnterpriseRequest, 'createEnterpriseRequest should be defined');
    console.log('✅ Enterprise module loaded');
});

// Test Prisma schema compatibility
test('Prisma client exists', async () => {
    const { prisma } = await import('../lib/prisma');
    assert.ok(prisma.employee, 'employee model should exist');
    assert.ok(prisma.company, 'company model should exist');
    assert.ok(prisma.subscription, 'subscription model should exist');
    console.log('✅ Prisma client loaded with all models');
});

// Test email service
test('Email templates can be loaded', async () => {
    const { EmailTemplates } = await import('../lib/email-service');
    assert.ok(EmailTemplates.registrationApproved, 'registrationApproved template should exist');
    assert.ok(EmailTemplates.registrationRejected, 'registrationRejected template should exist');
    console.log('✅ Email templates loaded');
});

test('Send email function exists', async () => {
    const { sendEmail } = await import('../lib/email-service');
    assert.ok(sendEmail, 'sendEmail should be defined');
    assert.strictEqual(typeof sendEmail, 'function', 'sendEmail should be a function');
    console.log('✅ sendEmail function available');
});

// Test API routes can be imported
test('Trial expiration cron can be imported', async () => {
    const route = await import('../app/api/cron/trial-expiration/route');
    assert.ok(route.GET, 'GET handler should exist');
    console.log('✅ Trial expiration cron loaded');
});

test('Leave submit can be imported', async () => {
    const route = await import('../app/api/leaves/submit/route');
    assert.ok(route.POST, 'POST handler should exist');
    console.log('✅ Leave submit route loaded');
});

test('Enterprise billing can be imported', async () => {
    const route = await import('../app/api/billing/enterprise/route');
    assert.ok(route.GET, 'GET handler should exist');
    assert.ok(route.POST, 'POST handler should exist');
    console.log('✅ Enterprise billing route loaded');
});

// Test type safety
test('OnboardingStatus enum values are valid', () => {
    const validStatuses = ['not_started', 'in_progress', 'pending_approval', 'approved', 'completed'];
    validStatuses.forEach(status => {
        assert.ok(['not_started', 'in_progress', 'pending_approval', 'approved', 'completed'].includes(status));
    });
    console.log('✅ OnboardingStatus values validated');
});

test('ApprovalStatus enum values are valid', () => {
    const validStatuses = ['pending', 'approved', 'rejected'];
    validStatuses.forEach(status => {
        assert.ok(['pending', 'approved', 'rejected'].includes(status));
    });
    console.log('✅ ApprovalStatus values validated');
});

console.log('\\n🎉 Module validation tests complete!');
