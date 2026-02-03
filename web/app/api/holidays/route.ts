import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isCalendarificConfigured } from "@/lib/holidays/calendarific";
import { ensurePublicHolidaysCached } from "@/lib/holidays/cache";
import { getUser } from "@/lib/supabase/server";

interface CachedHoliday {
    id: string;
    date: Date;
    name: string;
    local_name: string | null;
    country_code: string;
    year: number;
    is_global: boolean;
    types: any;
}

function toDateOnlyUTC(date: string): Date {
    // Accepts YYYY-MM-DD or ISO strings; normalizes to 00:00:00Z.
    const yyyyMmDd = date.includes("T") ? date.split("T")[0] : date;
    return new Date(`${yyyyMmDd}T00:00:00.000Z`);
}

// Get company-specific custom holidays from database (stored in CompanySettings.custom_holidays JSON)
async function getCompanyCustomHolidays(companyId: string, year: number): Promise<CachedHoliday[]> {
    const settings = await prisma.companySettings.findUnique({
        where: { company_id: companyId },
        select: { custom_holidays: true }
    });

    if (!settings || !settings.custom_holidays) {
        return [];
    }

    // custom_holidays is stored as JSON array: [{date: "2025-01-26", name: "Republic Day"}, ...]
    const holidays = settings.custom_holidays as Array<{date: string, name: string}>;
    
    return holidays
        .filter(h => {
            const holidayYear = new Date(h.date).getFullYear();
            return holidayYear === year;
        })
        .map((h, idx) => ({
            id: `custom-${year}-${idx}`,
            date: new Date(h.date + "T00:00:00.000Z"),
            name: h.name,
            local_name: h.name,
            country_code: "CUSTOM",
            year,
            is_global: false,
            types: ["company"]
        }));
}

// Default Indian holidays when provider is not available.
// NOTE: These are fallbacks only when no API configured AND no company holidays exist
function getDefaultIndianHolidays(year: number): CachedHoliday[] {
    const defaults = [
        { month: 1, day: 1, name: "New Year's Day" },
        { month: 1, day: 26, name: "Republic Day" },
        { month: 3, day: 8, name: "Maha Shivaratri" },
        { month: 3, day: 25, name: "Holi" },
        { month: 4, day: 14, name: "Dr. Ambedkar Jayanti" },
        { month: 4, day: 17, name: "Ram Navami" },
        { month: 5, day: 1, name: "May Day" },
        { month: 5, day: 23, name: "Buddha Purnima" },
        { month: 8, day: 15, name: "Independence Day" },
        { month: 8, day: 26, name: "Janmashtami" },
        { month: 10, day: 2, name: "Gandhi Jayanti" },
        { month: 10, day: 12, name: "Dussehra" },
        { month: 10, day: 31, name: "Diwali" },
        { month: 11, day: 1, name: "Diwali Holiday" },
        { month: 11, day: 15, name: "Guru Nanak Jayanti" },
        { month: 12, day: 25, name: "Christmas" },
    ];

    return defaults.map((h, idx) => ({
        id: `default-${year}-${idx}`,
        date: new Date(Date.UTC(year, h.month - 1, h.day)),
        name: h.name,
        local_name: h.name,
        country_code: "IN",
        year,
        is_global: true,
        types: ["public"]
    }));
}

async function getCachedHolidays(year: number, countryCode: string): Promise<CachedHoliday[]> {
    // Try to ensure cache if configured; otherwise just read whatever exists.
    if (isCalendarificConfigured()) {
        await ensurePublicHolidaysCached({ year, countryCode }).catch(() => null);
    }

    return prisma.publicHoliday.findMany({
        where: { year, country_code: countryCode },
        orderBy: { date: "asc" },
    });
}

// GET - Fetch holidays for a year
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
        const countryCode = searchParams.get('country') || "IN";
        const checkDate = searchParams.get('date'); // Optional: check if specific date is holiday
        const upcoming = searchParams.get('upcoming') === 'true';

        const configured = isCalendarificConfigured();
        
        // Try to get company context for custom holidays
        let companyId: string | null = null;
        try {
            const user = await getUser();
            if (user) {
                const employee = await prisma.employee.findFirst({
                    where: { clerk_id: user.id },
                    select: { org_id: true }
                });
                companyId = employee?.org_id || null;
            }
        } catch {
            // Auth failed, continue without company context
        }

        // If checking a specific date
        if (checkDate) {
            const dateObj = toDateOnlyUTC(checkDate);
            const targetYear = dateObj.getUTCFullYear();

            // First check company custom holidays
            if (companyId) {
                const companyHolidays = await getCompanyCustomHolidays(companyId, targetYear);
                const companyHoliday = companyHolidays.find(h => 
                    h.date.toISOString().split("T")[0] === dateObj.toISOString().split("T")[0]
                );
                if (companyHoliday) {
                    return NextResponse.json({
                        success: true,
                        provider: "company",
                        configured: true,
                        isHoliday: true,
                        holiday: {
                            date: dateObj.toISOString().split("T")[0],
                            name: companyHoliday.name,
                            localName: companyHoliday.name,
                        },
                    });
                }
            }

            if (configured) {
                await ensurePublicHolidaysCached({ year: targetYear, countryCode }).catch(() => null);
            }

            const cachedHoliday = await prisma.publicHoliday.findFirst({
                where: { date: dateObj, country_code: countryCode },
            });

            const fallback = countryCode === "IN" ? getDefaultIndianHolidays(targetYear) : [];
            const fallbackHoliday = fallback.find((h) => h.date.toISOString().split("T")[0] === dateObj.toISOString().split("T")[0]);

            const holiday = cachedHoliday || fallbackHoliday;

            return NextResponse.json({
                success: true,
                provider: "calendarific",
                configured,
                isHoliday: !!holiday,
                holiday: holiday
                    ? {
                          date: dateObj.toISOString().split("T")[0],
                          name: holiday.name,
                          localName: holiday.local_name || holiday.name,
                      }
                    : { date: checkDate, name: "Public Holiday" },
            });
        }

        // If fetching upcoming holidays
        if (upcoming) {
            const today = new Date();
            const todayUtc = toDateOnlyUTC(today.toISOString());
            const currentYear = todayUtc.getUTCFullYear();

            // Get company custom holidays first
            let companyHolidays: CachedHoliday[] = [];
            if (companyId) {
                companyHolidays = await getCompanyCustomHolidays(companyId, currentYear);
            }

            const publicHolidays = configured
                ? await getCachedHolidays(currentYear, countryCode)
                : countryCode === "IN"
                    ? getDefaultIndianHolidays(currentYear)
                    : [];

            // Merge and deduplicate by date
            const allHolidays = [...companyHolidays, ...publicHolidays];
            const seenDates = new Set<string>();
            const uniqueHolidays = allHolidays.filter(h => {
                const dateStr = h.date.toISOString().split("T")[0];
                if (seenDates.has(dateStr)) return false;
                seenDates.add(dateStr);
                return true;
            });

            const upcomingHolidays = uniqueHolidays
                .filter((h) => h.date.getTime() >= todayUtc.getTime())
                .sort((a, b) => a.date.getTime() - b.date.getTime())
                .slice(0, 30)
                .map((h) => ({
                    date: h.date.toISOString().split("T")[0],
                    name: h.name,
                    localName: h.local_name || h.name,
                }));

            return NextResponse.json({
                success: true,
                provider: companyHolidays.length > 0 ? "company+calendarific" : "calendarific",
                configured,
                holidays: upcomingHolidays
            });
        }

        // Fetch all holidays for the year
        let companyHolidays: CachedHoliday[] = [];
        if (companyId) {
            companyHolidays = await getCompanyCustomHolidays(companyId, year);
        }

        const publicHolidays = configured
            ? await getCachedHolidays(year, countryCode)
            : countryCode === "IN"
                ? getDefaultIndianHolidays(year)
                : [];

        // Merge and deduplicate
        const allHolidays = [...companyHolidays, ...publicHolidays];
        const seenDates = new Set<string>();
        const uniqueHolidays = allHolidays.filter(h => {
            const dateStr = h.date.toISOString().split("T")[0];
            if (seenDates.has(dateStr)) return false;
            seenDates.add(dateStr);
            return true;
        }).sort((a, b) => a.date.getTime() - b.date.getTime());

        return NextResponse.json({
            success: true,
            provider: companyHolidays.length > 0 ? "company+calendarific" : "calendarific",
            configured,
            year,
            countryCode,
            total: uniqueHolidays.length,
            holidays: uniqueHolidays.map((h: CachedHoliday) => ({
                id: h.id,
                date: h.date,
                name: h.name,
                localName: h.local_name,
                isGlobal: h.is_global
            }))
        });

    } catch (error) {
        console.error("[API] Holidays Error:", error);
        return NextResponse.json(
            { 
                success: false, 
                error: error instanceof Error ? error.message : "Failed to fetch holidays" 
            }, 
            { status: 500 }
        );
    }
}
