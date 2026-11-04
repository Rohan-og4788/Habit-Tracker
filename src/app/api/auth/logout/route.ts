export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { readSessionCookie, readCsrfCookie, clearSessionCookies, destroySession } from "@/lib/session";
import { validateCsrfToken } from "@/lib/csrf";
import dbConnect from "@/lib/database";

export async function POST(req: Request) {
  try {
    await dbConnect();

    const sessionToken = readSessionCookie(req);
    const csrfToken = req.headers.get("x-csrf-token") || "";
    const cookieCsrf = readCsrfCookie(req);

    if (!validateCsrfToken(csrfToken, cookieCsrf)) {
      return NextResponse.json({ error: "Invalid CSRF token." }, { status: 403 });
    }

    if (sessionToken) {
      await destroySession(sessionToken);
    }

    const res = NextResponse.json({ message: "Logged out." });
    clearSessionCookies(res);
    return res;
  } catch (err: any) {
    console.error("Logout error:", err);
    return NextResponse.json({ error: "Logout failed." }, { status: 500 });
  }
}
