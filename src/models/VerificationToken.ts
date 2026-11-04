import mongoose, { type InferSchemaType } from "mongoose";

const { Schema, model, models } = mongoose;

export type TokenPurpose = "email_verification" | "password_reset" | "email_change";

const verificationTokenSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    token: { type: String, required: true, unique: true, index: true },
    purpose: {
      type: String,
      enum: ["email_verification", "password_reset", "email_change"],
      required: true,
      index: true,
    },
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
    used: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export type IVerificationToken = InferSchemaType<typeof verificationTokenSchema>;

export const VerificationToken =
  (models.VerificationToken as mongoose.Model<IVerificationToken>) ||
  model<IVerificationToken>("VerificationToken", verificationTokenSchema);
