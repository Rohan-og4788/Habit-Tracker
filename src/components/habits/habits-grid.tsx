"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Archive,
  CheckCircle,
  Loader2,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/lib/use-toast";

type Habit = {
  _id: string;
  name: string;
  description?: string;
  status: string;
  category: string;
  trackingType: string;
  frequency: string;
  currentStreak: number;
  totalCompletions: number;
  color?: string;
};

const FILTERS = ["all", "active", "paused", "archived"] as const;

export function HabitsGrid({ initialHabits }: { initialHabits: Habit[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [habits, setHabits] = useState(initialHabits);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [pending, setPending] = useState<string | null>(null);

  const visible = useMemo(
    () => (filter === "all" ? habits : habits.filter((h) => h.status === filter)),
    [habits, filter]
  );

  async function action(habit: Habit, actionName: "pause" | "resume" | "archive" | "restore" | "delete") {
    setPending(`${habit._id}:${actionName}`);
    try {
      const res =
        actionName === "delete"
          ? await fetch(`/api/habits/${habit._id}`, { method: "DELETE" })
          : await fetch(`/api/habits/${habit._id}/${actionName}`, { method: "POST" });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ variant: "destructive", message: data.error || "Action failed." });
        return;
      }

      if (actionName === "delete") {
        setHabits((prev) => prev.filter((h) => h._id !== habit._id));
        toast({ variant: "success", message: "Habit deleted." });
      } else {
        const nextStatus =
          actionName === "pause"
            ? "paused"
            : actionName === "archive"
            ? "archived"
            : "active";
        setHabits((prev) =>
          prev.map((h) => (h._id === habit._id ? { ...h, status: nextStatus } : h))
        );
        toast({
          variant: "success",
          message:
            actionName === "pause"
              ? "Habit paused."
              : actionName === "archive"
              ? "Habit archived."
              : actionName === "restore"
              ? "Habit restored."
              : "Habit resumed.",
        });
      }
      router.refresh();
    } catch {
      toast({ variant: "destructive", message: "Network error. Please try again." });
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? "default" : "outline"}
              className="px-3 capitalize"
              onClick={() => setFilter(f)}
            >
              {f} ({f === "all" ? habits.length : habits.filter((h) => h.status === f).length})
            </Button>
          ))}
        </div>
        <Button asChild>
          <Link href="/dashboard/habits/add">
            <Plus className="h-4 w-4 mr-2" /> Add habit
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {visible.length === 0 ? (
          <div className="col-span-full p-12 text-center text-muted-foreground">
            {habits.length === 0 ? (
              <>
                No habits yet.{" "}
                <Link href="/dashboard/habits/add" className="text-primary font-medium">
                  Create your first habit
                </Link>
                .
              </>
            ) : (
              <>No habits in this view.</>
            )}
          </div>
        ) : (
          visible.map((habit) => {
            const statusColor =
              habit.status === "active"
                ? "bg-emerald-500 text-white"
                : habit.status === "paused"
                ? "bg-amber-500 text-white"
                : "bg-muted text-muted-foreground";
            const busy = pending?.startsWith(habit._id);
            return (
              <Card key={habit._id} className="p-4 flex flex-col">
                <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="h-8 w-8 shrink-0 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: habit.color || "#6366F1" }}
                    >
                      {habit.name[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate">{habit.name}</CardTitle>
                      <CardDescription className="text-xs line-clamp-2">
                        {habit.description || "No description"}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge className={statusColor}>{habit.status}</Badge>
                </CardHeader>
                <CardContent className="pt-2 flex-1">
                  <div className="text-sm text-muted-foreground mb-3">
                    {habit.category} · {habit.trackingType} · {habit.frequency}
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>🔥 {habit.currentStreak || 0} day streak</span>
                    <span>{habit.totalCompletions || 0} completions</span>
                  </div>
                </CardContent>
                <CardFooter className="pt-3 flex flex-wrap items-center gap-2">
                  <Link
                    href={`/dashboard/habits/${habit._id}`}
                    className="flex items-center gap-1 text-sm text-primary hover:underline mr-auto"
                  >
                    <ArrowRight className="h-3 w-3" /> View
                  </Link>

                  {habit.status === "active" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="px-2"
                      disabled={busy}
                      onClick={() => action(habit, "pause")}
                    >
                      {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Pause className="h-3 w-3" />}
                    </Button>
                  ) : habit.status === "paused" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="px-2"
                      disabled={busy}
                      onClick={() => action(habit, "resume")}
                    >
                      {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="px-2"
                      disabled={busy}
                      onClick={() => action(habit, "restore")}
                    >
                      {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                    </Button>
                  )}

                  {habit.status !== "archived" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="px-2"
                      disabled={busy}
                      onClick={() => action(habit, "archive")}
                      aria-label="Archive habit"
                    >
                      <Archive className="h-3 w-3" />
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="px-2 text-destructive"
                      disabled={busy}
                      onClick={() => {
                        if (confirm(`Delete "${habit.name}"? This cannot be undone.`)) {
                          action(habit, "delete");
                        }
                      }}
                      aria-label="Delete habit"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
