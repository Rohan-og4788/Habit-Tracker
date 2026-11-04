"use client";
export const dynamic = "force-dynamic";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Calendar as CalendarIcon, CheckCircle2, ChevronLeft, ChevronRight, Loader2, Undo2 } from "lucide-react";
import { useToast } from "@/lib/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Habit {
  _id: string;
  name: string;
  status: string;
  frequency: string;
  weekdays?: number[];
  intervalDays?: number;
  startDate?: string;
  endDate?: string;
  trackingType: string;
  targetValue?: number;
  unit?: string;
}

interface HabitLog {
  _id?: string;
  habitId: string;
  localDate: string;
  status: string;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function dateInTimezone(timezone: string, date = new Date()): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

function addDays(date: string, delta: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

function isScheduled(habit: Habit, date: string): boolean {
  if (habit.status !== "active") return false;
  const d = new Date(`${date}T00:00:00Z`);
  const day = d.getUTCDay();
  if (habit.startDate && date < habit.startDate.slice(0, 10)) return false;
  if (habit.endDate && date > habit.endDate.slice(0, 10)) return false;
  switch (habit.frequency) {
    case "weekdays":
      return day >= 1 && day <= 5;
    case "weekly":
      return (habit.weekdays?.length ? habit.weekdays : [1, 2, 3, 4, 5]).includes(day);
    case "monthly":
      return habit.startDate ? d.getUTCDate() === new Date(habit.startDate).getUTCDate() : true;
    case "custom": {
      const interval = Math.max(1, habit.intervalDays || 1);
      const start = habit.startDate ? new Date(habit.startDate.slice(0, 10) + "T00:00:00Z") : d;
      const diff = Math.floor((d.getTime() - start.getTime()) / 86400000);
      return diff >= 0 && diff % interval === 0;
    }
    default:
      return true;
  }
}

export default function CalendarPage() {
  const { toast } = useToast();
  const [timezone, setTimezone] = useState("UTC");
  const [today, setToday] = useState("");
  const [cursor, setCursor] = useState(() => new Date());
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<string | null>(null);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const monthKey = `${year}-${pad(month + 1)}`;
  const firstWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const monthName = cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const load = useCallback(
    async (tz: string) => {
      setLoading(true);
      try {
        const from = `${monthKey}-01`;
        const to = `${monthKey}-${pad(daysInMonth)}`;
        const [hRes, lRes] = await Promise.all([
          fetch("/api/habits?limit=200"),
          fetch(`/api/habit-logs?from=${from}&to=${to}`),
        ]);
        const hData = await hRes.json();
        const lData = await lRes.json();
        if (!hRes.ok) throw new Error(hData.error || "Failed to load habits.");
        if (!lRes.ok) throw new Error(lData.error || "Failed to load calendar data.");
        setHabits(hData.items || hData.habits || []);
        setLogs(lData.logs || []);
        setSelected((prev) => prev ?? dateInTimezone(tz));
      } catch (err: any) {
        toast({ variant: "destructive", message: err.message || "Failed to load calendar." });
      } finally {
        setLoading(false);
      }
    },
    [monthKey, daysInMonth, toast]
  );

  useEffect(() => {
    let active = true;
    fetch("/api/account")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!active) return;
        const tz = data?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
        setTimezone(tz);
        const localToday = dateInTimezone(tz);
        setToday(localToday);
        setCursor(new Date(`${localToday}T12:00:00Z`));
        load(tz);
      })
      .catch(() => {
        if (!active) return;
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
        setTimezone(tz);
        setToday(dateInTimezone(tz));
        load(tz);
      });
    return () => {
      active = false;
    };
  }, [load]);

  const logsByDate = useMemo(() => {
    const map = new Map<string, Map<string, HabitLog>>();
    for (const log of logs) {
      if (!map.has(log.localDate)) map.set(log.localDate, new Map());
      map.get(log.localDate)!.set(String(log.habitId), log);
    }
    return map;
  }, [logs]);

  const selectedHabits = useMemo(() => {
    if (!selected) return [];
    return habits.filter((h) => isScheduled(h, selected));
  }, [habits, selected]);

  const selectedLogs = selected ? logsByDate.get(selected) : undefined;

  function changeMonth(delta: number) {
    setCursor(new Date(Date.UTC(year, month + delta, 1)));
    setSelected(null);
  }

  async function toggle(habit: Habit, date: string, done: boolean) {
    setPending(`${habit._id}:${date}`);
    try {
      if (done) {
        const res = await fetch(
          `/api/habit-logs?habitId=${encodeURIComponent(habit._id)}&localDate=${date}`,
          { method: "DELETE" }
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast({ variant: "destructive", message: data.error || "Could not undo." });
          return;
        }
        setLogs((prev) =>
          prev.filter((l) => !(String(l.habitId) === habit._id && l.localDate === date))
        );
        toast({ message: "Progress undone." });
      } else {
        const payload: any = {
          habitId: habit._id,
          localDate: date,
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
          toast({ variant: "destructive", message: data.error || "Could not save progress." });
          return;
        }
        setLogs((prev) => [
          ...prev.filter(
            (l) => !(String(l.habitId) === habit._id && l.localDate === date)
          ),
          { habitId: habit._id, localDate: date, status: "completed" },
        ]);
        toast({ variant: "success", message: `${habit.name} completed.` });
      }
    } catch {
      toast({ variant: "destructive", message: "Network error. Please try again." });
    } finally {
      setPending(null);
    }
  }

  const canGoNext = monthKey < today.slice(0, 7);

  return (
    <div className="mx-auto max-w-5xl py-8 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Calendar</h1>
          <p className="text-muted-foreground">Review and edit your habit history by date.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => changeMonth(-1)} aria-label="Previous month">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-36 text-center font-semibold">{monthName}</span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => changeMonth(1)}
            disabled={!canGoNext}
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <CalendarIcon className="h-4 w-4 text-primary" /> Monthly view
            </CardTitle>
            <CardDescription>Click a day to see and edit that day&apos;s habits.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <>
                <div className="mb-2 grid grid-cols-7 text-center text-xs font-semibold text-muted-foreground">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                    <div key={d}>{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: firstWeekday }).map((_, i) => (
                    <div key={`blank-${i}`} className="h-11" />
                  ))}
                  {Array.from({ length: daysInMonth }, (_, i) => {
                    const day = i + 1;
                    const date = `${monthKey}-${pad(day)}`;
                    const dayLogs = logsByDate.get(date);
                    const scheduled = habits.filter((h) => isScheduled(h, date));
                    const done = dayLogs
                      ? scheduled.filter((h) => dayLogs.get(String(h._id))?.status === "completed").length
                      : 0;
                    const isToday = date === today;
                    const isSelected = date === selected;
                    const isFuture = date > today;
                    return (
                      <button
                        key={date}
                        onClick={() => setSelected(date)}
                        disabled={isFuture}
                        className={cn(
                          "flex h-11 flex-col items-center justify-center rounded-xl text-sm font-medium transition",
                          isFuture && "cursor-not-allowed opacity-40",
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : isToday
                            ? "border border-primary text-primary"
                            : "hover:bg-secondary",
                          !isSelected && done > 0 && "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                        )}
                      >
                        <span>{day}</span>
                        {scheduled.length > 0 ? (
                          <span
                            className={cn(
                              "mt-0.5 h-1 w-1 rounded-full",
                              done === scheduled.length ? "bg-emerald-500" : "bg-muted-foreground/40"
                            )}
                          />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Completed
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2.5 w-2.5 rounded-full border border-primary" /> Today
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/40" /> Scheduled
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">{selected ?? "Select a day"}</CardTitle>
            <CardDescription>
              {selected
                ? selected === today
                  ? "Today's scheduled habits"
                  : "Habits scheduled on this day"
                : "Pick a day from the calendar"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selected ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No day selected.</p>
            ) : selectedHabits.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No habits scheduled on this day.
              </p>
            ) : (
              <div className="space-y-2">
                {selectedHabits.map((habit) => {
                  const log = selectedLogs?.get(String(habit._id));
                  const done = log?.status === "completed";
                  const busy = pending === `${habit._id}:${selected}`;
                  const isFuture = selected > today;
                  return (
                    <div
                      key={habit._id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-border p-2.5"
                    >
                      <div className="min-w-0">
                        <Link
                          href={`/dashboard/habits/${habit._id}`}
                          className="truncate text-sm font-medium hover:underline"
                        >
                          {habit.name}
                        </Link>
                        <div className="text-xs text-muted-foreground">{habit.frequency}</div>
                      </div>
                      {done ? (
                        <div className="flex items-center gap-1">
                          <Badge variant="secondary" className="text-[10px]">
                            <CheckCircle2 className="mr-1 h-3 w-3" /> Done
                          </Badge>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            disabled={busy}
                            onClick={() => toggle(habit, selected, true)}
                            aria-label="Undo"
                          >
                            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Undo2 className="h-3.5 w-3.5" />}
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs"
                          disabled={busy || isFuture}
                          onClick={() => toggle(habit, selected, false)}
                        >
                          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Mark done"}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
