export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { requireAuth, badRequest, serverError } from "@/lib/api";
import { NotificationPreference } from "@/models/NotificationPreference";
import { PushSubscription } from "@/models/PushSubscription";
import { isPushConfigured } from "@/lib/push";

const ALLOWED_PREFERENCE_FIELDS = [
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
] as const;

export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    let prefs = await NotificationPreference.findOne({ userId: auth.userId }).lean();
    if (!prefs) {
      prefs = await NotificationPreference.create({
        userId: auth.userId,
        timezone: auth.user.timezone || "UTC",
      });
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
    const update: any = {};
    for (const key of ALLOWED_PREFERENCE_FIELDS) {
      if (body[key] !== undefined) update[key] = body[key];
    }
    if (Object.keys(update).length === 0) {
      return badRequest("No valid preference fields supplied.");
    }

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

export async function POST(req: Request) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    if (!isPushConfigured()) {
      return NextResponse.json(
        { error: "Push notifications are not configured on this server." },
        { status: 503 }
      );
    }

    const body = await req.json();
    const { endpoint, keys } = body;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return badRequest("Invalid push subscription.");
    }

    await PushSubscription.findOneAndUpdate(
      { endpoint, userId: auth.userId },
      { $set: { userId: auth.userId, endpoint, p256dh: keys.p256dh, auth: keys.auth } },
      { upsert: true, setDefaultsOnInsert: true }
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err, "Failed to save push subscription.");
  }
}
