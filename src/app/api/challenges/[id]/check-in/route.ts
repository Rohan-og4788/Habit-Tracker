export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { requireAuth, badRequest, serverError } from "@/lib/api";
import { checkInChallenge } from "@/services/challenge.service";
import { localDateString } from "@/services/streak.service";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const body = await req.json().catch(() => ({}));
    const localDate =
      body.localDate || localDateString(new Date(), auth.user.timezone || "UTC");
    if (typeof body.completed !== "boolean" && body.completed !== undefined) {
      return badRequest("completed must be a boolean.");
    }
    const progress = await checkInChallenge(
      params.id,
      auth.userId,
      localDate,
      body.completed ?? true,
      typeof body.value === "number" ? body.value : 0
    );
    return NextResponse.json(progress, { status: 201 });
  } catch (err) {
    return serverError(err, "Failed to check in.");
  }
}
