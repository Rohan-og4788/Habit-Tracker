// Seed HabitForge with a demo account and realistic sample data.
// Usage: npm run seed
// Requires MONGODB_URI in .env. This script is idempotent for the demo user.
import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB_NAME || "habitforge";
const DEMO_EMAIL = process.env.SEED_EMAIL || "demo@habitforge.app";
const DEMO_PASSWORD = process.env.SEED_PASSWORD || "Demo1234!";

if (!MONGODB_URI) {
  console.error("MONGODB_URI is not set. Add it to .env before seeding.");
  process.exit(1);
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function localDate(date) {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function addDays(date, delta) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + delta);
  return next;
}

async function main() {
  await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
  const db = mongoose.connection.db;
  console.log(`Connected to ${DB_NAME}.`);

  const existing = await db.collection("users").findOne({ email: DEMO_EMAIL });
  if (existing) {
    const userId = existing._id;
    for (const collection of [
      "sessions",
      "verificationtokens",
      "habits",
      "habitlogs",
      "habitscheduleversions",
      "goals",
      "challenges",
      "challengeprogresses",
      "journalentries",
      "focussessions",
      "dailytasks",
      "notifications",
      "notificationpreferences",
      "pushsubscriptions",
      "usersettings",
      "userachievements",
      "subscriptions",
      "auditlogs",
    ]) {
      try {
        await db.collection(collection).deleteMany({ userId });
      } catch {
        // Collection may not exist yet.
      }
    }
    await db.collection("users").deleteOne({ _id: userId });
    console.log("Removed previous demo account data.");
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const now = new Date();
  const userResult = await db.collection("users").insertOne({
    name: "Demo User",
    email: DEMO_EMAIL,
    passwordHash,
    emailVerified: true,
    role: "user",
    bio: "Building small habits, one day at a time.",
    timezone: "UTC",
    language: "en",
    theme: "system",
    emailNotifications: true,
    pushNotifications: false,
    aiConsent: false,
    createdAt: addDays(now, -60),
    updatedAt: now,
  });
  const userId = userResult.insertedId;

  const habitDefinitions = [
    {
      name: "Morning walk",
      description: "A 20 minute walk before starting work.",
      category: "fitness",
      trackingType: "duration",
      targetValue: 20,
      unit: "minutes",
      color: "#14B8A6",
      frequency: "daily",
      weekdays: [0, 1, 2, 3, 4, 5, 6],
    },
    {
      name: "Read 10 pages",
      description: "Read a book instead of scrolling.",
      category: "reading",
      trackingType: "numeric",
      targetValue: 10,
      unit: "pages",
      color: "#8B5CF6",
      frequency: "daily",
      weekdays: [0, 1, 2, 3, 4, 5, 6],
    },
    {
      name: "Drink water",
      description: "Eight glasses across the day.",
      category: "health",
      trackingType: "count",
      targetValue: 8,
      unit: "glasses",
      color: "#06B6D4",
      frequency: "daily",
      weekdays: [0, 1, 2, 3, 4, 5, 6],
    },
    {
      name: "No late-night snacking",
      description: "Avoid eating after 9pm.",
      category: "health",
      trackingType: "negative",
      color: "#EF4444",
      frequency: "daily",
      weekdays: [0, 1, 2, 3, 4, 5, 6],
    },
    {
      name: "Deep work block",
      description: "One focused 90 minute block on weekdays.",
      category: "productivity",
      trackingType: "boolean",
      color: "#6366F1",
      frequency: "weekdays",
      weekdays: [1, 2, 3, 4, 5],
    },
  ];

  const startDate = addDays(now, -30);
  const habitDocs = habitDefinitions.map((habit) => ({
    userId,
    ...habit,
    type: "build",
    status: "active",
    icon: "CheckCircle",
    intervalDays: null,
    startDate,
    endDate: null,
    reminder: { enabled: false, time: "09:00", days: [] },
    gracePeriodMinutes: 0,
    difficulty: "beginner",
    priority: "medium",
    notes: "",
    isPaused: false,
    currentStreak: 0,
    longestStreak: 0,
    totalCompletions: 0,
    createdAt: startDate,
    updatedAt: now,
  }));

  const habitResult = await db.collection("habits").insertMany(habitDocs);
  const habitIds = Object.values(habitResult.insertedIds);

  // Mirror createHabit: every habit gets its initial schedule version.
  await db.collection("habitscheduleversions").insertMany(
    habitIds.map((habitId, index) => ({
      habitId,
      userId,
      effectiveFrom: habitDefinitions[index].startDate ?? startDate,
      frequency: habitDefinitions[index].frequency,
      weekdays: habitDefinitions[index].weekdays,
      intervalDays: null,
      startDate,
      endDate: null,
      createdAt: startDate,
      updatedAt: startDate,
    }))
  );

  const logDocs = [];
  for (let offset = 29; offset >= 0; offset--) {
    const day = addDays(now, -offset);
    const date = localDate(day);
    const weekday = day.getUTCDay();

    habitIds.forEach((habitId, index) => {
      const habit = habitDefinitions[index];
      if (habit.frequency === "weekdays" && (weekday === 0 || weekday === 6)) return;
      // Deterministic pattern with a realistic miss rate.
      if ((offset + index) % 7 === 0) return;

      const base = {
        userId,
        habitId,
        localDate: date,
        status: "completed",
        trackingType: habit.trackingType,
        completedAt: day,
        createdAt: day,
        updatedAt: day,
      };
      if (habit.trackingType === "duration") {
        base.durationProgress = { minutes: 20, targetMinutes: 20 };
      } else if (habit.trackingType === "numeric") {
        base.numericProgress = { value: 10, target: 10, unit: "pages" };
      } else if (habit.trackingType === "count") {
        base.numericProgress = { value: 8, target: 8, unit: "glasses" };
      } else if (habit.trackingType === "negative") {
        base.negativeHabitLog = { incidents: 0, avoided: true };
      }
      logDocs.push(base);
    });
  }

  if (logDocs.length > 0) {
    await db.collection("habitlogs").insertMany(logDocs);
  }

  const goalResult = await db.collection("goals").insertMany([
    {
      userId,
      title: "Walk 100 km",
      description: "Accumulate 100 km of walking this quarter.",
      targetValue: 100,
      currentProgress: 42,
      unit: "km",
      deadline: addDays(now, 45),
      status: "active",
      priority: "high",
      linkedHabitIds: [habitIds[0]],
      milestones: [
        { id: "m1", title: "First 25 km", targetValue: 25, achievedAt: addDays(now, -20) },
        { id: "m2", title: "Halfway", targetValue: 50 },
      ],
      createdAt: addDays(now, -30),
      updatedAt: now,
    },
    {
      userId,
      title: "Read 12 books",
      description: "One book per month.",
      targetValue: 12,
      currentProgress: 12,
      unit: "books",
      deadline: addDays(now, -5),
      status: "completed",
      priority: "medium",
      linkedHabitIds: [habitIds[1]],
      milestones: [],
      completedAt: addDays(now, -5),
      createdAt: addDays(now, -60),
      updatedAt: addDays(now, -5),
    },
  ]);

  await db.collection("journalentries").insertMany(
    [0, 1, 2, 3, 4].map((offset) => {
      const day = addDays(now, -offset);
      return {
        userId,
        date: localDate(day),
        wentWell: "Kept the morning walk and reading habit.",
        struggledWith: offset % 2 === 0 ? "Late-night screen time." : "Busy workday.",
        learned: "Smaller sessions are easier to repeat.",
        improveTomorrow: "Put the phone away 30 minutes earlier.",
        mood: offset === 0 ? "good" : offset % 3 === 0 ? "neutral" : "good",
        notes: "",
        createdAt: day,
        updatedAt: day,
      };
    })
  );

  await db.collection("focussessions").insertMany(
    [1, 2, 3, 4, 5, 6, 7, 8].map((offset) => {
      const day = addDays(now, -offset);
      return {
        userId,
        habitId: habitIds[4],
        plannedMinutes: 25,
        actualMinutes: 25,
        startedAt: day,
        endedAt: new Date(day.getTime() + 25 * 60 * 1000),
        completed: true,
        createdAt: day,
        updatedAt: day,
      };
    })
  );

  await db.collection("dailytasks").insertMany([
    {
      userId,
      title: "Prepare tomorrow's clothes",
      description: "Remove friction from the morning.",
      date: localDate(now),
      priority: "medium",
      status: "pending",
      order: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      userId,
      title: "Refill water bottle",
      description: "Set up for the water habit.",
      date: localDate(now),
      priority: "low",
      status: "completed",
      order: 1,
      completedAt: now,
      createdAt: now,
      updatedAt: now,
    },
  ]);

  await db.collection("notificationpreferences").insertOne({
    userId,
    emailEnabled: true,
    pushEnabled: false,
    inAppEnabled: true,
    habitReminders: true,
    dailyMorning: true,
    eveningReview: true,
    incompleteReminder: true,
    streakMilestones: true,
    goalDeadlines: true,
    weeklyReport: true,
    monthlyReport: false,
    reminderTime: "09:00",
    quietHoursStart: "22:00",
    quietHoursEnd: "08:00",
    createdAt: now,
    updatedAt: now,
  });

  await db.collection("usersettings").insertOne({
    userId,
    weekStartDay: 1,
    dateFormat: "MM/DD/YYYY",
    timeFormat: "12",
    defaultReminderTime: "09:00",
    defaultCategory: "other",
    defaultFrequency: "daily",
    reducedMotion: false,
    highContrast: false,
    createdAt: now,
    updatedAt: now,
  });

  await db.collection("subscriptions").insertOne({
    userId,
    plan: "free",
    status: "inactive",
    currentPeriodStart: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    createdAt: now,
    updatedAt: now,
  });

  const habitCount = habitIds.length;
  const completedCount = logDocs.length;
  console.log("");
  console.log("Seed complete.");
  console.log(`  Demo email:    ${DEMO_EMAIL}`);
  console.log(`  Demo password: ${DEMO_PASSWORD}`);
  console.log(`  Habits:        ${habitCount}`);
  console.log(`  Habit logs:    ${completedCount}`);
  console.log(`  Goals:         ${goalResult.insertedCount}`);
  console.log("");
  console.log("Sign in at /auth/login with the credentials above.");

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error("Seed failed:", err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
