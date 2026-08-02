import { NextResponse } from "next/server";
import { stripeEnabled } from "@/lib/stripeServer";

export const runtime = "nodejs";

// Public — tells the checkout which payment methods to show. Only the PUBLISHABLE key is exposed.
export async function GET() {
  const stripe = stripeEnabled();
  return NextResponse.json({
    stripe,
    publishableKey: stripe ? process.env.STRIPE_PUBLISHABLE_KEY : null,
  });
}
