export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { validateSession, readSessionCookie } from "@/lib/session";
import { createFocusSession, listFocusSessions } from "@/services/focus.service";
import { badRequest } from "@/lib/api";
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
    const sessions = await listFocusSessions(userId);
    return NextResponse.json({ sessions });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to load sessions." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    const body = await req.json();
    const plannedMinutes = body.plannedMinutes ?? 25;
    if (
      typeof plannedMinutes !== "number" ||
      !Number.isFinite(plannedMinutes) ||
      plannedMinutes < 1 ||
      plannedMinutes > 1440
    ) {
      return badRequest("plannedMinutes must be between 1 and 1440.");
    }
    const startedAt = body.startedAt ? new Date(body.startedAt) : new Date();
    if (Number.isNaN(startedAt.getTime())) return badRequest("Invalid startedAt.");
    const session = await createFocusSession({
      userId,
      habitId: body.habitId || undefined,
      plannedMinutes: Math.round(plannedMinutes),
      startedAt,
    });
    return NextResponse.json(session, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to start session." }, { status: 500 });
  }
}
