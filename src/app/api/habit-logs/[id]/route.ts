export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { validateSession, readSessionCookie } from "@/lib/session";
import { getHabitLog } from "@/services/tracking.service";
import dbConnect from "@/lib/database";

async function getUserId(req: Request): Promise<string | null> {
  const token = readSessionCookie(req);
  if (!token) return null;
  const session = await validateSession(token);
  return session ? String(session.user._id) : null;
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    await dbConnect();
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const localDate = searchParams.get("localDate");
    if (!localDate) return NextResponse.json({ error: "Missing localDate." }, { status: 400 });
    const log = await getHabitLog(userId, params.id, localDate);
    if (!log) return NextResponse.json({ error: "Log not found." }, { status: 404 });
    return NextResponse.json(log);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed." }, { status: 500 });
  }
}
