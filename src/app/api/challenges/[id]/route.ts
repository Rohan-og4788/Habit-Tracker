export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { requireAuth, badRequest, notFound, serverError } from "@/lib/api";
import { updateChallenge, deleteChallenge } from "@/services/challenge.service";

function challengeError(err: unknown, fallback: string) {
  const message = err instanceof Error ? err.message : "";
  if (/not found/i.test(message)) return notFound(message);
  if (/must be|required|invalid/i.test(message)) return badRequest(message);
  return serverError(err, fallback);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const body = await req.json();
    const updates: any = { ...body };
    if (body.startDate) updates.startDate = new Date(body.startDate);
    if (body.endDate) updates.endDate = new Date(body.endDate);
    if (updates.startDate && Number.isNaN(updates.startDate.getTime())) {
      return badRequest("Invalid start date.");
    }
    if (updates.endDate && Number.isNaN(updates.endDate.getTime())) {
      return badRequest("Invalid end date.");
    }
    const challenge = await updateChallenge(params.id, auth.userId, updates);
    return NextResponse.json(challenge);
  } catch (err) {
    return challengeError(err, "Failed to update challenge.");
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    await deleteChallenge(params.id, auth.userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return challengeError(err, "Failed to delete challenge.");
  }
}
