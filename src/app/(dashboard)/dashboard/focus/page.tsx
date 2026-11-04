"use client";
export const dynamic = "force-dynamic";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pause, Play, RotateCcw, Square, Timer } from "lucide-react";
import { useToast } from "@/lib/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const STORAGE_KEY = "hf-focus-session";
const PRESETS = [15, 25, 45, 60];

interface StoredSession {
  id: string;
  startedAt: number;
  plannedMinutes: number;
  accumulatedSeconds: number;
}

export default function FocusPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<any[]>([]);
  const [plannedMinutes, setPlannedMinutes] = useState(25);
  const [active, setActive] = useState<StoredSession | null>(null);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [busy, setBusy] = useState(false);
  const finishingRef = useRef(false);

  const loadSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/focus-sessions");
      const data = await res.json();
      if (res.ok) setSessions(data.sessions || []);
    } catch {
      // Non-fatal: timer still works without history.
    }
  }, []);

  // Restore an in-progress session after a refresh.
  useEffect(() => {
    loadSessions();
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const stored: StoredSession = JSON.parse(raw);
        if (stored?.id && stored.startedAt) {
          setActive(stored);
          setPlannedMinutes(stored.plannedMinutes);
          setRunning(true);
        }
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [loadSessions]);

  // Timestamp-based ticker: no drift, works after tab throttling.
  useEffect(() => {
    if (!active || !running) return;
    const tick = () => {
      const liveSeconds = Math.floor((Date.now() - active.startedAt) / 1000);
      setElapsed(active.accumulatedSeconds + liveSeconds);
    };
    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [active, running]);

  const totalSeconds = Math.round(plannedMinutes * 60);
  const remaining = Math.max(0, totalSeconds - elapsed);

  const finish = useCallback(
    async (completed: boolean) => {
      if (!active || finishingRef.current) return;
      finishingRef.current = true;
      setBusy(true);
      try {
        const actualMinutes = Math.max(1, Math.round(elapsed / 60));
        const res = await fetch(`/api/focus-sessions/${active.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            actualMinutes,
            completed,
            interrupted: !completed,
            endedAt: new Date().toISOString(),
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          toast({ variant: "destructive", message: data.error || "Could not save session." });
          return;
        }
        toast({
          variant: "success",
          message: completed ? "Focus session completed!" : "Session ended.",
        });
        localStorage.removeItem(STORAGE_KEY);
        setActive(null);
        setRunning(false);
        setElapsed(0);
        await loadSessions();
        router.refresh();
      } catch {
        toast({ variant: "destructive", message: "Network error. Please try again." });
      } finally {
        setBusy(false);
        finishingRef.current = false;
      }
    },
    [active, elapsed, loadSessions, router, toast]
  );

  // Auto-complete when the planned duration is reached.
  useEffect(() => {
    if (active && running && remaining === 0) {
      finish(true);
    }
  }, [active, running, remaining, finish]);

  async function start() {
    setBusy(true);
    try {
      const startedAt = Date.now();
      const res = await fetch("/api/focus-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plannedMinutes,
          startedAt: new Date(startedAt).toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ variant: "destructive", message: data.error || "Could not start session." });
        return;
      }
      const stored: StoredSession = {
        id: String(data._id),
        startedAt,
        plannedMinutes,
        accumulatedSeconds: 0,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
      setActive(stored);
      setElapsed(0);
      setRunning(true);
      toast({ message: "Focus session started." });
    } catch {
      toast({ variant: "destructive", message: "Network error. Please try again." });
    } finally {
      setBusy(false);
    }
  }

  function pause() {
    if (!active) return;
    const accumulated = active.accumulatedSeconds + Math.floor((Date.now() - active.startedAt) / 1000);
    const stored = { ...active, accumulatedSeconds: accumulated };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    setActive(stored);
    setElapsed(accumulated);
    setRunning(false);
  }

  function resume() {
    if (!active) return;
    const stored = { ...active, startedAt: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    setActive(stored);
    setRunning(true);
  }

  function reset() {
    if (active) {
      finish(false);
      return;
    }
    setElapsed(0);
  }

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const progress = totalSeconds > 0 ? Math.min(100, (elapsed / totalSeconds) * 100) : 0;

  return (
    <div className="max-w-md mx-auto py-8">
      <div className="text-center mb-8">
        <Timer className="h-10 w-10 text-primary mb-4 mx-auto" />
        <h1 className="text-2xl font-bold mb-1">Focus timer</h1>
        <p className="text-sm text-muted-foreground">
          {active ? (running ? "Session in progress" : "Paused") : "Pick a duration and start"}
        </p>
      </div>

      <Card className="p-6">
        <div className="relative w-48 h-48 mx-auto mb-6">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 192 192">
            <circle cx="96" cy="96" r="84" stroke="currentColor" strokeWidth="10" fill="none" className="text-secondary" />
            <circle
              cx="96"
              cy="96"
              r="84"
              stroke="currentColor"
              strokeWidth="10"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 84}
              strokeDashoffset={2 * Math.PI * 84 * (1 - progress / 100)}
              className="text-primary transition-all duration-300"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-5xl font-mono font-bold tabular-nums">
              {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
            </span>
          </div>
        </div>

        {!active ? (
          <>
            <div className="flex justify-center gap-2 mb-4">
              {PRESETS.map((p) => (
                <Button
                  key={p}
                  size="sm"
                  variant={plannedMinutes === p ? "default" : "outline"}
                  onClick={() => setPlannedMinutes(p)}
                >
                  {p}m
                </Button>
              ))}
            </div>
            <div className="flex items-end gap-2 justify-center">
              <div className="w-24 space-y-1">
                <Label htmlFor="custom-minutes" className="text-xs">
                  Minutes
                </Label>
                <Input
                  id="custom-minutes"
                  type="number"
                  min={1}
                  max={180}
                  value={plannedMinutes}
                  onChange={(e) =>
                    setPlannedMinutes(Math.min(180, Math.max(1, Number(e.target.value) || 1)))
                  }
                />
              </div>
              <Button onClick={start} disabled={busy} className="w-32">
                {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                Start
              </Button>
            </div>
          </>
        ) : (
          <div className="flex justify-center gap-3">
            {running ? (
              <Button onClick={pause} className="w-32">
                <Pause className="h-4 w-4 mr-2" /> Pause
              </Button>
            ) : (
              <Button onClick={resume} className="w-32">
                <Play className="h-4 w-4 mr-2" /> Resume
              </Button>
            )}
            <Button variant="outline" onClick={() => finish(true)} disabled={busy}>
              <Square className="h-4 w-4 mr-2" /> Finish
            </Button>
            <Button variant="ghost" onClick={reset} disabled={busy} aria-label="Reset session">
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        )}
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-sm">Recent sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No sessions yet.</p>
          ) : (
            <div className="space-y-2">
              {sessions.slice(0, 8).map((s) => (
                <div
                  key={s._id}
                  className="flex items-center justify-between p-2 text-sm border-b border-border last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <span>{new Date(s.startedAt).toLocaleDateString()}</span>
                    <span className="text-muted-foreground">
                      ({s.actualMinutes || 0}/{s.plannedMinutes} min)
                    </span>
                  </div>
                  <span className={s.completed ? "text-emerald-600" : "text-muted-foreground"}>
                    {s.completed ? "Completed" : s.interrupted ? "Interrupted" : "In progress"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
