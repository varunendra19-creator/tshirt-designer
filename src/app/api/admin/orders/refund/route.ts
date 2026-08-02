import { NextResponse } from "next/server";
import { restoreStockForOrder } from "@/lib/stockServer";
import { logOrderEvent } from "@/lib/orderEvents";
import { requireAdmin } from "@/lib/adminAuth";
import { getStripe, stripeEnabled } from "@/lib/stripeServer";

export const runtime = "nodejs";

/**
 * POST — refund (full or partial) against an order.
 * Body: { id, amount?, reason?, restock? }
 *   amount  — INR to refund this time; defaults to the whole remaining balance. Clamped to [0, remaining].
 *   restock — if true, put the items' stock back.
 *
 * If the order was paid via Stripe (payment_ref = payment_intent) and Stripe is enabled,
 * the gateway refund is issued FIRST; only on success do we record it. COD/other orders
 * are recorded directly (money returned out-of-band).
 */
export async function POST(req: Request) {
  const { supabase, user, err } = await requireAdmin(req);
  if (err) return err;
  const b = await req.json().catch(() => ({}));
  if (!b.id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const actor = user?.email || "admin";

  const { data: o } = await supabase!.from("orders").select("*").eq("id", b.id).maybeSingle();
  if (!o) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (o.payment_status === "unpaid" || o.payment_status === "failed")
    return NextResponse.json({ error: "Nothing to refund — order is not paid" }, { status: 400 });

  const already = o.refund_amount || 0;
  const remaining = Math.max(0, (o.total || 0) - already);
  if (remaining <= 0) return NextResponse.json({ error: "Order is already fully refunded" }, { status: 400 });

  const reqAmount = b.amount === undefined || b.amount === null ? remaining : Math.round(Number(b.amount));
  if (!Number.isFinite(reqAmount) || reqAmount <= 0)
    return NextResponse.json({ error: "Invalid refund amount" }, { status: 400 });
  const amount = Math.min(reqAmount, remaining);

  const newTotal = already + amount;
  const payment_status = newTotal >= (o.total || 0) ? "refunded" : "partially_refunded";

  // Issue the gateway refund first (Stripe orders only). If it fails, abort before recording.
  let refundId: string | null = o.refund_id || null;
  let via = "";
  if (stripeEnabled() && o.payment_ref) {
    try {
      const stripe = await getStripe();
      const r = await stripe!.refunds.create({ payment_intent: o.payment_ref, amount: Math.round(amount * 100) });
      refundId = r.id;
      via = " via Stripe";
    } catch (e: any) {
      return NextResponse.json({ error: `Stripe refund failed: ${e.message}` }, { status: 502 });
    }
  }

  const { error } = await supabase!
    .from("orders")
    .update({
      refund_amount: newTotal,
      refunded_at: new Date().toISOString(),
      refund_reason: b.reason ? String(b.reason).slice(0, 500) : o.refund_reason || null,
      refund_id: refundId,
      payment_status,
    })
    .eq("id", b.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (b.restock) await restoreStockForOrder(supabase!, b.id);

  await logOrderEvent(
    supabase!,
    b.id,
    "refund",
    `Refunded ₹${amount}${via}${payment_status === "refunded" ? " (full)" : " (partial)"}${b.reason ? ` — ${b.reason}` : ""}${b.restock ? " · stock restored" : ""}`,
    actor,
  );
  return NextResponse.json({ ok: true, refunded: amount, total_refunded: newTotal, payment_status });
}
