"use client";
export const dynamic = "force-dynamic";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, Check, CreditCard, Loader2, Sparkles } from "lucide-react";
import { useToast } from "@/lib/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface SubscriptionInfo {
  plan: string;
  status: string;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
}

const FREE_FEATURES = [
  "Up to 5 active habits",
  "Unlimited habit history",
  "Streaks, calendar and analytics",
  "Goals, journal and focus timer",
  "JSON and CSV data export",
];

const PRO_FEATURES = [
  "Unlimited active habits",
  "Everything in Free",
  "Priority support",
  "Early access to new features",
];

export default function SubscriptionPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [billingConfigured, setBillingConfigured] = useState(false);
  const [activeHabits, setActiveHabits] = useState<number | null>(null);
  const [upgrading, setUpgrading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [subRes, habitsRes] = await Promise.all([
        fetch("/api/subscription"),
        fetch("/api/habits?status=active&limit=200"),
      ]);
      const subData = await subRes.json().catch(() => ({}));
      if (!subRes.ok) throw new Error(subData.error || "Failed to load subscription.");
      setSubscription(subData.subscription);
      setBillingConfigured(Boolean(subData.billingConfigured));
      if (habitsRes.ok) {
        const habitsData = await habitsRes.json().catch(() => ({}));
        setActiveHabits(
          typeof habitsData.total === "number"
            ? habitsData.total
            : Array.isArray(habitsData.items)
            ? habitsData.items.length
            : null
        );
      }
    } catch (err: any) {
      toast({ variant: "destructive", message: err.message || "Failed to load subscription." });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  async function upgrade() {
    setUpgrading(true);
    try {
      const res = await fetch("/api/subscription", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      toast({
        variant: res.ok ? "success" : "destructive",
        message: data.error || "Checkout is not available on this deployment.",
      });
    } catch {
      toast({ variant: "destructive", message: "Network error. Please try again." });
    } finally {
      setUpgrading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  const isPro = subscription?.plan === "pro" && subscription?.status === "active";

  return (
    <div className="mx-auto max-w-3xl py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Subscription</h1>
        <p className="text-muted-foreground">Review your plan and usage.</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <CreditCard className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold capitalize">
                    {subscription?.plan || "free"} plan
                  </span>
                  <Badge variant={isPro ? "success" : "secondary"} className="capitalize">
                    {subscription?.status || "inactive"}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  {isPro
                    ? "Unlimited active habits and all features."
                    : "Free plan: up to 5 active habits."}
                </div>
              </div>
            </div>
            {isPro ? (
              <Button asChild variant="outline">
                <Link href="/dashboard/settings">Manage account</Link>
              </Button>
            ) : (
              <Button onClick={upgrade} disabled={upgrading}>
                {upgrading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                Upgrade to Pro
              </Button>
            )}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border p-3">
              <div className="text-xs text-muted-foreground">Active habits</div>
              <div className="text-xl font-bold">
                {activeHabits === null ? "—" : activeHabits}
                {!isPro ? <span className="text-sm font-normal text-muted-foreground"> / 5</span> : null}
              </div>
            </div>
            <div className="rounded-lg border border-border p-3">
              <div className="text-xs text-muted-foreground">Current period ends</div>
              <div className="text-xl font-bold">
                {subscription?.currentPeriodEnd
                  ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
                  : "—"}
              </div>
            </div>
          </div>

          {subscription?.cancelAtPeriodEnd ? (
            <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">
              Your plan will cancel at the end of the current period.
            </p>
          ) : null}
        </CardContent>
      </Card>

      {!billingConfigured ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <div className="font-medium">Billing is not configured on this deployment</div>
            <p className="text-muted-foreground">
              Set <code className="rounded bg-secondary px-1">STRIPE_SECRET_KEY</code>,{" "}
              <code className="rounded bg-secondary px-1">STRIPE_PRICE_PRO</code> and{" "}
              <code className="rounded bg-secondary px-1">STRIPE_WEBHOOK_SECRET</code> to enable
              upgrades. The free plan remains fully usable.
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className={!isPro ? "border-primary/50" : undefined}>
          <CardHeader>
            <CardTitle className="text-sm">Free</CardTitle>
            <CardDescription>Everything you need to start.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {FREE_FEATURES.map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 text-sm font-medium text-muted-foreground">
              {isPro ? "Included in your plan" : "Current plan"}
            </div>
          </CardContent>
        </Card>

        <Card className={isPro ? "border-primary/50" : undefined}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4 text-primary" /> Pro
            </CardTitle>
            <CardDescription>For people who want no limits.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {PRO_FEATURES.map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4">
              {isPro ? (
                <Badge variant="success">Active</Badge>
              ) : (
                <Button size="sm" onClick={upgrade} disabled={upgrading}>
                  {upgrading ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
                  Upgrade
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">
        Payments are handled by Stripe. HabitForge never stores card details. If billing is not
        configured, no checkout is created and no payment is taken.
      </p>
    </div>
  );
}
