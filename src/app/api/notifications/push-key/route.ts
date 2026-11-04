export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { requireAuth, serverError } from "@/lib/api";
import { VAPID_PUBLIC_KEY, isPushConfigured } from "@/lib/push";

export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    return NextResponse.json({
      configured: isPushConfigured(),
      publicKey: isPushConfigured() ? VAPID_PUBLIC_KEY : "",
    });
  } catch (err) {
    return serverError(err, "Failed to load push configuration.");
  }
}
