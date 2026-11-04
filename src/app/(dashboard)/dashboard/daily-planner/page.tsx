"use client";
export const dynamic = "force-dynamic";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, Circle, Loader2, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/lib/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface Task {
  _id: string;
  title: string;
  description?: string;
  date: string;
  dueTime?: string;
  priority: "low" | "medium" | "high";
  status: "pending" | "completed" | "overdue" | "cancelled";
}

const PRIORITY_VARIANT: Record<string, "secondary" | "warning" | "destructive"> = {
  low: "secondary",
  medium: "warning",
  high: "destructive",
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function localDate(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function shiftDate(date: string, delta: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

export default function DailyPlannerPage() {
  const { toast } = useToast();
  const [date, setDate] = useState(localDate());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [dueTime, setDueTime] = useState("");
  const [adding, setAdding] = useState(false);
  const [pending, setPending] = useState<string | null>(null);

  const load = useCallback(
    async (forDate: string) => {
      setLoading(true);
      try {
        const res = await fetch(`/api/daily-tasks?date=${forDate}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load tasks.");
        setTasks(data.tasks || []);
      } catch (err: any) {
        toast({ variant: "destructive", message: err.message });
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  useEffect(() => {
    load(date);
  }, [date, load]);

  const sorted = useMemo(
    () =>
      [...tasks].sort((a, b) => {
        const order = { high: 0, medium: 1, low: 2 };
        if (a.status === "completed" && b.status !== "completed") return 1;
        if (b.status === "completed" && a.status !== "completed") return -1;
        if (order[a.priority] !== order[b.priority]) return order[a.priority] - order[b.priority];
        return (a.dueTime || "99:99").localeCompare(b.dueTime || "99:99");
      }),
    [tasks]
  );

  const completed = tasks.filter((t) => t.status === "completed").length;

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast({ variant: "destructive", message: "Enter a task title." });
      return;
    }
    setAdding(true);
    try {
      const res = await fetch("/api/daily-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          date,
          priority,
          dueTime: dueTime || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ variant: "destructive", message: data.error || "Could not add task." });
        return;
      }
      setTasks((prev) => [...prev, data]);
      setTitle("");
      setDueTime("");
      setPriority("medium");
      toast({ variant: "success", message: "Task added." });
    } catch {
      toast({ variant: "destructive", message: "Network error. Please try again." });
    } finally {
      setAdding(false);
    }
  }

  async function toggleTask(task: Task) {
    setPending(task._id);
    const nextStatus = task.status === "completed" ? "pending" : "completed";
    try {
      const res = await fetch(`/api/daily-tasks/${task._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ variant: "destructive", message: data.error || "Could not update task." });
        return;
      }
      setTasks((prev) => prev.map((t) => (t._id === task._id ? { ...t, ...data } : t)));
    } catch {
      toast({ variant: "destructive", message: "Network error. Please try again." });
    } finally {
      setPending(null);
    }
  }

  async function removeTask(task: Task) {
    setPending(task._id);
    try {
      const res = await fetch(`/api/daily-tasks/${task._id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ variant: "destructive", message: data.error || "Could not delete task." });
        return;
      }
      setTasks((prev) => prev.filter((t) => t._id !== task._id));
      toast({ message: "Task deleted." });
    } catch {
      toast({ variant: "destructive", message: "Network error. Please try again." });
    } finally {
      setPending(null);
    }
  }

  const isToday = date === localDate();

  return (
    <div className="mx-auto max-w-3xl py-8 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Daily planner</h1>
          <p className="text-muted-foreground">
            Plan and complete the tasks that support your habits.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setDate(shiftDate(date, -1))} aria-label="Previous day">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-40 text-center">
            <div className="text-sm font-semibold">
              {isToday ? "Today" : new Date(`${date}T12:00:00Z`).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
            </div>
            <input
              type="date"
              value={date}
              onChange={(e) => e.target.value && setDate(e.target.value)}
              className="mt-1 w-full bg-transparent text-center text-xs text-muted-foreground"
            />
          </div>
          <Button variant="outline" size="icon" onClick={() => setDate(shiftDate(date, 1))} aria-label="Next day">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Add a task</CardTitle>
          <CardDescription>Tasks are scoped to the selected day.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={addTask} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="task-title">Task</Label>
              <Input
                id="task-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. 20 minutes of reading"
                maxLength={300}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="due-time">Due time (optional)</Label>
                <Input
                  id="due-time"
                  type="time"
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                />
              </div>
            </div>
            <Button type="submit" disabled={adding || !title.trim()}>
              {adding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Add task
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Tasks for {date}</CardTitle>
          <CardDescription>
            {tasks.length === 0
              ? "No tasks yet."
              : `${completed} of ${tasks.length} completed`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : sorted.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Add your first task for this day above.
            </p>
          ) : (
            <div className="space-y-2">
              {sorted.map((task) => {
                const busy = pending === task._id;
                const done = task.status === "completed";
                return (
                  <div
                    key={task._id}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border border-border p-3",
                      done && "opacity-60"
                    )}
                  >
                    <button
                      onClick={() => toggleTask(task)}
                      disabled={busy}
                      className="shrink-0 text-muted-foreground hover:text-primary"
                      aria-label={done ? "Mark pending" : "Mark complete"}
                    >
                      {busy ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : done ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      ) : (
                        <Circle className="h-5 w-5" />
                      )}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className={cn("text-sm font-medium", done && "line-through")}>
                        {task.title}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant={PRIORITY_VARIANT[task.priority]} className="text-[10px] capitalize">
                          {task.priority}
                        </Badge>
                        {task.dueTime ? <span>Due {task.dueTime}</span> : null}
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground"
                      disabled={busy}
                      onClick={() => removeTask(task)}
                      aria-label="Delete task"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
