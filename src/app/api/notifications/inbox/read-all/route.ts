export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { requireAuth, serverError } from "@/lib/api";
import { markAllNotificationsRead } from "@/services/notification.service";

/** POST /api/notifications/inbox/read-all — mark every unread notification as read. */
export async function POST(req: Request) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const result = await markAllNotificationsRead(auth.userId);
    return NextResponse.json(result);
  } catch (err) {
    return serverError(err, "Failed to update notifications.");
  }
}
