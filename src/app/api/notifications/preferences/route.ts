export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { requireAuth, serverError } from "@/lib/api";
import { NotificationPreference } from "@/models/NotificationPreference";

export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    let prefs = await NotificationPreference.findOne({ userId: auth.userId }).lean();
    if (!prefs) {
      prefs = await NotificationPreference.create({ userId: auth.userId, timezone: auth.user.timezone });
    }
    return NextResponse.json(prefs);
  } catch (err) {
    return serverError(err, "Failed to load notification preferences.");
  }
}

export async function PATCH(req: Request) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();
    const allowed = [
      "emailEnabled",
      "pushEnabled",
      "inAppEnabled",
      "habitReminders",
      "dailyMorning",
      "eveningReview",
      "incompleteReminder",
      "streakMilestones",
      "goalDeadlines",
      "weeklyReport",
      "monthlyReport",
      "reminderTime",
      "reminderDays",
      "quietHoursStart",
      "quietHoursEnd",
      "timezone",
    ];
    const update: any = {};
    for (const key of allowed) if (body[key] !== undefined) update[key] = body[key];

    const prefs = await NotificationPreference.findOneAndUpdate(
      { userId: auth.userId },
      { $set: update },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return NextResponse.json(prefs);
  } catch (err) {
    return serverError(err, "Failed to update notification preferences.");
  }
}
