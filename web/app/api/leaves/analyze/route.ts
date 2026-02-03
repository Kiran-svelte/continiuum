import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { checkApiRateLimit, rateLimitedResponse } from "@/lib/api-rate-limit";
import { aiLogger } from "@/lib/logger";
import { withRetry, getCircuitBreaker } from "@/lib/reliability";
import { sanitizeInput, safeStringSchema } from "@/lib/integrity";

// 🔄 ENTERPRISE: Circuit breaker for AI engine
const aiCircuitBreaker = getCircuitBreaker('ai-engine');

// Helper function to format date as YYYY-MM-DD without timezone conversion
function formatDateLocal(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Helper function to get max days in a month
function getDaysInMonth(year: number, month: number): number {
    return new Date(year, month + 1, 0).getDate();
}

// Helper function to get suggested valid dates for invalid date
function getSuggestedDates(year: number, month: number, invalidDay: number): string[] {
    const maxDay = getDaysInMonth(year, month);
    const suggestions: string[] = [];
    const monthNames = ["January", "February", "March", "April", "May", "June", 
                        "July", "August", "September", "October", "November", "December"];
    
    // Suggest the last valid day of the month
    suggestions.push(`${monthNames[month]} ${maxDay}, ${year}`);
    
    // Suggest the first day of next month
    const nextMonth = (month + 1) % 12;
    const nextYear = month === 11 ? year + 1 : year;
    suggestions.push(`${monthNames[nextMonth]} 1, ${nextYear}`);
    
    return suggestions;
}

// Simple NLP parser for leave requests - now accepts company's leave types
interface CompanyLeaveType {
    code: string;
    name: string;
    description?: string | null;
}

function parseLeaveRequest(
    text: string, 
    companyLeaveTypes: CompanyLeaveType[] = []
): {
    leaveType: string;
    leaveTypeCode: string;
    startDate: string | null;
    endDate: string | null;
    duration: number;
    invalidDate?: { requested: string; reason: string; suggestions: string[] };
} {
    const lowerText = text.toLowerCase();
    
    // Try to match against company's configured leave types first
    let leaveType = "";
    let leaveTypeCode = "";
    
    if (companyLeaveTypes.length > 0) {
        // Build a map of keywords to leave types
        for (const lt of companyLeaveTypes) {
            const nameLower = lt.name.toLowerCase();
            const codeLower = lt.code.toLowerCase();
            const descLower = (lt.description || "").toLowerCase();
            
            // Check if the request mentions this leave type by name, code, or description keywords
            if (
                lowerText.includes(nameLower) || 
                lowerText.includes(codeLower) ||
                // Also match common variations
                (nameLower.includes("sick") && lowerText.includes("sick")) ||
                (nameLower.includes("casual") && lowerText.includes("casual")) ||
                (nameLower.includes("annual") && lowerText.includes("annual")) ||
                (nameLower.includes("vacation") && lowerText.includes("vacation")) ||
                (nameLower.includes("emergency") && (lowerText.includes("emergency") || lowerText.includes("urgent"))) ||
                (nameLower.includes("maternity") && lowerText.includes("maternity")) ||
                (nameLower.includes("paternity") && lowerText.includes("paternity")) ||
                (nameLower.includes("bereavement") && lowerText.includes("bereavement")) ||
                (nameLower.includes("privilege") && (lowerText.includes("privilege") || lowerText.includes("pl"))) ||
                (nameLower.includes("comp") && (lowerText.includes("comp off") || lowerText.includes("compensatory")))
            ) {
                leaveType = lt.name;
                leaveTypeCode = lt.code;
                break;
            }
        }
        
        // If no match found, use first available leave type as default
        if (!leaveType && companyLeaveTypes.length > 0) {
            leaveType = companyLeaveTypes[0].name;
            leaveTypeCode = companyLeaveTypes[0].code;
        }
    }
    
    // NO HARDCODED FALLBACK! If company hasn't configured leave types, return error
    if (!leaveType) {
        return {
            leaveType: "UNKNOWN",
            leaveTypeCode: "UNKNOWN",
            startDate: null,
            endDate: null,
            duration: 0,
            isHalfDay: false,
            reason: text,
            error: "No leave types configured for this company. Please contact HR."
        };
    }
    
    // Parse dates - handle various formats
    const today = new Date();
    const currentYear = today.getFullYear();
    let startDate: Date | null = null;
    let endDate: Date | null = null;
    let duration = 1;
    let invalidDate: { requested: string; reason: string; suggestions: string[] } | undefined;
    
    // Month names mapping
    const monthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    const fullMonthNames = ["january", "february", "march", "april", "may", "june", 
                           "july", "august", "september", "october", "november", "december"];
    
    const monthPattern = "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?";
    
    // Pattern 1: "jan 20-23rd", "january 20 to 23" (month first)
    const monthFirstRangePattern = new RegExp(
        `(${monthPattern})\\s*(\\d{1,2})(?:st|nd|rd|th)?\\s*(?:-|to|through|until)\\s*(\\d{1,2})(?:st|nd|rd|th)?`,
        'gi'
    );
    
    // Pattern 2: "20th to 22nd jan", "20-23 january" (day range first, then month)
    const dayRangeFirstPattern = new RegExp(
        `(\\d{1,2})(?:st|nd|rd|th)?\\s*(?:-|to|through|until)\\s*(\\d{1,2})(?:st|nd|rd|th)?\\s*(?:of\\s*)?(${monthPattern})`,
        'gi'
    );
    
    // Try both patterns
    const monthFirstMatch = monthFirstRangePattern.exec(lowerText);
    const dayRangeFirstMatch = dayRangeFirstPattern.exec(lowerText);
    
    let matchedMonthStr: string = "";
    let startDay: number = 0;
    let endDay: number = 0;
    let rangeMatchFound = false;
    
    if (monthFirstMatch) {
        // "jan 20-23" format
        matchedMonthStr = monthFirstMatch[1].toLowerCase();
        startDay = parseInt(monthFirstMatch[2]);
        endDay = parseInt(monthFirstMatch[3]);
        rangeMatchFound = true;
    } else if (dayRangeFirstMatch) {
        // "20th to 22nd jan" format
        startDay = parseInt(dayRangeFirstMatch[1]);
        endDay = parseInt(dayRangeFirstMatch[2]);
        matchedMonthStr = dayRangeFirstMatch[3].toLowerCase();
        rangeMatchFound = true;
    }
    
    if (rangeMatchFound && matchedMonthStr) {
        
        // Resolve month index
        let monthIndex = monthNames.findIndex(m => matchedMonthStr.startsWith(m));
        if (monthIndex === -1) {
            monthIndex = fullMonthNames.findIndex(m => matchedMonthStr.startsWith(m.substring(0, 3)));
        }
        
        if (monthIndex >= 0) {
            // Determine year
            let year = currentYear;
            const todayMonth = today.getMonth();
            const todayDay = today.getDate();
            
            if (monthIndex < todayMonth || (monthIndex === todayMonth && startDay < todayDay)) {
                year = currentYear + 1;
            }
            
            // Validate dates
            const maxDaysInMonth = getDaysInMonth(year, monthIndex);
            
            if (startDay > maxDaysInMonth || endDay > maxDaysInMonth) {
                const monthDisplayName = fullMonthNames[monthIndex].charAt(0).toUpperCase() + fullMonthNames[monthIndex].slice(1);
                invalidDate = {
                    requested: `${monthDisplayName} ${startDay}-${endDay}`,
                    reason: `${monthDisplayName} only has ${maxDaysInMonth} days in ${year}`,
                    suggestions: getSuggestedDates(year, monthIndex, Math.max(startDay, endDay))
                };
            } else {
                startDate = new Date(year, monthIndex, startDay);
                endDate = new Date(year, monthIndex, endDay);
                duration = endDay - startDay + 1;
            }
        }
    } else {
        // Try single date patterns
        // Pattern: "month day" (e.g., "feb 1st", "january 20th")
        const monthFirstPattern = new RegExp(`(${monthPattern})\\s*(\\d{1,2})(?:st|nd|rd|th)?`, 'gi');
        // Pattern: "day month" (e.g., "1st feb", "20 january")
        const dayFirstPattern = new RegExp(`(\\d{1,2})(?:st|nd|rd|th)?\\s*(${monthPattern})`, 'gi');
        
        let day: number | null = null;
        let monthIndex: number = -1;
        let matchedMonthStr: string = "";
        
        // Try month-first pattern first (more common)
        const monthFirstMatches = Array.from(lowerText.matchAll(monthFirstPattern));
        if (monthFirstMatches.length > 0) {
            const match = monthFirstMatches[0];
            matchedMonthStr = match[1].toLowerCase();
            day = parseInt(match[2]);
        } else {
            // Try day-first pattern
            const dayFirstMatches = Array.from(lowerText.matchAll(dayFirstPattern));
            if (dayFirstMatches.length > 0) {
                const match = dayFirstMatches[0];
                day = parseInt(match[1]);
                matchedMonthStr = match[2].toLowerCase();
            }
        }
        
        // Resolve month index
        if (matchedMonthStr) {
            monthIndex = monthNames.findIndex(m => matchedMonthStr.startsWith(m));
            if (monthIndex === -1) {
                monthIndex = fullMonthNames.findIndex(m => matchedMonthStr.startsWith(m.substring(0, 3)));
            }
        }
        
        if (day !== null && monthIndex >= 0) {
            // Determine the year - if month is in the past, use next year
            let year = currentYear;
            const todayMonth = today.getMonth();
            const todayDay = today.getDate();
            
            if (monthIndex < todayMonth || (monthIndex === todayMonth && day < todayDay)) {
                year = currentYear + 1;
            }
            
            // Validate if the date actually exists
            const maxDaysInMonth = getDaysInMonth(year, monthIndex);
            
            if (day > maxDaysInMonth) {
                const monthDisplayName = fullMonthNames[monthIndex].charAt(0).toUpperCase() + 
                                         fullMonthNames[monthIndex].slice(1);
                invalidDate = {
                    requested: `${monthDisplayName} ${day}`,
                    reason: `${monthDisplayName} only has ${maxDaysInMonth} days in ${year}`,
                    suggestions: getSuggestedDates(year, monthIndex, day)
                };
            } else {
                startDate = new Date(year, monthIndex, day);
                
                // Double-check the date was created correctly
                if (startDate.getDate() !== day || startDate.getMonth() !== monthIndex) {
                    const monthDisplayName = fullMonthNames[monthIndex].charAt(0).toUpperCase() + 
                                             fullMonthNames[monthIndex].slice(1);
                    invalidDate = {
                        requested: `${monthDisplayName} ${day}`,
                        reason: `Invalid date: ${monthDisplayName} ${day} does not exist`,
                        suggestions: getSuggestedDates(year, monthIndex, day)
                    };
                    startDate = null;
                }
            }
        }
    }
    
    // Check for "tomorrow" (overrides other dates if present)
    if (lowerText.includes("tomorrow") && !invalidDate) {
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() + 1);
    }
    
    // Check for "today"
    if (lowerText.includes("today") && !invalidDate) {
        startDate = new Date(today);
    }
    
    // Check for duration
    const durationMatch = lowerText.match(/(\d+)\s*days?/);
    if (durationMatch) {
        duration = parseInt(durationMatch[1]);
    }
    
    // Set end date based on duration
    if (startDate) {
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + duration - 1);
    }
    
    return {
        leaveType,
        leaveTypeCode,
        startDate: startDate ? formatDateLocal(startDate) : null,
        endDate: endDate ? formatDateLocal(endDate) : null,
        duration,
        ...(invalidDate && { invalidDate })
    };
}

export async function POST(req: NextRequest) {
    // Rate limiting - AI analysis is expensive
    const rateLimit = await checkApiRateLimit(req, 'aiAnalysis');
    if (!rateLimit.allowed) {
        return rateLimitedResponse(rateLimit);
    }
    
    try {
        const user = await getUser();
        const userId = user?.id;
        if (!userId) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { request: text } = body;

        if (!text) {
            return NextResponse.json({ success: false, error: "Request text is required" }, { status: 400 });
        }

        // Get employee from database FIRST (we need org_id for leave types)
        let employee;
        let companyLeaveTypes: CompanyLeaveType[] = [];
        
        try {
            employee = await prisma.employee.findUnique({
                where: { clerk_id: userId },
                include: {
                    company: true,
                    leave_balances: {
                        where: { year: new Date().getFullYear() }
                    }
                }
            });
            
            // Fetch company's configured leave types
            if (employee?.org_id) {
                const leaveTypes = await prisma.leaveType.findMany({
                    where: { company_id: employee.org_id, is_active: true },
                    select: { code: true, name: true, description: true },
                    orderBy: { sort_order: 'asc' }
                });
                companyLeaveTypes = leaveTypes;
            }
        } catch (dbError: any) {
            // Handle database connection errors gracefully
            console.error("[Analyze] Database error:", dbError);
            const errorMessage = dbError?.message || '';
            if (errorMessage.includes('MaxClientsInSessionMode') || 
                errorMessage.includes('max clients') ||
                errorMessage.includes('pool_size')) {
                return NextResponse.json({ 
                    success: false, 
                    error: "Server is experiencing high load. Please try again in a moment." 
                }, { status: 503 });
            }
            throw dbError;
        }

        if (!employee) {
            return NextResponse.json({ success: false, error: "Employee profile not found. Please complete onboarding." }, { status: 404 });
        }

        // Parse the natural language request with company's leave types
        const parsed = parseLeaveRequest(text, companyLeaveTypes);
        aiLogger.debug("Parsed leave request", { ...parsed, companyLeaveTypes: companyLeaveTypes.map(lt => lt.code) });

        // Calculate remaining leave balance for the requested type
        const balanceMap: Record<string, number> = {};
        employee.leave_balances.forEach(bal => {
            const total = Number(bal.annual_entitlement) + Number(bal.carried_forward);
            const used = Number(bal.used_days) + Number(bal.pending_days);
            // Store by both code and normalized name
            balanceMap[bal.leave_type.toLowerCase()] = total - used;
            balanceMap[bal.leave_type.toLowerCase().replace(/\s+/g, "_")] = total - used;
        });
        
        // Use the leave type code for balance lookup (try code first, then name)
        const leaveTypeCode = parsed.leaveTypeCode.toLowerCase();
        const leaveTypeKey = parsed.leaveType.toLowerCase().replace(/\s+/g, "_");
        // NO hardcoded fallback! Get actual balance from DB or 0 (will fail constraint check)
        const remainingLeave = balanceMap[leaveTypeCode] || balanceMap[leaveTypeKey] || Object.values(balanceMap)[0] || 0;

        // Check if there's an invalid date
        if (parsed.invalidDate) {
            return NextResponse.json({
                success: true,
                data: {
                    invalidDate: true,
                    error: parsed.invalidDate.reason,
                    requested_date: parsed.invalidDate.requested,
                    suggestions: parsed.invalidDate.suggestions,
                    parsed: parsed,
                    employee: {
                        emp_id: employee.emp_id,
                        name: employee.full_name,
                        department: employee.department
                    }
                }
            });
        }

        // Check holiday mode and validate against public holidays
        let holidayWarning = null;
        let holidayBlocker = null;
        
        if (parsed.startDate) {
            try {
                // Get company settings for holiday mode
                let companySettings: any = null;
                try {
                    companySettings = await (prisma as any).companySettings?.findFirst?.({
                        where: { company_id: employee.company?.id }
                    });
                } catch (dbError) {
                    console.warn("CompanySettings lookup failed:", dbError);
                }
                
                const holidayMode = companySettings?.holiday_mode || "auto";
                
                // Check if the requested date(s) fall on a public holiday
                const holidayRes = await fetch(
                    `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/holidays?date=${parsed.startDate}&country=${employee.country_code || 'IN'}`
                );
                const holidayData = await holidayRes.json();
                
                if (holidayData.success && holidayData.isHoliday) {
                    if (holidayMode === "auto") {
                        // In auto mode, block leave requests on holidays
                        return NextResponse.json({
                            success: true,
                            data: {
                                holidayConflict: true,
                                error: `Cannot request leave on ${holidayData.holiday?.name || 'a public holiday'}`,
                                holiday: holidayData.holiday,
                                message: `${parsed.startDate} is ${holidayData.holiday?.name}. In AUTO holiday mode, leave cannot be requested on public holidays as they are already off days.`,
                                parsed: parsed,
                                employee: {
                                    emp_id: employee.emp_id,
                                    name: employee.full_name,
                                    department: employee.department
                                }
                            }
                        });
                    } else {
                        // In manual mode, add a warning but allow the request
                        holidayWarning = {
                            type: 'holiday_notice',
                            message: `${parsed.startDate} is ${holidayData.holiday?.name}. You can work on this day or take leave.`,
                            holiday: holidayData.holiday
                        };
                    }
                }
            } catch (error) {
                console.error("[API] Holiday check error:", error);
                // Continue without holiday check if it fails
            }
        }

        // Get REAL team stats for the employee's department
        const department = employee.department || 'General';
        
        let teamCount = 1;
        let onLeaveCount = 0;
        
        try {
            // Count team members in same department
            teamCount = await prisma.employee.count({
                where: {
                    org_id: employee.org_id,
                    department: department
                }
            });
            
            // Count who's on leave during the requested period
            if (parsed.startDate && parsed.endDate) {
                onLeaveCount = await prisma.leaveRequest.count({
                    where: {
                        status: 'approved',
                        employee: {
                            org_id: employee.org_id,
                            department: department
                        },
                        start_date: { lte: new Date(parsed.endDate) },
                        end_date: { gte: new Date(parsed.startDate) }
                    }
                });
            }
        } catch (teamErr) {
            console.warn("[API] Team stats lookup failed:", teamErr);
        }

        // Build request for AI engine - it expects leave_type at root level
        const aiRequest: any = {
            employee_id: employee.emp_id,
            emp_id: employee.emp_id,
            country_code: employee.country_code || "IN",
            leave_type: parsed.leaveType,
            total_days: parsed.duration,
            working_days: parsed.duration,
            is_half_day: false,
            reason: text,
            text: text,
            team_state: {
                team: {
                    teamSize: teamCount || 1,
                    alreadyOnLeave: onLeaveCount,
                    min_coverage: 3,
                    max_concurrent_leave: 5
                },
                blackoutDates: []
            },
            leave_balance: {
                remaining: remainingLeave
            },
            holiday_warning: holidayWarning
        };

        // Add dates if parsed successfully
        if (parsed.startDate && parsed.endDate) {
            aiRequest.start_date = parsed.startDate;
            aiRequest.end_date = parsed.endDate;
        }

        aiLogger.debug("Sending to AI", aiRequest);

        // Call the AI constraint engine
        const aiResponse = await fetch(`${process.env.AI_SERVICE_URL || 'http://localhost:8001'}/analyze`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(aiRequest),
        });

        if (!aiResponse.ok) {
            const errorText = await aiResponse.text();
            aiLogger.error("AI Engine error", { status: aiResponse.status, error: errorText });
            throw new Error(`AI Engine returned ${aiResponse.status}: ${errorText}`);
        }

        const data = await aiResponse.json();
        
        return NextResponse.json({ 
            success: true, 
            data: {
                ...data,
                parsed: parsed,
                holiday_warning: holidayWarning,
                employee: {
                    emp_id: employee.emp_id,
                    name: employee.full_name,
                    department: employee.department
                }
            }
        });
    } catch (error) {
        console.error("[API] Leave Analysis Error:", error);
        return NextResponse.json(
            { 
                success: false, 
                error: error instanceof Error ? error.message : "Failed to analyze leave request" 
            }, 
            { status: 500 }
        );
    }
}
