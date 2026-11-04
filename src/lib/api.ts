import { NextResponse } from "next/server";
import { validateSession, readSessionCookie } from "@/lib/session";
import dbConnect from "@/lib/database";

export interface AuthContext {
  userId: string;
  user: any;
}

/**
 * Resolve the authenticated user from the session cookie.
 * Returns a 401 NextResponse when unauthenticated so route handlers can do:
 *   const auth = await requireAuth(req);
 *   if (auth instanceof NextResponse) return auth;
 */
export async function requireAuth(req: Request): Promise<AuthContext | NextResponse> {
  await dbConnect();
  const token = readSessionCookie(req);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const session = await validateSession(token);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  return { userId: String(session.user._id), user: session.user };
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function forbidden(message = "Forbidden.") {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function notFound(message = "Not found.") {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function serverError(err: unknown, fallback = "Something went wrong.") {
  // Log the full error server-side, but avoid leaking internal details (database
  // errors, stack fragments) to clients in production.
  console.error(fallback, err);
  const message =
    process.env.NODE_ENV === "production"
      ? fallback
      : err instanceof Error
        ? err.message
        : fallback;
  return NextResponse.json({ error: message }, { status: 500 });
}

export function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export function parseLimit(value: string | null, fallback = 50, max = 200): number {
  const n = parseInt(value || "", 10);
  if (Number.isNaN(n) || n <= 0) return fallback;
  return Math.min(n, max);
}
