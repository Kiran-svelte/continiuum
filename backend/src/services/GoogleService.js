/**
 * Google Services - Gmail & Calendar Integration
 * Real implementation using Google APIs
 */

const { google } = require('googleapis');
const googleConfig = require('../config/google.config');
const db = require('../config/db');

class GoogleService {
    constructor() {
        this.oauth2Client = new google.auth.OAuth2(
            googleConfig.clientId,
            googleConfig.clientSecret,
            googleConfig.redirectUri
        );
    }

    /**
     * Generate OAuth URL for user authorization
     */
    getAuthUrl(state = {}) {
        return this.oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: googleConfig.scopes,
            prompt: 'consent',
            state: JSON.stringify(state)
        });
    }

    /**
     * Exchange authorization code for tokens
     */
    async getTokensFromCode(code) {
        const { tokens } = await this.oauth2Client.getToken(code);
        return tokens;
    }

    /**
     * Get authenticated client for a user
     */
    async getAuthenticatedClient(empId) {
        const result = await db.query(
            'SELECT google_access_token, google_refresh_token FROM employees WHERE emp_id = ?',
            [empId]
        );
        
        // db.query returns [rows, fields] for compatibility
        const rows = Array.isArray(result) ? result[0] : result;
        
        if (!rows || rows.length === 0 || !rows[0].google_refresh_token) {
            throw new Error('User not connected to Google');
        }

        const client = new google.auth.OAuth2(
            googleConfig.clientId,
            googleConfig.clientSecret,
            googleConfig.redirectUri
        );

        client.setCredentials({
            access_token: rows[0].google_access_token,
            refresh_token: rows[0].google_refresh_token
        });

        // Handle token refresh
        client.on('tokens', async (tokens) => {
            if (tokens.access_token) {
                await db.execute(
                    'UPDATE employees SET google_access_token = ? WHERE emp_id = ?',
                    [tokens.access_token, empId]
                );
            }
        });

        return client;
    }

    /**
     * Save tokens to database for a user
     */
    async saveTokens(empId, tokens) {
        await db.execute(
            `UPDATE employees 
             SET google_access_token = ?, 
                 google_refresh_token = COALESCE(?, google_refresh_token)
             WHERE emp_id = ?`,
            [tokens.access_token, tokens.refresh_token, empId]
        );
    }

    /**
     * Get user info from Google
     */
    async getUserInfo(accessToken) {
        this.oauth2Client.setCredentials({ access_token: accessToken });
        const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
        const { data } = await oauth2.userinfo.get();
        return data;
    }

    // ==========================================
    // GMAIL METHODS
    // ==========================================

    /**
     * Send email using Gmail API
     */
    async sendEmail(fromEmpId, to, subject, htmlBody) {
        try {
            const auth = await this.getAuthenticatedClient(fromEmpId);
            const gmail = google.gmail({ version: 'v1', auth });

            // Create email content
            const emailLines = [
                `To: ${to}`,
                `Subject: ${subject}`,
                'MIME-Version: 1.0',
                'Content-Type: text/html; charset=utf-8',
                '',
                htmlBody
            ];
            const email = emailLines.join('\r\n');
            const encodedEmail = Buffer.from(email).toString('base64')
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=+$/, '');

            const response = await gmail.users.messages.send({
                userId: 'me',
                requestBody: {
                    raw: encodedEmail
                }
            });

            console.log(`[Gmail] Email sent: ${response.data.id}`);
            return { success: true, messageId: response.data.id };
        } catch (error) {
            console.error('[Gmail] Send error:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Send leave notification email
     */
    async sendLeaveNotification(type, leaveData) {
        // Ensure required fields have defaults
        const safeData = {
            ...leaveData,
            employeeName: leaveData.employeeName || leaveData.employeeId || 'Employee',
            leaveType: leaveData.leaveType || 'Leave',
            startDate: leaveData.startDate || 'N/A',
            endDate: leaveData.endDate || 'N/A',
            totalDays: leaveData.totalDays || 1,
            reason: leaveData.reason || 'Not specified',
            toEmail: leaveData.toEmail
        };

        console.log(`[Gmail] Sending ${type} notification to: ${safeData.toEmail}`);
        console.log(`[Gmail] Employee: ${safeData.employeeName}, Leave: ${safeData.leaveType}`);

        if (!safeData.toEmail) {
            console.error('[Gmail] No recipient email provided');
            return { success: false, error: 'No recipient email' };
        }

        const templates = {
            'leave_submitted': {
                subject: `Leave Request Submitted - ${safeData.employeeName}`,
                body: this._getLeaveSubmittedTemplate(safeData)
            },
            'leave_approved': {
                subject: `✅ Leave Approved - ${safeData.leaveType}`,
                body: this._getLeaveApprovedTemplate(safeData)
            },
            'leave_escalated': {
                subject: `⏳ Leave Needs Review - ${safeData.employeeName}`,
                body: this._getLeaveEscalatedTemplate(safeData)
            },
            'leave_rejected': {
                subject: `❌ Leave Request Update - ${safeData.leaveType}`,
                body: this._getLeaveRejectedTemplate(safeData)
            }
        };

        const template = templates[type];
        if (!template) {
            throw new Error(`Unknown email template: ${type}`);
        }

        console.log(`[Gmail] Subject: ${template.subject}`);

        // Use system account for notifications
        return this.sendEmailAsSystem(safeData.toEmail, template.subject, template.body);
    }

    /**
     * Send email as system (using verified sender)
     */
    async sendEmailAsSystem(to, subject, htmlBody) {
        // Find an employee with Google connected to send as
        const placeholders = googleConfig.verifiedEmails.map(() => '?').join(',');
        const result = await db.query(
            `SELECT emp_id FROM employees 
             WHERE google_refresh_token IS NOT NULL 
             AND email IN (${placeholders})
             LIMIT 1`,
            googleConfig.verifiedEmails
        );

        // db.query returns [rows, fields] for compatibility
        const rows = Array.isArray(result) ? result[0] : result;

        if (!rows || rows.length === 0) {
            console.error('[Gmail] No verified sender available');
            return { success: false, error: 'No verified sender configured' };
        }

        return this.sendEmail(rows[0].emp_id, to, subject, htmlBody);
    }

    // Email Templates
    _getLeaveSubmittedTemplate(data) {
        return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0;">
                <h2 style="margin: 0;">📋 Leave Request Submitted</h2>
            </div>
            <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb;">
                <p><strong>${data.employeeName}</strong> has submitted a leave request:</p>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Type:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${data.leaveType}</td></tr>
                    <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>From:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${data.startDate}</td></tr>
                    <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>To:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${data.endDate}</td></tr>
                    <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Days:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${data.totalDays}</td></tr>
                    <tr><td style="padding: 8px;"><strong>Reason:</strong></td><td style="padding: 8px;">${data.reason || 'Not specified'}</td></tr>
                </table>
                <div style="margin-top: 20px; padding: 15px; background: #dbeafe; border-radius: 8px;">
                    <strong>🤖 AI Analysis:</strong> ${data.aiDecision || 'Pending'}
                    <br><small>Confidence: ${data.confidence ? (data.confidence * 100).toFixed(1) + '%' : 'N/A'}</small>
                </div>
            </div>
            <div style="background: #374151; color: white; padding: 15px; text-align: center; border-radius: 0 0 10px 10px;">
                <small>AI Leave Management System</small>
            </div>
        </div>`;
    }

    _getLeaveApprovedTemplate(data) {
        return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0;">
                <h2 style="margin: 0;">✅ Leave Approved!</h2>
            </div>
            <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb;">
                <p>Good news! Your leave request has been <strong style="color: #059669;">approved</strong>.</p>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Type:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${data.leaveType}</td></tr>
                    <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>From:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${data.startDate}</td></tr>
                    <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>To:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${data.endDate}</td></tr>
                    <tr><td style="padding: 8px;"><strong>Days:</strong></td><td style="padding: 8px;">${data.totalDays}</td></tr>
                </table>
                ${data.approvedBy ? `<p style="margin-top: 15px;"><strong>Approved by:</strong> ${data.approvedBy}</p>` : ''}
                <div style="margin-top: 20px; padding: 15px; background: #d1fae5; border-radius: 8px; text-align: center;">
                    📅 A calendar event has been created for your leave period.
                </div>
            </div>
            <div style="background: #374151; color: white; padding: 15px; text-align: center; border-radius: 0 0 10px 10px;">
                <small>AI Leave Management System</small>
            </div>
        </div>`;
    }

    _getLeaveEscalatedTemplate(data) {
        return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0;">
                <h2 style="margin: 0;">⏳ Leave Request Needs Review</h2>
            </div>
            <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb;">
                <p>A leave request requires your attention:</p>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Employee:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${data.employeeName}</td></tr>
                    <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Type:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${data.leaveType}</td></tr>
                    <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>From:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${data.startDate}</td></tr>
                    <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>To:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${data.endDate}</td></tr>
                    <tr><td style="padding: 8px;"><strong>Days:</strong></td><td style="padding: 8px;">${data.totalDays}</td></tr>
                </table>
                <div style="margin-top: 20px; padding: 15px; background: #fef3c7; border-radius: 8px;">
                    <strong>🤖 AI Concerns:</strong>
                    <ul style="margin: 10px 0; padding-left: 20px;">
                        ${(data.violations || []).map(v => `<li>${v}</li>`).join('')}
                    </ul>
                </div>
                <div style="margin-top: 20px; text-align: center;">
                    <a href="${data.reviewUrl || '#'}" style="display: inline-block; padding: 12px 24px; background: #4f46e5; color: white; text-decoration: none; border-radius: 8px;">Review Request</a>
                </div>
            </div>
            <div style="background: #374151; color: white; padding: 15px; text-align: center; border-radius: 0 0 10px 10px;">
                <small>AI Leave Management System</small>
            </div>
        </div>`;
    }

    _getLeaveRejectedTemplate(data) {
        return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0;">
                <h2 style="margin: 0;">❌ Leave Request Not Approved</h2>
            </div>
            <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb;">
                <p>Unfortunately, your leave request could not be approved at this time.</p>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Type:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${data.leaveType}</td></tr>
                    <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>From:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${data.startDate}</td></tr>
                    <tr><td style="padding: 8px;"><strong>To:</strong></td><td style="padding: 8px;">${data.endDate}</td></tr>
                </table>
                <div style="margin-top: 20px; padding: 15px; background: #fee2e2; border-radius: 8px;">
                    <strong>Reason:</strong> ${data.rejectionReason || 'Please contact HR for details.'}
                </div>
                <p style="margin-top: 15px;">You may submit a new request with different dates or contact HR for assistance.</p>
            </div>
            <div style="background: #374151; color: white; padding: 15px; text-align: center; border-radius: 0 0 10px 10px;">
                <small>AI Leave Management System</small>
            </div>
        </div>`;
    }

    // ==========================================
    // CALENDAR METHODS
    // ==========================================

    /**
     * Create a calendar event for approved leave
     */
    async createLeaveEvent(empId, leaveData) {
        try {
            const auth = await this.getAuthenticatedClient(empId);
            const calendar = google.calendar({ version: 'v3', auth });

            const event = {
                summary: `🏖️ ${leaveData.leaveType} - ${leaveData.employeeName}`,
                description: `Leave Request #${leaveData.requestId}\nType: ${leaveData.leaveType}\nDays: ${leaveData.totalDays}\n\nApproved by AI Leave Management System`,
                start: {
                    date: leaveData.startDate,  // All-day event
                    timeZone: 'Asia/Kolkata'
                },
                end: {
                    date: this._addDays(leaveData.endDate, 1),  // End date is exclusive
                    timeZone: 'Asia/Kolkata'
                },
                colorId: googleConfig.calendar.eventColors[leaveData.leaveTypeDb] || '9',
                transparency: 'opaque',
                visibility: 'default',
                reminders: {
                    useDefault: false,
                    overrides: [
                        { method: 'email', minutes: 24 * 60 },  // 1 day before
                        { method: 'popup', minutes: 60 }        // 1 hour before
                    ]
                }
            };

            const response = await calendar.events.insert({
                calendarId: googleConfig.calendar.leaveCalendarId,
                requestBody: event
            });

            console.log(`[Calendar] Event created: ${response.data.id}`);

            // Save event ID to database for future updates
            await db.execute(
                `UPDATE leave_requests SET google_calendar_event_id = ? WHERE request_id = ?`,
                [response.data.id, leaveData.requestId]
            );

            return { success: true, eventId: response.data.id, eventLink: response.data.htmlLink };
        } catch (error) {
            console.error('[Calendar] Create event error:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Delete calendar event when leave is cancelled
     */
    async deleteLeaveEvent(empId, eventId) {
        try {
            const auth = await this.getAuthenticatedClient(empId);
            const calendar = google.calendar({ version: 'v3', auth });

            await calendar.events.delete({
                calendarId: googleConfig.calendar.leaveCalendarId,
                eventId: eventId
            });

            console.log(`[Calendar] Event deleted: ${eventId}`);
            return { success: true };
        } catch (error) {
            console.error('[Calendar] Delete event error:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get free/busy information for team
     */
    async getTeamAvailability(empId, startDate, endDate, teamEmails) {
        try {
            const auth = await this.getAuthenticatedClient(empId);
            const calendar = google.calendar({ version: 'v3', auth });

            const response = await calendar.freebusy.query({
                requestBody: {
                    timeMin: new Date(startDate).toISOString(),
                    timeMax: new Date(endDate).toISOString(),
                    items: teamEmails.map(email => ({ id: email }))
                }
            });

            return { success: true, calendars: response.data.calendars };
        } catch (error) {
            console.error('[Calendar] Free/busy error:', error.message);
            return { success: false, error: error.message };
        }
    }

    // Helper method
    _addDays(dateStr, days) {
        const date = new Date(dateStr);
        date.setDate(date.getDate() + days);
        return date.toISOString().split('T')[0];
    }
}

module.exports = new GoogleService();
