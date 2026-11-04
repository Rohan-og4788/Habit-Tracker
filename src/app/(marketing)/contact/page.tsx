"use client";

import Link from "next/link";
import { useState } from "react";
import { useToast } from "@/lib/use-toast";

const TYPES = [
  { value: "feedback", label: "Feedback" },
  { value: "bug", label: "Bug report" },
  { value: "feature", label: "Feature request" },
  { value: "other", label: "Other" },
];

export default function ContactPage() {
  const { toast } = useToast();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    type: "feedback",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          variant: "destructive",
          message: data.error || "Could not send your message.",
        });
        return;
      }
      setSent(true);
      toast({ variant: "success", message: "Message sent. We will get back to you." });
      setForm({ name: "", email: "", type: "feedback", message: "" });
    } catch {
      toast({ variant: "destructive", message: "Network error. Please try again." });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="font-bold text-xl">HabitForge</Link>
          <Link href="/" className="text-muted-foreground hover:text-foreground">Back to home</Link>
        </div>
      </nav>
      <div className="max-w-2xl mx-auto px-4 py-24">
        <h1 className="text-3xl font-bold mb-8">Contact &amp; support</h1>
        <p className="text-muted-foreground mb-8">
          Have a question, bug report, or feature request? Send a message and it will be emailed to
          the deployment owner.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4 p-6 rounded-xl border border-border bg-card">
          <div className="space-y-2">
            <label htmlFor="contact-name" className="text-sm font-medium">Name</label>
            <input
              id="contact-name"
              className="w-full border rounded-lg px-3 py-2 bg-background"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              minLength={2}
              maxLength={100}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="contact-email" className="text-sm font-medium">Email</label>
            <input
              id="contact-email"
              type="email"
              className="w-full border rounded-lg px-3 py-2 bg-background"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              maxLength={200}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="contact-type" className="text-sm font-medium">Type</label>
            <select
              id="contact-type"
              className="w-full border rounded-lg px-3 py-2 bg-background"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              {TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label htmlFor="contact-message" className="text-sm font-medium">Message</label>
            <textarea
              id="contact-message"
              className="w-full border rounded-lg px-3 py-2 h-32 bg-background"
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              required
              minLength={10}
              maxLength={5000}
            />
          </div>
          <button
            type="submit"
            disabled={sending}
            className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-medium disabled:opacity-60"
          >
            {sending ? "Sending..." : "Send message"}
          </button>
          {sent ? (
            <p className="text-sm text-success">Thanks — your message was sent.</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              The form requires the deployment to have an email provider configured. If it is not,
              you will see a clear setup message instead of a fake success.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
