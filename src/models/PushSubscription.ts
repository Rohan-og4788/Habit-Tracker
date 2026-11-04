import mongoose, { type InferSchemaType } from "mongoose";

const { Schema, model, models } = mongoose;

const pushSubscriptionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    endpoint: { type: String, required: true, unique: true, index: true },
    p256dh: { type: String, required: true },
    auth: { type: String, required: true },
    userAgent: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export type IPushSubscription = InferSchemaType<typeof pushSubscriptionSchema>;

export const PushSubscription =
  (models.PushSubscription as mongoose.Model<IPushSubscription>) ||
  model<IPushSubscription>("PushSubscription", pushSubscriptionSchema);
