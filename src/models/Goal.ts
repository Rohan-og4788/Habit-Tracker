import mongoose, { type InferSchemaType } from "mongoose";

const { Schema, model, models } = mongoose;

export const GOAL_STATUSES = ["active", "completed", "paused", "overdue"] as const;
export type GoalStatus = typeof GOAL_STATUSES[number];
export const GOAL_PRIORITIES = ["low", "medium", "high"] as const;
export type GoalPriority = typeof GOAL_PRIORITIES[number];

interface Milestone {
  id: string;
  title: string;
  targetValue: number;
  achievedAt?: Date;
}

const goalSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: [true, "Goal title is required"], trim: true, maxlength: 200 },
    description: { type: String, maxlength: 1000 },
    targetValue: { type: Number, required: true, min: 0 },
    currentProgress: { type: Number, default: 0, min: 0 },
    unit: { type: String, maxlength: 50 },
    deadline: { type: Date },
    status: { type: String, enum: GOAL_STATUSES, default: "active", index: true },
    priority: { type: String, enum: GOAL_PRIORITIES, default: "medium", index: true },
    linkedHabitIds: [{ type: Schema.Types.ObjectId, ref: "Habit" }],
    milestones: [
      {
        id: String,
        title: String,
        targetValue: Number,
        achievedAt: Date,
      },
    ],
    completedAt: { type: Date },
  },
  { timestamps: true }
);

goalSchema.index({ userId: 1, status: 1 });
goalSchema.index({ userId: 1, deadline: 1 });

export type IGoal = InferSchemaType<typeof goalSchema>;

export const Goal =
  (models.Goal as mongoose.Model<IGoal>) || model<IGoal>("Goal", goalSchema);
