import Link from "next/link";

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="font-bold text-xl">HabitForge</Link>
          <Link href="/" className="text-muted-foreground hover:text-foreground">Back to home</Link>
        </div>
      </nav>
      <div className="max-w-4xl mx-auto px-4 py-24">
        <h1 className="text-3xl font-bold mb-8">Features</h1>
        <p className="text-muted-foreground mb-12">Everything you need to build habits that stick.</p>
        <div className="space-y-8">
          {[
            ["Smart habit tracking", "Track boolean, numeric, duration, count, checklist, and negative habits with progress history."],
            ["Streak engine", "Current and longest streaks with grace days, streak freezes, and recovery rules that prevent one bad day from ending your progress."],
            ["Calendar & heatmap", "Monthly calendar and GitHub-style contribution heatmap to visualize consistency over time."],
            ["Goals & milestones", "Set long-term goals, link them to habits, and watch progress grow automatically."],
            ["Smart reminders", "Email, push, and in-app reminders scheduled around your timezone and quiet hours."],
            ["Focus timer", "Pomodoro sessions linked to habits, with daily focus statistics."],
            ["Journal & reflection", "Daily journaling with mood tracking to understand the emotions behind your habits."],
            ["Analytics & reports", "Real analytics on completion rates, consistency, and trends — exportable to CSV."],
          ].map(([title, desc]) => (
            <div key={title} className="p-6 rounded-xl border border-border bg-card flex gap-4">
              <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center text-primary flex-shrink-0">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              </div>
              <div>
                <h3 className="font-semibold">{title}</h3>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
