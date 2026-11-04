import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import SWRegister from "@/components/sw-register";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://habitforge.app").replace(/\/$/, "");

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "HabitForge — Build Better Habits",
    template: "%s | HabitForge",
  },
  description:
    "Production-ready habit tracking SaaS platform. Build positive habits, track progress, and reach your goals.",
  applicationName: "HabitForge",
  icons: {
    icon: "/icons/icon.svg",
    apple: "/icons/icon-512.svg",
  },
  manifest: "/manifest.json",
  openGraph: {
    title: "HabitForge — Build Better Habits. Become Your Best Self.",
    description: "Track habits, build streaks, and reach your goals with HabitForge.",
    type: "website",
    url: APP_URL,
    siteName: "HabitForge",
  },
  twitter: {
    card: "summary_large_image",
    title: "HabitForge — Build Better Habits",
    description: "Track habits, build streaks, and reach your goals with HabitForge.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.className}>
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
        <SWRegister />
        <Toaster />
      </body>
    </html>
  );
}
