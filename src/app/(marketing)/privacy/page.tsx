import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="font-bold text-xl">HabitForge</Link>
          <Link href="/" className="text-muted-foreground hover:text-foreground">Back to home</Link>
        </div>
      </nav>
      <div className="max-w-3xl mx-auto px-4 py-24">
        <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
        <p className="text-muted-foreground mb-6">Last updated: November 2026</p>
        <p className="text-muted-foreground">
          HabitForge respects your privacy. All habit data, journal entries, and personal
          information are stored in a database scoped to your account. We do not sell your
          data. You can export your data or delete your account at any time from Settings.
        </p>
      </div>
    </div>
  );
}
