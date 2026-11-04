import { UserAchievement } from "@/models/UserAchievement";
import { Achievement } from "@/models/Achievement";
import { Habit } from "@/models/Habit";
import { HabitLog } from "@/models/HabitLog";
import { Goal } from "@/models/Goal";
import { JournalEntry } from "@/models/JournalEntry";
import { FocusSession } from "@/models/FocusSession";
import dbConnect from "@/lib/database";
import { computeStreak, localDateString, isScheduledDate } from "@/services/streak.service";

export interface AchievementDefinition {
  key: string;
  title: string;
  description: string;
  category: "first-habit" | "streak" | "consistency" | "goal" | "completion" | "milestone";
  badgeIcon: string;
  badgeColor: string;
  threshold: number;
  secret?: boolean;
}

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  { key: "first-habit", title: "First Step", description: "Create your first habit.", category: "first-habit", badgeIcon: "Sparkles", badgeColor: "#6366F1", threshold: 1 },
  { key: "habit-collector", title: "Habit Collector", description: "Track 5 active habits at once.", category: "milestone", badgeIcon: "Layers", badgeColor: "#8B5CF6", threshold: 5 },
  { key: "first-completion", title: "Getting Started", description: "Complete a habit for the first time.", category: "completion", badgeIcon: "CheckCircle2", badgeColor: "#22C55E", threshold: 1 },
  { key: "completions-10", title: "Momentum", description: "Complete habits 10 times.", category: "completion", badgeIcon: "Zap", badgeColor: "#14B8A6", threshold: 10 },
  { key: "completions-100", title: "Centurion", description: "Complete habits 100 times.", category: "completion", badgeIcon: "Trophy", badgeColor: "#F59E0B", threshold: 100 },
  { key: "streak-3", title: "On a Roll", description: "Reach a 3-day streak.", category: "streak", badgeIcon: "Flame", badgeColor: "#F97316", threshold: 3 },
  { key: "streak-7", title: "Week Warrior", description: "Reach a 7-day streak.", category: "streak", badgeIcon: "Flame", badgeColor: "#EF4444", threshold: 7 },
  { key: "streak-30", title: "Unstoppable", description: "Reach a 30-day streak.", category: "streak", badgeIcon: "Flame", badgeColor: "#DC2626", threshold: 30 },
  { key: "goal-first", title: "Goal Getter", description: "Complete your first goal.", category: "goal", badgeIcon: "Target", badgeColor: "#06B6D4", threshold: 1 },
  { key: "journal-10", title: "Reflective", description: "Write 10 journal entries.", category: "consistency", badgeIcon: "BookOpen", badgeColor: "#A855F7", threshold: 10 },
  { key: "focus-10", title: "Deep Work", description: "Complete 10 focus sessions.", category: "consistency", badgeIcon: "Timer", badgeColor: "#0EA5E9", threshold: 10 },
  { key: "perfect-day", title: "Perfect Day", description: "Complete every scheduled habit in a day.", category: "consistency", badgeIcon: "Sun", badgeColor: "#FACC15", threshold: 1 },
];

export async function ensureAchievementsSeeded() {
  await dbConnect();
  await Achievement.bulkWrite(
    ACHIEVEMENT_DEFINITIONS.map((a) => ({
      updateOne: {
        filter: { key: a.key },
        update: { $setOnInsert: a },
        upsert: true,
      },
    }))
  );
}

export async function listAchievements() {
  await ensureAchievementsSeeded();
  return Achievement.find().sort({ category: 1, threshold: 1 }).lean();
}

export async function listUserAchievements(userId: string) {
  await dbConnect();
  return UserAchievement.find({ userId })
    .populate("achievementId")
    .sort({ unlockedAt: -1 })
    .lean();
}

export async function hasAchievement(userId: string, achievementKey: string): Promise<boolean> {
  await dbConnect();
  const achievement = await Achievement.findOne({ key: achievementKey }).lean();
  if (!achievement) return false;
  const ua = await UserAchievement.findOne({ userId, achievementId: achievement._id }).lean();
  return !!ua;
}

export async function unlockAchievement(userId: string, achievementKey: string) {
  await ensureAchievementsSeeded();
  const achievement = await Achievement.findOne({ key: achievementKey }).lean();
  if (!achievement) return null;
  const existing = await UserAchievement.findOne({ userId, achievementId: achievement._id }).lean();
  if (existing) return existing;
  try {
    return await UserAchievement.create({ userId, achievementId: achievement._id });
  } catch {
    // Unique index race: another request unlocked it first.
    return UserAchievement.findOne({ userId, achievementId: achievement._id }).lean();
  }
}

export async function checkFirstHabitAchievement(userId: string, habitCount: number) {
  if (habitCount >= 1) return unlockAchievement(userId, "first-habit");
  return null;
}

/**
 * Evaluate every achievement for a user and unlock newly earned ones.
 * Safe to call repeatedly; unlocking is idempotent via a unique index.
 */
export async function evaluateAchievements(userId: string, timezone = "UTC") {
  await ensureAchievementsSeeded();

  const [activeHabits, totalCompletions, completedGoals, journalCount, focusCount] =
    await Promise.all([
      Habit.countDocuments({ userId, status: "active", deletedAt: null }),
      HabitLog.countDocuments({ userId, status: "completed" }),
      Goal.countDocuments({ userId, status: "completed" }),
      JournalEntry.countDocuments({ userId }),
      FocusSession.countDocuments({ userId, completed: true }),
    ]);

  // Longest streak across the user's habits.
  const habits = await Habit.find({ userId, deletedAt: null }).select("_id").lean();
  let longest = 0;
  for (const h of habits) {
    const s = await computeStreak(userId, String(h._id), timezone);
    longest = Math.max(longest, s.current, s.longest);
  }

  // Perfect day: every habit scheduled today was completed.
  const today = localDateString(new Date(), timezone);
  const todayHabits = await Habit.find({ userId, status: "active", deletedAt: null }).lean();
  const scheduled = todayHabits.filter((h) => isScheduledDate(h, today));
  let perfectDay = false;
  if (scheduled.length > 0) {
    const done = await HabitLog.countDocuments({
      userId,
      localDate: today,
      status: "completed",
      habitId: { $in: scheduled.map((h) => h._id) },
    });
    perfectDay = done >= scheduled.length;
  }

  const earned: string[] = [];
  if (activeHabits >= 1) earned.push("first-habit");
  if (activeHabits >= 5) earned.push("habit-collector");
  if (totalCompletions >= 1) earned.push("first-completion");
  if (totalCompletions >= 10) earned.push("completions-10");
  if (totalCompletions >= 100) earned.push("completions-100");
  if (longest >= 3) earned.push("streak-3");
  if (longest >= 7) earned.push("streak-7");
  if (longest >= 30) earned.push("streak-30");
  if (completedGoals >= 1) earned.push("goal-first");
  if (journalCount >= 10) earned.push("journal-10");
  if (focusCount >= 10) earned.push("focus-10");
  if (perfectDay) earned.push("perfect-day");

  const unlocked = [];
  for (const key of earned) {
    const result = await unlockAchievement(userId, key);
    if (result) unlocked.push(key);
  }
  return unlocked;
}
