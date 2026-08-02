import type Stripe from "stripe";

/**
 * Server-side Stripe, env-gated. The whole payment integration stays dormant
 * until all three keys are set, so the store defaults to Cash on Delivery.
 * Never expose STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET to the client.
 */
export function stripeEnabled(): boolean {
  return !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PUBLISHABLE_KEY && process.env.STRIPE_WEBHOOK_SECRET);
}

let cached: Stripe | null = null;

/** Lazily construct the Stripe client (dynamic import so module load never depends on it). */
export async function getStripe(): Promise<Stripe | null> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (cached) return cached;
  const { default: StripeCtor } = await import("stripe");
  cached = new StripeCtor(key, { apiVersion: "2024-06-20" as any });
  return cached;
}
