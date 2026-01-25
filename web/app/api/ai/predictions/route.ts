import { NextRequest, NextResponse } from "next/server";
import { getPredictiveAnalytics } from "@/app/actions/ai-features";

export async function GET(request: NextRequest) {
    try {
        const result = await getPredictiveAnalytics();
        
        if (!result.success) {
            return NextResponse.json(
                { error: result.error },
                { status: 400 }
            );
        }
        
        return NextResponse.json({
            predictions: result.predictions,
            seasonalPatterns: result.seasonalPatterns,
            burnoutRisks: result.burnoutRisks
        });
    } catch (error) {
        console.error("Predictions API Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch predictions" },
            { status: 500 }
        );
    }
}
