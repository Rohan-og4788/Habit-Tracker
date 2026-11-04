import mongoose, { type InferSchemaType } from "mongoose";

const { Schema, model, models } = mongoose;

export type UserRole = "user" | "admin";

const userSchema = new Schema(
  {
    name: { type: String, required: [true, "Name is required"], trim: true, maxlength: 100 },
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
      unique: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
      index: true,
    },
    passwordHash: { type: String, select: false },
    emailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String, select: false },
    emailVerificationExpires: { type: Date, select: false },
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    role: { type: String, enum: ["user", "admin"], default: "user", index: true },
    image: { type: String },
    bio: { type: String, maxlength: 500 },
    timezone: { type: String, default: "UTC" },
    language: { type: String, default: "en" },
    theme: { type: String, enum: ["light", "dark", "system"], default: "system" },
    emailNotifications: { type: Boolean, default: true },
    pushNotifications: { type: Boolean, default: true },
    aiConsent: { type: Boolean, default: false },
    emailUnsubscribeToken: { type: String, select: false },
    googleId: { type: String, sparse: true, index: true },
    lastLoginAt: { type: Date },
    deletedAt: { type: Date },
  },
  { timestamps: true }
);

export type IUser = InferSchemaType<typeof userSchema>;

export const User =
  (models.User as mongoose.Model<IUser>) || model<IUser>("User", userSchema);
