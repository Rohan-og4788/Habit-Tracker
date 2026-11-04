"use client";
export const dynamic = "force-dynamic";

import { useCallback, useEffect, useState } from "react";
import { Bell, BellRing, Loader2, Mail, MonitorSmartphone, Save } from "lucide-react";
import { useToast } from "@/lib/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const TOGGLES: Array<{ key: string; label: string; description: string }> = [
  { key: "emailEnabled", label: "Email notifications", description: "Reminders and summaries by email" },
  { key: "pushEnabled", label: "Push notifications", description: "Browser push when the app is closed" },
  { key: "inAppEnabled", label: "In-app notifications", description: "Show notifications inside HabitForge" },
  { key: "habitReminders", label: "Habit reminders", description: "Nudges at your configured reminder time" },
  { key: "dailyMorning", label: "Morning overview", description: "A daily plan at the start of the day" },
  { key: "eveningReview", label: "Evening review", description: "A prompt to reflect on the day" },
  { key: "incompleteReminder", label: "Incomplete habits", description: "Remind me about unfinished habits" },
  { key: "streakMilestones", label: "Streak milestones", description: "Celebrate streak achievements" },
  { key: "goalDeadlines", label: "Goal deadlines", description: "Warn me before a goal is due" },
  { key: "weeklyReport", label: "Weekly report", description: "A weekly progress summary" },
  { key: "monthlyReport", label: "Monthly report", description: "A monthly progress summary" },
];

export default function NotificationsPage() {
  const { toast } = useToast();
  const [prefs, setPrefs] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pushInfo, setPushInfo] = useState<{ configured: boolean; publicKey: string } | null>(null);
  const [registering, setRegistering] = useState(false);

  const load = useCallback(async () => {
    try {
      const [prefsRes, pushRes] = await Promise.all([
        fetch("/api/notifications/preferences"),
        fetch("/api/notifications/push-key"),
      ]);
      if (!prefsRes.ok) throw new Error("Could not load notification preferences.");
      setPrefs(await prefsRes.json());
      if (pushRes.ok) setPushInfo(await pushRes.json());
    } catch (err: any) {
      toast({ variant: "destructive", message: err.message });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  async function update(key: string, value: any) {
    setPrefs((prev: any) => ({ ...prev, [key]: value }));
    try {
      const res = await fetch("/api/notifications/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setPrefs((prev: any) => ({ ...prev, [key]: !value }));
        toast({ variant: "destructive", message: data.error || "Could not update preference." });
      }
    } catch {
      setPrefs((prev: any) => ({ ...prev, [key]: !value }));
      toast({ variant: "destructive", message: "Network error. Please try again." });
    }
  }

  async function saveTimes() {
    setSaving(true);
    try {
      const res = await fetch("/api/notifications/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reminderTime: prefs.reminderTime,
          quietHoursStart: prefs.quietHoursStart,
          quietHoursEnd: prefs.quietHoursEnd,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ variant: "destructive", message: data.error || "Could not save times." });
        return;
      }
      toast({ variant: "success", message: "Notification times saved." });
    } catch {
      toast({ variant: "destructive", message: "Network error. Please try again." });
    } finally {
      setSaving(false);
    }
  }

  async function enableBrowserPush() {
    if (!pushInfo?.configured) {
      toast({
        variant: "destructive",
        message:
          "Push notifications are not configured on this deployment. Ask the administrator to set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY.",
      });
      return;
    }
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      toast({ variant: "destructive", message: "This browser does not support push notifications." });
      return;
    }
    setRegistering(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast({ variant: "destructive", message: "Notification permission was not granted." });
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ||
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(pushInfo.publicKey),
        }));
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ variant: "destructive", message: data.error || "Could not register for push." });
        return;
      }
      toast({ variant: "success", message: "Browser push notifications enabled." });
    } catch {
      toast({ variant: "destructive", message: "Could not enable push notifications." });
    } finally {
      setRegistering(false);
    }
  }

  if (loading || !prefs) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Notifications</h1>
        <p className="text-muted-foreground">Choose what you want to hear about and when.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <BellRing className="h-4 w-4 text-primary" /> Channels
          </CardTitle>
          <CardDescription>Pick how HabitForge can reach you.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {TOGGLES.slice(0, 3).map((item) => (
            <Row
              key={item.key}
              icon={
                item.key === "emailEnabled" ? Mail : item.key === "pushEnabled" ? Bell : MonitorSmartphone
              }
              label={item.label}
              description={item.description}
              checked={Boolean(prefs[item.key])}
              onChange={(v) => update(item.key, v)}
            />
          ))}
          <div className="rounded-lg border border-border p-3 text-xs text-muted-foreground">
            {pushInfo?.configured ? (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>Register this browser to receive push notifications.</span>
                <Button size="sm" variant="outline" onClick={enableBrowserPush} disabled={registering}>
                  {registering ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
                  Enable push
                </Button>
              </div>
            ) : (
              <span>
                Push notifications are disabled on this deployment. Set VAPID_PUBLIC_KEY and
                VAPID_PRIVATE_KEY to enable them.
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Reminders &amp; reports</CardTitle>
          <CardDescription>Only the notifications you enable will be sent.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {TOGGLES.slice(3).map((item) => (
            <Row
              key={item.key}
              label={item.label}
              description={item.description}
              checked={Boolean(prefs[item.key])}
              onChange={(v) => update(item.key, v)}
            />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Timing</CardTitle>
          <CardDescription>Reminder and quiet-hours times use your account timezone.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="reminder-time">Reminder time</Label>
              <Input
                id="reminder-time"
                type="time"
                value={prefs.reminderTime || "09:00"}
                onChange={(e) => setPrefs({ ...prefs, reminderTime: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quiet-start">Quiet hours start</Label>
              <Input
                id="quiet-start"
                type="time"
                value={prefs.quietHoursStart || "22:00"}
                onChange={(e) => setPrefs({ ...prefs, quietHoursStart: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quiet-end">Quiet hours end</Label>
              <Input
                id="quiet-end"
                type="time"
                value={prefs.quietHoursEnd || "08:00"}
                onChange={(e) => setPrefs({ ...prefs, quietHoursEnd: e.target.value })}
              />
            </div>
          </div>
          <Button onClick={saveTimes} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save times
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  description,
  checked,
  onChange,
}: {
  icon?: any;
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-start gap-3">
        {Icon ? <Icon className="mt-0.5 h-4 w-4 text-muted-foreground" /> : null}
        <div>
          <div className="text-sm font-medium">{label}</div>
          <div className="text-xs text-muted-foreground">{description}</div>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}
