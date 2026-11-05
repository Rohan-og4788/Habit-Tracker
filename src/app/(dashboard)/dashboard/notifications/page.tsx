"use client";
export const dynamic = "force-dynamic";

import { useCallback, useEffect, useState } from "react";
import { Bell, BellRing, CheckCheck, Inbox, Loader2, Mail, MonitorSmartphone, Save } from "lucide-react";
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
  const [inbox, setInbox] = useState<{ notifications: any[]; unreadCount: number }>({
    notifications: [],
    unreadCount: 0,
  });
  const [markingAll, setMarkingAll] = useState(false);

  const loadInbox = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications/inbox?limit=15");
      if (res.ok) setInbox(await res.json());
    } catch {
      // Inbox is non-critical; preferences still render.
    }
  }, []);

  const load = useCallback(async () => {
    try {
      const [prefsRes, pushRes] = await Promise.all([
        fetch("/api/notifications/preferences"),
        fetch("/api/notifications/push-key"),
      ]);
      if (!prefsRes.ok) throw new Error("Could not load notification preferences.");
      setPrefs(await prefsRes.json());
      if (pushRes.ok) setPushInfo(await pushRes.json());
      loadInbox();
    } catch (err: any) {
      toast({ variant: "destructive", message: err.message });
    } finally {
      setLoading(false);
    }
  }, [toast, loadInbox]);

  useEffect(() => {
    load();
  }, [load]);

  async function markRead(id: string) {
    const target = inbox.notifications.find((n) => n._id === id);
    if (!target || target.readAt) return;
    setInbox((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) =>
        n._id === id ? { ...n, readAt: new Date().toISOString() } : n
      ),
      unreadCount: Math.max(0, prev.unreadCount - 1),
    }));
    try {
      const res = await fetch(`/api/notifications/inbox/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read: true }),
      });
      if (!res.ok) throw new Error();
    } catch {
      toast({ variant: "destructive", message: "Could not mark the notification as read." });
      loadInbox();
    }
  }

  async function markAllRead() {
    setMarkingAll(true);
    try {
      const res = await fetch("/api/notifications/inbox/read-all", { method: "POST" });
      if (!res.ok) throw new Error();
      await loadInbox();
      toast({ variant: "success", message: "All notifications marked as read." });
    } catch {
      toast({ variant: "destructive", message: "Could not update notifications." });
    } finally {
      setMarkingAll(false);
    }
  }

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
            <Inbox className="h-4 w-4 text-primary" /> Inbox
            {inbox.unreadCount > 0 ? (
              <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                {inbox.unreadCount} new
              </span>
            ) : null}
          </CardTitle>
          <CardDescription>
            In-app notifications generated by your reminder schedule.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {inbox.notifications.length === 0 ? (
            <p className="rounded-lg border border-border p-3 text-xs text-muted-foreground">
              No notifications yet. Reminders appear here once the hourly reminder cron is
              configured (see <code>CRON_SECRET</code> in the deployment guide).
            </p>
          ) : (
            <>
              <ul className="divide-y divide-border rounded-lg border border-border">
                {inbox.notifications.map((n) => (
                  <li key={n._id}>
                    <button
                      type="button"
                      onClick={() => markRead(n._id)}
                      disabled={Boolean(n.readAt)}
                      className={`flex w-full items-start gap-3 p-3 text-left transition-colors ${
                        n.readAt ? "" : "bg-primary/5 hover:bg-primary/10"
                      } disabled:cursor-default`}
                    >
                      <span
                        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                          n.readAt ? "bg-border" : "bg-primary"
                        }`}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-baseline justify-between gap-2">
                          <span className={`text-sm ${n.readAt ? "font-normal" : "font-semibold"}`}>
                            {n.title}
                          </span>
                          <span className="text-xs text-muted-foreground">{formatWhen(n.createdAt)}</span>
                        </span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">{n.body}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <Button
                size="sm"
                variant="outline"
                onClick={markAllRead}
                disabled={markingAll || inbox.unreadCount === 0}
              >
                {markingAll ? (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCheck className="mr-2 h-3.5 w-3.5" />
                )}
                Mark all as read
              </Button>
            </>
          )}
        </CardContent>
      </Card>

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

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  return sameDay
    ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}
