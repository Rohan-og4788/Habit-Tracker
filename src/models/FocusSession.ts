import mongoose, { type InferSchemaType } from "mongoose";

const { Schema, model, models } = mongoose;

const focusSessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    habitId: { type: Schema.Types.ObjectId, ref: "Habit" },
    plannedMinutes: { type: Number, required: true, min: 1 },
    actualMinutes: { type: Number, default: 0 },
    startedAt: { type: Date, required: true, index: true },
    endedAt: { type: Date },
    completed: { type: Boolean, default: false },
    interrupted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

focusSessionSchema.index({ userId: 1, startedAt: 1 });

export type IFocusSession = InferSchemaType<typeof focusSessionSchema>;

export const FocusSession =
  (models.FocusSession as mongoose.Model<IFocusSession>) ||
  model<IFocusSession>("FocusSession", focusSessionSchema);
