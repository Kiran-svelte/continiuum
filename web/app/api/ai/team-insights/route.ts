import { NextRequest, NextResponse } from "next/server";
import { getTeamInsights } from "@/app/actions/ai-features";

export async function GET(request: NextRequest) {
    try {
        const result = await getTeamInsights();
        
        if (!result.success) {
            return NextResponse.json(
                { error: result.error },
                { status: 400 }
            );
        }
        
        return NextResponse.json({
            departments: result.departments,
            todayOverview: result.todayOverview
        });
    } catch (error) {
        console.error("Team Insights API Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch team insights" },
            { status: 500 }
        );
    }
}
