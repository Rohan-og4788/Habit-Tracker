"use client";
export const dynamic = "force-dynamic";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  Download,
  KeyRound,
  Loader2,
  Monitor,
  Moon,
  Sun,
  Trash2,
} from "lucide-react";
import { useToast } from "@/lib/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Theme = "light" | "dark" | "system";

const TIMEZONES: string[] =
  typeof Intl !== "undefined" && (Intl as any).supportedValuesOf
    ? ((Intl as any).supportedValuesOf("timeZone") as string[])
    : [
        "UTC",
        "America/New_York",
        "America/Chicago",
        "America/Denver",
        "America/Los_Angeles",
        "Europe/London",
        "Europe/Berlin",
        "Europe/Paris",
        "Asia/Kolkata",
        "Asia/Tokyo",
        "Asia/Singapore",
        "Australia/Sydney",
      ];

function applyTheme(theme: Theme) {
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const dark = theme === "dark" || (theme === "system" && systemDark);
  document.documentElement.classList.toggle("dark", dark);
}

export default function SettingsPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [prefs, setPrefs] = useState<any>(null);
  const [theme, setTheme] = useState<Theme>("system");
  const [timezone, setTimezone] = useState("UTC");
  const [weekStartDay, setWeekStartDay] = useState("1");
  const [timeFormat, setTimeFormat] = useState("12");

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  const [passwordOpen, setPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const timezoneOptions = useMemo(() => Array.from(new Set(TIMEZONES)), []);

  const load = useCallback(async () => {
    try {
      const [pRes, sRes, nRes] = await Promise.all([
        fetch("/api/account"),
        fetch("/api/settings"),
        fetch("/api/notifications/preferences"),
      ]);
      if (!pRes.ok) throw new Error("Could not load your profile.");
      const p = await pRes.json();
      const s = sRes.ok ? await sRes.json() : {};
      const n = nRes.ok ? await nRes.json() : {};
      setProfile(p);
      setSettings(s);
      setPrefs(n);
      setTimezone(p.timezone || "UTC");
      setTheme((p.theme as Theme) || "system");
      setWeekStartDay(String(s.weekStartDay ?? 1));
      setTimeFormat(String(s.timeFormat ?? "12"));
    } catch (err: any) {
      toast({ variant: "destructive", message: err.message || "Failed to load settings." });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  function chooseTheme(next: Theme) {
    setTheme(next);
    localStorage.setItem("hf-theme", next);
    applyTheme(next);
  }

  async function save() {
    setSaving(true);
    try {
      const [accountRes, settingsRes] = await Promise.all([
        fetch("/api/account", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            theme,
            timezone,
            emailNotifications: prefs?.emailEnabled ?? true,
            pushNotifications: prefs?.pushEnabled ?? true,
          }),
        }),
        fetch("/api/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            weekStartDay: Number(weekStartDay),
            timeFormat,
          }),
        }),
      ]);
      const accountData = await accountRes.json().catch(() => ({}));
      const settingsData = await settingsRes.json().catch(() => ({}));
      if (!accountRes.ok) {
        toast({ variant: "destructive", message: accountData.error || "Could not save settings." });
        return;
      }
      if (!settingsRes.ok) {
        toast({ variant: "destructive", message: settingsData.error || "Could not save preferences." });
        return;
      }
      toast({ variant: "success", message: "Settings saved." });
      router.refresh();
    } catch {
      toast({ variant: "destructive", message: "Network error. Please try again." });
    } finally {
      setSaving(false);
    }
  }

  async function togglePref(key: string, value: boolean) {
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

  async function deleteAccount() {
    if (deleteConfirm !== "DELETE") {
      toast({ variant: "destructive", message: 'Type "DELETE" to confirm.' });
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "DELETE" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ variant: "destructive", message: data.error || "Could not delete account." });
        return;
      }
      toast({ variant: "success", message: "Account deleted." });
      window.location.href = "/";
    } catch {
      toast({ variant: "destructive", message: "Network error. Please try again." });
    } finally {
      setDeleting(false);
    }
  }

  async function changePassword() {
    setChangingPassword(true);
    try {
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ variant: "destructive", message: data.error || "Could not change password." });
        return;
      }
      toast({ variant: "success", message: "Password changed." });
      setPasswordOpen(false);
      setCurrentPassword("");
      setNewPassword("");
    } catch {
      toast({ variant: "destructive", message: "Network error. Please try again." });
    } finally {
      setChangingPassword(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Control your account and app preferences.</p>
        </div>
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
          Save changes
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Appearance</CardTitle>
          <CardDescription>Theme applies instantly and is saved to your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { value: "light", label: "Light", icon: Sun },
                { value: "dark", label: "Dark", icon: Moon },
                { value: "system", label: "System", icon: Monitor },
              ] as const
            ).map((option) => (
              <button
                key={option.value}
                onClick={() => chooseTheme(option.value)}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-xl border p-4 text-sm transition",
                  theme === option.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-secondary"
                )}
              >
                <option.icon className="h-5 w-5" />
                {option.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Locale</CardTitle>
          <CardDescription>
            Dates are stored in UTC and shown in your timezone.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Timezone</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {timezoneOptions.map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {tz}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Week starts on</Label>
              <Select value={weekStartDay} onValueChange={setWeekStartDay}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map(
                    (day, index) => (
                      <SelectItem key={day} value={String(index)}>
                        {day}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Time format</Label>
              <Select value={timeFormat} onValueChange={setTimeFormat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="12">12-hour</SelectItem>
                  <SelectItem value="24">24-hour</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Notifications</CardTitle>
          <CardDescription>
            Fine-grained notification settings live on the{" "}
            <Link href="/dashboard/notifications" className="text-primary hover:underline">
              notifications page
            </Link>
            .
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ToggleRow
            label="Email notifications"
            description="Reminders and account emails"
            checked={Boolean(prefs?.emailEnabled)}
            onChange={(v) => togglePref("emailEnabled", v)}
          />
          <ToggleRow
            label="Push notifications"
            description="Browser push notifications"
            checked={Boolean(prefs?.pushEnabled)}
            onChange={(v) => togglePref("pushEnabled", v)}
          />
          <ToggleRow
            label="Weekly report"
            description="A weekly summary of your progress"
            checked={Boolean(prefs?.weeklyReport)}
            onChange={(v) => togglePref("weeklyReport", v)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Data &amp; account</CardTitle>
          <CardDescription>Download a copy of your data or manage your account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3">
            <div>
              <div className="text-sm font-medium">Export all data (JSON)</div>
              <div className="text-xs text-muted-foreground">
                Habits, logs, goals, journal and more
              </div>
            </div>
            <Button asChild variant="outline" size="sm">
              <a href="/api/export?format=json">
                <Download className="mr-2 h-3.5 w-3.5" /> Download
              </a>
            </Button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3">
            <div>
              <div className="text-sm font-medium">Export habit logs (CSV)</div>
              <div className="text-xs text-muted-foreground">Spreadsheet-friendly history</div>
            </div>
            <Button asChild variant="outline" size="sm">
              <a href="/api/export?format=csv">
                <Download className="mr-2 h-3.5 w-3.5" /> Download
              </a>
            </Button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3">
            <div>
              <div className="text-sm font-medium">Password</div>
              <div className="text-xs text-muted-foreground">Change your sign-in password</div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setPasswordOpen(true)}>
              <KeyRound className="mr-2 h-3.5 w-3.5" /> Change
            </Button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/40 p-3">
            <div>
              <div className="text-sm font-medium text-destructive">Delete account</div>
              <div className="text-xs text-muted-foreground">
                Permanently delete your account and all data
              </div>
            </div>
            <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription>
              This permanently removes your habits, logs, goals, journal entries and account.
              This cannot be undone. Type <strong>DELETE</strong> to confirm.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            placeholder="DELETE"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={deleteAccount}
              disabled={deleting || deleteConfirm !== "DELETE"}
            >
              {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change password</DialogTitle>
            <DialogDescription>
              Use at least 8 characters with upper, lower, number and symbol.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current password</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={changePassword}
              disabled={changingPassword || !currentPassword || !newPassword}
            >
              {changingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Update password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

