import { prisma } from "@/lib/prisma";
import { fetchCalendarificHolidays, isCalendarificConfigured, type NormalizedHoliday } from "@/lib/holidays/calendarific";

export async function cachePublicHolidaysForYear(params: {
    year: number;
    countryCode: string;
    holidays: NormalizedHoliday[];
}): Promise<number> {
    const { year, countryCode, holidays } = params;

    const cached = await prisma.$transaction(async (tx) => {
        await tx.publicHoliday.deleteMany({
            where: {
                year,
                country_code: countryCode,
            },
        });

        const results = await Promise.all(
            holidays.map((h) =>
                tx.publicHoliday.create({
                    data: {
                        date: new Date(h.date),
                        name: h.name,
                        local_name: h.local_name,
                        country_code: countryCode,
                        year,
                        is_global: h.is_global,
                        types: h.types,
                    },
                })
            )
        );

        return results.length;
    });

    return cached;
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
