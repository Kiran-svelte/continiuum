import { NextRequest, NextResponse } from "next/server";
import { getEmployeeWellness } from "@/app/actions/ai-features";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const employeeId = searchParams.get("employeeId") || undefined;
        
        const result = await getEmployeeWellness(employeeId);
        
        if (!result.success) {
            return NextResponse.json(
                { error: result.error },
                { status: 400 }
            );
        }
        
        return NextResponse.json({
            wellness: result.wellness
        });
    } catch (error) {
        console.error("Wellness API Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch wellness score" },
            { status: 500 }
        );
    }
}
