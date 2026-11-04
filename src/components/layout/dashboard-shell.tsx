"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CheckCircle,
  Calendar,
  BarChart3,
  Target,
  List,
  Settings,
  Bell,
  BookOpen,
  Clock,
  LogOut,
  User,
  Moon,
  Sun,
  Menu,
  Trophy,
  Swords,
  FileText,
  HelpCircle,
  CreditCard,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV: { label: string; href: string; icon: any; exact?: boolean }[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, exact: true },
  { label: "My Habits", href: "/dashboard/habits", icon: CheckCircle },
  { label: "Planner", href: "/dashboard/daily-planner", icon: List },
  { label: "Calendar", href: "/dashboard/calendar", icon: Calendar },
  { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { label: "Reports", href: "/dashboard/reports", icon: FileText },
  { label: "Goals", href: "/dashboard/goals", icon: Target },
  { label: "Challenges", href: "/dashboard/challenges", icon: Swords },
  { label: "Achievements", href: "/dashboard/achievements", icon: Trophy },
  { label: "Journal", href: "/dashboard/journal", icon: BookOpen },
  { label: "Focus", href: "/dashboard/focus", icon: Clock },
];

const SECONDARY_NAV: { label: string; href: string; icon: any }[] = [
  { label: "Notifications", href: "/dashboard/notifications", icon: Bell },
  { label: "Profile", href: "/dashboard/profile", icon: User },
  { label: "Subscription", href: "/dashboard/subscription", icon: CreditCard },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
  { label: "Help", href: "/dashboard/help", icon: HelpCircle },
];

const MOBILE_NAV = [
  { label: "Home", href: "/dashboard", icon: LayoutDashboard, exact: true },
  { label: "Habits", href: "/dashboard/habits", icon: CheckCircle },
  { label: "Planner", href: "/dashboard/daily-planner", icon: List },
  { label: "Stats", href: "/dashboard/analytics", icon: BarChart3 },
  { label: "More", href: "/dashboard/settings", icon: Settings },
];

type Theme = "light" | "dark" | "system";

function applyTheme(theme: Theme) {
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const dark = theme === "dark" || (theme === "system" && systemDark);
  document.documentElement.classList.toggle("dark", dark);
  return dark;
}

export default function DashboardShell({
  user,
  children,
}: {
  user: any;
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const stored = (localStorage.getItem("hf-theme") as Theme | null) || "system";
    setDark(applyTheme(stored));

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const current = (localStorage.getItem("hf-theme") as Theme | null) || "system";
      if (current === "system") setDark(applyTheme("system"));
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  function toggleTheme() {
    const next: Theme = dark ? "light" : "dark";
    localStorage.setItem("hf-theme", next);
    setDark(applyTheme(next));
  }

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const initials = (user?.name?.[0] || user?.email?.[0] || "U").toUpperCase();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:w-72 flex-col border-r border-border bg-card">
        <Link href="/dashboard" className="flex items-center gap-2 px-6 py-6">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <svg className="h-4 w-4 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span className="font-bold text-lg">HabitForge</span>
        </Link>

        <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-1">
          {NAV.map((item) => (
            <NavLink key={item.href} item={item} active={isActive(item.href, item.exact)} />
          ))}
          <div className="my-3 border-t border-border" />
          {SECONDARY_NAV.map((item) => (
            <NavLink key={item.href} item={item} active={isActive(item.href)} />
          ))}
        </nav>

        <div className="border-t border-border p-3">
          <div className="flex items-center gap-3 rounded-xl px-2 py-2">
            <div className="h-9 w-9 shrink-0 rounded-full bg-secondary border border-border overflow-hidden flex items-center justify-center text-sm font-semibold text-muted-foreground">
              {user?.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.image} alt="" className="h-full w-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium truncate">{user?.name || "User"}</div>
              <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
            </div>
            <button
              className="p-1.5 text-muted-foreground hover:bg-secondary rounded-lg"
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
          <Link
            href="/auth/logout"
            className="mt-1 flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </Link>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-40 border-b border-border bg-background/90 backdrop-blur">
        <div className="flex h-14 items-center justify-between px-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 text-muted-foreground hover:bg-secondary rounded-lg"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link href="/dashboard" className="font-semibold text-sm">
            HabitForge
          </Link>
          <div className="flex items-center gap-1">
            <button
              className="p-2 text-muted-foreground hover:bg-secondary rounded-lg"
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <Link
              href="/dashboard/profile"
              className="h-8 w-8 rounded-full bg-secondary border border-border flex items-center justify-center text-xs font-semibold"
              aria-label="Profile"
            >
              {initials}
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      {sidebarOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-card border-r border-border shadow-2xl">
            <div className="flex items-center justify-between px-4 py-4 border-b border-border">
              <span className="font-bold">HabitForge</span>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-2 text-muted-foreground hover:bg-secondary rounded-lg"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
              {[...NAV, ...SECONDARY_NAV].map((item) => (
                <NavLink
                  key={item.href}
                  item={item as any}
                  active={isActive(item.href, (item as any).exact)}
                  onClick={() => setSidebarOpen(false)}
                />
              ))}
            </nav>
            <div className="border-t border-border p-3">
              <Link
                href="/auth/logout"
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
              >
                <LogOut className="h-4 w-4" /> Sign out
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      <div className="lg:pl-72">
        <main className="px-4 sm:px-6 lg:px-8 pt-20 lg:pt-8 pb-24 lg:pb-10 max-w-7xl mx-auto">
          {children}
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur">
        <div className="flex justify-around px-2 py-1.5">
          {MOBILE_NAV.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 rounded-lg py-1.5 text-[11px]",
                isActive(item.href, item.exact)
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function NavLink({
  item,
  active,
  onClick,
}: {
  item: { label: string; href: string; icon: any };
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
      )}
    >
      <item.icon className="h-5 w-5 shrink-0" />
      {item.label}
    </Link>
  );
}
