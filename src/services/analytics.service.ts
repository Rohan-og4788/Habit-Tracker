import { HabitLog } from "@/models/HabitLog";
import { Habit } from "@/models/Habit";
import { User } from "@/models/User";
import dbConnect from "@/lib/database";
import { localDateString, localDateBounds, isScheduledDate, progressPercent } from "@/services/streak.service";

export interface AnalyticsOverview {
  totalActiveHabits: number;
  completedToday: number;
  remainingToday: number;
  dailyCompletionRate: number;
  weeklyConsistency: number;
  monthlyConsistency: number;
  longestStreak: number;
  totalTrackingDays: number;
}

export async function getAnalyticsOverview(
  userId: string,
  timezone: string
): Promise<AnalyticsOverview> {
  await dbConnect();
  const today = localDateString(new Date(), timezone);

  const activeHabits = await Habit.countDocuments({
    userId,
    status: "active",
    deletedAt: null,
  });

  const todayLogs = await HabitLog.find({ userId, localDate: today }).lean();
  const completedToday = todayLogs.filter((l) => l.status === "completed").length;
  const dailyCompletionRate =
    activeHabits > 0 ? (completedToday / activeHabits) * 100 : 0;

  const weeklyConsistency = await consistencyForPeriod(userId, 7, timezone);
  const monthlyConsistency = await consistencyForPeriod(userId, 30, timezone);

  const longestStreak = await longestStreakAcrossHabits(userId);

  const totalTrackingDays = await HabitLog.distinct("localDate", {
    userId,
    status: { $in: ["completed", "partial"] },
  }).then((dates) => dates.length);

  return {
    totalActiveHabits: activeHabits,
    completedToday,
    remainingToday: Math.max(0, activeHabits - completedToday),
    dailyCompletionRate: Math.round(dailyCompletionRate * 10) / 10,
    weeklyConsistency,
    monthlyConsistency,
    longestStreak,
    totalTrackingDays,
  };
}

async function consistencyForPeriod(
  userId: string,
  days: number,
  timezone: string
): Promise<number> {
  const today = new Date();
  const from = localDateString(
    new Date(today.getTime() - (days - 1) * 24 * 60 * 60 * 1000),
    timezone
  );
  const to = localDateString(today, timezone);

  const habits = await Habit.find({
    userId,
    status: "active",
    deletedAt: null,
  }).lean();

  if (habits.length === 0) return 0;

  let scheduled = 0;
  let completed = 0;

  for (const habit of habits) {
    let cursor = new Date(from);
    const end = new Date(to);
    while (cursor <= end) {
      const ds = localDateString(cursor, timezone);
      if (isScheduledDate(habit, ds)) {
        scheduled += 1;
        const log = await HabitLog.findOne({
          userId,
          habitId: habit._id,
          localDate: ds,
        }).lean();
        if (log && log.status === "completed") completed += 1;
      }
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  }

  if (scheduled === 0) return 0;
  return Math.round((completed / scheduled) * 100);
}

async function longestStreakAcrossHabits(userId: string): Promise<number> {
  const logs = await HabitLog.find({
    userId,
    status: "completed",
  })
    .sort({ localDate: 1 })
    .lean();

  const byDate = new Set(logs.map((l) => l.localDate));
  const dates = Array.from(byDate).sort();
  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const ds of dates) {
    if (prev && isCalendarConsecutive(prev, ds)) {
      run += 1;
    } else {
      run = 1;
    }
    longest = Math.max(longest, run);
    prev = ds;
  }
  return longest;
}

function isCalendarConsecutive(a: string, b: string): boolean {
  const da = new Date(`${a}T00:00:00`);
  const db = new Date(`${b}T00:00:00`);
  return (db.getTime() - da.getTime()) === 24 * 60 * 60 * 1000;
}

export async function getDailyTrend(
  userId: string,
  days: number,
  timezone: string
) {
  await dbConnect();
  const today = new Date();
  const series: Array<{ date: string; completionRate: number }> = [];

  const habits = await Habit.find({
    userId,
    status: "active",
    deletedAt: null,
  }).lean();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
    const ds = localDateString(d, timezone);
    let scheduled = 0;
    let completed = 0;
    for (const habit of habits) {
      if (isScheduledDate(habit, ds)) {
        scheduled += 1;
        const log = await HabitLog.findOne({
          userId,
          habitId: habit._id,
          localDate: ds,
        }).lean();
        if (log && log.status === "completed") completed += 1;
      }
    }
    series.push({
      date: ds,
      completionRate: scheduled === 0 ? 0 : Math.round((completed / scheduled) * 100),
    });
  }
  return series;
}

export async function getHabitCompletion(
  userId: string,
  timezone: string
) {
  await dbConnect();
  const habits = await Habit.find({
    userId,
    status: "active",
    deletedAt: null,
  }).lean();

  const today = localDateString(new Date(), timezone);
  const result = await Promise.all(
    habits.map(async (habit) => {
      const logs = await HabitLog.find({
        userId,
        habitId: habit._id,
      }).lean();
      const totalLogs = logs.length;
      const completed = logs.filter((l) => l.status === "completed").length;
      return {
        habitId: habit._id,
        name: habit.name,
        color: habit.color,
        totalLogs,
        completionRate: totalLogs === 0 ? 0 : Math.round((completed / totalLogs) * 100),
        currentStreak: habit.currentStreak,
      };
    })
  );
  return result.sort((a, b) => b.completionRate - a.completionRate);
}

export async function getCategoryPerformance(userId: string, timezone: string) {
  await dbConnect();
  const habits = await Habit.find({
    userId,
    status: "active",
    deletedAt: null,
  }).lean();

  const byCat: Record<string, { total: number; completed: number }> = {};
  for (const habit of habits) {
    if (!byCat[habit.category]) byCat[habit.category] = { total: 0, completed: 0 };
    const logs = await HabitLog.find({ userId, habitId: habit._id }).lean();
    byCat[habit.category].total += logs.length;
    byCat[habit.category].completed += logs.filter((l) => l.status === "completed").length;
  }
  return Object.entries(byCat).map(([cat, v]) => ({
    category: cat,
    completionRate: v.total === 0 ? 0 : Math.round((v.completed / v.total) * 100),
  }));
}
