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
import { sendEmail, EmailTemplates } from '@/lib/email-service';

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
            await sendEmail({
                to: contactEmail,
                subject: 'Continuum Enterprise - Quote Request Received',
                template: EmailTemplates.GENERIC,
                data: {
                    preheader: 'Your enterprise quote request has been received',
                    title: 'Thank You for Your Interest!',
                    message: `Dear ${contactName},

Thank you for requesting an enterprise quote for ${companyName}. Our team has received your request and will contact you within 24 hours with a customized quote.

Your request details:
• Company: ${companyName}
• Expected employees: ${expectedEmployees || 500}
• Billing cycle: ${billingCycle}

If you have any urgent questions, please reply to this email.

Best regards,
The Continuum Team`,
                    ctaText: 'View Enterprise Features',
                    ctaUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://continiuum.vercel.app'}/pricing`,
                }
            });
        } catch (emailError) {
            console.error('Failed to send enterprise confirmation email:', emailError);
            // Don't fail the request if email fails
        }

        // Send notification to sales team
        const salesEmail = process.env.SALES_EMAIL || process.env.GMAIL_USER;
        if (salesEmail) {
            try {
                await sendEmail({
                    to: salesEmail,
                    subject: `🏢 New Enterprise Lead: ${companyName}`,
                    template: EmailTemplates.GENERIC,
                    data: {
                        preheader: `Enterprise request from ${companyName}`,
                        title: 'New Enterprise Quote Request',
                        message: `A new enterprise quote has been requested:

**Company Details:**
• Company: ${companyName}
• Size: ${companySize || 'Not specified'}
• Industry: ${industry || 'Not specified'}

**Contact:**
• Name: ${contactName}
• Email: ${contactEmail}
• Phone: ${contactPhone || 'Not provided'}

**Requirements:**
• Expected Employees: ${expectedEmployees || 500}
• Billing Cycle: ${billingCycle}
• Notes: ${requirements || 'None'}

**Quote ID:** ${result.id}`,
                        ctaText: 'View in Dashboard',
                        ctaUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://continiuum.vercel.app'}/admin/enterprise`,
                    }
                });
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
