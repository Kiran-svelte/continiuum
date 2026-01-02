/**
 * Email Service
 * 
 * Handles all email notifications with:
 * - Queue-based sending (for reliability)
 * - Template support
 * - Fallback logging when SMTP not configured
 */

const nodemailer = require('nodemailer');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// Email queue for reliability
const emailQueue = [];
let isProcessing = false;

// Create transporter based on configuration
function createTransporter() {
    if (process.env.SMTP_ENABLED !== 'true') {
        return null;
    }

    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD
        }
    });
}

let transporter = createTransporter();

// Email templates
const templates = {
    leaveApproved: (data) => ({
        subject: `Leave Request Approved - ${data.leaveType}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #22c55e;">✅ Leave Request Approved</h2>
                <p>Dear ${data.employeeName},</p>
                <p>Your leave request has been <strong>approved</strong>.</p>
                <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p><strong>Type:</strong> ${data.leaveType}</p>
                    <p><strong>Dates:</strong> ${data.startDate} to ${data.endDate}</p>
                    <p><strong>Days:</strong> ${data.totalDays}</p>
                    <p><strong>Approved by:</strong> ${data.approverName}</p>
                </div>
                <p>Enjoy your time off!</p>
                <p style="color: #666; font-size: 12px;">This is an automated message from Company HR System.</p>
            </div>
        `
    }),

    leaveRejected: (data) => ({
        subject: `Leave Request Rejected - ${data.leaveType}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #ef4444;">❌ Leave Request Rejected</h2>
                <p>Dear ${data.employeeName},</p>
                <p>Unfortunately, your leave request has been <strong>rejected</strong>.</p>
                <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p><strong>Type:</strong> ${data.leaveType}</p>
                    <p><strong>Dates:</strong> ${data.startDate} to ${data.endDate}</p>
                    <p><strong>Reason:</strong> ${data.rejectionReason || 'Not specified'}</p>
                </div>
                <p>Please contact HR for more information.</p>
            </div>
        `
    }),

    leavePending: (data) => ({
        subject: `New Leave Request Pending Approval`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #f59e0b;">⏳ New Leave Request</h2>
                <p>A new leave request requires your approval.</p>
                <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p><strong>Employee:</strong> ${data.employeeName}</p>
                    <p><strong>Type:</strong> ${data.leaveType}</p>
                    <p><strong>Dates:</strong> ${data.startDate} to ${data.endDate}</p>
                    <p><strong>Days:</strong> ${data.totalDays}</p>
                    <p><strong>Reason:</strong> ${data.reason || 'Not specified'}</p>
                </div>
                <p><a href="${data.approvalUrl}" style="background: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Review Request</a></p>
            </div>
        `
    }),

    passwordReset: (data) => ({
        subject: 'Password Reset Request',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #3b82f6;">🔐 Password Reset</h2>
                <p>Dear ${data.userName},</p>
                <p>We received a request to reset your password.</p>
                <p><a href="${data.resetUrl}" style="background: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
                <p>This link expires in 1 hour.</p>
                <p style="color: #666; font-size: 12px;">If you didn't request this, please ignore this email.</p>
            </div>
        `
    }),

    welcomeEmployee: (data) => ({
        subject: 'Welcome to the Company!',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #22c55e;">🎉 Welcome Aboard!</h2>
                <p>Dear ${data.employeeName},</p>
                <p>Welcome to ${data.companyName}! We're excited to have you on our team.</p>
                <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p><strong>Start Date:</strong> ${data.startDate}</p>
                    <p><strong>Department:</strong> ${data.department}</p>
                    <p><strong>Manager:</strong> ${data.managerName}</p>
                </div>
                <p><a href="${data.onboardingUrl}" style="background: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Start Onboarding</a></p>
            </div>
        `
    })
};

/**
 * Send an email
 * @param {string} to - Recipient email
 * @param {string} templateName - Template to use
 * @param {object} data - Template data
 * @returns {Promise<object>} Send result
 */
async function sendEmail(to, templateName, data) {
    const template = templates[templateName];
    
    if (!template) {
        throw new Error(`Unknown email template: ${templateName}`);
    }

    const { subject, html } = template(data);
    
    const email = {
        from: `"${process.env.SMTP_FROM_NAME || 'Company HR'}" <${process.env.SMTP_FROM_EMAIL || 'noreply@company.com'}>`,
        to,
        subject,
        html
    };

    // Add to queue
    emailQueue.push({ email, templateName, data, timestamp: new Date() });
    
    // Process queue
    processQueue();

    return { queued: true, to, template: templateName };
}

/**
 * Process email queue
 */
async function processQueue() {
    if (isProcessing || emailQueue.length === 0) return;
    
    isProcessing = true;

    while (emailQueue.length > 0) {
        const item = emailQueue.shift();
        
        try {
            if (transporter && process.env.SMTP_ENABLED === 'true') {
                await transporter.sendMail(item.email);
                console.log(`✉️  Email sent: ${item.email.to} (${item.templateName})`);
            } else {
                // Log email when SMTP not configured
                console.log(`📧 [EMAIL LOG] Would send to: ${item.email.to}`);
                console.log(`   Subject: ${item.email.subject}`);
                console.log(`   Template: ${item.templateName}`);
            }
        } catch (error) {
            console.error(`❌ Email failed: ${item.email.to}`, error.message);
            
            // Retry logic - add back to queue with delay
            if (!item.retries || item.retries < 3) {
                item.retries = (item.retries || 0) + 1;
                setTimeout(() => {
                    emailQueue.push(item);
                    processQueue();
                }, 5000 * item.retries);
            }
        }
    }

    isProcessing = false;
}

/**
 * Test email configuration
 */
async function testEmailConfig() {
    if (!transporter) {
        return {
            configured: false,
            message: 'SMTP not configured. Set SMTP_ENABLED=true and configure SMTP settings.'
        };
    }

    try {
        await transporter.verify();
        return { configured: true, message: 'SMTP connection verified' };
    } catch (error) {
        return { configured: false, message: error.message };
    }
}

/**
 * Get queue status
 */
function getQueueStatus() {
    return {
        pending: emailQueue.length,
        isProcessing,
        smtpEnabled: process.env.SMTP_ENABLED === 'true'
    };
}

module.exports = {
    sendEmail,
    testEmailConfig,
    getQueueStatus,
    templates: Object.keys(templates)
};
