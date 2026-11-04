export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { runHabitReminders } from "@/services/reminder.service";
import dbConnect from "@/lib/database";

async function handle(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      {
        error:
          "Reminder cron is not configured. Set CRON_SECRET in your environment and configure the Vercel cron job.",
      },
      { status: 503 }
    );
  }

  const authorization = req.headers.get("authorization") || "";
  const headerSecret = req.headers.get("x-cron-secret") || "";
  const provided = authorization.startsWith("Bearer ")
    ? authorization.slice(7)
    : headerSecret;

  if (provided !== secret) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  await dbConnect();
  const result = await runHabitReminders();
  return NextResponse.json({ ok: true, ...result });
}

export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}
