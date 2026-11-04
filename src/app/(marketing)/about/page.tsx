import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="font-bold text-xl">HabitForge</Link>
          <Link href="/" className="text-muted-foreground hover:text-foreground">Back to home</Link>
        </div>
      </nav>
      <div className="max-w-3xl mx-auto px-4 py-24">
        <h1 className="text-3xl font-bold mb-8">About HabitForge</h1>
        <p className="text-muted-foreground mb-6">
          HabitForge is a personal growth platform designed to help people build positive habits,
          break bad ones, and stay consistent over the long term.
        </p>
        <p className="text-muted-foreground mb-6">
          Most habit trackers punish you for missing a day. HabitForge is different: it&apos;s built
          around recovery, grace days, and non-judgmental feedback so one missed day doesn&apos;t
          become a reason to quit.
        </p>
        <h3 className="text-xl font-semibold mt-10 mb-4">Our values</h3>
        <ul className="list-disc list-inside text-muted-foreground space-y-3 mb-6">
          <li>Consistency over intensity.</li>
          <li>Progress, not perfection.</li>
          <li>Your data belongs to you.</li>
          <li>No fake rankings or manipulation.</li>
        </ul>
      </div>
    </div>
  );
}
