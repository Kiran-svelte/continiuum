import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

/**
 * AI Services Test API
 * Tests the AI recommendation engine for leave requests
 * POST /api/test/ai-services
 */

const SPRITE_API_KEY = process.env.SPRITE_API_KEY || process.env.OPENAI_API_KEY;

interface AITestResult {
    name: string;
    status: "PASS" | "FAIL" | "SKIP";
    message: string;
    data?: any;
    error?: string;
}

export async function GET() {
    return NextResponse.json({
        status: "info",
        message: "Use POST to run AI service tests",
        endpoint: "/api/test/ai-services",
        method: "POST",
        body: {
            test_type: "leave_recommendation | constraint_validation | all"
        }
    });
}

export async function POST(request: NextRequest) {
    const results: AITestResult[] = [];
    const startTime = Date.now();

    try {
        // Check auth
        const user = await currentUser();
        if (!user) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

        // Get employee
        const employee = await prisma.employee.findUnique({
            where: { clerk_id: user.id },
            include: { company: true }
        });

        if (!employee?.org_id) {
            return NextResponse.json({ error: "Employee not found or no company" }, { status: 400 });
        }

        // Parse request body
        let body: { test_type?: string; api_key?: string } = {};
        try {
            body = await request.json();
        } catch {
            body = { test_type: "all" };
        }

        const testType = body.test_type || "all";
        const apiKey = body.api_key || SPRITE_API_KEY;

        // ============================================
        // TEST 1: API Key Validation
        // ============================================
        if (!apiKey) {
            results.push({
                name: "API Key Check",
                status: "FAIL",
                message: "No AI API key configured",
                error: "Set SPRITE_API_KEY or OPENAI_API_KEY in environment, or pass api_key in request body"
            });
            return NextResponse.json({
                status: "CONFIG_ERROR",
                results,
                duration_ms: Date.now() - startTime
            });
        }
        results.push({
            name: "API Key Check",
            status: "PASS",
            message: "API key present",
            data: { key_prefix: apiKey.substring(0, 15) + "..." }
        });

        // ============================================
        // TEST 2: Leave Recommendation AI
        // ============================================
        if (testType === "leave_recommendation" || testType === "all") {
            try {
                // Create a mock leave request scenario
                const mockLeaveRequest = {
                    employee_name: employee.full_name,
                    department: employee.department || "General",
                    leave_type: "Annual Leave",
                    days_requested: 3,
                    start_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
                    end_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    reason: "Family vacation",
                    leave_balance: 10,
                    pending_requests_in_team: 0,
                    company_name: employee.company?.name || "Company"
                };

                const prompt = `You are an HR AI assistant. Analyze this leave request and provide a recommendation.

Leave Request Details:
- Employee: ${mockLeaveRequest.employee_name}
- Department: ${mockLeaveRequest.department}
- Leave Type: ${mockLeaveRequest.leave_type}
- Duration: ${mockLeaveRequest.days_requested} days
- Dates: ${mockLeaveRequest.start_date} to ${mockLeaveRequest.end_date}
- Reason: ${mockLeaveRequest.reason}
- Current Balance: ${mockLeaveRequest.leave_balance} days
- Team members also on leave during this period: ${mockLeaveRequest.pending_requests_in_team}

Provide a JSON response with:
{
  "recommendation": "approve" | "review" | "reject",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation",
  "flags": ["any concerns"]
}`;

                const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        model: "gpt-4o-mini",
                        messages: [
                            { role: "system", content: "You are an HR AI assistant that analyzes leave requests. Always respond with valid JSON." },
                            { role: "user", content: prompt }
                        ],
                        temperature: 0.3,
                        max_tokens: 500
                    })
                });

                if (!aiResponse.ok) {
                    const errorData = await aiResponse.text();
                    throw new Error(`AI API error: ${aiResponse.status} - ${errorData}`);
                }

                const aiData = await aiResponse.json();
                const aiContent = aiData.choices?.[0]?.message?.content;

                // Try to parse JSON from response
                let recommendation;
                try {
                    // Extract JSON from response (handle markdown code blocks)
                    const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        recommendation = JSON.parse(jsonMatch[0]);
                    } else {
                        recommendation = { raw: aiContent };
                    }
                } catch {
                    recommendation = { raw: aiContent };
                }

                results.push({
                    name: "Leave Recommendation AI",
                    status: "PASS",
                    message: "AI recommendation generated successfully",
                    data: {
                        input: mockLeaveRequest,
                        recommendation,
                        model: aiData.model,
                        tokens_used: aiData.usage?.total_tokens
                    }
                });

            } catch (e: any) {
                results.push({
                    name: "Leave Recommendation AI",
                    status: "FAIL",
                    message: "Failed to get AI recommendation",
                    error: e.message
                });
            }
        }

        // ============================================
        // TEST 3: Constraint Validation AI
        // ============================================
        if (testType === "constraint_validation" || testType === "all") {
            try {
                // Get company's constraint policy
                const policy = await prisma.constraintPolicy.findFirst({
                    where: { org_id: employee.org_id, is_active: true }
                });

                const rules = policy?.rules as Record<string, any> || {};
                const ruleNames = Object.values(rules).slice(0, 5).map((r: any) => r.name);

                const validationPrompt = `You are a leave policy validator. Given these company rules:
${ruleNames.map((r, i) => `${i + 1}. ${r}`).join('\n')}

Validate this leave request:
- 5 days Annual Leave starting next Monday
- Employee has 10 days balance
- No other team members on leave

Respond with JSON:
{
  "is_valid": true/false,
  "violations": ["list of rule violations if any"],
  "warnings": ["list of warnings"],
  "approval_path": "auto_approve" | "manager_review" | "hr_review"
}`;

                const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        model: "gpt-4o-mini",
                        messages: [
                            { role: "system", content: "You are a leave policy validator. Always respond with valid JSON." },
                            { role: "user", content: validationPrompt }
                        ],
                        temperature: 0.2,
                        max_tokens: 300
                    })
                });

                if (!aiResponse.ok) {
                    throw new Error(`AI API error: ${aiResponse.status}`);
                }

                const aiData = await aiResponse.json();
                const aiContent = aiData.choices?.[0]?.message?.content;

                let validation;
                try {
                    const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        validation = JSON.parse(jsonMatch[0]);
                    } else {
                        validation = { raw: aiContent };
                    }
                } catch {
                    validation = { raw: aiContent };
                }

                results.push({
                    name: "Constraint Validation AI",
                    status: "PASS",
                    message: "AI constraint validation successful",
                    data: {
                        rules_checked: ruleNames.length,
                        validation,
                        tokens_used: aiData.usage?.total_tokens
                    }
                });

            } catch (e: any) {
                results.push({
                    name: "Constraint Validation AI",
                    status: "FAIL",
                    message: "Failed to validate constraints with AI",
                    error: e.message
                });
            }
        }

        // ============================================
        // SUMMARY
        // ============================================
        const passed = results.filter(r => r.status === "PASS").length;
        const failed = results.filter(r => r.status === "FAIL").length;

        return NextResponse.json({
            status: failed === 0 ? "SUCCESS" : "HAS_FAILURES",
            summary: {
                total: results.length,
                passed,
                failed,
                duration_ms: Date.now() - startTime
            },
            results,
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        console.error("[AI Services Test Error]:", error);
        return NextResponse.json({
            status: "ERROR",
            error: error.message,
            results,
            duration_ms: Date.now() - startTime
        }, { status: 500 });
    }
}
