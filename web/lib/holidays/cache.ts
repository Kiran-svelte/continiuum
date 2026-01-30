import { prisma } from "@/lib/prisma";
import { fetchCalendarificHolidays, isCalendarificConfigured, type NormalizedHoliday } from "@/lib/holidays/calendarific";

export async function cachePublicHolidaysForYear(params: {
    year: number;
    countryCode: string;
    holidays: NormalizedHoliday[];
}): Promise<number> {
    const { year, countryCode, holidays } = params;

    // First, delete existing holidays for this year/country
    await prisma.publicHoliday.deleteMany({
        where: {
            year,
            country_code: countryCode,
        },
    });

    // Deduplicate holidays by date (some APIs return multiple holidays on same date)
    const uniqueHolidays = new Map<string, NormalizedHoliday>();
    for (const h of holidays) {
        const dateKey = new Date(h.date).toISOString().split('T')[0];
        // Keep the first one or merge names if same date
        if (!uniqueHolidays.has(dateKey)) {
            uniqueHolidays.set(dateKey, h);
        } else {
            // Append name if different holiday on same date
            const existing = uniqueHolidays.get(dateKey)!;
            if (!existing.name.includes(h.name)) {
                existing.name = `${existing.name} / ${h.name}`;
            }
        }
    }

    // Insert holidays one by one to handle any remaining conflicts
    let count = 0;
    for (const h of uniqueHolidays.values()) {
        try {
            await prisma.publicHoliday.upsert({
                where: {
                    date_country_code: {
                        date: new Date(h.date),
                        country_code: countryCode,
                    },
                },
                update: {
                    name: h.name,
                    local_name: h.local_name,
                    year,
                    is_global: h.is_global,
                    types: h.types ?? undefined,
                },
                create: {
                    date: new Date(h.date),
                    name: h.name,
                    local_name: h.local_name,
                    country_code: countryCode,
                    year,
                    is_global: h.is_global,
                    types: h.types ?? undefined,
                },
            });
            count++;
        } catch (err) {
            console.error(`[cachePublicHolidaysForYear] Failed to upsert holiday ${h.name}:`, err);
        }
    }

    return count;
}

export async function ensurePublicHolidaysCached(params: {
    year: number;
    countryCode: string;
}): Promise<
    | { success: true; count: number; cached: boolean }
    | { success: false; error: string }
> {
    const { year, countryCode } = params;

    const existingCount = await prisma.publicHoliday
        .count({
            where: { year, country_code: countryCode },
        })
        .catch(() => 0);

    if (existingCount > 0) {
        return { success: true, count: existingCount, cached: false };
    }

    if (!isCalendarificConfigured()) {
        return { success: false, error: "Calendarific is not configured" };
    }

    const fetched = await fetchCalendarificHolidays({ year, countryCode });
    if (!fetched.success) {
        return fetched;
    }

    const cachedCount = await cachePublicHolidaysForYear({
        year,
        countryCode,
        holidays: fetched.holidays,
    });

    return { success: true, count: cachedCount, cached: true };
}
