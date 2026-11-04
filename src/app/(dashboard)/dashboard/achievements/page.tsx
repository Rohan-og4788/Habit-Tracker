"use client";
export const dynamic = "force-dynamic";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Award,
  BookOpen,
  CheckCircle2,
  Flame,
  Layers,
  Loader2,
  Lock,
  Sparkles,
  Sun,
  Target,
  Timer,
  Trophy,
  Zap,
} from "lucide-react";
import { useToast } from "@/lib/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Achievement {
  _id: string;
  key: string;
  title: string;
  description?: string;
  category: string;
  badgeIcon?: string;
  badgeColor?: string;
  threshold: number;
  unlocked: boolean;
}

const ICONS: Record<string, any> = {
  Sparkles,
  Layers,
  CheckCircle2,
  Zap,
  Trophy,
  Flame,
  Target,
  BookOpen,
  Timer,
  Sun,
  Award,
};

const CATEGORY_LABELS: Record<string, string> = {
  "first-habit": "First steps",
  streak: "Streaks",
  consistency: "Consistency",
  goal: "Goals",
  completion: "Completions",
  milestone: "Milestones",
};

const CATEGORY_ORDER = ["first-habit", "completion", "streak", "consistency", "goal", "milestone"];

export default function AchievementsPage() {
  const { toast } = useToast();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unlocked" | "locked">("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/achievements");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to load achievements.");
      setAchievements(data.achievements || []);
    } catch (err: any) {
      toast({ variant: "destructive", message: err.message || "Failed to load achievements." });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const percent =
    achievements.length === 0 ? 0 : Math.round((unlockedCount / achievements.length) * 100);

  const visible = useMemo(
    () =>
      achievements.filter((a) =>
        filter === "all" ? true : filter === "unlocked" ? a.unlocked : !a.unlocked
      ),
    [achievements, filter]
  );

  const grouped = useMemo(() => {
    const map = new Map<string, Achievement[]>();
    for (const achievement of visible) {
      if (!map.has(achievement.category)) map.set(achievement.category, []);
      map.get(achievement.category)!.push(achievement);
    }
    return CATEGORY_ORDER.filter((category) => map.has(category)).map((category) => ({
      category,
      items: map.get(category)!,
    }));
  }, [visible]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl py-8 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Achievements</h1>
          <p className="text-muted-foreground">
            Unlock badges as you build consistency. Achievements are evaluated from your real data.
          </p>
        </div>
        <Button variant="outline" onClick={load}>
          Refresh
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Trophy className="h-7 w-7" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {unlockedCount} / {achievements.length}
                </div>
                <div className="text-sm text-muted-foreground">Achievements unlocked</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {(["all", "unlocked", "locked"] as const).map((option) => (
                <Button
                  key={option}
                  size="sm"
                  variant={filter === option ? "default" : "outline"}
                  onClick={() => setFilter(option)}
                  className="capitalize"
                >
                  {option}
                </Button>
              ))}
            </div>
          </div>
          <div className="mt-5">
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${percent}%` }}
              />
            </div>
            <div className="mt-1 text-right text-xs text-muted-foreground">{percent}% complete</div>
          </div>
        </CardContent>
      </Card>

      {grouped.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
          <Lock className="mx-auto mb-3 h-9 w-9 opacity-40" />
          No achievements match this filter.
        </div>
      ) : (
        grouped.map((group) => (
          <section key={group.category} className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {CATEGORY_LABELS[group.category] || group.category}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.items.map((achievement) => {
                const Icon = ICONS[achievement.badgeIcon || ""] || Award;
                return (
                  <Card
                    key={achievement._id}
                    className={cn(
                      "p-4 transition",
                      achievement.unlocked
                        ? "border-primary/40"
                        : "opacity-70"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white"
                        style={{
                          backgroundColor: achievement.unlocked
                            ? achievement.badgeColor || "#6366F1"
                            : "#94A3B8",
                        }}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate text-sm font-semibold">{achievement.title}</h3>
                          {achievement.unlocked ? (
                            <Badge variant="success" className="shrink-0 text-[10px]">
                              Unlocked
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="shrink-0 text-[10px]">
                              Locked
                            </Badge>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {achievement.description}
                        </p>
                        <p className="mt-2 text-[11px] text-muted-foreground">
                          {achievement.unlocked
                            ? "Earned from your tracked activity"
                            : `Goal: reach ${achievement.threshold}`}
                        </p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </section>
        ))
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">How achievements work</CardTitle>
          <CardDescription>
            Every badge is derived from server-side counts of your habits, logs, goals, journal
            entries and focus sessions. Nothing is hardcoded per user.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
