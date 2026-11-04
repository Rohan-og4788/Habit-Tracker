"use client";
export const dynamic = "force-dynamic";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/lib/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { CheckCircle2, Flame, Target, Timer, List, BarChart3, AlertCircle } from "lucide-react";

const schema = z.object({
  name: z.string().min(1, "Habit name is required").max(200),
  description: z.string().max(1000).optional(),
  category: z.enum([
    "health", "fitness", "study", "career", "productivity",
    "personal-development", "finance", "mental-wellness", "reading", "other",
  ]).default("other"),
  type: z.enum(["build", "quit", "one-time"]).default("build"),
  trackingType: z.enum(["boolean", "numeric", "duration", "count", "checklist", "negative"]).default("boolean"),
  icon: z.string().default("CheckCircle2"),
  color: z.string().default("#6366F1"),
  targetValue: z.number().min(0).optional(),
  unit: z.string().max(50).optional(),
  frequency: z.enum(["daily", "weekdays", "weekly", "monthly", "custom"]).default("daily"),
  weekdays: z.array(z.number().min(0).max(6)).default([1, 2, 3, 4, 5]),
  startDate: z.preprocess((v) => (v ? new Date(v as string) : undefined), z.date()),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]).default("beginner"),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  reminderEnabled: z.boolean().default(false),
  reminderTime: z.string().default("09:00"),
});

const CATEGORIES: { value: string; label: string }[] = [
  { value: "health", label: "Health" },
  { value: "fitness", label: "Fitness" },
  { value: "study", label: "Study" },
  { value: "career", label: "Career" },
  { value: "productivity", label: "Productivity" },
  { value: "personal-development", label: "Personal Development" },
  { value: "finance", label: "Finance" },
  { value: "mental-wellness", label: "Mental Wellness" },
  { value: "reading", label: "Reading" },
  { value: "other", label: "Other" },
];

const ICONS: { value: string; label: string; icon: any }[] = [
  { value: "CheckCircle2", label: "Check", icon: CheckCircle2 },
  { value: "Flame", label: "Fire", icon: Flame },
  { value: "Target", label: "Target", icon: Target },
  { value: "Timer", label: "Timer", icon: Timer },
  { value: "List", label: "List", icon: List },
  { value: "BarChart3", label: "Chart", icon: BarChart3 },
];

export default function AddHabitPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "", description: "", category: "other", type: "build",
      trackingType: "boolean", icon: "CheckCircle2", color: "#6366F1",
      frequency: "daily", weekdays: [1,2,3,4,5], startDate: new Date(),
      difficulty: "beginner", priority: "medium", reminderEnabled: false, reminderTime: "09:00",
    },
  });

  async function onSubmit(values: z.infer<typeof schema>) {
    setLoading(true);
    try {
      const res = await fetch("/api/habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          weekdays: values.weekdays,
          startDate: values.startDate?.toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ variant: "destructive", message: data.error || "Failed to create habit" });
        return;
      }
      toast({ variant: "success", message: "Habit created!" });
      router.push(`/dashboard/habits/${data._id}`);
      router.refresh();
    } catch {
      toast({ variant: "destructive", message: "Something went wrong." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Add a new habit</h1>
        <p className="text-muted-foreground">What do you want to build into your routine?</p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-6 rounded-2xl border border-border bg-card">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Habit name</Label>
            <Input id="name" placeholder="e.g. Drink 3 liters of water" {...form.register("name")} />
            {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              {...(form.register("category") as any)}
              onValueChange={(v) => form.setValue("category", v as any)}
            >
              <SelectTrigger id="category"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description (optional)</Label>
          <Input id="description" {...form.register("description")} />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Type</Label>
            <div className="flex gap-2">
              {["build", "quit", "one-time"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => form.setValue("type", t as any)}
                  className={`flex-1 py-2 rounded-lg border text-xs font-medium transition ${form.watch("type") === t ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:bg-secondary"}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Tracking</Label>
            <div className="flex gap-2">
              {["boolean", "numeric", "duration", "count", "negative"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => form.setValue("trackingType", t as any)}
                  className={`flex-1 py-2 rounded-lg border text-xs font-medium transition ${form.watch("trackingType") === t ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:bg-secondary"}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Frequency</Label>
            <Select
              {...(form.register("frequency") as any)}
              onValueChange={(v) => form.setValue("frequency", v as any)}
            >
              <SelectTrigger id="frequency"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["daily", "weekdays", "weekly", "monthly", "custom"].map((f) => (
                  <SelectItem key={f} value={f}>{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {form.watch("trackingType") !== "boolean" && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="targetValue">Target value</Label>
              <Input id="targetValue" type="number" {...form.register("targetValue")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <Input id="unit" placeholder="e.g. glasses, minutes" {...form.register("unit")} />
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="startDate">Start date</Label>
          <Input id="startDate" type="date" {...form.register("startDate")} />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Difficulty</Label>
            <Select
              {...(form.register("difficulty") as any)}
              onValueChange={(v) => form.setValue("difficulty", v as any)}
            >
              <SelectTrigger id="difficulty"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["beginner", "intermediate", "advanced"].map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Priority</Label>
            <Select
              {...(form.register("priority") as any)}
              onValueChange={(v) => form.setValue("priority", v as any)}
            >
              <SelectTrigger id="priority"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["low", "medium", "high"].map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2 pt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <Label>Reminder</Label>
            <Switch checked={form.watch("reminderEnabled")} onCheckedChange={(v) => form.setValue("reminderEnabled", v)} />
          </div>
          {form.watch("reminderEnabled") && (
            <div className="ml-8 space-y-2">
              <Label htmlFor="reminderTime">Reminder time</Label>
              <Input id="reminderTime" type="time" {...form.register("reminderTime")} />
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button type="submit" className="w-auto" disabled={loading}>
            {loading ? "Creating..." : "Create habit"}
          </Button>
        </div>
      </form>
    </div>
  );
}
