export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { requireAuth, notFound, serverError } from "@/lib/api";
import { duplicateHabit } from "@/services/habit.service";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const result = await duplicateHabit(params.id, auth.userId);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "Habit not found") return notFound();
    return serverError(err, "Failed to duplicate habit.");
  }
}
