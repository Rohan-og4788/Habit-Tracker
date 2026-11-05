export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { validateSession, readSessionCookie } from "@/lib/session";
import {
  createHabit,
  listHabits,
  getActiveHabitCount,
  type ListHabitsFilters,
} from "@/services/habit.service";
import { createHabitSchema } from "@/lib/validations";
import { Subscription } from "@/models/Subscription";
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
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const filters: ListHabitsFilters = {
      userId,
      status: searchParams.get("status") as any || undefined,
      category: searchParams.get("category") as any || undefined,
      type: searchParams.get("type") as any || undefined,
      search: searchParams.get("search") || undefined,
      sortBy: (searchParams.get("sortBy") as any) || "createdAt",
      sortDir: (searchParams.get("sortDir") as any) || "desc",
      page: parseInt(searchParams.get("page") || "1", 10),
      limit: parseInt(searchParams.get("limit") || "50", 10),
    };

    const result = await listHabits(filters);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("List habits error:", err);
    return NextResponse.json({ error: "Failed to load habits." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const userId = await getUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createHabitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message || "Invalid input" },
        { status: 400 }
      );
    }

    // Enforce free-tier active habit limit unless pro
    const activeCount = await getActiveHabitCount(userId);
    if (activeCount >= 5) {
      // Check subscription pro status
      const sub = await Subscription.findOne({ userId }).lean();
      const isPro = sub && sub.plan === "pro" && sub.status === "active";
      if (!isPro) {
        return NextResponse.json(
          { error: "Free plan allows up to 5 active habits. Upgrade to Pro for unlimited." },
          { status: 403 }
        );
      }
    }

    const habit = await createHabit({ ...parsed.data, userId });
    const { evaluateAchievements } = await import("@/services/achievement.service");
    await evaluateAchievements(userId).catch(() => undefined);
    return NextResponse.json(habit, { status: 201 });
  } catch (err: any) {
    console.error("Create habit error:", err);
    return NextResponse.json({ error: err.message || "Failed to create habit." }, { status: 500 });
  }
}
