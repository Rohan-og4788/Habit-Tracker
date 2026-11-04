export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { requireAuth, serverError } from "@/lib/api";
import { Subscription } from "@/models/Subscription";

export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    let subscription = await Subscription.findOne({ userId: auth.userId }).lean();
    if (!subscription) {
      subscription = {
        plan: "free",
        status: "inactive",
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      } as any;
    }
    return NextResponse.json({
      subscription,
      billingConfigured: Boolean(
        process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_PRO
      ),
    });
  } catch (err) {
    return serverError(err, "Failed to load subscription.");
  }
}

export async function POST() {
  const configured = Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_PRO);
  return NextResponse.json(
    {
      error: configured
        ? "Stripe checkout requires the optional Stripe SDK integration. See docs/DEPLOYMENT.md#billing."
        : "Billing is not configured on this deployment. Set STRIPE_SECRET_KEY and STRIPE_PRICE_PRO to enable upgrades. You can keep using the free plan meanwhile.",
      configured,
    },
    { status: configured ? 501 : 503 }
  );
}
