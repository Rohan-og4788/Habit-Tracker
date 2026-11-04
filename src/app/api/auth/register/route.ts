export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { registerSchema } from "@/lib/validations";
import { hashPassword } from "@/lib/auth";
import { User } from "@/models/User";
import { VerificationToken } from "@/models/VerificationToken";
import { createSession, readSessionCookie, destroySession, destroyAllUserSessions } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { sendEmail, isEmailConfigured } from "@/lib/email";
import dbConnect from "@/lib/database";
import { generateToken, hashToken, VERIFICATION_TOKEN_TTL_MS } from "@/lib/auth";

function clientError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: Request) {
  try {
    await dbConnect();

    // Rate limit by IP
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const limit = rateLimit(`auth:register:${ip}`, { max: 5, windowMs: 60 * 60 * 1000 });
    if (!limit.allowed) {
      return clientError("Too many registration attempts. Try again later.", 429);
    }

    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return clientError(parsed.error.errors[0].message || "Invalid input");
    }

    const { name, email, password } = parsed.data;

    const existing = await User.findOne({ email }).lean();
    if (existing) {
      // Don't reveal whether email exists; return generic success but don't create
      return NextResponse.json({ message: "If the account exists, a verification email was sent." });
    }

    const passwordHash = await hashPassword(password);
    const requestedTimezone =
      typeof body?.timezone === "string" ? body.timezone : "";
    let timezone = "UTC";
    try {
      if (requestedTimezone) {
        new Intl.DateTimeFormat("en-US", { timeZone: requestedTimezone });
        timezone = requestedTimezone;
      }
    } catch {
      timezone = "UTC";
    }

    const user = await User.create({
      name,
      email,
      passwordHash,
      emailVerified: false,
      theme: "system",
      timezone,
      language: "en",
    });

    // Email verification token
    const token = generateToken();
    await VerificationToken.create({
      userId: user._id,
      token: hashToken(token),
      purpose: "email_verification",
      expiresAt: new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS()),
      used: false,
    });

    // Send verification email (non-fatal if not configured)
    if (isEmailConfigured()) {
      const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/verify-email?token=${token}`;
      await sendEmail({
        to: email,
        subject: "Verify your HabitForge email",
        html: `<p>Hi ${name},</p><p>Click <a href="${verifyUrl}">here</a> to verify your email address.</p>`,
      });
    }

    // Create session and log in
    const res = NextResponse.json({
      user: { id: user._id, name: user.name, email: user.email, emailVerified: false },
      message: "Account created. Please verify your email.",
    });
    await createSession(String(user._id), res, ip, req.headers.get("user-agent") ?? "");
    return res;
  } catch (err: any) {
    console.error("Register error:", err);
    return clientError("Registration failed. Please try again.", 500);
  }
}
