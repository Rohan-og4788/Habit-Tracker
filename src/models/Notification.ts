import mongoose, { type InferSchemaType } from "mongoose";

const { Schema, model, models } = mongoose;

export const NOTIFICATION_CHANNELS = ["in-app", "email", "push"] as const;
export type NotificationChannel = typeof NOTIFICATION_CHANNELS[number];
export const NOTIFICATION_TYPES = [
  "habit_reminder",
  "daily_morning",
  "evening_review",
  "incomplete_habit",
  "streak_milestone",
  "goal_deadline",
  "weekly_report",
  "monthly_report",
  "system",
] as const;
export type NotificationType = typeof NOTIFICATION_TYPES[number];
export const NOTIFICATION_STATUSES = ["pending", "sent", "delivered", "failed"] as const;
export type NotificationStatus = typeof NOTIFICATION_STATUSES[number];

const notificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, required: true, index: true },
    channel: { type: String, enum: NOTIFICATION_CHANNELS, required: true },
    title: { type: String, required: true, maxlength: 200 },
    body: { type: String, required: true, maxlength: 1000 },
    status: { type: String, enum: NOTIFICATION_STATUSES, default: "pending", index: true },
    scheduledAt: { type: Date, required: true, index: true },
    sentAt: { type: Date },
    deliveredAt: { type: Date },
    failureReason: { type: String, maxlength: 1000 },
    relatedHabitId: { type: Schema.Types.ObjectId, ref: "Habit" },
    relatedGoalId: { type: Schema.Types.ObjectId, ref: "Goal" },
    idempotencyKey: { type: String, unique: true, sparse: true, index: true },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, scheduledAt: 1, status: 1 });
notificationSchema.index({ userId: 1, status: 1 });

export type INotification = InferSchemaType<typeof notificationSchema>;

export const Notification =
  (models.Notification as mongoose.Model<INotification>) ||
  model<INotification>("Notification", notificationSchema);
