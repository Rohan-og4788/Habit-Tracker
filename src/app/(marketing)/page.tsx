"use client";

import Link from "next/link";
import { CheckCircle2, BarChart2, Flame, Bell, Target, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const features = [
  {
    title: "Smart habit tracking",
    desc: "Boolean, numeric, duration, count, checklist, and negative habit tracking — all in one place.",
    icon: CheckCircle2,
  },
  {
    title: "Streak engine",
    desc: "Reliable current and longest streaks with grace days, streak freezes, and recovery rules.",
    icon: Flame,
  },
  {
    title: "Calendar & heatmap",
    desc: "GitHub-style contribution heatmap and monthly calendar to visualize your consistency.",
    icon: BarChart2,
  },
  {
    title: "Goals & challenges",
    desc: "Set long-term goals, link habits, and take on time-boxed challenges.",
    icon: Target,
  },
  {
    title: "Smart reminders",
    desc: "Email, browser push, and in-app reminders that respect your timezone and quiet hours.",
    icon: Bell,
  },
  {
    title: "Focus timer",
    desc: "Pomodoro focus sessions linked to your habits, with session history.",
    icon: Clock,
  },
];

const pricingPlans = [
  {
    name: "Free",
    price: "$0",
    desc: "For getting started with habit tracking.",
    features: ["Up to 5 active habits", "Basic tracking & streaks", "Calendar & heatmap", "Daily reminders", "Limited goals"],
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$8",
    priceSuffix: "/mo",
    desc: "For serious habit builders.",
    features: ["Unlimited habits", "Advanced analytics & reports", "AI coach (when configured)", "Extended history", "All challenges", "Priority support"],
    highlighted: true,
  },
];

export default function LandingPage() {
  return (
    <div className="relative">
      {/* Hero */}
      <section className="relative px-4 pt-20 pb-32 sm:pt-32 sm:pb-40 lg:pt-44 lg:pb-48 overflow-hidden">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
            </span>
            Built for real people, not perfectionists
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-foreground mb-6">
            Build Better Habits.<br />
            <span className="text-primary">Become Your Best Self.</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            HabitForge helps you build positive habits, break bad ones, and stay consistent —
            with real tracking, streaks, analytics, and recovery when you miss a day.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button size="lg" className="w-full sm:w-auto" asChild>
              <Link href="/auth/register">Get started free</Link>
            </Button>
            <Button variant="outline" size="lg" className="w-full sm:w-auto" asChild>
              <a href="#features">Explore features</a>
            </Button>
          </div>
          <div className="mt-10 relative">
            <div className="absolute inset-0 bg-muted/50 rounded-2xl blur-xl"></div>
            <Card className="relative z-10 border-border max-w-md mx-auto shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Dashboard preview</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Your habits, streaks, and progress at a glance.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 h-64 overflow-hidden relative">
                <div className="flex gap-2 p-4">
                  {[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30].map((d) => (
                    <div key={d} className={`w-4 h-4 rounded ${d % 3 === 0 ? "bg-success" : d % 5 === 0 ? "bg-accent/50" : "bg-secondary"}`} />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20 border-y border-border">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">How HabitForge works</h2>
            <p className="text-muted-foreground">Simple, effective, non-judgmental.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[1,2,3].map((i) => (
              <div key={i} className="p-6 rounded-xl border border-border bg-card">
                <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center mb-4">
                  <svg className="h-5 w-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <h3 className="font-semibold mb-2">Create</h3>
                <p className="text-sm text-muted-foreground">Pick a habit, set your target, frequency, and reminder.</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Everything you need to stay consistent</h2>
            <p className="text-muted-foreground">Real tracking, real streaks, real progress.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {features.map((f) => (
              <Card key={f.title} className="p-6">
                <CardHeader>
                  <f.icon className="h-5 w-5 text-primary mb-3" />
                  <CardTitle>{f.title}</CardTitle>
                </CardHeader>
                <CardDescription className="text-sm">{f.desc}</CardDescription>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Analytics preview */}
      <section id="analytics" className="py-20 border-y border-border bg-secondary">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {[
              { label: "Daily completion rate", value: "78%" },
              { label: "Current streak", value: "12 days" },
              { label: "Habits on track", value: "6 / 8" },
            ].map((stat) => (
              <Card key={stat.label} className="p-6 text-center">
                <div className="text-2xl font-bold mb-1">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </Card>
            ))}
          </div>
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-4">Understand your patterns</h2>
            <p className="text-muted-foreground mb-8">Heatmaps, trends, and category insights — powered by your real data.</p>
            <Card className="mx-auto max-w-2xl p-8">
              <div className="flex items-center justify-center gap-2 h-48">
                {[...Array(7)].map((_, i) => (
                  <div key={i} className="w-2 h-full rounded-full bg-muted"></div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-4 text-center">Contribution-style heatmap preview</p>
            </Card>
          </div>
        </div>
      </section>

      {/* Testimonials (clearly demo) */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">What members are saying</h2>
            <p className="text-xs text-muted-foreground">Demo testimonials — illustrative only.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: "Alex", role: "Student", text: "The streak recovery rules kept me from quitting after a bad week." },
              { name: "Sam", role: "Developer", text: "Finally a tracker that handles my irregular work schedule." },
              { name: "Taylor", role: "Designer", text: "The heatmap makes consistency visible and motivating." },
            ].map((t) => (
              <Card key={t.name} className="p-6">
                <div className="text-muted-foreground text-sm italic mb-4">“{t.text}”</div>
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center">
                    {t.name[0]}
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.role}</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 border-y border-border">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Simple, transparent pricing</h2>
            <p className="text-muted-foreground">Start free. Upgrade when you&apos;re ready.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricingPlans.map((plan) => (
              <Card key={plan.name} className={cn("p-8 relative", plan.highlighted ? "border-primary ring-1 ring-primary" : "")}>
                {plan.highlighted && <Badge className="absolute top-0 right-0 m-3">Most popular</Badge>}
                <CardHeader>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.desc}</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="mb-6">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.priceSuffix}</span>
                  </div>
                  <ul className="space-y-3 text-sm">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-success" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button className="w-full" asChild>
                    <a href={plan.highlighted ? "/auth/register" : "#"}>
                      {plan.highlighted ? "Start free trial" : "Choose Free"}
                    </a>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
          <p className="text-center text-xs text-muted-foreground mt-8">
            Pro features such as the AI coach and email delivery require external credentials to be configured.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Frequently asked questions</h2>
          <div className="space-y-4">
            {[
              ["Is HabitForge free?", "Yes. The free plan includes up to 5 active habits, basic tracking, streaks, and the calendar."],
              ["Can I switch plans later?", "Absolutely. You can upgrade to Pro anytime from Settings."],
              ["Is my data private?", "Yes. All data is scoped to your account and never shared with other users."],
              ["Can I export my data?", "Yes. Go to Settings > Privacy to export your personal data."],
              ["Does it work offline?", "HabitForge is a PWA and caches static resources for offline use."],
            ].map(([q, a]) => (
              <Card key={q} className="p-6">
                <CardTitle className="text-base">{q}</CardTitle>
                <CardDescription className="text-sm">{a}</CardDescription>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="py-20 px-4">
        <Card className="max-w-2xl mx-auto p-8 md:p-12 text-center rounded-2xl bg-primary text-primary-foreground">
          <h2 className="text-2xl font-bold mb-2">Ready to build better habits?</h2>
          <p className="text-primary-foreground/90 mb-6">Join thousands building consistency, one day at a time.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
            <Button asChild size="lg" variant="secondary" className="flex-1">
              <Link href="/auth/register">Create free account</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="flex-1 border-white/30 bg-transparent text-primary-foreground hover:bg-white/10"
            >
              <Link href="/pricing">See plans</Link>
            </Button>
          </div>
          <p className="mt-3 text-sm text-primary-foreground/80">
            No credit card required. The free plan includes up to 5 active habits.
          </p>
        </Card>
      </section>
    </div>
  );
}
