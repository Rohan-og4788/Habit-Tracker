export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getAnalyticsOverview } from "@/services/analytics.service";
import { listHabits } from "@/services/habit.service";
import { getTodayLogs } from "@/services/tracking.service";
import { isScheduledDate, localDateString } from "@/services/streak.service";
import dbConnect from "@/lib/database";
import { validateSession } from "@/lib/session";
import { cookies } from "next/headers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, Flame, Target } from "lucide-react";
import Link from "next/link";
import { TodayHabitList } from "@/components/habits/today-list";

export default async function DashboardPage() {
  await dbConnect();
  const cookieStore = cookies();
  const token = cookieStore.get("hf_session")?.value;
  let userId = "";
  let timezone = "UTC";
  let userName = "there";
  if (token) {
    const session = await validateSession(token);
    if (session) {
      userId = String(session.user._id);
      timezone = session.user.timezone || "UTC";
      userName = session.user.name || "there";
    }
  }
  // Defense in depth: the layout and middleware already guard this route, but
  // querying with an empty userId would throw a cast error instead of redirecting.
  if (!userId) redirect("/auth/login");

  const today = localDateString(new Date(), timezone);
  const [overview, habitsResult, todayLogs] = await Promise.all([
    getAnalyticsOverview(userId, timezone),
    listHabits({ userId, status: "active", limit: 100 }),
    getTodayLogs(userId, timezone),
  ]);

  const scheduledHabits = habitsResult.items.filter((h) => isScheduledDate(h, today));
  const completedToday = todayLogs.filter(
    (l) => l.status === "completed" && scheduledHabits.some((h) => String(h._id) === String(l.habitId))
  ).length;
  const completionRate =
    scheduledHabits.length > 0 ? Math.round((completedToday / scheduledHabits.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Welcome back, {userName.split(" ")[0]}</h1>
          <p className="text-muted-foreground">
            {scheduledHabits.length > 0
              ? `You have ${scheduledHabits.length} habit${scheduledHabits.length === 1 ? "" : "s"} scheduled today.`
              : "No habits scheduled today — enjoy the rest day."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/habits/add">Add habit</Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/habits">View all habits</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Scheduled today" value={scheduledHabits.length} icon={CheckCircle} desc="Habits due today" />
        <StatCard title="Done today" value={completedToday} icon={Clock} desc={`of ${scheduledHabits.length} scheduled`} />
        <StatCard title="Completion rate" value={`${completionRate}%`} icon={Target} desc="Today's progress" />
        <StatCard title="Longest streak" value={overview.longestStreak} icon={Flame} desc="Your best run" />
      </div>

      <div className="grid gap-6 md:grid-cols-12">
        <div className="md:col-span-7">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Today&apos;s habits</CardTitle>
              <CardDescription>
                {scheduledHabits.length > 0
                  ? `${completedToday} of ${scheduledHabits.length} completed`
                  : "No habits scheduled for today"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TodayHabitList
                habits={scheduledHabits as any}
                logs={todayLogs as any}
                timezone={timezone}
                date={today}
              />
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-5 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Today&apos;s progress</CardTitle>
              <CardDescription>Keep the streak going.</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-col items-center gap-4">
                <div className="relative w-32 h-32">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 128 128">
                    <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="8" fill="none" className="text-secondary" />
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray="352"
                      strokeDashoffset={352 - (completionRate / 100) * 352}
                      className="text-primary transition-all duration-700"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold">{completionRate}%</span>
                    <span className="text-xs text-muted-foreground">of today</span>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  {completedToday} completed · {Math.max(0, scheduledHabits.length - completedToday)} remaining
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Weekly consistency</CardTitle>
              <CardDescription>Last 7 days</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-3xl font-bold">{overview.weeklyConsistency}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                {overview.totalTrackingDays} total tracking days all-time
              </p>
              <Button asChild variant="outline" size="sm" className="mt-3">
                <Link href="/dashboard/analytics">View analytics</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  desc,
}: {
  title: string;
  value: React.ReactNode;
  icon: any;
  desc: string;
}) {
  return (
    <Card className="p-4">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <CardDescription className="text-xs">{desc}</CardDescription>
        </div>
        <Icon className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
