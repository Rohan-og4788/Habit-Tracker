import { User } from "@/models/User";
import { Habit } from "@/models/Habit";
import { HabitLog } from "@/models/HabitLog";
import { Goal } from "@/models/Goal";
import { JournalEntry } from "@/models/JournalEntry";
import { FocusSession } from "@/models/FocusSession";
import { DailyTask } from "@/models/DailyTask";
import { Challenge } from "@/models/Challenge";
import { ChallengeProgress } from "@/models/ChallengeProgress";
import { UserAchievement } from "@/models/UserAchievement";
import { AuditLog } from "@/models/AuditLog";
import dbConnect from "@/lib/database";

export async function exportUserData(userId: string) {
  await dbConnect();
  const [user, habits, habitLogs, goals, journal, focusSessions, tasks, challenges, challengeProgress, achievements] =
    await Promise.all([
      User.findById(userId)
        .select(
          "-passwordHash -emailVerificationToken -passwordResetToken -emailUnsubscribeToken"
        )
        .lean(),
      Habit.find({ userId }).lean(),
      HabitLog.find({ userId }).sort({ localDate: 1 }).lean(),
      Goal.find({ userId }).lean(),
      JournalEntry.find({ userId }).sort({ date: -1 }).lean(),
      FocusSession.find({ userId }).lean(),
      DailyTask.find({ userId }).lean(),
      Challenge.find({ userId }).lean(),
      ChallengeProgress.find({ userId }).lean(),
      UserAchievement.find({ userId }).populate("achievementId").lean(),
    ]);

  if (!user) throw new Error("User not found");

  await AuditLog.create({
    userId,
    action: "export",
    entityType: "User",
    entityId: userId,
    details: { format: "json" },
  });

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      timezone: user.timezone,
      language: user.language,
      theme: user.theme,
      createdAt: user.createdAt,
    },
    habits,
    habitLogs,
    goals,
    journal,
    focusSessions,
    dailyTasks: tasks,
    challenges,
    challengeProgress,
    achievements,
    exportedAt: new Date().toISOString(),
  };
}

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export async function exportHabitLogsCsv(userId: string): Promise<string> {
  await dbConnect();
  const logs = await HabitLog.find({ userId }).sort({ localDate: 1 }).lean();
  const habits = await Habit.find({ userId }).select("name").lean();
  const habitNames = new Map(habits.map((h) => [String(h._id), h.name]));

  const header = [
    "localDate",
    "habit",
    "status",
    "trackingType",
    "numericValue",
    "numericTarget",
    "durationMinutes",
    "durationTarget",
    "notes",
    "completedAt",
  ];
  const rows = logs.map((log) =>
    [
      log.localDate,
      habitNames.get(String(log.habitId)) || "",
      log.status,
      log.trackingType,
      log.numericProgress?.value,
      log.numericProgress?.target,
      log.durationProgress?.minutes,
      log.durationProgress?.targetMinutes,
      log.notes,
      log.completedAt ? new Date(log.completedAt).toISOString() : "",
    ]
      .map(csvEscape)
      .join(",")
  );

  await AuditLog.create({
    userId,
    action: "export",
    entityType: "HabitLog",
    entityId: userId,
    details: { format: "csv", rows: rows.length },
  });

  return [header.join(","), ...rows].join("\r\n");
}
