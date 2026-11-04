import mongoose, { type InferSchemaType } from "mongoose";

const { Schema, model, models } = mongoose;

const habitScheduleVersionSchema = new Schema(
  {
    habitId: { type: Schema.Types.ObjectId, ref: "Habit", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    effectiveFrom: { type: Date, required: true },
    frequency: { type: String, required: true },
    weekdays: { type: [Number] },
    intervalDays: { type: Number },
    startDate: { type: Date },
    endDate: { type: Date },
  },
  { timestamps: true }
);

habitScheduleVersionSchema.index({ habitId: 1, effectiveFrom: 1 });

export type IHabitScheduleVersion = InferSchemaType<typeof habitScheduleVersionSchema>;

export const HabitScheduleVersion =
  (models.HabitScheduleVersion as mongoose.Model<IHabitScheduleVersion>) ||
  model<IHabitScheduleVersion>("HabitScheduleVersion", habitScheduleVersionSchema);
