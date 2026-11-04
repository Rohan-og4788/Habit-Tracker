import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="font-bold text-xl">HabitForge</Link>
          <Link href="/" className="text-muted-foreground hover:text-foreground">Back to home</Link>
        </div>
      </nav>
      <div className="max-w-3xl mx-auto px-4 py-24">
        <h1 className="text-3xl font-bold mb-8">Terms and Conditions</h1>
        <p className="text-muted-foreground mb-6">Last updated: November 2026</p>
        <p className="text-muted-foreground">
          By using HabitForge, you agree to these terms. The service is provided &quot;as is&quot; and
          is not a substitute for medical or mental health advice. AI-generated suggestions,
          when enabled, are not guaranteed results.
        </p>
      </div>
    </div>
  );
}
