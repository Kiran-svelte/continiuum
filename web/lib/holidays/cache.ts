import { prisma } from "@/lib/prisma";
import { fetchCalendarificHolidays, isCalendarificConfigured, type NormalizedHoliday } from "@/lib/holidays/calendarific";

// Normalize date to UTC midnight to avoid timezone issues
function normalizeDate(date: Date | string): Date {
    const d = new Date(date);
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

export async function cachePublicHolidaysForYear(params: {
    year: number;
    countryCode: string;
    holidays: NormalizedHoliday[];
}): Promise<number> {
    const { year, countryCode, holidays } = params;

    try {
        // First, delete ALL existing holidays for this year/country
        const deleted = await prisma.publicHoliday.deleteMany({
            where: {
                year,
                country_code: countryCode,
            },
        });
        console.log(`[cachePublicHolidaysForYear] Deleted ${deleted.count} existing holidays for ${countryCode} ${year}`);

        // Deduplicate holidays by normalized date string (YYYY-MM-DD)
        const uniqueHolidays = new Map<string, NormalizedHoliday>();
        for (const h of holidays) {
            const normalizedDate = normalizeDate(h.date);
            const dateKey = normalizedDate.toISOString().split('T')[0]; // YYYY-MM-DD
            
            if (!uniqueHolidays.has(dateKey)) {
                uniqueHolidays.set(dateKey, { ...h, date: normalizedDate });
            } else {
                // Merge names for same date
                const existing = uniqueHolidays.get(dateKey)!;
                if (!existing.name.includes(h.name)) {
                    existing.name = `${existing.name} / ${h.name}`;
                }
            }
        }

        console.log(`[cachePublicHolidaysForYear] Inserting ${uniqueHolidays.size} unique holidays`);

        // Use createMany for efficiency (skip duplicates)
        const holidaysToCreate = Array.from(uniqueHolidays.values()).map(h => ({
            date: normalizeDate(h.date),
            name: h.name,
            local_name: h.local_name,
            country_code: countryCode,
            year,
            is_global: h.is_global,
            types: h.types ?? undefined,
        }));

        const result = await prisma.publicHoliday.createMany({
            data: holidaysToCreate,
            skipDuplicates: true, // Skip any that somehow still exist
        });

        console.log(`[cachePublicHolidaysForYear] Created ${result.count} holidays`);
        return result.count;

    } catch (err: any) {
        console.error(`[cachePublicHolidaysForYear] Error:`, err?.message || err);
        throw err; // Re-throw to let caller handle
    }
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
