import Link from "next/link";

const plans = [
  {
    name: "Free",
    price: "$0",
    desc: "Get started with habit tracking.",
    features: ["Up to 5 active habits", "Boolean, numeric & duration tracking", "Calendar & heatmap", "Daily reminders", "Basic analytics", "Limited goals"],
    button: "Get started",
  },
  {
    name: "Pro",
    price: "$8/mo",
    desc: "For serious habit builders.",
    features: ["Unlimited habits", "Advanced analytics & reports", "AI habit coach", "Extended history", "All challenges", "Priority support", "CSV export"],
    button: "Start free trial",
    highlight: true,
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="font-bold text-xl">HabitForge</Link>
          <Link href="/" className="text-muted-foreground hover:text-foreground">Back to home</Link>
        </div>
      </nav>
      <div className="max-w-5xl mx-auto px-4 py-24">
        <div className="text-center mb-16">
          <h1 className="text-3xl font-bold mb-4">Simple, transparent pricing</h1>
          <p className="text-muted-foreground">Start free. Upgrade when you&apos;re ready.</p>
        </div>
        <div className="grid md:grid-cols-2 gap-8">
          {plans.map((plan) => (
            <div key={plan.name} className={`p-8 rounded-2xl border ${plan.highlight ? "border-primary bg-primary/5" : "border-border bg-card"}`}>
              <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
              <p className="text-lg font-bold mb-6">{plan.price}</p>
              <p className="text-sm text-muted-foreground mb-6">{plan.desc}</p>
              <ul className="space-y-3 text-sm mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/auth/register" className={`w-full block py-3 rounded-xl text-center font-semibold ${plan.highlight ? "bg-primary text-white" : "border border-border hover:bg-secondary"}`}>
                {plan.button}
              </Link>
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-muted-foreground mt-10">
          AI coach and email notifications require external credentials to be configured by the instance owner.
        </p>
      </div>
    </div>
  );
}
