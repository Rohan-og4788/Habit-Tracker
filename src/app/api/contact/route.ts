export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { z } from "zod";
import { sendEmail, isEmailConfigured } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp, badRequest } from "@/lib/api";

const contactSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Enter a valid email address").max(200),
  type: z.enum(["feedback", "bug", "feature", "other"]).default("other"),
  message: z.string().min(10, "Message must be at least 10 characters").max(5000),
});

export async function POST(req: Request) {
  try {
    if (!isEmailConfigured()) {
      return NextResponse.json(
        {
          error:
            "Contact email is not configured on this deployment. Set RESEND_API_KEY and EMAIL_FROM to enable the contact form.",
          configured: false,
        },
        { status: 503 }
      );
    }

    const ip = getClientIp(req);
    const limit = rateLimit(`contact:${ip}`, { max: 5, windowMs: 60 * 60 * 1000 });
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many messages. Please try again later." },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const parsed = contactSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.errors[0]?.message || "Invalid contact message.");
    }

    const { name, email, type, message } = parsed.data;
    const to = process.env.CONTACT_EMAIL || process.env.EMAIL_FROM || "";
    if (!to) {
      return NextResponse.json(
        { error: "No contact recipient is configured.", configured: false },
        { status: 503 }
      );
    }

    const result = await sendEmail({
      to,
      subject: `[HabitForge contact] ${type} from ${name}`,
      html: `<h2>New contact message</h2>
        <p><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Type:</strong> ${escapeHtml(type)}</p>
        <p><strong>Message:</strong></p>
        <p>${escapeHtml(message).replace(/\n/g, "<br />")}</p>`,
      text: `Name: ${name}\nEmail: ${email}\nType: ${type}\n\n${message}`,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Could not send your message." },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, message: "Message sent." });
  } catch (err: any) {
    console.error("Contact form error:", err);
    return NextResponse.json({ error: "Could not send your message." }, { status: 500 });
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
