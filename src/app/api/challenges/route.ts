export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { requireAuth, badRequest, serverError } from "@/lib/api";
import { listChallenges, createChallenge } from "@/services/challenge.service";

export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const challenges = await listChallenges(auth.userId);
    return NextResponse.json({ challenges });
  } catch (err) {
    return serverError(err, "Failed to load challenges.");
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const body = await req.json();
    if (!body.title?.trim()) return badRequest("Title is required.");
    if (!body.startDate || !body.endDate) return badRequest("Start and end dates are required.");

    const start = new Date(body.startDate);
    const end = new Date(body.endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return badRequest("Invalid dates.");
    }
    if (end < start) return badRequest("End date must be after start date.");

    const challenge = await createChallenge({
      userId: auth.userId,
      title: body.title,
      description: body.description,
      startDate: start,
      endDate: end,
      linkedHabitIds: Array.isArray(body.linkedHabitIds) ? body.linkedHabitIds : [],
      targetValue: typeof body.targetValue === "number" ? body.targetValue : undefined,
      isPublic: Boolean(body.isPublic),
    });
    return NextResponse.json(challenge, { status: 201 });
  } catch (err) {
    return serverError(err, "Failed to create challenge.");
  }
}
