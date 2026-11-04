export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { validateSession, readSessionCookie } from "@/lib/session";
import { recordHabitLog, getHabitLogsForRange, getHabitLog, deleteHabitLog, getTodayLogs } from "@/services/tracking.service";
import { recordLogSchema } from "@/lib/validations";
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
    const { searchParams } = new URL(req.url);
    const habitId = searchParams.get("habitId") || undefined;
    const from = searchParams.get("from") || "";
    const to = searchParams.get("to") || "";
    const logs = await getHabitLogsForRange(userId, habitId, from, to);
    return NextResponse.json({ logs });
  } catch (err: any) {
    console.error("List logs error:", err);
    return NextResponse.json({ error: "Failed to load logs." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    const body = await req.json();
    const parsed = recordLogSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message || "Invalid input" }, { status: 400 });
    }
    const log = await recordHabitLog({ ...parsed.data, userId });
    return NextResponse.json(log, { status: 201 });
  } catch (err: any) {
    console.error("Record log error:", err);
    return NextResponse.json({ error: err.message || "Failed to record log." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await dbConnect();
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const habitId = searchParams.get("habitId");
    const localDate = searchParams.get("localDate");
    if (!habitId || !localDate) {
      return NextResponse.json({ error: "Missing habitId or localDate." }, { status: 400 });
    }
    await deleteHabitLog(userId, habitId, localDate);
    return NextResponse.json({ message: "Log deleted." });
  } catch (err: any) {
    console.error("Delete log error:", err);
    return NextResponse.json({ error: err.message || "Failed to delete log." }, { status: 500 });
  }
}
