import mongoose, { type InferSchemaType } from "mongoose";

const { Schema, model, models } = mongoose;

export type AuditAction =
  | "create"
  | "read"
  | "update"
  | "delete"
  | "login"
  | "logout"
  | "register"
  | "export"
  | "delete_account"
  | "password_change";

const auditLogSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    action: { type: String, required: true, index: true },
    entityType: { type: String, index: true },
    entityId: { type: Schema.Types.Mixed, index: true },
    details: { type: Schema.Types.Mixed },
    ipAddress: { type: String },
    userAgent: { type: String },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false }
);

auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });

export type IAuditLog = InferSchemaType<typeof auditLogSchema>;

export const AuditLog =
  (models.AuditLog as mongoose.Model<IAuditLog>) || model<IAuditLog>("AuditLog", auditLogSchema);
