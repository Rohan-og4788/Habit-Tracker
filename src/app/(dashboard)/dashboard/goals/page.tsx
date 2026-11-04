"use client";
export const dynamic = "force-dynamic";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Target, Loader2, Trash2, TrendingUp, CheckCircle2 } from "lucide-react";
import { useToast } from "@/lib/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

export default function GoalsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<string | null>(null);
  const [activeGoal, setActiveGoal] = useState<any | null>(null);
  const [amount, setAmount] = useState("1");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/goals");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load goals.");
      setGoals(data.goals || []);
    } catch (err: any) {
      toast({ variant: "destructive", message: err.message });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const progress = (g: any) =>
    g.targetValue > 0 ? Math.min(100, Math.round((g.currentProgress / g.targetValue) * 100)) : 0;

  async function updateGoal(id: string, body: any, message: string) {
    setPending(id);
    try {
      const res = await fetch(`/api/goals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ variant: "destructive", message: data.error || "Update failed." });
        return;
      }
      toast({ variant: "success", message });
      await load();
      router.refresh();
    } catch {
      toast({ variant: "destructive", message: "Network error. Please try again." });
    } finally {
      setPending(null);
    }
  }

  async function deleteGoal(id: string) {
    if (!confirm("Delete this goal? This cannot be undone.")) return;
    setPending(id);
    try {
      const res = await fetch(`/api/goals/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        toast({ variant: "destructive", message: data.error || "Delete failed." });
        return;
      }
      setGoals((prev) => prev.filter((g) => g._id !== id));
      toast({ variant: "success", message: "Goal deleted." });
      router.refresh();
    } finally {
      setPending(null);
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Goals</h1>
          <p className="text-muted-foreground">Set and track your long-term goals.</p>
        </div>
        <Button asChild className="flex items-center gap-2">
          <Link href="/dashboard/goals/add">
            <Plus className="h-4 w-4" /> Add goal
          </Link>
        </Button>
      </div>

      {goals.length === 0 ? (
        <div className="p-12 text-center text-muted-foreground">
          No goals yet.{" "}
          <Link href="/dashboard/goals/add" className="text-primary font-medium">
            Create your first goal
          </Link>
          .
        </div>
      ) : (
        <div className="space-y-4">
          {goals.map((g) => {
            const pct = progress(g);
            const busy = pending === g._id;
            return (
              <Card key={g._id} className="p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-start gap-3">
                    <Target className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <h3 className="font-semibold">{g.title}</h3>
                      <p className="text-xs text-muted-foreground">{g.description || "No description"}</p>
                      {g.deadline ? (
                        <p className="text-xs text-muted-foreground mt-1">
                          Deadline: {new Date(g.deadline).toLocaleDateString()}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <Badge className="capitalize">{g.status}</Badge>
                </div>
                <div className="w-full bg-secondary rounded-full h-3 mb-2 overflow-hidden">
                  <div className="bg-primary h-full transition-all" style={{ width: `${pct}%` }} />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mb-3">
                  <span>
                    {g.currentProgress} / {g.targetValue} {g.unit || ""}
                  </span>
                  <span>{pct}%</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy || g.status === "completed"}
                    onClick={() => {
                      setActiveGoal(g);
                      setAmount("1");
                    }}
                  >
                    <TrendingUp className="h-3.5 w-3.5 mr-1" /> Log progress
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy || !g.linkedHabitIds?.length}
                    onClick={() => updateGoal(g._id, { action: "recalc" }, "Progress recalculated from habits.")}
                  >
                    Recalculate
                  </Button>
                  {g.status !== "completed" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => updateGoal(g._id, { status: "completed" }, "Goal completed!")}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Mark complete
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive ml-auto"
                    disabled={busy}
                    onClick={() => deleteGoal(g._id)}
                  >
                    {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!activeGoal} onOpenChange={(open) => !open && setActiveGoal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log progress</DialogTitle>
            <DialogDescription>
              {activeGoal ? `How much progress did you make on "${activeGoal.title}"?` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="goal-amount">
              Amount {activeGoal?.unit ? `(${activeGoal.unit})` : ""}
            </Label>
            <Input
              id="goal-amount"
              type="number"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActiveGoal(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!activeGoal) return;
                const n = Number(amount);
                if (Number.isNaN(n) || n === 0) {
                  toast({ variant: "destructive", message: "Enter a non-zero number." });
                  return;
                }
                updateGoal(activeGoal._id, { increment: n }, "Progress logged.");
                setActiveGoal(null);
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
