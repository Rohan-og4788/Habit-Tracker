export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { listHabits } from "@/services/habit.service";
import dbConnect from "@/lib/database";
import { validateSession } from "@/lib/session";
import { cookies } from "next/headers";
import { HabitsGrid } from "@/components/habits/habits-grid";

export default async function MyHabitsPage() {
  await dbConnect();
  const cookieStore = cookies();
  const token = cookieStore.get("hf_session")?.value;
  let userId = "";
  if (token) {
    const session = await validateSession(token);
    if (session) userId = String(session.user._id);
  }
  // Defense in depth: never query with an empty userId (would throw a cast
  // error); redirect to login instead.
  if (!userId) redirect("/auth/login");

  const { items, total } = await listHabits({ userId, limit: 200 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Habits</h1>
        <p className="text-muted-foreground">
          {total} habit{total !== 1 ? "s" : ""} tracked.
        </p>
      </div>
      <HabitsGrid initialHabits={items as any} />
    </div>
  );
}
