import { NextRequest, NextResponse } from "next/server";
import { getSmartCalendarSuggestions } from "@/app/actions/ai-features";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const leaveDays = parseInt(searchParams.get("days") || "1");
        const month = searchParams.get("month") 
            ? parseInt(searchParams.get("month")!) 
            : undefined;
        
        const result = await getSmartCalendarSuggestions(leaveDays, month);
        
        if (!result.success) {
            return NextResponse.json(
                { error: result.error },
                { status: 400 }
            );
        }
        
        return NextResponse.json({
            suggestions: result.suggestions
        });
    } catch (error) {
        console.error("Smart Calendar API Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch calendar suggestions" },
            { status: 500 }
        );
    }
}
