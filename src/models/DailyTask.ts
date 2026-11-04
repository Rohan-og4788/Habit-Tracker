import mongoose, { type InferSchemaType } from "mongoose";

const { Schema, model, models } = mongoose;

export const TASK_PRIORITIES = ["low", "medium", "high"] as const;
export type TaskPriority = typeof TASK_PRIORITIES[number];
export const TASK_STATUSES = ["pending", "completed", "overdue", "cancelled"] as const;
export type TaskStatus = typeof TASK_STATUSES[number];

const dailyTaskSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    habitId: { type: Schema.Types.ObjectId, ref: "Habit" },
    title: { type: String, required: true, trim: true, maxlength: 300 },
    description: { type: String, maxlength: 1000 },
    date: { type: String, required: true, index: true }, // YYYY-MM-DD
    dueTime: { type: String }, // HH:mm
    priority: { type: String, enum: TASK_PRIORITIES, default: "medium", index: true },
    status: { type: String, enum: TASK_STATUSES, default: "pending", index: true },
    order: { type: Number, default: 0 },
    timeBlockStart: { type: String }, // HH:mm
    timeBlockEnd: { type: String },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

dailyTaskSchema.index({ userId: 1, date: 1, status: 1 });

export type IDailyTask = InferSchemaType<typeof dailyTaskSchema>;

export const DailyTask =
  (models.DailyTask as mongoose.Model<IDailyTask>) ||
  model<IDailyTask>("DailyTask", dailyTaskSchema);
