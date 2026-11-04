"use client";
export const dynamic = "force-dynamic";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/lib/use-toast";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const schema = z.object({
  title: z.string().min(1, "Goal title is required").max(200),
  description: z.string().max(1000).optional(),
  targetValue: z.number().min(1),
  unit: z.string().max(50).optional(),
  deadline: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
});

export default function AddGoalPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", description: "", targetValue: 1, unit: "", deadline: "", priority: "medium" },
  });

  async function onSubmit(values: z.infer<typeof schema>) {
    setLoading(true);
    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ variant: "destructive", message: data.error || "Failed to create goal" });
        return;
      }
      toast({ variant: "success", message: "Goal created!" });
      router.push("/dashboard/goals");
      router.refresh();
    } catch {
      toast({ variant: "destructive", message: "Something went wrong." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/dashboard/goals" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-2">Add a goal</h1>
      <p className="text-muted-foreground mb-6">What do you want to achieve?</p>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-6 rounded-2xl border border-border bg-card">
        <div className="space-y-2">
          <Label htmlFor="title">Goal title</Label>
          <Input id="title" placeholder="e.g. Read 12 books this year" {...form.register("title")} />
          {form.formState.errors.title && <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description (optional)</Label>
          <Input id="description" {...form.register("description")} />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="targetValue">Target value</Label>
            <Input id="targetValue" type="number" {...form.register("targetValue")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="unit">Unit</Label>
            <Input id="unit" placeholder="e.g. books" {...form.register("unit")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="deadline">Deadline</Label>
            <Input id="deadline" type="date" {...form.register("deadline")} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Priority</Label>
          <select {...form.register("priority")} className="w-full border rounded-lg px-3 py-2">
            {["low", "medium", "high"].map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Creating..." : "Create goal"}
        </Button>
      </form>
    </div>
  );
}
