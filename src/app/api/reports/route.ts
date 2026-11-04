export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { requireAuth, serverError } from "@/lib/api";
import { getHabitReport } from "@/services/report.service";

export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get("days") || "30", 10);
    const report = await getHabitReport(
      auth.userId,
      auth.user.timezone || "UTC",
      Number.isNaN(days) ? 30 : days
    );
    return NextResponse.json(report);
  } catch (err) {
    return serverError(err, "Failed to build report.");
  }
}
