import { Habit, type IHabit, HABIT_CATEGORIES } from "@/models/Habit";
import { HabitScheduleVersion } from "@/models/HabitScheduleVersion";
import { User } from "@/models/User";
import { AuditLog } from "@/models/AuditLog";
import dbConnect from "@/lib/database";
import {
  type HabitCategory,
  type DifficultyLevel,
  type Priority,
  type HabitStatus,
  type HabitTrackingType,
  type HabitFrequency,
  type HabitType,
} from "@/models/Habit";

export interface CreateHabitInput {
  userId: string;
  name: string;
  description?: string;
  category?: HabitCategory;
  type?: HabitType;
  trackingType?: HabitTrackingType;
  icon?: string;
  color?: string;
  targetValue?: number;
  unit?: string;
  frequency?: HabitFrequency;
  weekdays?: number[];
  intervalDays?: number;
  startDate?: Date;
  endDate?: Date;
  reminder?: {
    enabled?: boolean;
    time?: string;
    days?: number[];
  };
  gracePeriodMinutes?: number;
  difficulty?: DifficultyLevel;
  priority?: Priority;
  notes?: string;
}

export interface ListHabitsFilters {
  userId: string;
  status?: HabitStatus;
  category?: HabitCategory;
  type?: HabitType;
  search?: string;
  sortBy?: "name" | "createdAt" | "currentStreak" | "priority";
  sortDir?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export async function createHabit(input: CreateHabitInput) {
  await dbConnect();
  const session = await mongooseStartSession();
  let createdHabit: any;
  try {
    await session.withTransaction(async () => {
      const [habit] = await Habit.create(
        [
          {
            userId: input.userId,
            name: input.name,
            description: input.description,
            category: input.category || "other",
            type: input.type || "build",
            trackingType: input.trackingType || "boolean",
            status: "active",
            icon: input.icon || "CheckCircle",
            color: input.color || "#6366F1",
            targetValue: input.targetValue,
            unit: input.unit,
            frequency: input.frequency || "daily",
            weekdays: input.weekdays || [1, 2, 3, 4, 5],
            intervalDays: input.intervalDays,
            startDate: input.startDate || new Date(),
            endDate: input.endDate,
            reminder: input.reminder || { enabled: false, time: "09:00", days: [] },
            gracePeriodMinutes: input.gracePeriodMinutes ?? 0,
            difficulty: input.difficulty || "beginner",
            priority: input.priority || "medium",
            notes: input.notes,
          },
        ],
        { session }
      );
      createdHabit = habit;

      await HabitScheduleVersion.create(
        [
          {
            habitId: habit._id,
            userId: input.userId,
            effectiveFrom: habit.startDate,
            frequency: habit.frequency,
            weekdays: habit.weekdays,
            intervalDays: habit.intervalDays,
            startDate: habit.startDate,
            endDate: habit.endDate,
          },
        ],
        { session }
      );

      await AuditLog.create(
        [
          {
            userId: input.userId,
            action: "create",
            entityType: "Habit",
            entityId: habit._id,
            details: { name: input.name },
          },
        ],
        { session }
      );
    });
    return createdHabit;
  } finally {
    await session.endSession();
  }
}

async function mongooseStartSession() {
  const mongoose = require("mongoose");
  return mongoose.startSession();
}

export async function listHabits(filters: ListHabitsFilters) {
  await dbConnect();
  const {
    userId,
    status,
    category,
    type,
    search,
    sortBy = "createdAt",
    sortDir = "desc",
    page = 1,
    limit = 50,
  } = filters;

  const query: any = { userId, deletedAt: null };
  if (status) query.status = status;
  if (category) query.category = category;
  if (type) query.type = type;
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
    ];
  }

  const sort: any = {};
  sort[sortBy] = sortDir === "asc" ? 1 : -1;

  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    Habit.find(query).sort(sort).skip(skip).limit(limit).lean(),
    Habit.countDocuments(query),
  ]);

  return { items, total, page, limit, pages: Math.ceil(total / limit) };
}

export async function getHabit(habitId: string, userId: string) {
  await dbConnect();
  const habit = await Habit.findOne({ _id: habitId, userId, deletedAt: null }).lean();
  return habit;
}

export async function updateHabit(
  habitId: string,
  userId: string,
  updates: Partial<CreateHabitInput> & {
    status?: HabitStatus;
    isPaused?: boolean;
    pausedAt?: Date;
    pauseReason?: string;
  }
) {
  await dbConnect();
  const habit = await Habit.findOne({ _id: habitId, userId, deletedAt: null });
  if (!habit) throw new Error("Habit not found");

  const changed: string[] = [];
  const allowed: (keyof CreateHabitInput)[] = [
    "name",
    "description",
    "category",
    "type",
    "trackingType",
    "icon",
    "color",
    "targetValue",
    "unit",
    "frequency",
    "weekdays",
    "intervalDays",
    "startDate",
    "endDate",
    "reminder",
    "gracePeriodMinutes",
    "difficulty",
    "priority",
    "notes",
  ];

  for (const field of allowed) {
    if (updates[field] !== undefined) {
      const before = habit[field];
      const after = updates[field];
      if (JSON.stringify(before) !== JSON.stringify(after)) {
        changed.push(field);
        (habit as any)[field] = after;
      }
    }
  }

  if (updates.status !== undefined) {
    habit.status = updates.status;
    if (updates.status === "archived") habit.archivedAt = new Date();
    else if (updates.status === "active" && habit.archivedAt) {
      habit.archivedAt = undefined;
    }
    changed.push("status");
  }

  // If scheduling fields changed, preserve history via schedule version
  if (
    changed.includes("frequency") ||
    changed.includes("weekdays") ||
    changed.includes("intervalDays") ||
    changed.includes("startDate") ||
    changed.includes("endDate")
  ) {
    await HabitScheduleVersion.create({
      habitId: habit._id,
      userId,
      effectiveFrom: new Date(), // apply from now on; history preserved
      frequency: habit.frequency,
      weekdays: habit.weekdays,
      intervalDays: habit.intervalDays,
      startDate: habit.startDate,
      endDate: habit.endDate,
    });
  }

  await habit.save();

  await AuditLog.create({
    userId,
    action: "update",
    entityType: "Habit",
    entityId: habit._id,
    details: { changed },
  });

  return habit;
}

export async function archiveHabit(habitId: string, userId: string) {
  return updateHabit(habitId, userId, { status: "archived" });
}

export async function restoreHabit(habitId: string, userId: string) {
  return updateHabit(habitId, userId, { status: "active" });
}

export async function pauseHabit(
  habitId: string,
  userId: string,
  reason?: string
) {
  return updateHabit(habitId, userId, {
    status: "paused",
    isPaused: true,
    pausedAt: new Date(),
    pauseReason: reason,
  });
}

export async function resumeHabit(habitId: string, userId: string) {
  return updateHabit(habitId, userId, {
    status: "active",
    isPaused: false,
    pausedAt: undefined,
    pauseReason: undefined,
  });
}

export async function deleteHabit(habitId: string, userId: string) {
  await dbConnect();
  const habit = await Habit.findOne({ _id: habitId, userId });
  if (!habit) throw new Error("Habit not found");
  habit.deletedAt = new Date();
  habit.status = "archived";
  await habit.save();

  await AuditLog.create({
    userId,
    action: "delete",
    entityType: "Habit",
    entityId: habit._id,
  });

  return habit;
}

export async function duplicateHabit(habitId: string, userId: string) {
  await dbConnect();
  const habit = await Habit.findOne({ _id: habitId, userId, deletedAt: null });
  if (!habit) throw new Error("Habit not found");

  const { _id, createdAt, updatedAt, ...rest } = habit.toObject();
  const duplicate = await Habit.create({
    ...rest,
    name: `${habit.name} (Copy)`,
    userId,
    startDate: new Date(),
    currentStreak: 0,
    longestStreak: 0,
    totalCompletions: 0,
    lastCompletedAt: undefined,
  });

  await AuditLog.create({
    userId,
    action: "create",
    entityType: "Habit",
    entityId: duplicate._id,
    details: { name: duplicate.name, duplicatedFrom: habitId },
  });

  return duplicate;
}

export async function getActiveHabitCount(userId: string): Promise<number> {
  await dbConnect();
  return Habit.countDocuments({ userId, status: "active", deletedAt: null });
}

export function isValidCategory(value: string): value is typeof HABIT_CATEGORIES[number] {
  return (HABIT_CATEGORIES as readonly string[]).includes(value);
}
