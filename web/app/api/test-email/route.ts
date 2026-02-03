/**
 * 🧪 EMAIL TEST API
 * 
 * Test email sending with OAuth tokens.
 * GET /api/test-email - Check email config
 * POST /api/test-email - Send test email
 * 
 * ⚠️ DEVELOPMENT ONLY - Protected in production
 */

import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { google } from 'googleapis';
import { getUser } from "@/lib/supabase/server";

const GMAIL_CONFIG = {
    clientId: process.env.GMAIL_CLIENT_ID || '',
    clientSecret: process.env.GMAIL_CLIENT_SECRET || '',
    refreshToken: process.env.GMAIL_REFRESH_TOKEN || '',
    user: process.env.GMAIL_USER || 'traderlighter11@gmail.com'
};

// Development check - disable in production
function isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development' || process.env.ALLOW_TEST_ENDPOINTS === 'true';
}

// GET - Check email configuration status
export async function GET() {
    // Security: Only allow in development or with explicit flag
    if (!isDevelopment()) {
        const user = await getUser();
        if (!user) {
            return NextResponse.json({ error: "This endpoint is disabled in production" }, { status: 403 });
        }
    }

    const config = {
        hasClientId: !!GMAIL_CONFIG.clientId,
        hasClientSecret: !!GMAIL_CONFIG.clientSecret,
        hasRefreshToken: !!GMAIL_CONFIG.refreshToken,
        user: GMAIL_CONFIG.user,
        refreshTokenPreview: GMAIL_CONFIG.refreshToken 
            ? `${GMAIL_CONFIG.refreshToken.substring(0, 20)}...` 
            : 'NOT SET'
    };

    // Test OAuth connection
    let oauthStatus = 'not_tested';
    let accessToken = null;

    if (GMAIL_CONFIG.refreshToken) {
        try {
            const oauth2Client = new google.auth.OAuth2(
                GMAIL_CONFIG.clientId,
                GMAIL_CONFIG.clientSecret,
                'https://developers.google.com/oauthplayground'
            );

            oauth2Client.setCredentials({
                refresh_token: GMAIL_CONFIG.refreshToken
            });

            const { token } = await oauth2Client.getAccessToken();
            accessToken = token ? `${token.substring(0, 20)}...` : null;
            oauthStatus = token ? 'success' : 'failed_no_token';
        } catch (error: any) {
            oauthStatus = `error: ${error.message}`;
        }
    }

    return NextResponse.json({
        status: 'Email Configuration Check',
        config,
        oauthStatus,
        accessToken,
        ready: config.hasClientId && config.hasClientSecret && config.hasRefreshToken && oauthStatus === 'success'
    });
}

// POST - Send test email
export async function POST(request: NextRequest) {
    // Security: Only allow in development or with explicit flag
    if (!isDevelopment()) {
        const user = await getUser();
        if (!user) {
            return NextResponse.json({ error: "This endpoint is disabled in production" }, { status: 403 });
        }
    }

    try {
        const body = await request.json();
        const toEmail = body.to || GMAIL_CONFIG.user; // Default to self

        if (!GMAIL_CONFIG.refreshToken) {
            return NextResponse.json({
                success: false,
                error: 'GMAIL_REFRESH_TOKEN not configured in .env'
            }, { status: 400 });
        }

        // Create OAuth2 client
        const oauth2Client = new google.auth.OAuth2(
            GMAIL_CONFIG.clientId,
            GMAIL_CONFIG.clientSecret,
            'https://developers.google.com/oauthplayground'
        );

        oauth2Client.setCredentials({
            refresh_token: GMAIL_CONFIG.refreshToken
        });

        // Get access token
        const { token: accessToken } = await oauth2Client.getAccessToken();

        if (!accessToken) {
            return NextResponse.json({
                success: false,
                error: 'Failed to get access token from refresh token'
            }, { status: 500 });
        }

        // Create transporter with OAuth2
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                type: 'OAuth2',
                user: GMAIL_CONFIG.user,
                clientId: GMAIL_CONFIG.clientId,
                clientSecret: GMAIL_CONFIG.clientSecret,
                refreshToken: GMAIL_CONFIG.refreshToken,
                accessToken: accessToken
            }
        });

        // Send test email
        const result = await transporter.sendMail({
            from: `"Continuum HR" <${GMAIL_CONFIG.user}>`,
            to: toEmail,
            subject: '✅ Continuum Email Test - OAuth Working!',
            html: `
                <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #10B981; margin: 0;">🎉 Email Test Successful!</h1>
                    </div>
                    
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 16px; padding: 30px; color: white; margin-bottom: 20px;">
                        <h2 style="margin: 0 0 15px 0;">OAuth2 Configuration ✓</h2>
                        <p style="margin: 0; opacity: 0.9;">Your Gmail OAuth tokens are working correctly!</p>
                    </div>
                    
                    <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                        <h3 style="color: #1e293b; margin: 0 0 10px 0;">📧 Email Details</h3>
                        <table style="width: 100%; font-size: 14px;">
                            <tr><td style="color: #64748b; padding: 5px 0;">From:</td><td style="color: #1e293b;">${GMAIL_CONFIG.user}</td></tr>
                            <tr><td style="color: #64748b; padding: 5px 0;">To:</td><td style="color: #1e293b;">${toEmail}</td></tr>
                            <tr><td style="color: #64748b; padding: 5px 0;">Time:</td><td style="color: #1e293b;">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</td></tr>
                            <tr><td style="color: #64748b; padding: 5px 0;">Method:</td><td style="color: #10B981; font-weight: 600;">OAuth2 (Refresh Token)</td></tr>
                        </table>
                    </div>
                    
                    <div style="text-align: center; color: #64748b; font-size: 12px;">
                        <p>Sent from Continuum HR Platform</p>
                    </div>
                </div>
            `
        });

        return NextResponse.json({
            success: true,
            message: `Test email sent to ${toEmail}`,
            messageId: result.messageId,
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        console.error('Email test failed:', error);
        return NextResponse.json({
            success: false,
            error: error.message,
            code: error.code,
            hint: error.code === 'EAUTH' 
                ? 'OAuth tokens may be expired. Refresh them at https://developers.google.com/oauthplayground'
                : undefined
        }, { status: 500 });
    }
}
