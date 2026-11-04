"use client";
export const dynamic = "force-dynamic";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download, FileText, Loader2, Printer, RefreshCw } from "lucide-react";
import { useToast } from "@/lib/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface DailyPoint {
  date: string;
  scheduled: number;
  completed: number;
  completionRate: number;
}

interface Report {
  from: string;
  to: string;
  days: number;
  scheduled: number;
  completed: number;
  completionRate: number;
  activeDays: number;
  bestDay: { date: string; completionRate: number } | null;
  daily: DailyPoint[];
  habits: Array<{
    habitId: string;
    name: string;
    category: string;
    scheduled: number;
    completed: number;
    completionRate: number;
  }>;
  categories: Array<{
    category: string;
    scheduled: number;
    completed: number;
    completionRate: number;
  }>;
  focusMinutes: number;
  focusSessions: number;
  journalEntries: number;
  goalsCompleted: number;
  challengesActive: number;
}

function rateTone(rate: number) {
  if (rate >= 75) return "text-emerald-600 dark:text-emerald-400";
  if (rate >= 40) return "text-amber-600 dark:text-amber-400";
  return "text-destructive";
}

export default function ReportsPage() {
  const { toast } = useToast();
  const [report, setReport] = useState<Report | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (range: number) => {
      setLoading(true);
      try {
        const res = await fetch(`/api/reports?days=${range}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Failed to build report.");
        setReport(data);
      } catch (err: any) {
        toast({ variant: "destructive", message: err.message || "Failed to build report." });
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  useEffect(() => {
    load(days);
  }, [load, days]);

  if (loading && !report) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  const chartData =
    report?.daily.map((d) => ({
      ...d,
      label: d.date.slice(5),
    })) || [];

  return (
    <div className="mx-auto max-w-5xl py-8 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-muted-foreground">
            A server-generated summary of your tracked activity
            {report ? ` from ${report.from} to ${report.to}` : ""}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {[7, 30, 90].map((range) => (
            <Button
              key={range}
              size="sm"
              variant={days === range ? "default" : "outline"}
              onClick={() => setDays(range)}
            >
              {range} days
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

      {!report ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
          <FileText className="mx-auto mb-3 h-9 w-9 opacity-40" />
          No report data available yet.
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard
              label="Completion rate"
              value={`${report.completionRate}%`}
              hint={`${report.completed} of ${report.scheduled} check-ins`}
            />
            <SummaryCard
              label="Active days"
              value={report.activeDays}
              hint={`out of ${report.days} days`}
            />
            <SummaryCard
              label="Best day"
              value={report.bestDay ? `${report.bestDay.completionRate}%` : "—"}
              hint={report.bestDay?.date || "No completed days yet"}
            />
            <SummaryCard
              label="Focus time"
              value={`${report.focusMinutes}m`}
              hint={`${report.focusSessions} focus sessions`}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <SummaryCard label="Journal entries" value={report.journalEntries} hint="In this period" />
            <SummaryCard label="Goals completed" value={report.goalsCompleted} hint="All time" />
            <SummaryCard label="Active challenges" value={report.challengesActive} hint="Right now" />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Daily completion</CardTitle>
              <CardDescription>Completed check-ins vs scheduled habits per day</CardDescription>
            </CardHeader>
            <CardContent>
              {chartData.every((d) => d.scheduled === 0) ? (
                <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
                  No habits were scheduled in this period.
                </div>
              ) : (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} minTickGap={20} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip
                        labelFormatter={(label: any) => `Date ${label}`}
                        formatter={(value: any, name: any) => [
                          value,
                          name === "completed" ? "Completed" : "Scheduled",
                        ]}
                      />
                      <Bar dataKey="scheduled" fill="#CBD5E1" radius={[3, 3, 0, 0]} name="scheduled" />
                      <Bar dataKey="completed" fill="#6366F1" radius={[3, 3, 0, 0]} name="completed" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Per-habit performance</CardTitle>
                <CardDescription>Sorted by completion rate</CardDescription>
              </CardHeader>
              <CardContent>
                {report.habits.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">No habits yet.</p>
                ) : (
                  <div className="space-y-3">
                    {report.habits.map((habit) => (
                      <div key={habit.habitId} className="space-y-1">
                        <div className="flex items-center justify-between gap-2 text-sm">
                          <Link
                            href={`/dashboard/habits/${habit.habitId}`}
                            className="truncate font-medium hover:underline"
                          >
                            {habit.name}
                          </Link>
                          <span className={cn("shrink-0 font-semibold", rateTone(habit.completionRate))}>
                            {habit.completionRate}%
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                          <div
                            className="h-full bg-primary"
                            style={{ width: `${habit.completionRate}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[11px] text-muted-foreground">
                          <span className="capitalize">{habit.category}</span>
                          <span>
                            {habit.completed}/{habit.scheduled} check-ins
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Category breakdown</CardTitle>
                <CardDescription>Where your effort is going</CardDescription>
              </CardHeader>
              <CardContent>
                {report.categories.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    No scheduled habits in this period.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {report.categories.map((category) => (
                      <div
                        key={category.category}
                        className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-medium capitalize">{category.category}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {category.completed}/{category.scheduled} check-ins
                          </div>
                        </div>
                        <Badge variant={category.completionRate >= 60 ? "success" : "secondary"}>
                          {category.completionRate}%
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Export this report</CardTitle>
              <CardDescription>
                Downloads are generated server-side from your own data.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <a href="/api/export?format=json">
                  <Download className="mr-2 h-4 w-4" /> Export JSON
                </a>
              </Button>
              <Button asChild variant="outline">
                <a href="/api/export?format=csv">
                  <Download className="mr-2 h-4 w-4" /> Export CSV
                </a>
              </Button>
              <Button variant="outline" onClick={() => window.print()}>
                <Printer className="mr-2 h-4 w-4" /> Print
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  hint: string;
}) {
  return (
    <Card className="p-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
      </CardContent>
    </Card>
  );
}
