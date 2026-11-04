export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { validateSession, readSessionCookie } from "@/lib/session";
import { createGoal, listGoals, getGoal } from "@/services/goal.service";
import { createGoalSchema } from "@/lib/validations";
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
    const status = searchParams.get("status") || undefined;
    const goals = await listGoals(userId, status);
    return NextResponse.json({ goals });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to load goals." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    const body = await req.json();
    const parsed = createGoalSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message || "Invalid input" }, { status: 400 });
    }
    const goal = await createGoal({ ...parsed.data, userId });
    return NextResponse.json(goal, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create goal." }, { status: 500 });
  }
}
