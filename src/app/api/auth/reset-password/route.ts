export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { resetPasswordSchema } from "@/lib/validations";
import { comparePassword, hashPassword, hashToken } from "@/lib/auth";
import { User } from "@/models/User";
import { VerificationToken } from "@/models/VerificationToken";
import { readSessionCookie, readCsrfCookie, clearSessionCookies, destroyAllUserSessions, createSession } from "@/lib/session";
import { validateCsrfToken } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";
import dbConnect from "@/lib/database";

function clientError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const limit = rateLimit(`auth:reset:${ip}`, { max: 5, windowMs: 60 * 60 * 1000 });
    if (!limit.allowed) {
      return clientError("Too many requests. Try again later.", 429);
    }

    const body = await req.json();
    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return clientError(parsed.error.errors[0].message || "Invalid input");
    }

    const { token, password } = parsed.data;

    const record = await VerificationToken.findOne({
      token: hashToken(token),
      purpose: "password_reset",
      used: false,
      expiresAt: { $gt: new Date() },
    }).lean();

    if (!record) {
      return clientError("Invalid or expired reset token.", 400);
    }

    const user = await User.findById(record.userId);
    if (!user || user.deletedAt) {
      return clientError("Invalid or expired reset token.", 400);
    }

    const newHash = await hashPassword(password);
    user.passwordHash = newHash;
    user.emailVerified = true; // mark verified on reset
    await user.save();

    // Invalidate token
    await VerificationToken.findByIdAndUpdate(record._id, { used: true });

    // Destroy all other sessions, create new session
    await destroyAllUserSessions(String(user._id));
    const res = NextResponse.json({ message: "Password reset. You are logged in." });
    await createSession(String(user._id), res, ip, req.headers.get("user-agent") ?? "");
    return res;
  } catch (err: any) {
    console.error("Reset password error:", err);
    return clientError("Reset failed. Try again.", 500);
  }
}
