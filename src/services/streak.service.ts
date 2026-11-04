import { HabitLog } from "@/models/HabitLog";
import { Habit } from "@/models/Habit";
import dbConnect from "@/lib/database";

export type LogStatus = "completed" | "partial" | "skipped" | "missed";
export type TrackingType =
  | "boolean"
  | "numeric"
  | "duration"
  | "count"
  | "checklist"
  | "negative";

export interface LocalDateBounds {
  start: Date; // inclusive start of local day (UTC instant)
  end: Date; // inclusive end of local day (UTC instant)
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidLocalDate(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/** Convert a UTC instant to YYYY-MM-DD in the given IANA timezone. */
export function localDateString(date: Date, timezone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  } catch {
    // Invalid timezone: fall back to UTC rather than crashing.
    return date.toISOString().slice(0, 10);
  }
}

/** Offset in milliseconds of `timezone` at the given instant (local wall clock - UTC). */
function timezoneOffsetMs(timezone: string, instant: Date): number {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(instant);

    const get = (type: string) =>
      Number(parts.find((p) => p.type === type)?.value ?? 0);

    const asUtc = Date.UTC(
      get("year"),
      get("month") - 1,
      get("day"),
      get("hour"),
      get("minute"),
      get("second")
    );
    return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
  } catch {
    return 0;
  }
}

/** Convert a wall-clock date/time in `timezone` to the corresponding UTC instant. */
function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
  timezone = "UTC"
): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute, second);
  // Two passes handle DST transitions correctly.
  let offset = timezoneOffsetMs(timezone, new Date(guess));
  let ts = guess - offset;
  offset = timezoneOffsetMs(timezone, new Date(ts));
  ts = guess - offset;
  return new Date(ts);
}

/** Start/end UTC instants for a YYYY-MM-DD date in the user's timezone. */
export function localDateBounds(localDate: string, timezone: string): LocalDateBounds {
  if (!isValidLocalDate(localDate)) {
    throw new Error("Invalid local date");
  }
  const [y, m, d] = localDate.split("-").map(Number);
  const start = zonedTimeToUtc(y, m, d, 0, 0, 0, timezone);
  // The day ends 1ms before the start of the next local day. Computing it this
  // way stays correct across DST transitions (days can be 23 or 25 hours long).
  const nextDay = new Date(Date.UTC(y, m - 1, d + 1));
  const nextStart = zonedTimeToUtc(
    nextDay.getUTCFullYear(),
    nextDay.getUTCMonth() + 1,
    nextDay.getUTCDate(),
    0,
    0,
    0,
    timezone
  );
  return { start, end: new Date(nextStart.getTime() - 1) };
}

function addDays(localDate: string, delta: number): string {
  const d = new Date(`${localDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

/** Whether a habit is scheduled on a given local date. */
export function isScheduledDate(habit: any, localDate: string): boolean {
  if (!habit) return false;
  if (!isValidLocalDate(localDate)) return false;

  const freq = habit.frequency || "daily";
  const d = new Date(`${localDate}T00:00:00Z`);
  const day = d.getUTCDay(); // 0=Sun ... 6=Sat

  if (habit.startDate) {
    const start = localDateString(new Date(habit.startDate), "UTC");
    if (localDate < start) return false;
  }
  if (habit.endDate) {
    const end = localDateString(new Date(habit.endDate), "UTC");
    if (localDate > end) return false;
  }

  if (freq === "daily") return true;
  if (freq === "weekdays") return day >= 1 && day <= 5;
  if (freq === "weekly") {
    const weekdays = Array.isArray(habit.weekdays) ? habit.weekdays : [1, 2, 3, 4, 5];
    return weekdays.includes(day);
  }
  if (freq === "monthly") {
    const start = habit.startDate ? new Date(habit.startDate) : d;
    return d.getUTCDate() === start.getUTCDate();
  }
  if (freq === "custom") {
    const interval = Math.max(1, habit.intervalDays || 1);
    const start = habit.startDate
      ? new Date(localDateString(new Date(habit.startDate), "UTC") + "T00:00:00Z")
      : d;
    const diffDays = Math.floor((d.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays % interval === 0;
  }
  return true;
}

function previousScheduledDate(dateStr: string, habit: any): string | null {
  let cursor = dateStr;
  for (let i = 0; i < 366 * 2; i++) {
    cursor = addDays(cursor, -1);
    if (isScheduledDate(habit, cursor)) return cursor;
  }
  return null;
}

function mostRecentScheduledOnOrBefore(dateStr: string, habit: any): string | null {
  let cursor = dateStr;
  for (let i = 0; i < 366 * 2; i++) {
    if (isScheduledDate(habit, cursor)) return cursor;
    cursor = addDays(cursor, -1);
  }
  return null;
}

export async function computeStreak(
  userId: string,
  habitId: string,
  timezone: string = "UTC"
): Promise<{ current: number; longest: number }> {
  await dbConnect();
  const [logs, habit] = await Promise.all([
    HabitLog.find({ userId, habitId, status: "completed" }).sort({ localDate: 1 }).lean(),
    Habit.findById(habitId).lean(),
  ]);

  if (!habit) return { current: 0, longest: 0 };

  const completedDates = new Set(logs.map((l) => l.localDate));
  const allDates = Array.from(completedDates).sort();

  // Longest run of consecutive scheduled completed days.
  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const dateStr of allDates) {
    if (!isScheduledDate(habit, dateStr)) continue;
    if (prev && previousScheduledDate(dateStr, habit) === prev) {
      run += 1;
    } else {
      run = 1;
    }
    longest = Math.max(longest, run);
    prev = dateStr;
  }

  // Current streak: must include the most recent scheduled day, or the day
  // immediately before it if today is still pending (streak grace).
  const today = localDateString(new Date(), timezone);
  const latestScheduled = mostRecentScheduledOnOrBefore(today, habit);
  if (!latestScheduled) return { current: 0, longest };

  const latestCompleted = [...allDates]
    .reverse()
    .find((d) => d <= today && isScheduledDate(habit, d));
  if (!latestCompleted) return { current: 0, longest };

  const graceDate = previousScheduledDate(latestScheduled, habit);
  if (latestCompleted !== latestScheduled && latestCompleted !== graceDate) {
    return { current: 0, longest };
  }

  let current = 0;
  let expected: string | null = latestCompleted;
  while (expected && completedDates.has(expected) && isScheduledDate(habit, expected)) {
    current += 1;
    expected = previousScheduledDate(expected, habit);
  }

  return { current, longest: Math.max(longest, current) };
}

export function progressPercent(trackingType: TrackingType, log: any): number {
  if (!log) return 0;
  if (trackingType === "boolean") return log.status === "completed" ? 100 : 0;
  if (trackingType === "negative") {
    return log.negativeHabitLog?.avoided ? 100 : 0;
  }
  const np = log.numericProgress;
  if (np && np.target > 0) return Math.min(100, Math.max(0, (np.value / np.target) * 100));
  const dp = log.durationProgress;
  if (dp && dp.targetMinutes > 0)
    return Math.min(100, Math.max(0, (dp.minutes / dp.targetMinutes) * 100));
  const cp = log.checklistProgress;
  if (cp && cp.requiredCount > 0) {
    const checked = cp.items.filter((i: any) => i.checked).length;
    return Math.min(100, Math.max(0, (checked / cp.requiredCount) * 100));
  }
  return 0;
}
