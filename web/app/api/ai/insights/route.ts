import { NextRequest, NextResponse } from "next/server";
import { getAIInsights } from "@/app/actions/ai-features";

export async function GET(request: NextRequest) {
    try {
        const result = await getAIInsights();
        
        if (!result.success) {
            return NextResponse.json(
                { error: result.error },
                { status: 400 }
            );
        }
        
        return NextResponse.json({
            insights: result.insights,
            teamHealth: result.teamHealth
        });
    } catch (error) {
        console.error("AI Insights API Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch AI insights" },
            { status: 500 }
        );
    }
}
