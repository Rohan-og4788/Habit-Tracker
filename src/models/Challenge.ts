import mongoose, { type InferSchemaType } from "mongoose";

const { Schema, model, models } = mongoose;

export const CHALLENGE_STATUSES = ["active", "completed", "failed", "paused"] as const;
export type ChallengeStatus = typeof CHALLENGE_STATUSES[number];

const challengeSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, maxlength: 1000 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: { type: String, enum: CHALLENGE_STATUSES, default: "active", index: true },
    linkedHabitIds: [{ type: Schema.Types.ObjectId, ref: "Habit" }],
    targetValue: { type: Number },
    isPublic: { type: Boolean, default: false },
  },
  { timestamps: true }
);

challengeSchema.index({ userId: 1, status: 1 });

export type IChallenge = InferSchemaType<typeof challengeSchema>;

export const Challenge =
  (models.Challenge as mongoose.Model<IChallenge>) || model<IChallenge>("Challenge", challengeSchema);
