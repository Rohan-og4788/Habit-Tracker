export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { requireAuth, badRequest, serverError } from "@/lib/api";
import { listDailyTasks, createDailyTask, reorderDailyTasks } from "@/services/daily-task.service";
import { isValidLocalDate, localDateString } from "@/services/streak.service";

export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date") || localDateString(new Date(), auth.user.timezone || "UTC");
    if (!isValidLocalDate(date)) return badRequest("Invalid date.");
    const tasks = await listDailyTasks(auth.userId, date);
    return NextResponse.json({ tasks, date });
  } catch (err) {
    return serverError(err, "Failed to load daily tasks.");
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const body = await req.json();
    if (!body.title?.trim()) return badRequest("Title is required.");
    const date = body.date || localDateString(new Date(), auth.user.timezone || "UTC");
    if (!isValidLocalDate(date)) return badRequest("Invalid date.");
    const task = await createDailyTask({
      userId: auth.userId,
      title: body.title,
      description: body.description,
      date,
      dueTime: body.dueTime,
      priority: body.priority,
      habitId: body.habitId || undefined,
      timeBlockStart: body.timeBlockStart,
      timeBlockEnd: body.timeBlockEnd,
    });
    return NextResponse.json(task, { status: 201 });
  } catch (err) {
    return serverError(err, "Failed to create task.");
  }
}

export async function PATCH(req: Request) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const body = await req.json();
    if (!body.date || !Array.isArray(body.orderedIds)) {
      return badRequest("date and orderedIds are required.");
    }
    if (!isValidLocalDate(body.date)) return badRequest("Invalid date.");
    const tasks = await reorderDailyTasks(auth.userId, body.date, body.orderedIds);
    return NextResponse.json({ tasks });
  } catch (err) {
    return serverError(err, "Failed to reorder tasks.");
  }
}
