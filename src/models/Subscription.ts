import mongoose, { type InferSchemaType } from "mongoose";

const { Schema, model, models } = mongoose;

export const SUBSCRIPTION_STATUSES = ["inactive", "active", "past_due", "canceled", "trialing"] as const;
export type SubscriptionStatus = typeof SUBSCRIPTION_STATUSES[number];
export const PLAN_TYPES = ["free", "pro"] as const;
export type PlanType = typeof PLAN_TYPES[number];

const subscriptionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    plan: { type: String, enum: PLAN_TYPES, default: "free", index: true },
    status: { type: String, enum: SUBSCRIPTION_STATUSES, default: "inactive", index: true },
    stripeCustomerId: { type: String, select: false },
    stripeSubscriptionId: { type: String, select: false },
    stripePriceId: { type: String, select: false },
    currentPeriodStart: { type: Date },
    currentPeriodEnd: { type: Date },
    cancelAtPeriodEnd: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export type ISubscription = InferSchemaType<typeof subscriptionSchema>;

export const Subscription =
  (models.Subscription as mongoose.Model<ISubscription>) ||
  model<ISubscription>("Subscription", subscriptionSchema);
