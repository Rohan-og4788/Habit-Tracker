export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { validateSession, readSessionCookie } from "@/lib/session";
import { updateHabit, archiveHabit, restoreHabit, pauseHabit, resumeHabit, deleteHabit, duplicateHabit, getHabit } from "@/services/habit.service";
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
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    const habit = await getHabit(params.id, userId);
    if (!habit) {
      return NextResponse.json({ error: "Habit not found." }, { status: 404 });
    }
    return NextResponse.json(habit);
  } catch (err: any) {
    console.error("Get habit error:", err);
    return NextResponse.json({ error: "Failed to load habit." }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await dbConnect();
    const userId = await getUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    const body = await req.json();
    const habit = await updateHabit(params.id, userId, body);
    return NextResponse.json(habit);
  } catch (err: any) {
    console.error("Update habit error:", err);
    const status = err.message === "Habit not found" ? 404 : 500;
    return NextResponse.json({ error: err.message || "Failed to update habit." }, { status });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    await dbConnect();
    const userId = await getUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    await deleteHabit(params.id, userId);
    return NextResponse.json({ message: "Habit deleted." });
  } catch (err: any) {
    console.error("Delete habit error:", err);
    const status = err.message === "Habit not found" ? 404 : 500;
    return NextResponse.json({ error: err.message || "Failed to delete habit." }, { status });
  }
}
