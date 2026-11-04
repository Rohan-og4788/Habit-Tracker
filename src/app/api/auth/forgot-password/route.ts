export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { forgotPasswordSchema } from "@/lib/validations";
import { User } from "@/models/User";
import { VerificationToken } from "@/models/VerificationToken";
import { rateLimit } from "@/lib/rate-limit";
import { sendEmail, isEmailConfigured } from "@/lib/email";
import { generateToken, hashToken, PASSWORD_RESET_TTL_MS } from "@/lib/auth";
import dbConnect from "@/lib/database";

function clientError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const limit = rateLimit(`auth:forgot:${ip}`, { max: 3, windowMs: 60 * 60 * 1000 });
    if (!limit.allowed) {
      return clientError("Too many requests. Try again later.", 429);
    }

    const body = await req.json();
    const parsed = forgotPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return clientError("Invalid email.");
    }

    const { email } = parsed.data;
    const user = await User.findOne({ email }).lean();

    // Always return generic success to prevent email enumeration
    if (user && !user.deletedAt && user.passwordHash) {
      const token = generateToken();
      await VerificationToken.create({
        userId: user._id,
        token: hashToken(token),
        purpose: "password_reset",
        expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS()),
        used: false,
      });

      if (isEmailConfigured()) {
        const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password?token=${token}`;
        await sendEmail({
          to: email,
          subject: "Reset your HabitForge password",
          html: `<p>Click <a href="${resetUrl}">here</a> to reset your password. This link expires in 1 hour.</p>`,
        });
      }
    }

    return NextResponse.json({ message: "If an account exists, a reset email was sent." });
  } catch (err: any) {
    console.error("Forgot password error:", err);
    return clientError("Request failed. Try again.", 500);
  }
}
