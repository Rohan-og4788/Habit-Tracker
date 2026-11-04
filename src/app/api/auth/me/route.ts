export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { validateSession, readSessionCookie } from "@/lib/session";
import { User } from "@/models/User";
import dbConnect from "@/lib/database";

export async function GET(req: Request) {
  try {
    await dbConnect();
    const token = readSessionCookie(req);
    if (!token) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }
    const session = await validateSession(token);
    if (!session) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }
    const user = session.user as any;
    return NextResponse.json({
      authenticated: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        image: user.image,
        bio: user.bio,
        timezone: user.timezone,
        language: user.language,
        theme: user.theme,
        emailNotifications: user.emailNotifications,
        pushNotifications: user.pushNotifications,
        aiConsent: user.aiConsent,
        role: user.role,
      },
    });
  } catch (err: any) {
    console.error("Me error:", err);
    return NextResponse.json({ error: "Failed to load session." }, { status: 500 });
  }
}
