import mongoose, { type InferSchemaType } from "mongoose";

const { Schema, model, models } = mongoose;

const userAchievementSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    achievementId: { type: Schema.Types.ObjectId, ref: "Achievement", required: true, index: true },
    unlockedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

userAchievementSchema.index({ userId: 1, achievementId: 1 }, { unique: true });

export type IUserAchievement = InferSchemaType<typeof userAchievementSchema>;

export const UserAchievement =
  (models.UserAchievement as mongoose.Model<IUserAchievement>) ||
  model<IUserAchievement>("UserAchievement", userAchievementSchema);
