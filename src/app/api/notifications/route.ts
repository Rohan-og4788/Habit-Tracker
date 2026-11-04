export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { validateSession, readSessionCookie } from "@/lib/session";
import { NotificationPreference } from "@/models/NotificationPreference";
import { PushSubscription } from "@/models/PushSubscription";
import dbConnect from "@/lib/database";

async function getUserId(req: Request): Promise<string | null> {
  const token = readSessionCookie(req);
  if (!token) return null;
  const session = await validateSession(token);
  return session ? String(session.user._id) : null;
}

export async function GET(req: Request) {
  try {
    await dbConnect();
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    let prefs = await NotificationPreference.findOne({ userId }).lean();
    if (!prefs) {
      prefs = await NotificationPreference.create({ userId });
    }
    return NextResponse.json(prefs);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed." }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    await dbConnect();
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    const body = await req.json();
    const prefs = await NotificationPreference.findOneAndUpdate(
      { userId },
      { $set: body },
      { upsert: true, new: true }
    );
    return NextResponse.json(prefs);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    const body = await req.json();
    const { endpoint, keys } = body;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ error: "Invalid push subscription." }, { status: 400 });
    }
    await PushSubscription.findOneAndUpdate(
      { endpoint },
      { $set: { userId, endpoint, p256dh: keys.p256dh, auth: keys.auth } },
      { upsert: true }
    );
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed." }, { status: 500 });
  }
}
