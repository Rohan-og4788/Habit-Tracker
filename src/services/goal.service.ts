import { Goal } from "@/models/Goal";
import { Habit } from "@/models/Habit";
import { HabitLog } from "@/models/HabitLog";
import { UserAchievement } from "@/models/UserAchievement";
import { Achievement } from "@/models/Achievement";
import dbConnect from "@/lib/database";
import { localDateString } from "@/services/streak.service";

export interface CreateGoalInput {
  userId: string;
  title: string;
  description?: string;
  targetValue: number;
  unit?: string;
  deadline?: Date;
  priority?: "low" | "medium" | "high";
  linkedHabitIds?: string[];
  milestones?: Array<{ id: string; title: string; targetValue: number }>;
}

export async function createGoal(input: CreateGoalInput) {
  await dbConnect();
  const goal = await Goal.create({
    userId: input.userId,
    title: input.title,
    description: input.description,
    targetValue: input.targetValue,
    currentProgress: 0,
    unit: input.unit,
    deadline: input.deadline,
    status: "active",
    priority: input.priority || "medium",
    linkedHabitIds: input.linkedHabitIds || [],
    milestones: (input.milestones || []).map((m) => ({ ...m, achievedAt: undefined })),
  });
  return goal;
}

export async function listGoals(userId: string, status?: string) {
  await dbConnect();
  const query: any = { userId, deletedAt: null };
  if (status) query.status = status;
  return Goal.find(query).sort({ createdAt: -1 }).lean();
}

export async function getGoal(goalId: string, userId: string) {
  await dbConnect();
  return Goal.findOne({ _id: goalId, userId }).lean();
}

export async function updateGoalProgress(goalId: string, userId: string, increment = 1) {
  await dbConnect();
  const goal = await Goal.findOne({ _id: goalId, userId });
  if (!goal) throw new Error("Goal not found");
  goal.currentProgress += increment;
  if (goal.currentProgress >= goal.targetValue && goal.status !== "completed") {
    goal.status = "completed";
    goal.completedAt = new Date();
  }
  await goal.save();
  return goal;
}

export async function recalcGoalFromHabits(goalId: string, userId: string) {
  await dbConnect();
  const goal = await Goal.findOne({ _id: goalId, userId }).lean();
  if (!goal || !goal.linkedHabitIds?.length) return goal;

  const total = await HabitLog.countDocuments({
    userId,
    habitId: { $in: goal.linkedHabitIds },
    status: "completed",
  });

  const goalDoc = await Goal.findOne({ _id: goalId, userId });
  if (goalDoc) {
    goalDoc.currentProgress = total;
    if (goalDoc.currentProgress >= goalDoc.targetValue && goalDoc.status !== "completed") {
      goalDoc.status = "completed";
      goalDoc.completedAt = new Date();
    }
    await goalDoc.save();
  }
  return goalDoc;
}

export function goalProgressPercent(goal: any): number {
  if (goal.targetValue <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((goal.currentProgress / goal.targetValue) * 100)));
}

export function isGoalOverdue(goal: any): boolean {
  if (goal.status === "completed" || goal.status === "paused") return false;
  if (!goal.deadline) return false;
  return new Date(goal.deadline) < new Date();
}
