export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { User } from "@/models/User";
import { VerificationToken } from "@/models/VerificationToken";
import { hashToken } from "@/lib/auth";
import dbConnect from "@/lib/database";

export async function GET(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");
    if (!token) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/auth/verify-email?error=missing_token`);
    }

    const record = await VerificationToken.findOne({
      token: hashToken(token),
      purpose: "email_verification",
      used: false,
      expiresAt: { $gt: new Date() },
    }).lean();

    if (!record) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/auth/verify-email?error=invalid_or_expired`);
    }

    await User.findByIdAndUpdate(record.userId, { emailVerified: true });
    await VerificationToken.findByIdAndUpdate(record._id, { used: true });

    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/auth/verify-email?success=1`);
  } catch (err: any) {
    console.error("Verify email error:", err);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/auth/verify-email?error=server_error`);
  }
}
