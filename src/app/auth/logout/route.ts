import { NextResponse } from "next/server";
import { readSessionCookie, destroySession, clearSessionCookies } from "@/lib/session";
import dbConnect from "@/lib/database";

export const dynamic = "force-dynamic";

/**
 * Convenience GET sign-out used by the dashboard shell. POST /api/auth/logout
 * remains the CSRF-protected endpoint for API clients.
 */
export async function GET(req: Request) {
  await dbConnect();
  const token = readSessionCookie(req);
  if (token) {
    await destroySession(token).catch(() => undefined);
  }
  const url = new URL("/", req.url);
  const res = NextResponse.redirect(url);
  clearSessionCookies(res);
  return res;
}
