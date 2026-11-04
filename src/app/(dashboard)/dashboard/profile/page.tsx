"use client";
export const dynamic = "force-dynamic";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BadgeCheck, Bot, Loader2, Save, ShieldAlert, User as UserIcon } from "lucide-react";
import { useToast } from "@/lib/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const FALLBACK_TIMEZONES = [
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

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
  { value: "fr", label: "Français" },
  { value: "de", label: "Deutsch" },
  { value: "pt", label: "Português" },
  { value: "hi", label: "हिन्दी" },
];

export default function ProfilePage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [image, setImage] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [language, setLanguage] = useState("en");
  const [aiConsent, setAiConsent] = useState(false);

  const timezones = useMemo(() => {
    const supported =
      typeof Intl !== "undefined" && (Intl as any).supportedValuesOf
        ? ((Intl as any).supportedValuesOf("timeZone") as string[])
        : FALLBACK_TIMEZONES;
    return Array.from(new Set([...FALLBACK_TIMEZONES, ...supported]));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/account");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to load profile.");
      setProfile(data);
      setName(data.name || "");
      setBio(data.bio || "");
      setImage(data.image || "");
      setTimezone(data.timezone || "UTC");
      setLanguage(data.language || "en");
      setAiConsent(Boolean(data.aiConsent));
    } catch (err: any) {
      toast({ variant: "destructive", message: err.message || "Failed to load profile." });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  async function save() {
    if (name.trim().length < 2) {
      toast({ variant: "destructive", message: "Name must be at least 2 characters." });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          bio,
          image: image.trim(),
          timezone,
          language,
          aiConsent,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ variant: "destructive", message: data.error || "Could not save profile." });
        return;
      }
      setProfile((prev: any) => ({ ...prev, ...data.user }));
      toast({ variant: "success", message: "Profile updated." });
    } catch {
      toast({ variant: "destructive", message: "Network error. Please try again." });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  const initials = (name?.[0] || profile?.email?.[0] || "U").toUpperCase();

  return (
    <div className="mx-auto max-w-2xl py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Profile</h1>
          <p className="text-muted-foreground">Manage how you appear and how your data is used.</p>
        </div>
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save profile
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-primary/10 text-xl font-bold text-primary">
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-lg font-semibold">{name || "Unnamed user"}</span>
                {profile?.emailVerified ? (
                  <Badge variant="success" className="gap-1">
                    <BadgeCheck className="h-3 w-3" /> Verified
                  </Badge>
                ) : (
                  <Badge variant="warning" className="gap-1">
                    <ShieldAlert className="h-3 w-3" /> Email unverified
                  </Badge>
                )}
              </div>
              <div className="truncate text-sm text-muted-foreground">{profile?.email}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Member since{" "}
                {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "—"}
              </div>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/settings">
                <UserIcon className="mr-2 h-3.5 w-3.5" /> Account settings
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Public details</CardTitle>
          <CardDescription>Shown only inside your own account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="profile-name">Name</Label>
            <Input
              id="profile-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-bio">Bio</Label>
            <textarea
              id="profile-bio"
              rows={3}
              maxLength={500}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="What are you working towards?"
            />
            <p className="text-right text-[11px] text-muted-foreground">{bio.length}/500</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-image">Avatar URL (optional)</Label>
            <Input
              id="profile-image"
              value={image}
              onChange={(e) => setImage(e.target.value)}
              placeholder="https://example.com/avatar.png"
            />
            <p className="text-[11px] text-muted-foreground">
              Image uploads require Cloudinary credentials. You can paste any public image URL.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Locale</CardTitle>
          <CardDescription>Used for dates, reminders and report windows.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Timezone</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {timezones.map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {tz}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Language</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Bot className="h-4 w-4 text-primary" /> AI insights consent
          </CardTitle>
          <CardDescription>
            When enabled and the deployment has an AI provider key, your aggregate habit stats may
            be sent to the AI provider to generate coaching advice. No raw journal text is sent.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium">Allow AI processing</div>
              <div className="text-xs text-muted-foreground">
                Without consent, the coach uses a local deterministic analysis.
              </div>
            </div>
            <Switch checked={aiConsent} onCheckedChange={setAiConsent} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
