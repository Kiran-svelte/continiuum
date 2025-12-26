class DateExtractor {
    static extract(text) {
        text = text.toLowerCase().trim();
        const today = new Date();

        let startDate = null;
        let endDate = null;
        let type = text.includes('sick') ? 'Sick Leave' : 'Casual Leave';

        // Helper to parse a single date string
        const parseDateToken = (token) => {
            if (!token) return null;
            token = token.trim();

            // "tomorrow"
            if (token.includes('tomorrow')) {
                const d = new Date(today);
                d.setDate(d.getDate() + 1);
                return d;
            }
            // "today"
            if (token.includes('today')) {
                return new Date(today);
            }

            // "next monday", etc (Basic support)
            // ...

            // Regex for specific dates: "jan 2nd", "2nd jan", "2025-01-02"
            // Matches: [full, month-first-month, month-first-day, day-first-day, day-first-month]
            const regex = /(?:(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?)|(?:(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*)/i;

            const match = token.match(regex);

            if (match) {
                const monthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
                let day, monthStr;

                if (match[1]) {
                    monthStr = match[1];
                    day = parseInt(match[2]);
                } else {
                    day = parseInt(match[3]);
                    monthStr = match[4];
                }

                const month = monthNames.indexOf(monthStr.substring(0, 3).toLowerCase());
                let date = new Date(today);
                date.setMonth(month);
                date.setDate(day);

                // Year Inference Logic
                // If asking for a month that is 'earlier' than current month, assume next year.
                // e.g. In Dec 2024, asking for "Jan" -> Jan 2025.
                // e.g. In Jan 2025, asking for "Dec" -> Dec 2025 (current year).
                if (date < today && month < today.getMonth()) {
                    date.setFullYear(today.getFullYear() + 1);
                }

                return date;
            }
            return null;
        };

        // RANGE DETECTION
        // Split by "till", "to", "until", "-"
        // We need to be careful with "sick leave [to]day" vs "jan 2 [to] jan 5"
        // Strategy: Look for date patterns first, then look for separators between them.

        // 1. Try splitting by explicit range words
        const parts = text.split(/\s+(?:till|until|to|-)\s+/);

        if (parts.length >= 2) {
            // Check start date in first part
            // We search from right-to-left in first part to find the date nearest the separator
            const p1 = parts[0];
            const p2 = parts[parts.length - 1]; // Take last part for end date

            // For now, simple approach: just try to parse the whole chunk or substrings
            startDate = parseDateToken(p1);
            endDate = parseDateToken(p2);

            // If failed, maybe the date was "jan 2nd" and "5th jan"
            // Try extracting just the date-like substring?
            // (Passed text to parseDateToken handles strict matches well but might need pre-cleaning if words surround it)
        }

        if (!startDate) {
            // Fallback: finding single date
            startDate = parseDateToken(text);
        }

        // Final Validation / Defaults in JS
        if (startDate && !endDate) {
            endDate = new Date(startDate); // Single day
        }

        if (startDate && endDate) {
            // Validate order
            if (startDate > endDate) {
                // If they enter "till Jan 5th" (implied start today/tomorrow)
                // or parse error.
                // For now, swap
                // const temp = startDate; startDate = endDate; endDate = temp;
            }
        }

        if (!startDate) {
            // Absolute fallback
            startDate = new Date(today);
            startDate.setDate(today.getDate() + 1);
            endDate = new Date(startDate);
        }

        return {
            leave_type: type,
            start_date: startDate.toISOString().split('T')[0],
            end_date: endDate.toISOString().split('T')[0],
            confidence: 0.95 // Mock confidence
        };
    }
}

module.exports = DateExtractor;
