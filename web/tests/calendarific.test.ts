import test from "node:test";
import assert from "node:assert/strict";

import { parseCalendarificResponse } from "@/lib/holidays/calendarific";

test("parseCalendarificResponse extracts and sorts holidays", () => {
    const data = {
        response: {
            holidays: [
                {
                    name: "Republic Day",
                    date: { iso: "2026-01-26" },
                    type: ["National holiday"],
                },
                {
                    name: "New Year's Day",
                    date: { iso: "2026-01-01" },
                    type: ["National holiday"],
                },
            ],
        },
    };

    const parsed = parseCalendarificResponse(data as any);

    assert.equal(parsed.length, 2);
    assert.equal(parsed[0].name, "New Year's Day");
    assert.equal(parsed[0].date.toISOString().startsWith("2026-01-01"), true);
    assert.equal(parsed[1].name, "Republic Day");
});

test("parseCalendarificResponse drops invalid entries", () => {
    const data = {
        response: {
            holidays: [
                { name: "Bad", date: { iso: "not-a-date" } },
                { name: "Good", date: { iso: "2026-12-25" } },
                { name: "Missing date" },
            ],
        },
    };

    const parsed = parseCalendarificResponse(data as any);
    assert.equal(parsed.length, 1);
    assert.equal(parsed[0].name, "Good");
});
