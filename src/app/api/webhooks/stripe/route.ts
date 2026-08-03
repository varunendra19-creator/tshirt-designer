import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getStripe, stripeEnabled } from "@/lib/stripeServer";
import { commitStockForOrder } from "@/lib/stockServer";
import { logOrderEvent } from "@/lib/orderEvents";
import { sendEmail } from "@/lib/email";
import { orderConfirmationEmail } from "@/lib/emailTemplates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stripe webhook. Verifies the signature against the RAW body, then processes each
 * event at most once (processed_webhooks table). Marks orders paid on
 * checkout.session.completed and reconciles gateway refunds.
 */
export async function POST(req: Request) {
  if (!stripeEnabled()) return NextResponse.json({ received: true, ignored: "stripe disabled" });
  const stripe = await getStripe();
  const supabase = getSupabaseAdmin();
  if (!stripe || !supabase) return NextResponse.json({ received: true, ignored: "not configured" });

  const sig = req.headers.get("stripe-signature") || "";
  const raw = await req.text(); // raw body required for signature verification

  let event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (e: any) {
    return NextResponse.json({ error: `Signature verification failed: ${e.message}` }, { status: 400 });
  }

  // idempotency: first writer wins; a duplicate event id short-circuits.
  const { error: dupErr } = await supabase.from("processed_webhooks").insert({ event_id: event.id, type: event.type });
  if (dupErr) {
    if ((dupErr as any).code === "23505") return NextResponse.json({ received: true, duplicate: true });
    // storage error — let Stripe retry
    return NextResponse.json({ error: "idempotency store failed" }, { status: 500 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const s: any = event.data.object;
      const orderId = s.client_reference_id || s.metadata?.order_id;
      const paymentIntent = typeof s.payment_intent === "string" ? s.payment_intent : s.payment_intent?.id;
      if (orderId && s.payment_status === "paid") {
        // only flip an unpaid order → paid; keep it idempotent at the row level too
        const { data: updated } = await supabase
          .from("orders")
          .update({ payment_status: "paid", payment_ref: paymentIntent || null, stripe_session_id: s.id, status: "processing" })
          .eq("id", orderId).eq("payment_status", "unpaid").select("id").maybeSingle();
        if (updated) {
          await commitStockForOrder(supabase, orderId);
          await logOrderEvent(supabase, orderId, "payment", "Payment received (Stripe)", "stripe");
          // send the order-confirmation email now that payment has landed
          const { data: full } = await supabase
            .from("orders")
            .select("*, order_items(name, qty, size, color, line_total, is_custom)")
            .eq("id", orderId).maybeSingle();
          if (full?.email) {
            const mail = orderConfirmationEmail({
              order_no: full.order_no, customer_name: full.customer_name, email: full.email,
              address: full.address, city: full.city, state: full.state, pincode: full.pincode,
              payment_method: full.payment_method, subtotal: full.subtotal, shipping: full.shipping,
              tax: full.tax, discount: full.discount, total: full.total, coupon_code: full.coupon_code,
              items: (full.order_items || []).map((it: any) => ({ name: it.name, qty: it.qty, size: it.size, color: it.color, line_total: it.line_total, is_custom: it.is_custom })),
            });
            await sendEmail({ to: full.email, subject: mail.subject, html: mail.html });
          }
        }
      }
    } else if (event.type === "charge.refunded") {
      // reconcile a refund initiated in the Stripe dashboard (not through our admin panel)
      const charge: any = event.data.object;
      const pi = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
      if (pi) {
        const { data: order } = await supabase.from("orders").select("id, total, refund_amount").eq("payment_ref", pi).maybeSingle();
        if (order) {
          const refunded = Math.round((charge.amount_refunded || 0) / 100);
          if (refunded > (order.refund_amount || 0)) {
            await supabase.from("orders").update({
              refund_amount: refunded,
              payment_status: refunded >= (order.total || 0) ? "refunded" : "partially_refunded",
              refunded_at: new Date().toISOString(),
            }).eq("id", order.id);
            await logOrderEvent(supabase, order.id, "refund", `Refund reconciled from Stripe: ₹${refunded} total`, "stripe");
          }
        }
      }
    }
  } catch (e) {
    // processing failed after claiming the event → release the claim so Stripe can retry
    await supabase.from("processed_webhooks").delete().eq("event_id", event.id);
    return NextResponse.json({ error: "processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
