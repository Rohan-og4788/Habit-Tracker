import { Habit } from "@/models/Habit";
import { HabitLog } from "@/models/HabitLog";
import { JournalEntry } from "@/models/JournalEntry";
import { FocusSession } from "@/models/FocusSession";
import { Goal } from "@/models/Goal";
import { Challenge } from "@/models/Challenge";
import dbConnect from "@/lib/database";
import {
  localDateString,
  isScheduledDate,
  localDateBounds,
} from "@/services/streak.service";

export interface HabitReport {
  from: string;
  to: string;
  days: number;
  scheduled: number;
  completed: number;
  completionRate: number;
  activeDays: number;
  bestDay: { date: string; completionRate: number } | null;
  daily: Array<{ date: string; scheduled: number; completed: number; completionRate: number }>;
  habits: Array<{
    habitId: string;
    name: string;
    category: string;
    scheduled: number;
    completed: number;
    completionRate: number;
  }>;
  categories: Array<{ category: string; scheduled: number; completed: number; completionRate: number }>;
  focusMinutes: number;
  focusSessions: number;
  journalEntries: number;
  goalsCompleted: number;
  challengesActive: number;
}

function addDays(date: string, delta: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

export async function getHabitReport(
  userId: string,
  timezone = "UTC",
  days = 30
): Promise<HabitReport> {
  await dbConnect();
  const safeDays = Math.min(366, Math.max(1, days));
  const today = localDateString(new Date(), timezone);
  const from = addDays(today, -(safeDays - 1));

  const [habits, logs, focus, journalEntries, goalsCompleted, challengesActive] = await Promise.all([
    Habit.find({ userId, deletedAt: null }).lean(),
    HabitLog.find({ userId, localDate: { $gte: from, $lte: today } }).lean(),
    FocusSession.find({
      userId,
      startedAt: { $gte: localDateBounds(from, timezone).start, $lte: localDateBounds(today, timezone).end },
    }).lean(),
    JournalEntry.countDocuments({ userId, date: { $gte: from, $lte: today } }),
    Goal.countDocuments({ userId, status: "completed" }),
    Challenge.countDocuments({ userId, status: "active" }),
  ]);

  const logKey = (habitId: any, date: string) => `${String(habitId)}:${date}`;
  const logMap = new Map(logs.map((l) => [logKey(l.habitId, l.localDate), l]));

  const daily: HabitReport["daily"] = [];
  const habitStats = new Map<string, { scheduled: number; completed: number }>();
  const categoryStats = new Map<string, { scheduled: number; completed: number }>();

  for (const habit of habits) {
    habitStats.set(String(habit._id), { scheduled: 0, completed: 0 });
    if (!categoryStats.has(habit.category)) {
      categoryStats.set(habit.category, { scheduled: 0, completed: 0 });
    }
  }

  for (let i = 0; i < safeDays; i++) {
    const date = addDays(from, i);
    let scheduled = 0;
    let completed = 0;

    for (const habit of habits) {
      if (!isScheduledDate(habit, date)) continue;
      scheduled += 1;
      habitStats.get(String(habit._id))!.scheduled += 1;
      categoryStats.get(habit.category)!.scheduled += 1;

      const log = logMap.get(logKey(habit._id, date));
      if (log?.status === "completed") {
        completed += 1;
        habitStats.get(String(habit._id))!.completed += 1;
        categoryStats.get(habit.category)!.completed += 1;
      }
    }

    daily.push({
      date,
      scheduled,
      completed,
      completionRate: scheduled === 0 ? 0 : Math.round((completed / scheduled) * 100),
    });
  }

  const scheduled = daily.reduce((s, d) => s + d.scheduled, 0);
  const completed = daily.reduce((s, d) => s + d.completed, 0);
  const activeDays = daily.filter((d) => d.completed > 0).length;
  const bestDay = daily.reduce<HabitReport["bestDay"]>((best, d) => {
    if (d.scheduled === 0) return best;
    if (!best || d.completionRate > best.completionRate) return { date: d.date, completionRate: d.completionRate };
    return best;
  }, null);

  return {
    from,
    to: today,
    days: safeDays,
    scheduled,
    completed,
    completionRate: scheduled === 0 ? 0 : Math.round((completed / scheduled) * 100),
    activeDays,
    bestDay,
    daily,
    habits: habits
      .map((h) => {
        const stats = habitStats.get(String(h._id))!;
        return {
          habitId: String(h._id),
          name: h.name,
          category: h.category,
          scheduled: stats.scheduled,
          completed: stats.completed,
          completionRate:
            stats.scheduled === 0 ? 0 : Math.round((stats.completed / stats.scheduled) * 100),
        };
      })
      .sort((a, b) => b.completionRate - a.completionRate),
    categories: Array.from(categoryStats.entries()).map(([category, stats]) => ({
      category,
      ...stats,
      completionRate: stats.scheduled === 0 ? 0 : Math.round((stats.completed / stats.scheduled) * 100),
    })),
    focusMinutes: focus.reduce((s, f) => s + (f.actualMinutes || 0), 0),
    focusSessions: focus.length,
    journalEntries,
    goalsCompleted,
    challengesActive,
  };
}
