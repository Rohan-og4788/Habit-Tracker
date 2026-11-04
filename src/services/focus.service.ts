import { FocusSession } from "@/models/FocusSession";
import dbConnect from "@/lib/database";

export interface CreateFocusSessionInput {
  userId: string;
  habitId?: string;
  plannedMinutes: number;
  startedAt: Date;
}

export async function createFocusSession(input: CreateFocusSessionInput) {
  await dbConnect();
  const sessionDoc = await FocusSession.create({
    userId: input.userId,
    habitId: input.habitId,
    plannedMinutes: input.plannedMinutes,
    actualMinutes: 0,
    startedAt: input.startedAt,
    completed: false,
    interrupted: false,
  });
  return sessionDoc;
}

export async function updateFocusSession(
  sessionId: string,
  userId: string,
  updates: { actualMinutes?: number; completed?: boolean; interrupted?: boolean; endedAt?: Date }
) {
  await dbConnect();
  return FocusSession.findOneAndUpdate(
    { _id: sessionId, userId },
    { $set: updates },
    { new: true }
  );
}

export async function listFocusSessions(userId: string, from?: string, to?: string) {
  await dbConnect();
  const query: any = { userId };
  if (from || to) {
    query.startedAt = {};
    if (from) query.startedAt.$gte = new Date(from);
    if (to) query.startedAt.$lte = new Date(to);
  }
  return FocusSession.find(query).sort({ startedAt: -1 }).lean();
}

export async function getDailyFocusStats(userId: string, date: string) {
  await dbConnect();
  const start = new Date(`${date}T00:00:00Z`);
  const end = new Date(`${date}T23:59:59Z`);
  const sessions = await FocusSession.find({
    userId,
    startedAt: { $gte: start, $lte: end },
  }).lean();
  const totalMinutes = sessions.reduce((sum, s) => sum + (s.actualMinutes || 0), 0);
  return { sessions, totalMinutes, sessionCount: sessions.length };
}
