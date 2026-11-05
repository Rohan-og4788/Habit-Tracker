import { DailyTask } from "@/models/DailyTask";
import dbConnect from "@/lib/database";
import { isValidLocalDate } from "@/services/streak.service";

export interface CreateDailyTaskInput {
  userId: string;
  title: string;
  description?: string;
  date: string;
  dueTime?: string;
  priority?: "low" | "medium" | "high";
  habitId?: string;
  timeBlockStart?: string;
  timeBlockEnd?: string;
}

export async function listDailyTasks(userId: string, date: string) {
  await dbConnect();
  if (!isValidLocalDate(date)) throw new Error("Invalid date");
  return DailyTask.find({ userId, date }).sort({ order: 1, createdAt: 1 }).lean();
}

export async function createDailyTask(input: CreateDailyTaskInput) {
  await dbConnect();
  if (!isValidLocalDate(input.date)) throw new Error("Invalid date");
  if (!input.title?.trim()) throw new Error("Title is required");
  const last = await DailyTask.findOne({ userId: input.userId, date: input.date })
    .sort({ order: -1 })
    .lean();
  return DailyTask.create({
    ...input,
    title: input.title.trim(),
    order: (last?.order ?? 0) + 1,
  });
}

export async function updateDailyTask(
  taskId: string,
  userId: string,
  updates: Partial<CreateDailyTaskInput> & { status?: "pending" | "completed" | "overdue" | "cancelled" }
) {
  await dbConnect();
  const task = await DailyTask.findOne({ _id: taskId, userId });
  if (!task) throw new Error("Task not found");
  if (updates.date !== undefined && !isValidLocalDate(updates.date)) {
    throw new Error("Invalid date");
  }

  const allowed = [
    "title",
    "description",
    "date",
    "dueTime",
    "priority",
    "habitId",
    "timeBlockStart",
    "timeBlockEnd",
    "status",
  ] as const;
  for (const key of allowed) {
    if (updates[key] !== undefined) (task as any)[key] = updates[key];
  }
  task.completedAt = task.status === "completed" ? new Date() : undefined;
  await task.save();
  return task;
}

export async function deleteDailyTask(taskId: string, userId: string) {
  await dbConnect();
  const task = await DailyTask.findOneAndDelete({ _id: taskId, userId });
  if (!task) throw new Error("Task not found");
  return task;
}

export async function reorderDailyTasks(userId: string, date: string, orderedIds: string[]) {
  await dbConnect();
  if (!Array.isArray(orderedIds)) throw new Error("orderedIds must be an array");
  await Promise.all(
    orderedIds.map((id, index) =>
      DailyTask.updateOne({ _id: id, userId, date }, { $set: { order: index } })
    )
  );
  return listDailyTasks(userId, date);
}
