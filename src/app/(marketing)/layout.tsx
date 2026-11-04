import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="font-bold text-xl tracking-tight">HabitForge</span>
            </Link>
            <div className="hidden md:flex items-center gap-6 text-sm font-medium">
              {["Features", "Pricing", "How it works", "FAQ"].map((label) => (
                <Link
                  key={label}
                  href={`#${label.toLowerCase().replace(" ", "-")}`}
                  className="text-muted-foreground hover:text-primary transition"
                >
                  {label}
                </Link>
              ))}
              <Link href="/auth/login" className="text-muted-foreground hover:text-primary transition">
                Log in
              </Link>
              <Button asChild>
                <Link href="/auth/register">Get started free</Link>
              </Button>
            </div>
            <div className="flex items-center gap-3 md:hidden">
              <Button variant="outline" size="sm" asChild>
                <Link href="/auth/login">Log in</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/auth/register">Sign up</Link>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main>{children}</main>

      <footer className="border-t border-border mt-auto bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded bg-primary flex items-center justify-center">
                <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="font-semibold">HabitForge</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {new Date().getFullYear()} HabitForge.
            </p>
            <div className="flex gap-4 text-sm">
              <Link href="/privacy" className="text-muted-foreground hover:text-foreground">Privacy</Link>
              <Link href="/terms" className="text-muted-foreground hover:text-foreground">Terms</Link>
              <Link href="/contact" className="text-muted-foreground hover:text-foreground">Contact</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
