export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { requireAuth, serverError } from "@/lib/api";
import {
  getAnalyticsOverview,
  getDailyTrend,
  getHabitCompletion,
  getCategoryPerformance,
} from "@/services/analytics.service";

export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(req.url);
    const timezone = searchParams.get("timezone") || auth.user.timezone || "UTC";
    const section = searchParams.get("section") || "overview";

    if (section === "overview") {
      return NextResponse.json(await getAnalyticsOverview(auth.userId, timezone));
    }
    if (section === "trends") {
      const days = Math.min(365, Math.max(1, parseInt(searchParams.get("days") || "30", 10) || 30));
      return NextResponse.json({ trend: await getDailyTrend(auth.userId, days, timezone) });
    }
    if (section === "habits") {
      return NextResponse.json({ habits: await getHabitCompletion(auth.userId, timezone) });
    }
    if (section === "categories") {
      return NextResponse.json({ categories: await getCategoryPerformance(auth.userId, timezone) });
    }
    return NextResponse.json({ error: "Unknown section." }, { status: 400 });
  } catch (err) {
    return serverError(err, "Failed to load analytics.");
  }
}
