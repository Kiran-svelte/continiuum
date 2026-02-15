/**
 * SLA Breach Detection Cron
 * GET /api/cron/sla-check
 *
 * Runs periodically (every hour) to find leave requests that have
 * breached their SLA deadline and auto-escalates them to the next
 * approver in the chain.
 *
 * Protected by CRON_SECRET to prevent unauthorized access.
 */

import { NextRequest, NextResponse } from "next/server";
import { checkAndEscalateSLABreaches } from "@/app/actions/leave-engine";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // 60 seconds max

export async function GET(request: NextRequest) {
  // Verify cron secret (set in Vercel or environment)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const result = await checkAndEscalateSLABreaches();

    console.log(
      `[SLA Check] Breached: ${result.breachedCount}, Escalated: ${result.escalatedCount}, Errors: ${result.errors.length}`
    );

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      breached: result.breachedCount,
      escalated: result.escalatedCount,
      errors: result.errors,
    });
  } catch (error: any) {
    console.error("[SLA Check] Cron error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "SLA check failed",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
