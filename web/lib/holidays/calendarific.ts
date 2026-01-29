import { safeFetch } from "@/lib/safe-fetch";

export type CalendarificHolidayType = string;

export interface CalendarificHoliday {
    name: string;
    description?: string;
    date?: {
        iso?: string;
    };
    type?: CalendarificHolidayType[];
}

export interface CalendarificApiResponse {
    response?: {
        holidays?: CalendarificHoliday[];
    };
    meta?: any;
}

export interface NormalizedHoliday {
    date: Date;
    name: string;
    local_name: string | null;
    is_global: boolean;
    types: CalendarificHolidayType[] | null;
}

export function isCalendarificConfigured(): boolean {
    const key = process.env.CALENDARIFIC_API_KEY;
    return !!key && key.length > 10;
}

function normalizeCalendarificHoliday(h: CalendarificHoliday): NormalizedHoliday | null {
    const iso = h?.date?.iso;
    if (!iso) return null;

    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return null;

    const types = Array.isArray(h.type) ? h.type.filter(Boolean) : null;

    return {
        date,
        name: (h.name || "Public Holiday").toString(),
        local_name: null,
        is_global: true,
        types,
    };
}

export function parseCalendarificResponse(data: CalendarificApiResponse): NormalizedHoliday[] {
    const holidays = data?.response?.holidays;
    if (!Array.isArray(holidays)) return [];

    return holidays
        .map(normalizeCalendarificHoliday)
        .filter((h): h is NormalizedHoliday => !!h)
        .sort((a, b) => a.date.getTime() - b.date.getTime());
}

export async function fetchCalendarificHolidays(params: {
    year: number;
    countryCode: string;
}): Promise<
    | { success: true; holidays: NormalizedHoliday[]; source: "calendarific" }
    | { success: false; error: string }
> {
    const apiKey = process.env.CALENDARIFIC_API_KEY;
    if (!apiKey) {
        return { success: false, error: "CALENDARIFIC_API_KEY is not configured" };
    }

    const { year, countryCode } = params;

    const url = `https://calendarific.com/api/v2/holidays?api_key=${encodeURIComponent(
        apiKey
    )}&country=${encodeURIComponent(countryCode)}&year=${encodeURIComponent(String(year))}`;

    const res = await safeFetch<CalendarificApiResponse>(url, {}, { timeout: 10000, retries: 2 });
    if (!res.success) {
        return { success: false, error: res.error };
    }

    const holidays = parseCalendarificResponse(res.data);

    if (holidays.length === 0) {
        return { success: false, error: "No holidays returned from Calendarific" };
    }

    return { success: true, holidays, source: "calendarific" };
}
