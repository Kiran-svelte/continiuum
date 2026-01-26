/**
 * 🏢 ENTERPRISE SIGNUP API
 * 
 * Handles enterprise quote requests and self-serve signup.
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
    calculateEnterpriseQuote, 
    createEnterpriseRequest,
    getEnterpriseFeatures,
} from '@/lib/billing/enterprise';
import { sendEmail } from '@/lib/email-service';

// GET - Get enterprise pricing and features
export async function GET() {
    const features = getEnterpriseFeatures();
    
    // Calculate sample quotes for different sizes
    const quotes = {
        small: calculateEnterpriseQuote(200, 'yearly'),
        medium: calculateEnterpriseQuote(500, 'yearly'),
        large: calculateEnterpriseQuote(1000, 'yearly'),
        enterprise: calculateEnterpriseQuote(5000, 'yearly'),
    };

    return NextResponse.json({
        features,
        sampleQuotes: quotes,
        faq: [
            {
                q: 'What is included in the Enterprise plan?',
                a: 'Unlimited employees, dedicated support, custom SLA, white-label branding, and more.',
            },
            {
                q: 'Can I get a custom quote?',
                a: 'Yes! Fill out the form below and we\'ll prepare a custom quote within 24 hours.',
            },
            {
                q: 'Is there a setup fee?',
                a: 'No setup fees. We include onboarding and training at no extra cost.',
            },
            {
                q: 'What about data migration?',
                a: 'We offer free data migration from your existing HRIS system.',
            },
        ],
    });
}

// POST - Create enterprise request
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        
        const {
            companyName,
            companySize,
            industry,
            contactName,
            contactEmail,
            contactPhone,
            requirements,
            expectedEmployees,
            billingCycle = 'yearly',
        } = body;

        // Validate required fields
        if (!companyName || !contactEmail || !contactName) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const result = await createEnterpriseRequest({
            companyName,
            companySize,
            industry,
            contactName,
            contactEmail,
            contactPhone,
            requirements,
            expectedEmployees: expectedEmployees || 500,
            billingCycle,
        });

        // Send confirmation email to customer
        try {
            const confirmationHtml = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #6366f1, #4f46e5); padding: 30px; text-align: center;">
                        <h1 style="color: white; margin: 0;">Thank You for Your Interest!</h1>
                    </div>
                    <div style="padding: 30px; background: #1e293b; color: #e2e8f0;">
                        <h2 style="color: #fff;">Dear ${contactName},</h2>
                        <p>Thank you for requesting an enterprise quote for ${companyName}. Our team has received your request and will contact you within 24 hours with a customized quote.</p>
                        
                        <div style="background: #334155; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <p style="margin: 0 0 10px; color: #94a3b8; font-weight: bold;">Your request details:</p>
                            <ul style="color: #e2e8f0; margin: 0; padding-left: 20px;">
                                <li>Company: ${companyName}</li>
                                <li>Expected employees: ${expectedEmployees || 500}</li>
                                <li>Billing cycle: ${billingCycle}</li>
                            </ul>
                        </div>
                        
                        <p>If you have any urgent questions, please reply to this email.</p>
                        
                        <div style="text-align: center; margin-top: 25px;">
                            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://continiuum.vercel.app'}/pricing" style="display: inline-block; background: #6366f1; color: white; padding: 14px 35px; border-radius: 8px; text-decoration: none; font-weight: bold;">View Enterprise Features</a>
                        </div>
                    </div>
                    <div style="padding: 15px; background: #0f172a; text-align: center;">
                        <p style="color: #64748b; margin: 0; font-size: 12px;">Continuum HR Management System</p>
                    </div>
                </div>
            `;
            await sendEmail(
                contactEmail,
                'Continuum Enterprise - Quote Request Received',
                confirmationHtml
            );
        } catch (emailError) {
            console.error('Failed to send enterprise confirmation email:', emailError);
            // Don't fail the request if email fails
        }

        // Send notification to sales team
        const salesEmail = process.env.SALES_EMAIL || process.env.GMAIL_USER;
        if (salesEmail) {
            try {
                const salesHtml = `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 30px; text-align: center;">
                            <h1 style="color: white; margin: 0;">🏢 New Enterprise Lead</h1>
                        </div>
                        <div style="padding: 30px; background: #1e293b; color: #e2e8f0;">
                            <h2 style="color: #fff;">New Enterprise Quote Request</h2>
                            
                            <div style="background: #334155; padding: 20px; border-radius: 8px; margin: 20px 0;">
                                <p style="margin: 0 0 15px; color: #94a3b8; font-weight: bold;">Company Details:</p>
                                <ul style="color: #e2e8f0; margin: 0; padding-left: 20px;">
                                    <li>Company: ${companyName}</li>
                                    <li>Size: ${companySize || 'Not specified'}</li>
                                    <li>Industry: ${industry || 'Not specified'}</li>
                                </ul>
                            </div>
                            
                            <div style="background: #334155; padding: 20px; border-radius: 8px; margin: 20px 0;">
                                <p style="margin: 0 0 15px; color: #94a3b8; font-weight: bold;">Contact:</p>
                                <ul style="color: #e2e8f0; margin: 0; padding-left: 20px;">
                                    <li>Name: ${contactName}</li>
                                    <li>Email: ${contactEmail}</li>
                                    <li>Phone: ${contactPhone || 'Not provided'}</li>
                                </ul>
                            </div>
                            
                            <div style="background: #334155; padding: 20px; border-radius: 8px; margin: 20px 0;">
                                <p style="margin: 0 0 15px; color: #94a3b8; font-weight: bold;">Requirements:</p>
                                <ul style="color: #e2e8f0; margin: 0; padding-left: 20px;">
                                    <li>Expected Employees: ${expectedEmployees || 500}</li>
                                    <li>Billing Cycle: ${billingCycle}</li>
                                    <li>Notes: ${requirements || 'None'}</li>
                                </ul>
                            </div>
                            
                            <p style="color: #94a3b8;">Quote ID: ${result.id}</p>
                            
                            <div style="text-align: center; margin-top: 25px;">
                                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://continiuum.vercel.app'}/admin/enterprise" style="display: inline-block; background: #10b981; color: white; padding: 14px 35px; border-radius: 8px; text-decoration: none; font-weight: bold;">View in Dashboard</a>
                            </div>
                        </div>
                        <div style="padding: 15px; background: #0f172a; text-align: center;">
                            <p style="color: #64748b; margin: 0; font-size: 12px;">Continuum HR Management System</p>
                        </div>
                    </div>
                `;
                await sendEmail(
                    salesEmail,
                    `🏢 New Enterprise Lead: ${companyName}`,
                    salesHtml
                );
            } catch (salesEmailError) {
                console.error('Failed to send sales notification email:', salesEmailError);
            }
        }

        return NextResponse.json({
            success: true,
            requestId: result.id,
            quote: result.quote,
            message: 'Thank you! Our team will contact you within 24 hours.',
        });
    } catch (error: any) {
        console.error('Enterprise request error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to process request' },
            { status: 500 }
        );
    }
}
