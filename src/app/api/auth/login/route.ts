export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { loginSchema } from "@/lib/validations";
import { comparePassword } from "@/lib/auth";
import { User } from "@/models/User";
import { createSession, readSessionCookie, destroyAllUserSessions } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import dbConnect from "@/lib/database";

function clientError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: Request) {
  try {
    await dbConnect();

    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const limit = rateLimit(`auth:login:${ip}`, { max: 10, windowMs: 60 * 60 * 1000 });
    if (!limit.allowed) {
      return clientError("Too many login attempts. Try again later.", 429);
    }

    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return clientError(parsed.error.errors[0].message || "Invalid input");
    }

    const { email, password } = parsed.data;

    const user = await User.findOne({ email }).select("+passwordHash").lean();
    if (!user) {
      // Generic failure to avoid user enumeration
      return clientError("Invalid email or password.", 401);
    }
    if (!user.passwordHash) {
      return clientError("Invalid email or password.", 401);
    }

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) {
      return clientError("Invalid email or password.", 401);
    }

    if (user.deletedAt) {
      return clientError("Account is deactivated.", 403);
    }

    // Session fixation prevention: destroy existing sessions, create new
    await destroyAllUserSessions(String(user._id));
    const res = NextResponse.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
      },
    });
    await createSession(String(user._id), res, ip, req.headers.get("user-agent") ?? "");

    await User.findByIdAndUpdate(user._id, { lastLoginAt: new Date() });

    return res;
  } catch (err: any) {
    console.error("Login error:", err);
    return clientError("Login failed. Please try again.", 500);
  }
}
