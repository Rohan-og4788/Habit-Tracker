"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle, Circle, Loader2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/lib/use-toast";
import { cn } from "@/lib/utils";

interface TodayHabit {
  _id: string;
  name: string;
  category: string;
  trackingType: string;
  targetValue?: number;
  unit?: string;
}

interface TodayLog {
  habitId: string;
  status: string;
  localDate: string;
}

export function TodayHabitList({
  habits,
  logs,
  timezone,
  date,
}: {
  habits: TodayHabit[];
  logs: TodayLog[];
  timezone: string;
  date: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [logState, setLogState] = useState<Record<string, string>>(() =>
    Object.fromEntries(logs.map((l) => [String(l.habitId), l.status]))
  );
  const [pending, setPending] = useState<string | null>(null);
  const [dialogHabit, setDialogHabit] = useState<TodayHabit | null>(null);
  const [value, setValue] = useState("");

  const completed = useMemo(
    () => habits.filter((h) => logState[String(h._id)] === "completed").length,
    [habits, logState]
  );

  async function submit(habit: TodayHabit, numericValue?: number) {
    setPending(String(habit._id));
    try {
      const payload: any = {
        habitId: habit._id,
        localDate: date,
        timezone,
        status: "completed",
        trackingType: habit.trackingType,
      };
      if (habit.trackingType === "numeric" || habit.trackingType === "count") {
        payload.numericProgress = {
          value: numericValue ?? habit.targetValue ?? 1,
          target: habit.targetValue ?? 1,
          unit: habit.unit || "",
        };
      } else if (habit.trackingType === "duration") {
        payload.durationProgress = {
          minutes: numericValue ?? habit.targetValue ?? 1,
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
      const data = await res.json();
      if (!res.ok) {
        toast({ variant: "destructive", message: data.error || "Could not save progress." });
        return;
      }
      setLogState((prev) => ({ ...prev, [String(habit._id)]: "completed" }));
      toast({ variant: "success", message: `${habit.name} completed!` });
      router.refresh();
    } catch {
      toast({ variant: "destructive", message: "Network error. Please try again." });
    } finally {
      setPending(null);
    }
  }

  async function undo(habit: TodayHabit) {
    setPending(String(habit._id));
    try {
      const res = await fetch(
        `/api/habit-logs?habitId=${encodeURIComponent(habit._id)}&localDate=${date}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok) {
        toast({ variant: "destructive", message: data.error || "Could not undo." });
        return;
      }
      setLogState((prev) => {
        const next = { ...prev };
        delete next[String(habit._id)];
        return next;
      });
      toast({ message: "Progress undone." });
      router.refresh();
    } catch {
      toast({ variant: "destructive", message: "Network error. Please try again." });
    } finally {
      setPending(null);
    }
  }

  function handleMark(habit: TodayHabit) {
    if (["numeric", "count", "duration"].includes(habit.trackingType)) {
      setDialogHabit(habit);
      setValue(String(habit.targetValue ?? 1));
      return;
    }
    submit(habit);
  }

  if (habits.length === 0) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        No habits yet.{" "}
        <Link href="/dashboard/habits/add" className="text-primary font-medium">
          Add your first habit
        </Link>
        .
      </div>
    );
  }

  return (
    <div>
      <div className="divide-y divide-border">
        {habits.map((habit) => {
          const done = logState[String(habit._id)] === "completed";
          const isPending = pending === String(habit._id);
          return (
            <div key={habit._id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={cn(
                    "h-7 w-7 shrink-0 rounded-lg flex items-center justify-center",
                    done ? "bg-emerald-500 text-white" : "bg-secondary text-muted-foreground"
                  )}
                >
                  {done ? <CheckCircle className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                </div>
                <div className="min-w-0">
                  <Link
                    href={`/dashboard/habits/${habit._id}`}
                    className="text-sm font-medium hover:underline truncate block"
                  >
                    {habit.name}
                  </Link>
                  <div className="text-xs text-muted-foreground">{habit.category}</div>
                </div>
              </div>
              {done ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="px-3"
                  disabled={isPending}
                  onClick={() => undo(habit)}
                >
                  {isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Undo2 className="h-3.5 w-3.5 mr-1" />
                  )}
                  Undo
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="px-3"
                  disabled={isPending}
                  onClick={() => handleMark(habit)}
                >
                  {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Mark done"}
                </Button>
              )}
            </div>
          );
        })}
      </div>

      <div className="px-4 py-2 text-xs text-muted-foreground">
        {completed} of {habits.length} completed
      </div>

      <Dialog open={!!dialogHabit} onOpenChange={(open) => !open && setDialogHabit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log progress</DialogTitle>
            <DialogDescription>
              {dialogHabit
                ? `How much did you complete for "${dialogHabit.name}"?`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="progress-value">
              {dialogHabit?.trackingType === "duration"
                ? "Minutes"
                : dialogHabit?.unit || "Amount"}
            </Label>
            <Input
              id="progress-value"
              type="number"
              min={0}
              step="any"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
            {dialogHabit?.targetValue ? (
              <p className="text-xs text-muted-foreground">
                Target: {dialogHabit.targetValue} {dialogHabit.unit || ""}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogHabit(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!dialogHabit) return;
                const n = Number(value);
                if (Number.isNaN(n) || n < 0) {
                  toast({ variant: "destructive", message: "Enter a valid number." });
                  return;
                }
                submit(dialogHabit, n);
                setDialogHabit(null);
              }}
            >
              Save progress
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
