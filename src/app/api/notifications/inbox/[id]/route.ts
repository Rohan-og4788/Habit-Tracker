export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAuth, badRequest, notFound, serverError } from "@/lib/api";
import { markNotificationRead } from "@/services/notification.service";

/**
 * PATCH /api/notifications/inbox/[id]
 * Body: { read?: boolean } (defaults to true). Scoped to the caller: a
 * notification belonging to another user returns 404, never a mutation.
 */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    if (!mongoose.isValidObjectId(params.id)) {
      return badRequest("Invalid notification id.");
    }

    const body = await req.json().catch(() => ({}));
    const read = typeof body.read === "boolean" ? body.read : true;

    const notification = await markNotificationRead(params.id, auth.userId, read);
    return NextResponse.json({ notification });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (/not found/i.test(message)) return notFound(message);
    return serverError(err, "Failed to update notification.");
  }
}
