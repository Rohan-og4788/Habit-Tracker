import mongoose, { type InferSchemaType } from "mongoose";

const { Schema, model, models } = mongoose;

export const MOODS = ["excellent", "good", "neutral", "low", "difficult"] as const;
export type Mood = typeof MOODS[number];

const journalEntrySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    date: { type: String, required: true, index: true }, // YYYY-MM-DD in user tz
    wentWell: { type: String, maxlength: 2000 },
    struggledWith: { type: String, maxlength: 2000 },
    learned: { type: String, maxlength: 2000 },
    improveTomorrow: { type: String, maxlength: 2000 },
    mood: { type: String, enum: MOODS, default: "neutral" },
    notes: { type: String, maxlength: 5000 },
  },
  { timestamps: true }
);

journalEntrySchema.index({ userId: 1, date: 1 }, { unique: true });

export type IJournalEntry = InferSchemaType<typeof journalEntrySchema>;

export const JournalEntry =
  (models.JournalEntry as mongoose.Model<IJournalEntry>) ||
  model<IJournalEntry>("JournalEntry", journalEntrySchema);
