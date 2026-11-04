export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { requireAuth, serverError } from "@/lib/api";
import {
  listAchievements,
  listUserAchievements,
  evaluateAchievements,
} from "@/services/achievement.service";

export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    await evaluateAchievements(auth.userId, auth.user.timezone || "UTC");
    const [achievements, unlocked] = await Promise.all([
      listAchievements(),
      listUserAchievements(auth.userId),
    ]);
    const unlockedIds = new Set(
      unlocked.map((u: any) => String(u.achievementId?._id || u.achievementId))
    );
    return NextResponse.json({
      achievements: achievements.map((a) => ({
        ...a,
        unlocked: unlockedIds.has(String(a._id)),
      })),
      unlockedCount: unlocked.length,
      totalCount: achievements.length,
    });
  } catch (err) {
    return serverError(err, "Failed to load achievements.");
  }
}
