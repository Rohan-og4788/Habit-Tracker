"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/lib/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const schema = z.object({
  name: z.string().min(1, "Habit name is required").max(200),
  description: z.string().max(1000).optional(),
  category: z.string(),
  type: z.string(),
  trackingType: z.string(),
  icon: z.string(),
  color: z.string(),
  targetValue: z.number().min(0).optional(),
  unit: z.string().max(50).optional(),
  frequency: z.string(),
  weekdays: z.array(z.number()).optional(),
  startDate: z.any(),
  difficulty: z.string(),
  priority: z.string(),
});

export default function EditHabitPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [habit, setHabit] = useState<any>(null);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "", description: "", category: "other", type: "build",
      trackingType: "boolean", icon: "CheckCircle2", color: "#6366F1",
      frequency: "daily", difficulty: "beginner", priority: "medium",
    },
  });

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/habits/${params.id}`);
      const data = await res.json();
      setHabit(data);
      form.reset({
        name: data.name,
        description: data.description || "",
        category: data.category,
        type: data.type,
        trackingType: data.trackingType,
        icon: data.icon,
        color: data.color,
        targetValue: data.targetValue,
        unit: data.unit || "",
        frequency: data.frequency,
        weekdays: data.weekdays || [],
        startDate: data.startDate,
        difficulty: data.difficulty,
        priority: data.priority,
      });
    } catch {
      toast({ variant: "destructive", message: "Failed to load habit." });
    }
  }, [params.id, form, toast]);

  useEffect(() => {
    load();
  }, [load]);

  async function onSubmit(values: z.infer<typeof schema>) {
    setLoading(true);
    try {
      const res = await fetch(`/api/habits/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ variant: "destructive", message: data.error || "Failed to update" });
        return;
      }
      toast({ variant: "success", message: "Habit updated." });
      router.push(`/dashboard/habits/${params.id}`);
      router.refresh();
    } catch {
      toast({ variant: "destructive", message: "Something went wrong." });
    } finally {
      setLoading(false);
    }
  }

  if (!habit) return (
    <div className="flex h-screen items-center justify-center">Loading...</div>
  );

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="flex items-center gap-2 mb-6">
        <Link href={`/dashboard/habits/${params.id}`} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-2">Edit habit</h1>
      <p className="text-muted-foreground mb-6">Update {habit.name}.</p>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-6 rounded-2xl border border-border bg-card">
        <div className="space-y-2">
          <Label htmlFor="name">Habit name</Label>
          <Input id="name" {...form.register("name")} />
          {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Input id="description" {...form.register("description")} />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Category</Label>
            <select {...form.register("category")} className="w-full border rounded-lg px-3 py-2">
              {["health", "fitness", "study", "career", "productivity", "personal-development", "finance", "mental-wellness", "reading", "other"].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Frequency</Label>
            <select {...form.register("frequency")} className="w-full border rounded-lg px-3 py-2">
              {["daily", "weekdays", "weekly", "monthly", "custom"].map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Priority</Label>
            <select {...form.register("priority")} className="w-full border rounded-lg px-3 py-2">
              {["low", "medium", "high"].map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Saving..." : "Save changes"}
        </Button>
      </form>
    </div>
  );
}
