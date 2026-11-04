import { Habit } from "@/models/Habit";
import { User } from "@/models/User";
import { Notification } from "@/models/Notification";
import { NotificationPreference } from "@/models/NotificationPreference";
import dbConnect from "@/lib/database";
import { localDateString, isScheduledDate } from "@/services/streak.service";
import { sendEmail, isEmailConfigured } from "@/lib/email";

export interface ReminderResult {
  date: string;
  checkedHabits: number;
  created: number;
  emailed: number;
  skipped: number;
  emailConfigured: boolean;
}

function currentTimeInTimezone(timezone: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(11, 16);
  }
}

function isQuietHours(now: string, start?: string, end?: string): boolean {
  if (!start || !end) return false;
  if (start <= end) return now >= start && now < end;
  // Quiet window crosses midnight (e.g. 22:00 – 08:00).
  return now >= start || now < end;
}

/**
 * Create due habit reminders exactly once per habit per local day.
 * Safe to call repeatedly (cron may retry).
 */
export async function runHabitReminders(): Promise<ReminderResult> {
  await dbConnect();

  const habits = await Habit.find({
    status: "active",
    deletedAt: null,
    "reminder.enabled": true,
  }).lean();

  const result: ReminderResult = {
    date: new Date().toISOString().slice(0, 10),
    checkedHabits: habits.length,
    created: 0,
    emailed: 0,
    skipped: 0,
    emailConfigured: isEmailConfigured(),
  };

  const userCache = new Map<string, any>();
  const prefCache = new Map<string, any>();

  for (const habit of habits) {
    const userId = String(habit.userId);
    let user = userCache.get(userId);
    if (user === undefined) {
      user = await User.findById(userId).lean();
      userCache.set(userId, user);
    }
    if (!user || user.deletedAt) {
      result.skipped += 1;
      continue;
    }

    const timezone = user.timezone || "UTC";
    const now = currentTimeInTimezone(timezone);
    const reminderTime = habit.reminder?.time || "09:00";
    const reminderHour = reminderTime.slice(0, 2);
    if (now.slice(0, 2) !== reminderHour) {
      result.skipped += 1;
      continue;
    }

    const date = localDateString(new Date(), timezone);
    if (!isScheduledDate(habit, date)) {
      result.skipped += 1;
      continue;
    }

    let prefs = prefCache.get(userId);
    if (prefs === undefined) {
      prefs = await NotificationPreference.findOne({ userId }).lean();
      prefCache.set(userId, prefs);
    }
    if (prefs && !prefs.habitReminders) {
      result.skipped += 1;
      continue;
    }
    if (prefs && isQuietHours(now, prefs.quietHoursStart, prefs.quietHoursEnd)) {
      result.skipped += 1;
      continue;
    }

    const idempotencyKey = `habit-reminder:${String(habit._id)}:${date}`;
    const existing = await Notification.findOne({ idempotencyKey }).lean();
    if (existing) {
      result.skipped += 1;
      continue;
    }

    const notification = await Notification.create({
      userId,
      type: "habit_reminder",
      channel: "in-app",
      title: `Time for ${habit.name}`,
      body: `A gentle nudge to complete "${habit.name}" today.`,
      status: "sent",
      scheduledAt: new Date(),
      sentAt: new Date(),
      relatedHabitId: habit._id,
      idempotencyKey,
    });
    result.created += 1;

    if (
      prefs?.emailEnabled !== false &&
      user.emailNotifications !== false &&
      isEmailConfigured()
    ) {
      const email = await sendEmail({
        to: user.email,
        subject: `HabitForge reminder: ${habit.name}`,
        html: `<p>Hi ${user.name},</p><p>This is your reminder to complete <strong>${habit.name}</strong> today.</p><p><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/habits/${habit._id}">Open HabitForge</a></p>`,
      });
      if (email.success) {
        result.emailed += 1;
        await Notification.updateOne(
          { _id: notification._id },
          { $set: { channel: "email", deliveredAt: new Date() } }
        );
      }
    }
  }

  return result;
}
