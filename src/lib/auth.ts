import { randomBytes, createHmac, timingSafeEqual } from "crypto";
import bcrypt from "bcryptjs";

function authSecret(): string {
  const secret = process.env.AUTH_SECRET || process.env.BETTER_AUTH_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET must be set in production.");
  }
  // Development-only fallback so local builds work without a .env file.
  return "habitforge-development-only-secret";
}

export function hashToken(token: string): string {
  return createHmac("sha256", authSecret()).update(token).digest("hex");
}

export function generateToken(): string {
  return randomBytes(32).toString("hex");
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export function generateSessionToken(): string {
  return randomBytes(32).toString("hex");
}

export function generateCsrfToken(): string {
  return randomBytes(16).toString("hex");
}

export function SESSION_TTL_MS(): number {
  return 30 * 24 * 60 * 60 * 1000; // 30 days
}

export function VERIFICATION_TOKEN_TTL_MS(): number {
  return 24 * 60 * 60 * 1000; // 24 hours
}

export function PASSWORD_RESET_TTL_MS(): number {
  return 60 * 60 * 1000; // 1 hour
}
