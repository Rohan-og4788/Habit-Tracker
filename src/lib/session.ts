import { Session, User } from "@/models";
import {
  generateSessionToken,
  generateCsrfToken,
  hashToken,
  SESSION_TTL_MS,
} from "@/lib/auth";
import dbConnect from "@/lib/database";

const SESSION_COOKIE_NAME = "hf_session";
const CSRF_COOKIE_NAME = "hf_csrf";

export async function createSession(
  userId: string,
  res: Response,
  ipAddress?: string,
  userAgent?: string
) {
  await dbConnect();
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS());

  await Session.create({
    userId,
    token,
    expiresAt,
  });

  const sessionCookie = {
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires: expiresAt,
  };

  // CSRF token (double-submit): readable by client, sent back on mutations
  const csrfToken = generateCsrfToken();
  const csrfCookie = {
    name: CSRF_COOKIE_NAME,
    value: csrfToken,
    httpOnly: false, // client must read it
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires: expiresAt,
  };

  // Set cookies via Set-Cookie headers on the response
  res.headers.append("Set-Cookie", serializeCookie(sessionCookie));
  res.headers.append("Set-Cookie", serializeCookie(csrfCookie));

  return { token, csrfToken, expiresAt };
}

export async function validateSession(token: string) {
  await dbConnect();
  const session = await Session.findOne({ token, expiresAt: { $gt: new Date() } })
    .populate("userId")
    .lean();
  if (!session) return null;
  const user = session.userId as any;
  if (!user || user.deletedAt) return null;
  return { user, session };
}

export async function destroySession(token: string) {
  await dbConnect();
  await Session.deleteOne({ token });
}

export async function destroyAllUserSessions(userId: string) {
  await dbConnect();
  await Session.deleteMany({ userId });
}

export function getSessionCookieName() {
  return SESSION_COOKIE_NAME;
}

export function getCsrfCookieName() {
  return CSRF_COOKIE_NAME;
}

function serializeCookie(opts: {
  name: string;
  value: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax" | "strict" | "none";
  path: string;
  expires: Date;
}) {
  const parts: string[] = [];
  parts.push(`${opts.name}=${encodeURIComponent(opts.value)}`);
  parts.push(`Path=${opts.path}`);
  parts.push(`Expires=${opts.expires.toUTCString()}`);
  if (opts.secure) parts.push("Secure");
  parts.push(`SameSite=${opts.sameSite}`);
  if (opts.httpOnly) parts.push("HttpOnly");
  return parts.join("; ");
}

export function clearSessionCookies(res: Response) {
  const now = new Date(0).toUTCString();
  res.headers.append(
    "Set-Cookie",
    `${SESSION_COOKIE_NAME}=; Path=/; Expires=${now}; HttpOnly; SameSite=lax${process.env.NODE_ENV === "production" ? "; Secure" : ""}`
  );
  res.headers.append(
    "Set-Cookie",
    `${CSRF_COOKIE_NAME}=; Path=/; Expires=${now}; SameSite=lax${process.env.NODE_ENV === "production" ? "; Secure" : ""}`
  );
}

export function readSessionCookie(req: Request): string | undefined {
  const cookie = req.headers.get("cookie") || "";
  const match = cookie.match(/(?:^|;\s*)hf_session=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : undefined;
}

export function readCsrfCookie(req: Request): string | undefined {
  const cookie = req.headers.get("cookie") || "";
  const match = cookie.match(/(?:^|;\s*)hf_csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : undefined;
}
