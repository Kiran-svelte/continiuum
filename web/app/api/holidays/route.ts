import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

// Holiday API (holidayapi.com) - Supports India properly
const HOLIDAY_API_KEY = process.env.HOLIDAY_API_KEY || "8186ce7f-a734-47fa-968f-e2553a4638c3";
const HOLIDAY_API_BASE = "https://holidayapi.com/v1";

interface HolidayAPIHoliday {
    name: string;
    name_local?: string;
    language?: string;
    description?: string;
    country: string;
    location?: string;
    type: string;
    date: string;
    date_year: string;
    date_month: string;
    date_day: string;
    week_day: string;
    observed?: string;
    public: boolean;
}

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

// Fetch and cache holidays from Holiday API (holidayapi.com)
// For future years (free tier limitation), fetch previous year's holidays and adjust dates
async function fetchAndCacheHolidays(year: number, countryCode: string = "IN"): Promise<CachedHoliday[]> {
    try {
        // Check if we already have cached holidays for this year
        const cachedCount = await (prisma as any).publicHoliday?.count?.({
            where: {
                year,
                country_code: countryCode
            }
        }).catch(() => 0);

        // If holidays are already cached, return them from DB
        if (cachedCount > 0) {
            const cached = await (prisma as any).publicHoliday.findMany({
                where: {
                    year,
                    country_code: countryCode
                },
                orderBy: { date: 'asc' }
            });
            return cached;
        }

        // Holiday API free tier only supports past years
        const currentYear = new Date().getFullYear();
        const queryYear = year >= currentYear ? currentYear - 1 : year;
        
        // Fetch from Holiday API (holidayapi.com)
        const response = await fetch(
            `${HOLIDAY_API_BASE}/holidays?key=${HOLIDAY_API_KEY}&country=${countryCode}&year=${queryYear}&public=true`
        );
        
        if (!response.ok) {
            throw new Error(`Holiday API returned ${response.status}`);
        }

        const data = await response.json();
        
        if (data.status !== 200 || !data.holidays) {
            throw new Error(data.error || "No holidays data returned");
        }

        const holidays: HolidayAPIHoliday[] = data.holidays;

        // Adjust dates to the requested year if we queried a different year
        const adjustDate = (originalDate: string): Date => {
            const d = new Date(originalDate);
            d.setFullYear(year); // Adjust to requested year
            return d;
        };

        // Try to cache the holidays in database (if table exists)
        try {
            const cachedHolidays = await Promise.all(
                holidays.map(async (holiday) => {
                    const adjustedDate = adjustDate(holiday.date);
                    return (prisma as any).publicHoliday.upsert({
                        where: {
                            date_country_code: {
                                date: adjustedDate,
                                country_code: countryCode
                            }
                        },
                        update: {
                            name: holiday.name,
                            local_name: holiday.name_local || holiday.name,
                            is_global: holiday.public,
                            types: [holiday.type]
                        },
                        create: {
                            date: adjustedDate,
                            name: holiday.name,
                            local_name: holiday.name_local || holiday.name,
                            country_code: countryCode,
                            year,
                            is_global: holiday.public,
                            types: [holiday.type]
                        }
                    });
                })
            );
            return cachedHolidays;
        } catch (dbError) {
            console.warn("Could not cache holidays in DB:", dbError);
            // Return directly from API response if caching fails
            return holidays.map((h, idx) => {
                const adjustedDate = adjustDate(h.date);
                return {
                    id: `temp-${idx}`,
                    date: adjustedDate,
                    name: h.name,
                    local_name: h.name_local || h.name,
                    country_code: countryCode,
                    year,
                    is_global: h.public,
                    types: [h.type]
                };
            });
        }
    } catch (error) {
        console.error("Error fetching holidays:", error);
        throw error;
    }
}

// Check if a specific date is a public holiday using Holiday API
// For future years (free tier limitation), check if same date was a holiday in previous year
async function isPublicHoliday(date: string, countryCode: string = "IN"): Promise<{ isHoliday: boolean; holiday?: any }> {
    try {
        // First check our cache
        try {
            const cachedHoliday = await (prisma as any).publicHoliday?.findFirst?.({
                where: {
                    date: new Date(date),
                    country_code: countryCode
                }
            });

            if (cachedHoliday) {
                return { isHoliday: true, holiday: cachedHoliday };
            }
        } catch (dbError) {
            console.warn("DB check failed, falling back to API:", dbError);
        }

        // If not in cache, check Holiday API directly
        const dateObj = new Date(date);
        let year = dateObj.getFullYear();
        const month = dateObj.getMonth() + 1;
        const day = dateObj.getDate();
        const currentYear = new Date().getFullYear();
        
        // Holiday API free tier only supports past years
        // For current/future years, check the previous year (national holidays repeat)
        const queryYear = year >= currentYear ? currentYear - 1 : year;

        const response = await fetch(
            `${HOLIDAY_API_BASE}/holidays?key=${HOLIDAY_API_KEY}&country=${countryCode}&year=${queryYear}&month=${month}&day=${day}&public=true`
        );

        if (!response.ok) {
            // If API fails, try previous year as fallback
            if (response.status === 402 && year > 2020) {
                const fallbackResponse = await fetch(
                    `${HOLIDAY_API_BASE}/holidays?key=${HOLIDAY_API_KEY}&country=${countryCode}&year=2024&month=${month}&day=${day}&public=true`
                );
                if (fallbackResponse.ok) {
                    const fallbackData = await fallbackResponse.json();
                    if (fallbackData.status === 200 && fallbackData.holidays?.length > 0) {
                        const holiday = fallbackData.holidays[0];
                        return { 
                            isHoliday: true, 
                            holiday: {
                                date: date, // Return original date
                                name: holiday.name,
                                local_name: holiday.name_local || holiday.name,
                                type: holiday.type
                            }
                        };
                    }
                }
            }
            console.error("Holiday API error:", response.status);
            return { isHoliday: false };
        }

        const data = await response.json();
        
        if (data.status === 200 && data.holidays && data.holidays.length > 0) {
            const holiday = data.holidays[0];
            return { 
                isHoliday: true, 
                holiday: {
                    date: date, // Return the original requested date
                    name: holiday.name,
                    local_name: holiday.name_local || holiday.name,
                    type: holiday.type
                }
            };
        }
        
        return { isHoliday: false };
    } catch (error) {
        console.error("Error checking holiday:", error);
        return { isHoliday: false };
    }
}

// GET - Fetch holidays for a year
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
        const countryCode = searchParams.get('country') || "IN";
        const checkDate = searchParams.get('date'); // Optional: check if specific date is holiday
        const upcoming = searchParams.get('upcoming') === 'true';

        // If checking a specific date
        if (checkDate) {
            const result = await isPublicHoliday(checkDate, countryCode);
            return NextResponse.json({
                success: true,
                isHoliday: result.isHoliday,
                holiday: result.holiday || { date: checkDate, name: "Public Holiday" }
            });
        }

        // If fetching upcoming holidays
        if (upcoming) {
            // Use Holiday API - fetch current year and filter for upcoming
            const today = new Date();
            const currentYear = today.getFullYear();
            
            const response = await fetch(
                `${HOLIDAY_API_BASE}/holidays?key=${HOLIDAY_API_KEY}&country=${countryCode}&year=${currentYear}&public=true&upcoming=true`
            );
            
            if (!response.ok) {
                throw new Error(`Holiday API error: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.status !== 200) {
                throw new Error(data.error || "Failed to fetch upcoming holidays");
            }
            
            const upcomingHolidays = (data.holidays || []).map((h: HolidayAPIHoliday) => ({
                date: h.date,
                name: h.name,
                localName: h.name_local || h.name,
                type: h.type
            }));
            
            return NextResponse.json({
                success: true,
                holidays: upcomingHolidays
            });
        }

        // Fetch all holidays for the year
        const holidays = await fetchAndCacheHolidays(year, countryCode);

        return NextResponse.json({
            success: true,
            year,
            countryCode,
            total: holidays.length,
            holidays: holidays.map((h: CachedHoliday) => ({
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
