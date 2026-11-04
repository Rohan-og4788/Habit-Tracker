export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { requireAuth, serverError } from "@/lib/api";
import { updateDailyTask, deleteDailyTask } from "@/services/daily-task.service";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const body = await req.json();
    const task = await updateDailyTask(params.id, auth.userId, body);
    return NextResponse.json(task);
  } catch (err) {
    return serverError(err, "Failed to update task.");
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    await deleteDailyTask(params.id, auth.userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err, "Failed to delete task.");
  }
}
