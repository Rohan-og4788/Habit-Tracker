import { HabitLog } from "@/models/HabitLog";
import { Habit } from "@/models/Habit";
import { AuditLog } from "@/models/AuditLog";
import dbConnect from "@/lib/database";
import {
  localDateString,
  isValidLocalDate,
  isScheduledDate,
  computeStreak,
} from "@/services/streak.service";
import mongoose from "mongoose";

export interface RecordLogInput {
  userId: string;
  habitId: string;
  localDate: string; // YYYY-MM-DD user tz
  timezone: string;
  status: "completed" | "partial" | "skipped" | "missed";
  trackingType: string;
  notes?: string;
  skippedReason?: string;
  numericProgress?: { value: number; target: number; unit: string };
  durationProgress?: { minutes: number; targetMinutes: number };
  checklistProgress?: { items: Array<{ id: string; checked: boolean }>; requiredCount: number };
  negativeHabitLog?: { incidents: number; avoided: boolean; triggerNote?: string };
}

export async function recordHabitLog(input: RecordLogInput) {
  await dbConnect();

  if (!isValidLocalDate(input.localDate)) {
    throw new Error("Invalid date. Expected YYYY-MM-DD.");
  }

  const habit = await Habit.findOne({
    _id: input.habitId,
    userId: input.userId,
    deletedAt: null,
  }).lean();
  if (!habit) throw new Error("Habit not found");

  const todayLocal = localDateString(new Date(), input.timezone);
  if (input.localDate > todayLocal) {
    throw new Error("You cannot log a future date.");
  }

  const countsAsDone = input.status === "completed" || input.status === "partial";
  if (countsAsDone && !isScheduledDate(habit, input.localDate)) {
    throw new Error("This habit is not scheduled for the selected day.");
  }

  const session = await mongoose.startSession();
  let log: any;
  try {
    await session.withTransaction(async () => {
      const existing = await HabitLog.findOne({
        userId: input.userId,
        habitId: input.habitId,
        localDate: input.localDate,
      }).session(session);

      const now = new Date();
      const data: any = {
        userId: input.userId,
        habitId: input.habitId,
        localDate: input.localDate,
        status: input.status,
        trackingType: input.trackingType,
        notes: input.notes,
        skippedReason: input.skippedReason,
        numericProgress: input.numericProgress,
        durationProgress: input.durationProgress,
        checklistProgress: input.checklistProgress,
        negativeHabitLog: input.negativeHabitLog,
        updatedAt: now,
      };
      data.completedAt = countsAsDone ? now : undefined;

      if (existing) {
        const update: any = { $set: data };
        if (!countsAsDone) update.$unset = { completedAt: "" };
        log = await HabitLog.findOneAndUpdate({ _id: existing._id }, update, {
          new: true,
          session,
        });
      } else {
        const created = await HabitLog.create([data], { session });
        log = created[0];
      }

      await AuditLog.create(
        [
          {
            userId: input.userId,
            action: existing ? "update" : "create",
            entityType: "HabitLog",
            entityId: log._id,
            details: { habitId: input.habitId, localDate: input.localDate, status: input.status },
          },
        ],
        { session }
      );
    });
  } finally {
    await session.endSession();
  }

  // Recompute derived counters after commit (keeps aggregates drift-free).
  await recalcHabitAggregates(input.habitId, input.userId, input.timezone);

  // Fire-and-forget achievement evaluation (never blocks the log write).
  import("@/services/achievement.service")
    .then((m) => m.evaluateAchievements(input.userId, input.timezone))
    .catch(() => undefined);

  return log;
}

export async function getHabitLogsForRange(
  userId: string,
  habitId: string | undefined,
  from: string,
  to: string
) {
  await dbConnect();
  const query: any = { userId };
  if (from || to) {
    query.localDate = {};
    if (from) query.localDate.$gte = from;
    if (to) query.localDate.$lte = to;
  }
  if (habitId) query.habitId = habitId;
  return HabitLog.find(query).sort({ localDate: 1 }).lean();
}

export async function getHabitLog(userId: string, habitId: string, localDate: string) {
  await dbConnect();
  return HabitLog.findOne({ userId, habitId, localDate }).lean();
}

export async function deleteHabitLog(userId: string, habitId: string, localDate: string) {
  await dbConnect();
  const log = await HabitLog.findOneAndDelete({ userId, habitId, localDate });
  if (!log) throw new Error("Log not found");
  await recalcHabitAggregates(habitId, userId);
  await AuditLog.create({
    userId,
    action: "delete",
    entityType: "HabitLog",
    entityId: log._id,
  });
  return log;
}

export async function getTodayLogs(userId: string, timezone: string) {
  await dbConnect();
  const today = localDateString(new Date(), timezone);
  return HabitLog.find({ userId, localDate: today }).lean();
}

export async function recalcHabitAggregates(
  habitId: string,
  userId: string,
  timezone = "UTC"
) {
  await dbConnect();
  const habit = await Habit.findOne({ _id: habitId, userId }).lean();
  if (!habit) return;

  const logs = await HabitLog.find({ habitId, userId }).lean();
  const completed = logs.filter((l) => l.status === "completed");
  const last = completed.sort((a, b) => (a.localDate < b.localDate ? -1 : 1)).pop();
  const streak = await computeStreak(userId, habitId, timezone);

  await Habit.findByIdAndUpdate(habitId, {
    totalCompletions: completed.length,
    currentStreak: streak.current,
    longestStreak: Math.max(streak.longest, habit.longestStreak || 0),
    lastCompletedAt: last ? new Date(`${last.localDate}T12:00:00Z`) : undefined,
  });
}
