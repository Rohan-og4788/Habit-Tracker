"use client";
export const dynamic = "force-dynamic";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Archive,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Edit2,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  Trash2,
  Undo2,
} from "lucide-react";
import { useToast } from "@/lib/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function todayInTimezone(timezone: string) {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

export default function HabitDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const habitId = params.id as string;
  const [habit, setHabit] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [timezone, setTimezone] = useState("UTC");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [hRes, lRes, aRes] = await Promise.all([
        fetch(`/api/habits/${habitId}`),
        fetch(`/api/habit-logs?habitId=${habitId}`),
        fetch("/api/account"),
      ]);
      const habitData = await hRes.json().catch(() => ({}));
      if (!hRes.ok) throw new Error(habitData.error || "Habit not found.");
      const logsData = await lRes.json().catch(() => ({}));
      const account = aRes.ok ? await aRes.json() : null;
      setHabit(habitData);
      setLogs(logsData.logs || []);
      setTimezone(account?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
    } catch (err: any) {
      toast({ variant: "destructive", message: err.message || "Failed to load habit." });
      setHabit(null);
    } finally {
      setLoading(false);
    }
  }, [habitId, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const today = todayInTimezone(timezone);
  const todayLog = logs.find((l) => l.localDate === today);
  const doneToday = todayLog?.status === "completed";
  const completedLogs = logs.filter((l) => l.status === "completed");

  async function markToday() {
    if (!habit) return;
    setBusy("today");
    try {
      if (doneToday) {
        const res = await fetch(
          `/api/habit-logs?habitId=${encodeURIComponent(habitId)}&localDate=${today}`,
          { method: "DELETE" }
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast({ variant: "destructive", message: data.error || "Could not undo." });
          return;
        }
        toast({ message: "Today's progress undone." });
      } else {
        const payload: any = {
          habitId,
          localDate: today,
          timezone,
          status: "completed",
          trackingType: habit.trackingType,
        };
        if (["numeric", "count"].includes(habit.trackingType)) {
          payload.numericProgress = {
            value: habit.targetValue ?? 1,
            target: habit.targetValue ?? 1,
            unit: habit.unit || "",
          };
        } else if (habit.trackingType === "duration") {
          payload.durationProgress = {
            minutes: habit.targetValue ?? 1,
            targetMinutes: habit.targetValue ?? 1,
          };
        } else if (habit.trackingType === "negative") {
          payload.negativeHabitLog = { incidents: 0, avoided: true };
        }
        const res = await fetch("/api/habit-logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast({ variant: "destructive", message: data.error || "Could not log progress." });
          return;
        }
        toast({ variant: "success", message: "Marked complete for today." });
      }
      await load();
      router.refresh();
    } catch {
      toast({ variant: "destructive", message: "Network error. Please try again." });
    } finally {
      setBusy(null);
    }
  }

  async function removeLog(log: any) {
    setBusy(log.localDate);
    try {
      const res = await fetch(
        `/api/habit-logs?habitId=${encodeURIComponent(habitId)}&localDate=${log.localDate}`,
        { method: "DELETE" }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ variant: "destructive", message: data.error || "Could not delete log." });
        return;
      }
      setLogs((prev) => prev.filter((l) => l.localDate !== log.localDate));
      toast({ message: "Log deleted." });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function habitAction(action: "archive" | "restore" | "pause" | "resume") {
    setBusy(action);
    try {
      const res = await fetch(`/api/habits/${habitId}/${action}`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ variant: "destructive", message: data.error || "Action failed." });
        return;
      }
      toast({
        variant: "success",
        message:
          action === "archive"
            ? "Habit archived."
            : action === "restore"
            ? "Habit restored."
            : action === "pause"
            ? "Habit paused."
            : "Habit resumed.",
      });
      await load();
      router.refresh();
    } catch {
      toast({ variant: "destructive", message: "Network error. Please try again." });
    } finally {
      setBusy(null);
    }
  }

  async function removeHabit() {
    if (!confirm(`Delete "${habit?.name}" and all of its logs? This cannot be undone.`)) return;
    setBusy("delete");
    try {
      const res = await fetch(`/api/habits/${habitId}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ variant: "destructive", message: data.error || "Delete failed." });
        return;
      }
      toast({ variant: "success", message: "Habit deleted." });
      router.push("/dashboard/habits");
      router.refresh();
    } catch {
      toast({ variant: "destructive", message: "Network error. Please try again." });
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  if (!habit) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-muted-foreground">
        <p>Habit not found.</p>
        <Button asChild variant="outline">
          <Link href="/dashboard/habits">Back to habits</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl py-8 space-y-6">
      <Link
        href="/dashboard/habits"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> All habits
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-2xl text-xl font-bold text-white"
              style={{ backgroundColor: habit.color || "#6366F1" }}
            >
              {habit.name[0]?.toUpperCase()}
            </div>
            <Badge className="capitalize">{habit.category}</Badge>
            <Badge variant="secondary" className="capitalize">
              {habit.trackingType}
            </Badge>
            <Badge variant={habit.status === "active" ? "success" : "outline"} className="capitalize">
              {habit.status}
            </Badge>
          </div>
          <h1 className="text-3xl font-bold">{habit.name}</h1>
          <p className="mt-1 text-muted-foreground">{habit.description || "No description yet."}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/habits/${habitId}/edit`)}>
            <Edit2 className="mr-2 h-4 w-4" /> Edit
          </Button>
          {habit.status === "active" ? (
            <Button variant="outline" size="sm" onClick={() => habitAction("pause")} disabled={!!busy}>
              {busy === "pause" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Pause className="mr-2 h-4 w-4" />}
              Pause
            </Button>
          ) : habit.status === "paused" ? (
            <Button variant="outline" size="sm" onClick={() => habitAction("resume")} disabled={!!busy}>
              {busy === "resume" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
              Resume
            </Button>
          ) : null}
          {habit.status === "archived" ? (
            <Button variant="outline" size="sm" onClick={() => habitAction("restore")} disabled={!!busy}>
              {busy === "restore" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
              Restore
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => habitAction("archive")} disabled={!!busy}>
              {busy === "archive" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Archive className="mr-2 h-4 w-4" />}
              Archive
            </Button>
          )}
          <Button variant="destructive" size="sm" onClick={removeHabit} disabled={!!busy}>
            {busy === "delete" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
            Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Current streak" value={habit.currentStreak || 0} />
        <StatCard title="Longest streak" value={habit.longestStreak || 0} />
        <StatCard title="Completions" value={habit.totalCompletions || 0} />
        <StatCard title="Today" value={doneToday ? "Done" : "Pending"} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Today ({today})</CardTitle>
            <CardDescription>
              {doneToday ? "You already completed this habit today." : "Log your progress for today."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              variant={doneToday ? "outline" : "default"}
              onClick={markToday}
              disabled={busy === "today" || habit.status === "archived"}
            >
              {busy === "today" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : doneToday ? (
                <Undo2 className="mr-2 h-4 w-4" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              {doneToday ? "Undo today" : "Mark complete"}
            </Button>
            {habit.status === "archived" ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Restore this habit before logging new progress.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Schedule</CardTitle>
            <CardDescription className="capitalize">{habit.frequency}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <p>Started {habit.startDate ? new Date(habit.startDate).toLocaleDateString() : "—"}</p>
            {habit.endDate ? <p>Ends {new Date(habit.endDate).toLocaleDateString()}</p> : null}
            {habit.frequency === "weekly" && habit.weekdays?.length ? (
              <p>
                Days:{" "}
                {habit.weekdays
                  .map((d: number) => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d])
                  .join(", ")}
              </p>
            ) : null}
            {habit.targetValue ? (
              <p>
                Target: {habit.targetValue} {habit.unit || ""}
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">History</CardTitle>
          <CardDescription>
            {completedLogs.length} completions out of {logs.length} logged days
          </CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No tracking history yet.
            </p>
          ) : (
            <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
              {[...logs]
                .sort((a, b) => (a.localDate < b.localDate ? 1 : -1))
                .map((log) => (
                  <div
                    key={log.localDate}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border p-2.5"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{log.localDate}</span>
                      <Badge
                        variant={log.status === "completed" ? "success" : "secondary"}
                        className="capitalize"
                      >
                        {log.status}
                      </Badge>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground"
                      disabled={busy === log.localDate}
                      onClick={() => removeLog(log)}
                      aria-label={`Delete log for ${log.localDate}`}
                    >
                      {busy === log.localDate ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: React.ReactNode }) {
  return (
    <Card className="p-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
