import { z } from "zod";

export const registerSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name is too long")
    .trim(),
  email: z.string().email("Invalid email address").trim().toLowerCase(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password is too long")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[a-z]/, "Password must contain a lowercase letter")
    .regex(/[0-9]/, "Password must contain a number")
    .regex(/[^A-Za-z0-9]/, "Password must contain a special character"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address").trim().toLowerCase(),
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address").trim().toLowerCase(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Invalid or expired reset token"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[a-z]/, "Password must contain a lowercase letter")
    .regex(/[0-9]/, "Password must contain a number")
    .regex(/[^A-Za-z0-9]/, "Password must contain a special character"),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[a-z]/, "Password must contain a lowercase letter")
    .regex(/[0-9]/, "Password must contain a number")
    .regex(/[^A-Za-z0-9]/, "Password must contain a special character"),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).trim().optional(),
  bio: z.string().max(500).optional(),
  timezone: z.string().min(1),
  language: z.string().min(1).max(10),
  theme: z.enum(["light", "dark", "system"]).optional(),
  emailNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  aiConsent: z.boolean().optional(),
  image: z.string().url("Avatar must be a valid URL").max(500).optional().or(z.literal("")),
});

export const createHabitSchema = z.object({
  name: z.string().min(1, "Habit name is required").max(200).trim(),
  description: z.string().max(1000).optional(),
  category: z.enum([
    "health", "fitness", "study", "career", "productivity",
    "personal-development", "finance", "mental-wellness", "reading", "other",
  ]).default("other"),
  type: z.enum(["build", "quit", "one-time"]).default("build"),
  trackingType: z.enum(["boolean", "numeric", "duration", "count", "checklist", "negative"]).default("boolean"),
  icon: z.string().default("CheckCircle"),
  color: z.string().default("#6366F1"),
  targetValue: z.number().min(0).optional(),
  unit: z.string().max(50).optional(),
  frequency: z.enum(["daily", "weekdays", "weekly", "monthly", "custom"]).default("daily"),
  weekdays: z.array(z.number().min(0).max(6)).default([1, 2, 3, 4, 5]),
  intervalDays: z.number().min(1).optional(),
  startDate: z.preprocess((v) => (v ? new Date(v as string) : undefined), z.date().optional()),
  endDate: z.preprocess((v) => (v ? new Date(v as string) : undefined), z.date().optional()),
  reminder: z.object({
    enabled: z.boolean().default(false),
    time: z.string().default("09:00"),
    days: z.array(z.number().min(0).max(6)).default([]),
  }).default({ enabled: false, time: "09:00", days: [] }),
  gracePeriodMinutes: z.number().min(0).default(0),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]).default("beginner"),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  notes: z.string().max(2000).optional(),
});

export const recordLogSchema = z.object({
  habitId: z.string().min(1),
  localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  timezone: z.string().min(1),
  status: z.enum(["completed", "partial", "skipped", "missed"]),
  trackingType: z.string(),
  notes: z.string().max(2000).optional(),
  skippedReason: z.string().max(500).optional(),
  numericProgress: z.object({ value: z.number(), target: z.number(), unit: z.string() }).optional(),
  durationProgress: z.object({ minutes: z.number(), targetMinutes: z.number() }).optional(),
  checklistProgress: z.object({
    items: z.array(z.object({ id: z.string(), checked: z.boolean() })),
    requiredCount: z.number(),
  }).optional(),
  negativeHabitLog: z.object({
    incidents: z.number().min(0),
    avoided: z.boolean(),
    triggerNote: z.string().max(500).optional(),
  }).optional(),
});

export const createGoalSchema = z.object({
  title: z.string().min(1).max(200).trim(),
  description: z.string().max(1000).optional(),
  targetValue: z.number().min(0),
  unit: z.string().max(50).optional(),
  deadline: z.preprocess((v) => (v ? new Date(v as string) : undefined), z.date().optional()),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  linkedHabitIds: z.array(z.string()).default([]),
  milestones: z.array(
    z.object({ id: z.string(), title: z.string(), targetValue: z.number().min(0) })
  ).default([]),
});

export const journalSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  wentWell: z.string().max(2000).optional(),
  struggledWith: z.string().max(2000).optional(),
  learned: z.string().max(2000).optional(),
  improveTomorrow: z.string().max(2000).optional(),
  mood: z.enum(["excellent", "good", "neutral", "low", "difficult"]).default("neutral"),
  notes: z.string().max(5000).optional(),
});
