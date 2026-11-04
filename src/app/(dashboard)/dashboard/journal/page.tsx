"use client";
export const dynamic = "force-dynamic";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, Pencil, Trash2, BookOpen } from "lucide-react";
import { useToast } from "@/lib/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const MOODS = ["excellent", "good", "neutral", "low", "difficult"];

const emptyForm = {
  date: new Date().toISOString().slice(0, 10),
  mood: "neutral",
  wentWell: "",
  struggledWith: "",
  learned: "",
  improveTomorrow: "",
  notes: "",
};

export default function JournalPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [form, setForm] = useState<any>(emptyForm);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/journal");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load journal.");
      setEntries(data.entries || []);
    } catch (err: any) {
      toast({ variant: "destructive", message: err.message });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  function openNew() {
    setEditingDate(null);
    setForm({ ...emptyForm, date: new Date().toISOString().slice(0, 10) });
    setOpen(true);
  }

  function openEdit(entry: any) {
    setEditingDate(entry.date);
    setForm({
      date: entry.date,
      mood: entry.mood || "neutral",
      wentWell: entry.wentWell || "",
      struggledWith: entry.struggledWith || "",
      learned: entry.learned || "",
      improveTomorrow: entry.improveTomorrow || "",
      notes: entry.notes || "",
    });
    setOpen(true);
  }

  async function save() {
    if (!form.date) {
      toast({ variant: "destructive", message: "Choose a date." });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(editingDate ? `/api/journal/${editingDate}` : "/api/journal", {
        method: editingDate ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ variant: "destructive", message: data.error || "Could not save entry." });
        return;
      }
      toast({ variant: "success", message: "Journal entry saved." });
      setOpen(false);
      await load();
      router.refresh();
    } catch {
      toast({ variant: "destructive", message: "Network error. Please try again." });
    } finally {
      setSaving(false);
    }
  }

  async function remove(entry: any) {
    if (!confirm(`Delete the journal entry for ${entry.date}?`)) return;
    setDeleting(entry.date);
    try {
      const res = await fetch(`/api/journal/${entry.date}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        toast({ variant: "destructive", message: data.error || "Delete failed." });
        return;
      }
      setEntries((prev) => prev.filter((e) => e.date !== entry.date));
      toast({ variant: "success", message: "Entry deleted." });
      router.refresh();
    } finally {
      setDeleting(null);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Journal</h1>
          <p className="text-muted-foreground">Reflect on your day.</p>
        </div>
        <Button className="flex items-center gap-2" onClick={openNew}>
          <Plus className="h-4 w-4" /> New entry
        </Button>
      </div>

      {entries.length === 0 ? (
        <div className="p-16 text-center text-muted-foreground">
          <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-40" />
          No journal entries yet. Reflect on your first day.
        </div>
      ) : (
        <div className="space-y-4">
          {entries.map((e) => (
            <Card key={e.date} className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold">{e.date}</span>
                <Badge className="capitalize">{e.mood}</Badge>
              </div>
              <div className="text-sm text-muted-foreground mb-3 space-y-1">
                {e.wentWell ? <p>✓ Went well: {e.wentWell}</p> : null}
                {e.struggledWith ? <p>⚠ Struggled: {e.struggledWith}</p> : null}
                {e.learned ? <p>💡 Learned: {e.learned}</p> : null}
                {e.improveTomorrow ? <p>🎯 Tomorrow: {e.improveTomorrow}</p> : null}
                {e.notes ? <p className="whitespace-pre-wrap">{e.notes}</p> : null}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => openEdit(e)}>
                  <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  disabled={deleting === e.date}
                  onClick={() => remove(e)}
                >
                  {deleting === e.date ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingDate ? "Edit entry" : "New journal entry"}</DialogTitle>
            <DialogDescription>Capture what happened and what you want to improve.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="journal-date">Date</Label>
                <Input
                  id="journal-date"
                  type="date"
                  value={form.date}
                  max={new Date().toISOString().slice(0, 10)}
                  disabled={!!editingDate}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Mood</Label>
                <Select value={form.mood} onValueChange={(v) => setForm({ ...form, mood: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MOODS.map((m) => (
                      <SelectItem key={m} value={m} className="capitalize">
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {[
              ["wentWell", "What went well?"],
              ["struggledWith", "What was difficult?"],
              ["learned", "What did you learn?"],
              ["improveTomorrow", "What will you improve tomorrow?"],
            ].map(([key, label]) => (
              <div key={key} className="space-y-2">
                <Label htmlFor={key}>{label}</Label>
                <textarea
                  id={key}
                  rows={2}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                />
              </div>
            ))}

            <div className="space-y-2">
              <Label htmlFor="notes">Free-form notes</Label>
              <textarea
                id="notes"
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Save entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
