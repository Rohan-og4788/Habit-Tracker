import mongoose, { type InferSchemaType } from "mongoose";

const { Schema, model, models } = mongoose;

const sessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    token: { type: String, required: true, unique: true, index: true },
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
  },
  { timestamps: true }
);

export type ISession = InferSchemaType<typeof sessionSchema>;

export const Session =
  (models.Session as mongoose.Model<ISession>) ||
  model<ISession>("Session", sessionSchema);
