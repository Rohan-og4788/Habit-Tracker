export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { requireAuth, badRequest, notFound, serverError } from "@/lib/api";
import { updateFocusSession } from "@/services/focus.service";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();
    const updates: any = {};
    if (typeof body.actualMinutes === "number" && body.actualMinutes >= 0) {
      updates.actualMinutes = Math.round(body.actualMinutes);
    }
    if (typeof body.completed === "boolean") updates.completed = body.completed;
    if (typeof body.interrupted === "boolean") updates.interrupted = body.interrupted;
    updates.endedAt = body.endedAt ? new Date(body.endedAt) : new Date();

    if (Object.keys(updates).length === 0) return badRequest("No valid updates supplied.");

    const session = await updateFocusSession(params.id, auth.userId, updates);
    if (!session) return notFound("Focus session not found.");
    return NextResponse.json(session);
  } catch (err) {
    return serverError(err, "Failed to update focus session.");
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const { FocusSession } = await import("@/models/FocusSession");
    const deleted = await FocusSession.findOneAndDelete({ _id: params.id, userId: auth.userId });
    if (!deleted) return notFound("Focus session not found.");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err, "Failed to delete focus session.");
  }
}
