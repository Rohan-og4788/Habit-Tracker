export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { requireAuth, serverError } from "@/lib/api";
import { getCoachAdvice } from "@/services/ai.service";

export async function POST(req: Request) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const body = await req.json().catch(() => ({}));
    const days = typeof body.days === "number" ? body.days : 30;
    const advice = await getCoachAdvice(
      auth.userId,
      auth.user.timezone || "UTC",
      Boolean(auth.user.aiConsent),
      days
    );
    return NextResponse.json(advice);
  } catch (err) {
    return serverError(err, "Failed to generate coaching advice.");
  }
}
