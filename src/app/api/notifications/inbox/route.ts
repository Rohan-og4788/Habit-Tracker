export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { requireAuth, badRequest, serverError } from "@/lib/api";
import { listNotifications } from "@/services/notification.service";

/**
 * GET /api/notifications/inbox
 * Recent in-app notifications for the signed-in user plus an unread count.
 * Query: limit (1-100, default 20), unreadOnly=true to hide read items.
 */
export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(req.url);
    const rawLimit = searchParams.get("limit");
    const limit = rawLimit ? parseInt(rawLimit, 10) : 20;
    if (rawLimit && (!Number.isFinite(limit) || limit < 1)) {
      return badRequest("limit must be a positive integer.");
    }

    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const result = await listNotifications(auth.userId, { limit, unreadOnly });
    return NextResponse.json(result);
  } catch (err) {
    return serverError(err, "Failed to load notifications.");
  }
}
