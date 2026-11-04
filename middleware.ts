import { NextResponse } from "next/server";
import { validateSession, readSessionCookie } from "@/lib/session";
import dbConnect from "@/lib/database";

const PUBLIC_PREFIXES = [
  "/auth",
  "/api/auth",
  "/api/webhooks",
  "/api/cron",
  "/_next",
  "/favicon.ico",
  "/manifest.json",
  "/sw.js",
  "/icons",
  "/sitemap.xml",
  "/robots.txt",
];

const PUBLIC_PAGES = new Set([
  "/",
  "/features",
  "/pricing",
  "/about",
  "/contact",
  "/privacy",
  "/terms",
]);

const DASHBOARD_PREFIX = "/dashboard";
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js).*)"],
};

export async function middleware(req: any) {
  const { pathname } = req.nextUrl;
  const method: string = req.method;

  // CSRF defense-in-depth for cookie-authenticated API mutations:
  // if a browser sends an Origin header it must match this host.
  if (pathname.startsWith("/api/") && MUTATING_METHODS.has(method)) {
    const origin = req.headers.get("origin");
    if (origin) {
      try {
        if (new URL(origin).host !== req.nextUrl.host) {
          return NextResponse.json({ error: "Cross-origin request blocked." }, { status: 403 });
        }
      } catch {
        return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
      }
    }
  }

  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }
  if (PUBLIC_PAGES.has(pathname)) {
    return NextResponse.next();
  }

  const isAuthPage = pathname.startsWith("/auth");
  const isDashboard = pathname.startsWith(DASHBOARD_PREFIX);
  const isApi = pathname.startsWith("/api/");

  // Marketing assets and unknown public files do not need a DB round-trip.
  if (!isAuthPage && !isDashboard && !isApi) {
    return NextResponse.next();
  }

  await dbConnect();
  const token = readSessionCookie(req);
  const session = token ? await validateSession(token) : null;

  if (isAuthPage && session) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (isDashboard && !session) {
    const loginUrl = new URL("/auth/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const res = NextResponse.next();
  if (session) {
    res.headers.set("x-user-id", String(session.user._id));
    res.headers.set("x-user-email", String(session.user.email));
  }
  return res;
}
