export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { requireAuth, serverError } from "@/lib/api";
import { updateProfile, deleteAccount } from "@/services/account.service";
import { updateProfileSchema } from "@/lib/validations";
import { clearSessionCookies } from "@/lib/session";

export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    return NextResponse.json({
      id: auth.user._id,
      name: auth.user.name,
      email: auth.user.email,
      bio: auth.user.bio || "",
      image: auth.user.image || "",
      timezone: auth.user.timezone || "UTC",
      language: auth.user.language || "en",
      theme: auth.user.theme || "system",
      emailNotifications: auth.user.emailNotifications,
      pushNotifications: auth.user.pushNotifications,
      aiConsent: auth.user.aiConsent,
      emailVerified: auth.user.emailVerified,
      createdAt: auth.user.createdAt,
    });
  } catch (err) {
    return serverError(err, "Failed to load profile.");
  }
}

export async function PATCH(req: Request) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const body = await req.json();
    const parsed = updateProfileSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }
    const user = await updateProfile(auth.userId, parsed.data as any);
    return NextResponse.json({ user });
  } catch (err) {
    return serverError(err, "Failed to update profile.");
  }
}

export async function DELETE(req: Request) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const body = await req.json().catch(() => ({}));
    if (body.confirm !== "DELETE") {
      return NextResponse.json(
        { error: 'Type "DELETE" to confirm permanent account deletion.' },
        { status: 400 }
      );
    }
    await deleteAccount(auth.userId);
    const res = NextResponse.json({ ok: true, message: "Account deleted." });
    clearSessionCookies(res);
    return res;
  } catch (err) {
    return serverError(err, "Failed to delete account.");
  }
}
