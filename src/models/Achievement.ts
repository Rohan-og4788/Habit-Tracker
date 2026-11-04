import mongoose, { type InferSchemaType } from "mongoose";

const { Schema, model, models } = mongoose;

export const ACHIEVEMENT_CATEGORIES = [
  "first-habit",
  "streak",
  "consistency",
  "goal",
  "completion",
  "milestone",
] as const;
export type AchievementCategory = typeof ACHIEVEMENT_CATEGORIES[number];

const achievementSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, index: true }, // e.g. "first-habit"
    title: { type: String, required: true, maxlength: 200 },
    description: { type: String, maxlength: 500 },
    category: { type: String, enum: ACHIEVEMENT_CATEGORIES, index: true },
    badgeIcon: { type: String, default: "Badge" },
    badgeColor: { type: String, default: "#6366F1" },
    threshold: { type: Number, required: true, min: 0 }, // value needed to unlock
    secret: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export type IAchievement = InferSchemaType<typeof achievementSchema>;

export const Achievement =
  (models.Achievement as mongoose.Model<IAchievement>) ||
  model<IAchievement>("Achievement", achievementSchema);
