import mongoose, { type InferSchemaType } from "mongoose";

const { Schema, model, models } = mongoose;

export const LOG_STATUSES = ["completed", "partial", "skipped", "missed"] as const;
export type LogStatus = typeof LOG_STATUSES[number];

interface NumericProgress {
  value: number;
  target: number;
  unit: string;
}

interface DurationProgress {
  minutes: number;
  targetMinutes: number;
}

interface ChecklistProgress {
  items: Array<{ id: string; checked: boolean }>;
  requiredCount: number;
}

interface NegativeHabitLog {
  incidents: number;
  avoided: boolean;
  triggerNote?: string;
}

const habitLogSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    habitId: { type: Schema.Types.ObjectId, ref: "Habit", required: true, index: true },
    localDate: { type: String, required: true, index: true }, // YYYY-MM-DD in user tz
    status: { type: String, enum: LOG_STATUSES, required: true, index: true },
    trackingType: {
      type: String,
      enum: ["boolean", "numeric", "duration", "count", "checklist", "negative"],
      required: true,
    },
    numericProgress: { value: Number, target: Number, unit: String },
    durationProgress: { minutes: Number, targetMinutes: Number },
    checklistProgress: {
      items: [{ id: String, checked: Boolean }],
      requiredCount: Number,
    },
    negativeHabitLog: { incidents: Number, avoided: Boolean, triggerNote: String },
    notes: { type: String, maxlength: 2000 },
    skippedReason: { type: String, maxlength: 500 },
    completedAt: { type: Date },
    updatedAt: { type: Date },
  },
  { timestamps: true }
);

// One aggregate log per habit per local date per user
habitLogSchema.index({ userId: 1, habitId: 1, localDate: 1 }, { unique: true });
habitLogSchema.index({ userId: 1, localDate: 1 });
habitLogSchema.index({ habitId: 1, localDate: 1 });

export type IHabitLog = InferSchemaType<typeof habitLogSchema>;

export const HabitLog =
  (models.HabitLog as mongoose.Model<IHabitLog>) ||
  model<IHabitLog>("HabitLog", habitLogSchema);
