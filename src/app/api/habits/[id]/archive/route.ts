export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { requireAuth, notFound, serverError } from "@/lib/api";
import { archiveHabit } from "@/services/habit.service";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const result = await archiveHabit(params.id, auth.userId);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof Error && err.message === "Habit not found") return notFound();
    return serverError(err, "Failed to archive habit.");
  }
}
