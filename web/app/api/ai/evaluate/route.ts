import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { checkConstraints } from "@/lib/ai-proxy";

export async function POST(req: NextRequest) {
    try {
        const user = await getUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { emp_id, leave_info, org_id } = body;

        // Use the proxy to check constraints
        const result = await checkConstraints(emp_id, leave_info, org_id);

        return NextResponse.json(result);
    } catch (error: any) {
        console.error("API Error:", error);
        return NextResponse.json(
            { error: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}
