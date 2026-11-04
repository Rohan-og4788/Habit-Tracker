import mongoose, { type InferSchemaType } from "mongoose";

const { Schema, model, models } = mongoose;

// ---------------------------------------------------------------------------
// Runtime enum values + derived types
// ---------------------------------------------------------------------------

export const HABIT_TYPES = ["build", "quit", "one-time"] as const;
export type HabitType = typeof HABIT_TYPES[number];

export const HABIT_TRACKING_TYPES = [
  "boolean",
  "numeric",
  "duration",
  "count",
  "checklist",
  "negative",
] as const;
export type HabitTrackingType = typeof HABIT_TRACKING_TYPES[number];

export const HABIT_FREQUENCIES = ["daily", "weekdays", "weekly", "monthly", "custom"] as const;
export type HabitFrequency = typeof HABIT_FREQUENCIES[number];

export const HABIT_STATUSES = ["active", "archived", "paused"] as const;
export type HabitStatus = typeof HABIT_STATUSES[number];

export const DIFFICULTY_LEVELS = ["beginner", "intermediate", "advanced"] as const;
export type DifficultyLevel = typeof DIFFICULTY_LEVELS[number];

export const PRIORITIES = ["low", "medium", "high"] as const;
export type Priority = typeof PRIORITIES[number];

export const HABIT_CATEGORIES = [
  "health",
  "fitness",
  "study",
  "career",
  "productivity",
  "personal-development",
  "finance",
  "mental-wellness",
  "reading",
  "other",
] as const;
export type HabitCategory = typeof HABIT_CATEGORIES[number];

// ---------------------------------------------------------------------------
// Habit schema
// ---------------------------------------------------------------------------

interface Reminder {
  enabled: boolean;
  time: string;
  days: number[];
}

const habitSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: [true, "Habit name is required"], trim: true, maxlength: 200 },
    description: { type: String, maxlength: 1000 },
    category: { type: String, enum: HABIT_CATEGORIES, default: "other", index: true },
    type: { type: String, enum: HABIT_TYPES, default: "build", index: true },
    trackingType: {
      type: String,
      enum: HABIT_TRACKING_TYPES,
      default: "boolean",
      index: true,
    },
    status: { type: String, enum: HABIT_STATUSES, default: "active", index: true },
    icon: { type: String, default: "CheckCircle" },
    color: { type: String, default: "#6366F1" },
    targetValue: { type: Number },
    unit: { type: String, maxlength: 50 },
    frequency: { type: String, enum: HABIT_FREQUENCIES, default: "daily", index: true },
    weekdays: { type: [Number], default: [1, 2, 3, 4, 5], validate: (v: any[]) => v.length > 0 },
    intervalDays: { type: Number, min: 1 },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    reminder: {
      enabled: { type: Boolean, default: false },
      time: { type: String, default: "09:00" },
      days: { type: [Number], default: [] },
    },
    gracePeriodMinutes: { type: Number, default: 0 },
    difficulty: { type: String, enum: DIFFICULTY_LEVELS, default: "beginner" },
    priority: { type: String, enum: PRIORITIES, default: "medium" },
    notes: { type: String, maxlength: 2000 },
    isPaused: { type: Boolean, default: false },
    pausedAt: { type: Date },
    pauseReason: { type: String },
    archivedAt: { type: Date },
    deletedAt: { type: Date },
    lastCompletedAt: { type: Date },
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    totalCompletions: { type: Number, default: 0 },
  },
  { timestamps: true }
);

habitSchema.index({ userId: 1, status: 1 });
habitSchema.index({ userId: 1, category: 1 });
habitSchema.index({ userId: 1, createdAt: -1 });

export type IHabit = InferSchemaType<typeof habitSchema>;

export const Habit =
  (models.Habit as mongoose.Model<IHabit>) || model<IHabit>("Habit", habitSchema);
