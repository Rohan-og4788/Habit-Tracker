"use client";
export const dynamic = "force-dynamic";

import { useCallback, useEffect, useState } from "react";
import { CalendarDays, CheckCircle2, Loader2, Plus, Swords, Trash2 } from "lucide-react";
import { useToast } from "@/lib/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Challenge {
  _id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  status: string;
  completedDays: number;
  totalDays: number;
  progressPercent: number;
  checkIns?: Array<{ localDate: string; completed: boolean }>;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function todayLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function ChallengesPage() {
  const { toast } = useToast();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    startDate: todayLocal(),
    endDate: (() => {
      const d = new Date();
      d.setDate(d.getDate() + 29);
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    })(),
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/challenges");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load challenges.");
      setChallenges(data.challenges || []);
    } catch (err: any) {
      toast({ variant: "destructive", message: err.message });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  async function create() {
    if (!form.title.trim()) {
      toast({ variant: "destructive", message: "Give your challenge a title." });
      return;
    }
    if (form.endDate < form.startDate) {
      toast({ variant: "destructive", message: "End date must be after the start date." });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ variant: "destructive", message: data.error || "Could not create challenge." });
        return;
      }
      toast({ variant: "success", message: "Challenge created." });
      setOpen(false);
      setForm((prev) => ({ ...prev, title: "", description: "" }));
      await load();
    } catch {
      toast({ variant: "destructive", message: "Network error. Please try again." });
    } finally {
      setSaving(false);
    }
  }

  async function checkIn(challenge: Challenge) {
    setPending(challenge._id);
    try {
      const res = await fetch(`/api/challenges/${challenge._id}/check-in`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ localDate: todayLocal(), completed: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ variant: "destructive", message: data.error || "Could not check in." });
        return;
      }
      toast({ variant: "success", message: "Checked in for today." });
      await load();
    } catch {
      toast({ variant: "destructive", message: "Network error. Please try again." });
    } finally {
      setPending(null);
    }
  }

  async function remove(challenge: Challenge) {
    if (!confirm(`Delete the challenge "${challenge.title}"? This cannot be undone.`)) return;
    setPending(challenge._id);
    try {
      const res = await fetch(`/api/challenges/${challenge._id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ variant: "destructive", message: data.error || "Could not delete challenge." });
        return;
      }
      setChallenges((prev) => prev.filter((c) => c._id !== challenge._id));
      toast({ message: "Challenge deleted." });
    } catch {
      toast({ variant: "destructive", message: "Network error. Please try again." });
    } finally {
      setPending(null);
    }
  }

  const today = todayLocal();

  return (
    <div className="mx-auto max-w-4xl py-8 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Challenges</h1>
          <p className="text-muted-foreground">Commit to a streak and check in each day.</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> New challenge
        </Button>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      ) : challenges.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
          <Swords className="mx-auto mb-3 h-10 w-10 opacity-40" />
          No challenges yet. Start a 7, 21 or 30-day challenge.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {challenges.map((challenge) => {
            const start = challenge.startDate.slice(0, 10);
            const end = challenge.endDate.slice(0, 10);
            const withinWindow = today >= start && today <= end;
            const checkedToday = challenge.checkIns?.some(
              (c) => c.localDate === today && c.completed
            );
            const busy = pending === challenge._id;
            return (
              <Card key={challenge._id} className="flex flex-col p-5">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold">{challenge.title}</h3>
                    <p className="text-xs text-muted-foreground">
                      {challenge.description || "No description"}
                    </p>
                  </div>
                  <Badge variant={challenge.status === "active" ? "success" : "secondary"} className="capitalize">
                    {challenge.status}
                  </Badge>
                </div>

                <div className="mb-2 flex items-center gap-1 text-xs text-muted-foreground">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {start} → {end}
                </div>

                <div className="mb-2 h-2.5 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${challenge.progressPercent}%` }}
                  />
                </div>
                <div className="mb-3 flex justify-between text-xs text-muted-foreground">
                  <span>
                    {challenge.completedDays} / {challenge.totalDays} days
                  </span>
                  <span>{challenge.progressPercent}%</span>
                </div>

                <div className="mt-auto flex items-center gap-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    disabled={busy || !withinWindow || checkedToday}
                    onClick={() => checkIn(challenge)}
                  >
                    {busy ? (
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
                    )}
                    {checkedToday ? "Checked in" : withinWindow ? "Check in today" : "Not active"}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive"
                    disabled={busy}
                    onClick={() => remove(challenge)}
                    aria-label="Delete challenge"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New challenge</DialogTitle>
            <DialogDescription>Pick a window and commit to daily check-ins.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="challenge-title">Title</Label>
              <Input
                id="challenge-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="30 days of morning walks"
                maxLength={200}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="challenge-description">Description (optional)</Label>
              <textarea
                id="challenge-description"
                rows={2}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="challenge-start">Start date</Label>
                <Input
                  id="challenge-start"
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="challenge-end">End date</Label>
                <Input
                  id="challenge-end"
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={create} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create challenge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
