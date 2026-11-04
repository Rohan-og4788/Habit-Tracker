export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { requireAuth, badRequest, notFound, serverError } from "@/lib/api";
import { Goal } from "@/models/Goal";
import { getGoal, updateGoalProgress, recalcGoalFromHabits } from "@/services/goal.service";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const goal = await getGoal(params.id, auth.userId);
    if (!goal) return notFound("Goal not found.");
    return NextResponse.json(goal);
  } catch (err) {
    return serverError(err, "Failed to load goal.");
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();

    if (body.action === "recalc") {
      const goal = await recalcGoalFromHabits(params.id, auth.userId);
      if (!goal) return notFound("Goal not found.");
      return NextResponse.json(goal);
    }

    if (typeof body.increment === "number") {
      if (body.increment === 0) return badRequest("Increment cannot be zero.");
      const goal = await updateGoalProgress(params.id, auth.userId, body.increment);
      return NextResponse.json(goal);
    }

    const goal = await Goal.findOne({ _id: params.id, userId: auth.userId });
    if (!goal) return notFound("Goal not found.");

    const allowed = [
      "title",
      "description",
      "targetValue",
      "currentProgress",
      "unit",
      "deadline",
      "status",
      "priority",
      "linkedHabitIds",
      "milestones",
    ] as const;
    for (const key of allowed) {
      if (body[key] !== undefined) (goal as any)[key] = body[key];
    }
    if (body.deadline) goal.deadline = new Date(body.deadline);
    if (goal.currentProgress >= goal.targetValue && goal.status !== "completed") {
      goal.status = "completed";
      goal.completedAt = new Date();
    }
    await goal.save();

    if (goal.status === "completed") {
      const { evaluateAchievements } = await import("@/services/achievement.service");
      await evaluateAchievements(auth.userId, auth.user.timezone || "UTC").catch(() => undefined);
    }
    return NextResponse.json(goal);
  } catch (err) {
    return serverError(err, "Failed to update goal.");
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const goal = await Goal.findOneAndDelete({ _id: params.id, userId: auth.userId });
    if (!goal) return notFound("Goal not found.");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err, "Failed to delete goal.");
  }
}
