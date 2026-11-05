import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";

// The app's database module captures MONGODB_URI at import time, so every
// service/model is imported dynamically *after* the in-memory replica set is
// running. A replica set (not a standalone server) is required because habit
// creation and log writes use transactions.
let replset: MongoMemoryReplSet;

let habitService: typeof import("@/services/habit.service");
let trackingService: typeof import("@/services/tracking.service");
let streakService: typeof import("@/services/streak.service");
let analyticsService: typeof import("@/services/analytics.service");
let userModel: typeof import("@/models/User").User;
let habitLogModel: typeof import("@/models/HabitLog").HabitLog;

let userSeq = 0;

function ymd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** A UTC calendar date `n` days before today (negative = future). */
function daysAgo(n: number): string {
  const d = new Date();
  d.setUTCHours(12, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - n);
  return ymd(d);
}

async function makeUser() {
  userSeq += 1;
  return userModel.create({
    name: `Test User ${userSeq}`,
    email: `user${userSeq}@example.com`,
    passwordHash: "not-used-in-tests",
    timezone: "UTC",
  });
}

function createDailyHabit(userId: string, startDaysAgo = 30) {
  return habitService.createHabit({
    userId,
    name: "Daily habit",
    trackingType: "boolean",
    frequency: "daily",
    startDate: new Date(`${daysAgo(startDaysAgo)}T00:00:00.000Z`),
  });
}

async function clearDatabase() {
  const collections = await mongoose.connection.db!.collections();
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
}

beforeAll(async () => {
  replset = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
  });
  process.env.MONGODB_URI = replset.getUri();
  process.env.MONGODB_DB_NAME = "habitforge_integration";

  habitService = await import("@/services/habit.service");
  trackingService = await import("@/services/tracking.service");
  streakService = await import("@/services/streak.service");
  analyticsService = await import("@/services/analytics.service");
  userModel = (await import("@/models/User")).User;
  habitLogModel = (await import("@/models/HabitLog")).HabitLog;

  // Force the app's lazy connection and wait for index builds.
  const dbConnect = (await import("@/lib/database")).default;
  await dbConnect();
  await Promise.all([
    userModel.init(),
    habitLogModel.init(),
    (await import("@/models/Habit")).Habit.init(),
    (await import("@/models/HabitScheduleVersion")).HabitScheduleVersion.init(),
  ]);
}, 300_000);

beforeEach(async () => {
  await clearDatabase();
});

afterEach(async () => {
  // recordHabitLog schedules achievement evaluation without awaiting it.
  await new Promise((resolve) => setTimeout(resolve, 75));
});

afterAll(async () => {
  await mongoose.disconnect();
  if (replset) await replset.stop();
});

describe("database integration", () => {
  it("creates a habit and its initial schedule version", async () => {
    const user = await makeUser();
    const userId = String(user._id);

    const habit = await createDailyHabit(userId);

    expect(String(habit.userId)).toBe(userId);
    expect(habit.status).toBe("active");

    const fetched = await habitService.getHabit(String(habit._id), userId);
    expect(fetched).not.toBeNull();
    expect(fetched!.name).toBe("Daily habit");

    const versions = await mongoose.connection
      .collection("habitscheduleversions")
      .find({ habitId: habit._id })
      .toArray();
    expect(versions).toHaveLength(1);
    expect(versions[0].userId.toString()).toBe(userId);
  });

  it("upserts exactly one log per habit per local date", async () => {
    const user = await makeUser();
    const userId = String(user._id);
    const habit = await createDailyHabit(userId);
    const localDate = daysAgo(0);

    const first = await trackingService.recordHabitLog({
      userId,
      habitId: String(habit._id),
      localDate,
      timezone: "UTC",
      status: "completed",
      trackingType: "boolean",
    });

    const second = await trackingService.recordHabitLog({
      userId,
      habitId: String(habit._id),
      localDate,
      timezone: "UTC",
      status: "partial",
      trackingType: "boolean",
      notes: "Updated",
    });

    expect(String(second._id)).toBe(String(first._id));
    expect(second.status).toBe("partial");
    expect(second.notes).toBe("Updated");

    const count = await habitLogModel.countDocuments({
      userId,
      habitId: habit._id,
      localDate,
    });
    expect(count).toBe(1);
  });

  it("enforces the unique index at the database level", async () => {
    const user = await makeUser();
    const userId = String(user._id);
    const habit = await createDailyHabit(userId);
    const localDate = daysAgo(0);

    await trackingService.recordHabitLog({
      userId,
      habitId: String(habit._id),
      localDate,
      timezone: "UTC",
      status: "completed",
      trackingType: "boolean",
    });

    await expect(
      habitLogModel.create({
        userId,
        habitId: habit._id,
        localDate,
        status: "completed",
        trackingType: "boolean",
      })
    ).rejects.toMatchObject({ code: 11000 });
  });

  it("rejects future dates", async () => {
    const user = await makeUser();
    const userId = String(user._id);
    const habit = await createDailyHabit(userId);

    await expect(
      trackingService.recordHabitLog({
        userId,
        habitId: String(habit._id),
        localDate: daysAgo(-1),
        timezone: "UTC",
        status: "completed",
        trackingType: "boolean",
      })
    ).rejects.toThrow(/future/i);
  });

  it("rejects completion on an unscheduled day", async () => {
    const user = await makeUser();
    const userId = String(user._id);

    const habit = await habitService.createHabit({
      userId,
      name: "Weekdays only",
      trackingType: "boolean",
      frequency: "weekdays",
      startDate: new Date(`${daysAgo(30)}T00:00:00.000Z`),
    });

    // Find the most recent weekend day, which a weekdays habit must reject.
    const cursor = new Date();
    cursor.setUTCHours(12, 0, 0, 0);
    let weekend = ymd(cursor);
    for (let i = 0; i < 7; i += 1) {
      if (cursor.getUTCDay() === 0 || cursor.getUTCDay() === 6) {
        weekend = ymd(cursor);
        break;
      }
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }

    await expect(
      trackingService.recordHabitLog({
        userId,
        habitId: String(habit._id),
        localDate: weekend,
        timezone: "UTC",
        status: "completed",
        trackingType: "boolean",
      })
    ).rejects.toThrow(/not scheduled/i);
  });

  it("scopes reads and writes to the owning user", async () => {
    const owner = await makeUser();
    const stranger = await makeUser();
    const ownerId = String(owner._id);
    const strangerId = String(stranger._id);
    const habit = await createDailyHabit(ownerId);
    const localDate = daysAgo(0);

    await trackingService.recordHabitLog({
      userId: ownerId,
      habitId: String(habit._id),
      localDate,
      timezone: "UTC",
      status: "completed",
      trackingType: "boolean",
    });

    expect(await habitService.getHabit(String(habit._id), strangerId)).toBeNull();

    await expect(
      trackingService.recordHabitLog({
        userId: strangerId,
        habitId: String(habit._id),
        localDate,
        timezone: "UTC",
        status: "completed",
        trackingType: "boolean",
      })
    ).rejects.toThrow(/not found/i);

    const strangerLogs = await trackingService.getHabitLogsForRange(
      strangerId,
      undefined,
      "",
      ""
    );
    expect(strangerLogs).toHaveLength(0);

    await expect(
      trackingService.deleteHabitLog(strangerId, String(habit._id), localDate)
    ).rejects.toThrow(/not found/i);

    const ownerLog = await trackingService.getHabitLog(
      ownerId,
      String(habit._id),
      localDate
    );
    expect(ownerLog).not.toBeNull();
  });

  it("computes current and longest streaks from real logs", async () => {
    const user = await makeUser();
    const userId = String(user._id);
    const habit = await createDailyHabit(userId);

    for (const offset of [2, 1, 0]) {
      await trackingService.recordHabitLog({
        userId,
        habitId: String(habit._id),
        localDate: daysAgo(offset),
        timezone: "UTC",
        status: "completed",
        trackingType: "boolean",
      });
    }

    const streak = await streakService.computeStreak(userId, String(habit._id), "UTC");
    expect(streak.current).toBe(3);
    expect(streak.longest).toBe(3);

    await trackingService.deleteHabitLog(userId, String(habit._id), daysAgo(0));

    const afterDelete = await streakService.computeStreak(
      userId,
      String(habit._id),
      "UTC"
    );
    expect(afterDelete.current).toBe(2);
  });

  it("reflects real logs in analytics", async () => {
    const user = await makeUser();
    const userId = String(user._id);
    const habit = await createDailyHabit(userId);

    for (const offset of [2, 1, 0]) {
      await trackingService.recordHabitLog({
        userId,
        habitId: String(habit._id),
        localDate: daysAgo(offset),
        timezone: "UTC",
        status: "completed",
        trackingType: "boolean",
      });
    }

    const overview = await analyticsService.getAnalyticsOverview(userId, "UTC");
    expect(overview.totalActiveHabits).toBe(1);
    expect(overview.completedToday).toBe(1);
    expect(overview.dailyCompletionRate).toBe(100);
    expect(overview.totalTrackingDays).toBe(3);
  });
});
