"use client";
export const dynamic = "force-dynamic";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bot, Loader2, RefreshCw } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useToast } from "@/lib/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const COLORS = ["#6366F1", "#14B8A6", "#22C55E", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4"];

export default function AnalyticsPage() {
  const { toast } = useToast();
  const [overview, setOverview] = useState<any>(null);
  const [trend, setTrend] = useState<any[]>([]);
  const [habits, setHabits] = useState<any[]>([]);
  const [cats, setCats] = useState<any[]>([]);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [coach, setCoach] = useState<any>(null);
  const [coachLoading, setCoachLoading] = useState(false);

  const load = useCallback(
    async (range: number) => {
      setLoading(true);
      try {
        const [oRes, tRes, hRes, cRes] = await Promise.all([
          fetch("/api/analytics?section=overview"),
          fetch(`/api/analytics?section=trends&days=${range}`),
          fetch("/api/analytics?section=habits"),
          fetch("/api/analytics?section=categories"),
        ]);
        const [o, t, h, c] = await Promise.all([
          oRes.json(),
          tRes.json(),
          hRes.json(),
          cRes.json(),
        ]);
        if (!oRes.ok) throw new Error(o.error || "Failed to load analytics.");
        if (!tRes.ok) throw new Error(t.error || "Failed to load trends.");
        if (!hRes.ok) throw new Error(h.error || "Failed to load habit analytics.");
        if (!cRes.ok) throw new Error(c.error || "Failed to load category analytics.");
        setOverview(o);
        setTrend(t.trend || []);
        setHabits(h.habits || []);
        setCats(c.categories || []);
      } catch (err: any) {
        toast({ variant: "destructive", message: err.message || "Failed to load analytics." });
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  useEffect(() => {
    load(days);
  }, [load, days]);

  async function askCoach() {
    setCoachLoading(true);
    try {
      const res = await fetch("/api/ai/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ variant: "destructive", message: data.error || "Could not generate advice." });
        return;
      }
      setCoach(data);
    } catch {
      toast({ variant: "destructive", message: "Network error. Please try again." });
    } finally {
      setCoachLoading(false);
    }
  }

  if (loading && !overview) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  const hasTrend = trend.some((t) => t.scheduled > 0);
  const hasCategories = cats.some((c) => c.scheduled > 0);

  return (
    <div className="mx-auto max-w-5xl py-8 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">Understand your consistency over time.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {[7, 30, 90].map((range) => (
            <Button
              key={range}
              size="sm"
              variant={days === range ? "default" : "outline"}
              onClick={() => setDays(range)}
            >
              {range}d
            </Button>
          ))}
          <Button size="sm" variant="outline" onClick={() => load(days)} disabled={loading}>
            {loading ? (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-3.5 w-3.5" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Active habits" value={overview?.totalActiveHabits ?? 0} />
        <StatCard title="Done today" value={overview?.completedToday ?? 0} />
        <StatCard title="Daily rate" value={`${overview?.dailyCompletionRate ?? 0}%`} />
        <StatCard title="Longest streak" value={overview?.longestStreak ?? 0} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Weekly consistency" value={`${overview?.weeklyConsistency ?? 0}%`} />
        <StatCard title="Monthly consistency" value={`${overview?.monthlyConsistency ?? 0}%`} />
        <StatCard title="Tracking days" value={overview?.totalTrackingDays ?? 0} />
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <CardHeader>
            <CardTitle className="text-sm">Completion trend</CardTitle>
            <CardDescription>Last {days} days</CardDescription>
          </CardHeader>
          <CardContent>
            {!hasTrend ? (
              <EmptyChart message="Complete a habit to start building your trend." />
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trend}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={24} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="completionRate"
                      stroke="#6366F1"
                      strokeWidth={2}
                      dot={false}
                      name="Completion rate"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-5">
          <CardHeader>
            <CardTitle className="text-sm">Category performance</CardTitle>
            <CardDescription>Completion rate by category</CardDescription>
          </CardHeader>
          <CardContent>
            {!hasCategories ? (
              <EmptyChart message="No scheduled habits in this period." />
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={cats
                        .filter((c) => c.scheduled > 0)
                        .map((c) => ({ name: c.category, value: c.completionRate }))}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={(entry: any) => entry.name}
                    >
                      {cats.map((_, i) => (
                        <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Habit completion</CardTitle>
          <CardDescription>Completion rate per habit</CardDescription>
        </CardHeader>
        <CardContent>
          {habits.length === 0 ? (
            <EmptyChart message="Add habits to see per-habit analytics." />
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={habits}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} height={50} textAnchor="end" />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                  <Tooltip />
                  <Bar dataKey="completionRate" fill="#14B8A6" radius={[4, 4, 0, 0]} name="Completion rate" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Bot className="h-4 w-4 text-primary" /> Habit coach
            </CardTitle>
            <CardDescription>
              Get a personalised summary based on your aggregate stats.
            </CardDescription>
          </div>
          <Button size="sm" onClick={askCoach} disabled={coachLoading}>
            {coachLoading ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
            {coach ? "Refresh advice" : "Get advice"}
          </Button>
        </CardHeader>
        <CardContent>
          {!coach ? (
            <p className="text-sm text-muted-foreground">
              Ask for a short, data-driven coaching summary. AI is only used if the deployment
              is configured and you have enabled AI consent in your profile.
            </p>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={coach.provider === "openai" ? "default" : "secondary"}>
                  {coach.provider === "openai" ? "AI generated" : "Local analysis"}
                </Badge>
                {coach.consentRequired ? <Badge variant="warning">Consent required for AI</Badge> : null}
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{coach.message}</p>
              {coach.consentRequired ? (
                <Button asChild size="sm" variant="outline">
                  <Link href="/dashboard/profile">Enable AI consent</Link>
                </Button>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-72 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
      {message}
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: React.ReactNode }) {
  return (
    <Card className="p-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
