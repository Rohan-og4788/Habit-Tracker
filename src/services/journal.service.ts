import { JournalEntry } from "@/models/JournalEntry";
import dbConnect from "@/lib/database";

export type Mood = "excellent" | "good" | "neutral" | "low" | "difficult";

export interface CreateJournalInput {
  userId: string;
  date: string; // YYYY-MM-DD
  wentWell?: string;
  struggledWith?: string;
  learned?: string;
  improveTomorrow?: string;
  mood?: Mood;
  notes?: string;
}

export async function upsertJournalEntry(input: CreateJournalInput) {
  await dbConnect();
  const entry = await JournalEntry.findOneAndUpdate(
    { userId: input.userId, date: input.date },
    {
      $set: {
        wentWell: input.wentWell,
        struggledWith: input.struggledWith,
        learned: input.learned,
        improveTomorrow: input.improveTomorrow,
        mood: input.mood || "neutral",
        notes: input.notes,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return entry;
}

export async function listJournalEntries(userId: string, from?: string, to?: string) {
  await dbConnect();
  const query: any = { userId };
  if (from || to) {
    query.date = {};
    if (from) query.date.$gte = from;
    if (to) query.date.$lte = to;
  }
  return JournalEntry.find(query).sort({ date: -1 }).lean();
}

export async function getJournalEntry(userId: string, date: string) {
  await dbConnect();
  return JournalEntry.findOne({ userId, date }).lean();
}

export async function deleteJournalEntry(userId: string, date: string) {
  await dbConnect();
  return JournalEntry.findOneAndDelete({ userId, date });
}
