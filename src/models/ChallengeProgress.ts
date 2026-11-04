import mongoose, { type InferSchemaType } from "mongoose";

const { Schema, model, models } = mongoose;

const challengeProgressSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    challengeId: { type: Schema.Types.ObjectId, ref: "Challenge", required: true, index: true },
    localDate: { type: String, required: true, index: true },
    completed: { type: Boolean, default: false },
    value: { type: Number, default: 0 },
  },
  { timestamps: true }
);

challengeProgressSchema.index({ userId: 1, challengeId: 1, localDate: 1 }, { unique: true });

export type IChallengeProgress = InferSchemaType<typeof challengeProgressSchema>;

export const ChallengeProgress =
  (models.ChallengeProgress as mongoose.Model<IChallengeProgress>) ||
  model<IChallengeProgress>("ChallengeProgress", challengeProgressSchema);
