export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

/**
 * Stripe webhook placeholder. Billing is disabled until Stripe credentials and
 * the optional Stripe SDK are configured; this endpoint never pretends a
 * payment succeeded.
 */
export async function POST() {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!webhookSecret || !secretKey) {
    return NextResponse.json(
      {
        error:
          "Stripe billing is not configured. Set STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET and STRIPE_PRICE_PRO in your environment to enable subscriptions.",
        configured: false,
      },
      { status: 503 }
    );
  }

  return NextResponse.json(
    {
      error:
        "Stripe is configured but the webhook handler requires the optional Stripe SDK integration. See docs/DEPLOYMENT.md#billing.",
      configured: true,
    },
    { status: 501 }
  );
}
