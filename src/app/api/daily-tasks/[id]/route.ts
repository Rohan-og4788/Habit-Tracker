export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { requireAuth, badRequest, notFound, serverError } from "@/lib/api";
import { updateDailyTask, deleteDailyTask } from "@/services/daily-task.service";

function taskError(err: unknown, fallback: string) {
  const message = err instanceof Error ? err.message : "";
  if (/not found/i.test(message)) return notFound(message);
  if (/invalid date|title is required/i.test(message)) return badRequest(message);
  return serverError(err, fallback);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const body = await req.json();
    const task = await updateDailyTask(params.id, auth.userId, body);
    return NextResponse.json(task);
  } catch (err) {
    return taskError(err, "Failed to update task.");
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    await deleteDailyTask(params.id, auth.userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return taskError(err, "Failed to delete task.");
  }
}
