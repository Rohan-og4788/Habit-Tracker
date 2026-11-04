export const dynamic = "force-dynamic";

import Link from "next/link";
import {
  BookOpen,
  Calendar,
  Download,
  HelpCircle,
  Keyboard,
  LifeBuoy,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const FAQS: Array<{ question: string; answer: string }> = [
  {
    question: "How are streaks calculated?",
    answer:
      "Streaks are computed from completed habit logs in your account timezone. A scheduled day that is missed breaks the current streak, while unscheduled days are ignored. Editing an old log recomputes the affected habit immediately.",
  },
  {
    question: "Why can't I mark a future day as complete?",
    answer:
      "Habit completion is only accepted for today or past dates in your timezone. This prevents logging progress that has not happened yet and keeps analytics honest.",
  },
  {
    question: "How does the free plan limit work?",
    answer:
      "The free plan allows up to 5 active habits. Archived habits do not count toward the limit. Upgrading to Pro removes the limit when billing is configured on the deployment.",
  },
  {
    question: "Where is my data stored?",
    answer:
      "Your account data is stored in MongoDB and every query is scoped to your authenticated user id. You can export everything as JSON or CSV from Settings, or delete your account permanently.",
  },
  {
    question: "Can I use HabitForge offline?",
    answer:
      "HabitForge is installable as a progressive web app. The shell can load offline, but changes require a network connection because the database is server-side.",
  },
  {
    question: "Why are push notifications unavailable?",
    answer:
      "Web push requires VAPID keys on the deployment. When they are not configured, the notifications page shows a setup message instead of pretending to subscribe.",
  },
];

const QUICK_LINKS = [
  { href: "/dashboard/habits/add", label: "Create a habit", icon: Sparkles, description: "Start tracking something new" },
  { href: "/dashboard/daily-planner", label: "Plan your day", icon: Calendar, description: "Add tasks that support your habits" },
  { href: "/dashboard/analytics", label: "Review analytics", icon: BookOpen, description: "See trends and consistency" },
  { href: "/dashboard/settings", label: "Export or delete data", icon: Download, description: "Control your account and data" },
];

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-3xl py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Help &amp; support</h1>
        <p className="text-muted-foreground">
          Answers to common questions and ways to get unstuck.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {QUICK_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-start gap-3 rounded-xl border border-border p-4 transition hover:bg-secondary"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <link.icon className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold">{link.label}</div>
              <div className="text-xs text-muted-foreground">{link.description}</div>
            </div>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <HelpCircle className="h-4 w-4 text-primary" /> Frequently asked questions
          </CardTitle>
          <CardDescription>Click a question to expand the answer.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {FAQS.map((faq) => (
            <details key={faq.question} className="group rounded-lg border border-border p-3">
              <summary className="cursor-pointer list-none text-sm font-medium marker:hidden">
                <span className="flex items-center justify-between gap-2">
                  {faq.question}
                  <span className="text-muted-foreground transition group-open:rotate-45">+</span>
                </span>
              </summary>
              <p className="mt-2 text-sm text-muted-foreground">{faq.answer}</p>
            </details>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Keyboard className="h-4 w-4 text-primary" /> Tips
          </CardTitle>
          <CardDescription>Small habits are easier to keep.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• Start with one habit you can complete in under two minutes.</p>
          <p>• Use the planner to attach tasks to an existing routine.</p>
          <p>• Check the calendar weekly to spot missed days early.</p>
          <p>• Export your data regularly if you want a personal backup.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <LifeBuoy className="h-4 w-4 text-primary" /> Contact support
          </CardTitle>
          <CardDescription>
            Support email is configured by the deployment owner. If it is not set, use the
            repository issue tracker.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild>
            <a href="mailto:support@habitforge.app?subject=HabitForge%20support%20request">
              Email support
            </a>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/settings">
              <ShieldCheck className="mr-2 h-4 w-4" /> Privacy &amp; data settings
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
