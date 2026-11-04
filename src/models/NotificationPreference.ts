import mongoose, { type InferSchemaType } from "mongoose";

const { Schema, model, models } = mongoose;

const notificationPreferenceSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    emailEnabled: { type: Boolean, default: true },
    pushEnabled: { type: Boolean, default: true },
    inAppEnabled: { type: Boolean, default: true },
    habitReminders: { type: Boolean, default: true },
    dailyMorning: { type: Boolean, default: true },
    eveningReview: { type: Boolean, default: false },
    incompleteReminder: { type: Boolean, default: true },
    streakMilestones: { type: Boolean, default: true },
    goalDeadlines: { type: Boolean, default: true },
    weeklyReport: { type: Boolean, default: false },
    monthlyReport: { type: Boolean, default: false },
    reminderTime: { type: String, default: "09:00" },
    reminderDays: { type: [Number], default: [0, 1, 2, 3, 4, 5, 6] },
    quietHoursStart: { type: String, default: "22:00" },
    quietHoursEnd: { type: String, default: "08:00" },
    timezone: { type: String, default: "UTC" },
  },
  { timestamps: true }
);

export type INotificationPreference = InferSchemaType<typeof notificationPreferenceSchema>;

export const NotificationPreference =
  (models.NotificationPreference as mongoose.Model<INotificationPreference>) ||
  model<INotificationPreference>("NotificationPreference", notificationPreferenceSchema);
