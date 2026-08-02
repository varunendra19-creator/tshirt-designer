import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getStripe, stripeEnabled } from "@/lib/stripeServer";
import { rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

/**
 * POST { order_id } — create a Stripe Checkout Session for an existing PENDING order
 * and return its hosted-checkout URL. The order is charged for its stored total
 * (server value; the client never supplies the amount here).
 */
export async function POST(req: Request) {
  const limited = rateLimit(req, "pay-checkout", 15, 60_000);
  if (limited) return limited;
  if (!stripeEnabled()) return NextResponse.json({ error: "Online payment is not enabled." }, { status: 400 });
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 501 });

  const b = await req.json().catch(() => ({}));
  if (!b.order_id) return NextResponse.json({ error: "order_id required" }, { status: 400 });

  const { data: order } = await supabase.from("orders").select("*").eq("id", b.order_id).maybeSingle();
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.payment_status !== "unpaid") return NextResponse.json({ error: "Order is not awaiting payment" }, { status: 409 });

  // If the order belongs to an account, the requester must be that user.
  if (order.user_id) {
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    const { data } = token ? await supabase.auth.getUser(token) : { data: { user: null } };
    if (data?.user?.id !== order.user_id) return NextResponse.json({ error: "Not your order" }, { status: 403 });
  }

  const stripe = await getStripe();
  if (!stripe) return NextResponse.json({ error: "Online payment is not enabled." }, { status: 400 });

  const origin = req.headers.get("origin") || new URL(req.url).origin;
  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      client_reference_id: order.id,
      customer_email: order.email || undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "inr",
            unit_amount: Math.round(order.total * 100), // paise
            product_data: { name: `Campus Mode order #${order.order_no}` },
          },
        },
      ],
      metadata: { order_id: order.id, order_no: order.order_no },
      success_url: `${origin}/checkout?status=success&order_no=${order.order_no}`,
      cancel_url: `${origin}/checkout?status=cancelled&order_no=${order.order_no}`,
    },
    { idempotencyKey: `checkout_${order.id}` },
  );

  await supabase.from("orders").update({ stripe_session_id: session.id }).eq("id", order.id);
  return NextResponse.json({ url: session.url });
}
