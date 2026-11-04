export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { requireAuth, serverError } from "@/lib/api";
import { updateChallenge, deleteChallenge } from "@/services/challenge.service";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const body = await req.json();
    const updates: any = { ...body };
    if (body.startDate) updates.startDate = new Date(body.startDate);
    if (body.endDate) updates.endDate = new Date(body.endDate);
    const challenge = await updateChallenge(params.id, auth.userId, updates);
    return NextResponse.json(challenge);
  } catch (err) {
    return serverError(err, "Failed to update challenge.");
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    await deleteChallenge(params.id, auth.userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err, "Failed to delete challenge.");
  }
}
