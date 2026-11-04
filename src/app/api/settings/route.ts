export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { requireAuth, serverError } from "@/lib/api";
import { UserSetting } from "@/models/UserSetting";

export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    let settings = await UserSetting.findOne({ userId: auth.userId }).lean();
    if (!settings) settings = await UserSetting.create({ userId: auth.userId });
    return NextResponse.json(settings);
  } catch (err) {
    return serverError(err, "Failed to load settings.");
  }
}

export async function PATCH(req: Request) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const body = await req.json();
    const allowed = [
      "weekStartDay",
      "dateFormat",
      "timeFormat",
      "defaultReminderTime",
      "defaultCategory",
      "defaultFrequency",
      "reducedMotion",
      "highContrast",
    ];
    const update: any = {};
    for (const key of allowed) if (body[key] !== undefined) update[key] = body[key];
    const settings = await UserSetting.findOneAndUpdate(
      { userId: auth.userId },
      { $set: update },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return NextResponse.json(settings);
  } catch (err) {
    return serverError(err, "Failed to save settings.");
  }
}
