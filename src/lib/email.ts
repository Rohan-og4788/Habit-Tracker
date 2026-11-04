import { Resend } from "resend";

let resend: Resend | null = null;

if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY);
}

export const EMAIL_FROM = process.env.EMAIL_FROM || "no-reply@habitforge.app";

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(opts: EmailOptions): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    return {
      success: false,
      error: "Email provider not configured (RESEND_API_KEY missing).",
    };
  }
  try {
    const result = await resend.emails.send({
      from: EMAIL_FROM,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    });
    return { success: true, error: undefined };
  } catch (err: any) {
    return { success: false, error: err?.message || "Email delivery failed" };
  }
}

export function isEmailConfigured(): boolean {
  return resend !== null;
}
