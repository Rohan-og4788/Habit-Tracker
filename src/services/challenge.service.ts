import { Challenge } from "@/models/Challenge";
import { ChallengeProgress } from "@/models/ChallengeProgress";
import dbConnect from "@/lib/database";
import { isValidLocalDate, localDateString } from "@/services/streak.service";

export interface CreateChallengeInput {
  userId: string;
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  linkedHabitIds?: string[];
  targetValue?: number;
  isPublic?: boolean;
}

function daysBetween(start: Date, end: Date): number {
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
}

export async function listChallenges(userId: string) {
  await dbConnect();
  const challenges = await Challenge.find({ userId }).sort({ createdAt: -1 }).lean();
  return Promise.all(
    challenges.map(async (c) => {
      const [completedDays, progress] = await Promise.all([
        ChallengeProgress.countDocuments({ userId, challengeId: c._id, completed: true }),
        ChallengeProgress.find({ userId, challengeId: c._id }).lean(),
      ]);
      const totalDays = daysBetween(new Date(c.startDate), new Date(c.endDate));
      return {
        ...c,
        completedDays,
        totalDays,
        progressPercent: Math.min(100, Math.round((completedDays / totalDays) * 100)),
        checkIns: progress,
      };
    })
  );
}

export async function createChallenge(input: CreateChallengeInput) {
  await dbConnect();
  if (!input.title?.trim()) throw new Error("Title is required");
  if (input.endDate < input.startDate) throw new Error("End date must be after start date");
  return Challenge.create({ ...input, title: input.title.trim(), status: "active" });
}

export async function updateChallenge(
  challengeId: string,
  userId: string,
  updates: Partial<CreateChallengeInput> & { status?: "active" | "completed" | "failed" | "paused" }
) {
  await dbConnect();
  const challenge = await Challenge.findOne({ _id: challengeId, userId });
  if (!challenge) throw new Error("Challenge not found");
  const allowed = ["title", "description", "startDate", "endDate", "linkedHabitIds", "targetValue", "isPublic", "status"] as const;
  for (const key of allowed) {
    if (updates[key] !== undefined) (challenge as any)[key] = updates[key];
  }
  await challenge.save();
  return challenge;
}

export async function deleteChallenge(challengeId: string, userId: string) {
  await dbConnect();
  const challenge = await Challenge.findOneAndDelete({ _id: challengeId, userId });
  if (!challenge) throw new Error("Challenge not found");
  await ChallengeProgress.deleteMany({ challengeId, userId });
  return challenge;
}

export async function checkInChallenge(
  challengeId: string,
  userId: string,
  localDate: string,
  completed = true,
  value = 0
) {
  await dbConnect();
  if (!isValidLocalDate(localDate)) throw new Error("Invalid date");
  const challenge = await Challenge.findOne({ _id: challengeId, userId }).lean();
  if (!challenge) throw new Error("Challenge not found");

  const start = localDateString(new Date(challenge.startDate), "UTC");
  const end = localDateString(new Date(challenge.endDate), "UTC");
  if (localDate < start || localDate > end) {
    throw new Error("Check-in date is outside the challenge window");
  }

  return ChallengeProgress.findOneAndUpdate(
    { userId, challengeId, localDate },
    { $set: { completed, value } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}
