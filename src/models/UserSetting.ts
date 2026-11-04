import mongoose, { type InferSchemaType } from "mongoose";

const { Schema, model, models } = mongoose;

const userSettingSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    weekStartDay: { type: Number, default: 1, min: 0, max: 6 }, // 0=Sun ... 6=Sat
    dateFormat: { type: String, default: "YYYY-MM-DD" },
    timeFormat: { type: String, default: "12" }, // 12 or 24
    defaultReminderTime: { type: String, default: "09:00" },
    defaultCategory: { type: String, default: "other" },
    defaultFrequency: { type: String, default: "daily" },
    reducedMotion: { type: Boolean, default: false },
    highContrast: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export type IUserSetting = InferSchemaType<typeof userSettingSchema>;

export const UserSetting =
  (models.UserSetting as mongoose.Model<IUserSetting>) ||
  model<IUserSetting>("UserSetting", userSettingSchema);
