import { NextResponse } from "next/server";
import { commitStockForOrder, restoreStockForOrder } from "@/lib/stockServer";
import { logOrderEvent } from "@/lib/orderEvents";
import { requireAdmin } from "@/lib/adminAuth";
import { sendEmail } from "@/lib/email";
import { shippingUpdateEmail } from "@/lib/emailTemplates";

export const runtime = "nodejs";

const FULFILMENT = ["pending", "processing", "shipped", "delivered", "cancelled"];
const PAYMENT = ["unpaid", "paid", "partially_refunded", "refunded", "failed"];

// GET — every order, newest first, with items + timeline.
export async function GET(req: Request) {
  const { supabase, err } = await requireAdmin(req);
  if (err) return err;
  const { data, error } = await supabase!
    .from("orders")
    .select("*, order_items(*), order_events(*)")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  // sort each order's timeline oldest→newest for display
  (data ?? []).forEach((o: any) => o.order_events?.sort((a: any, b: any) => a.created_at.localeCompare(b.created_at)));
  return NextResponse.json({ orders: data });
}

/**
 * PATCH — update an order's fulfilment status, payment status, shipping/tracking or note.
 * Body: { id, status?, payment_status?, carrier?, tracking_no?, tracking_url?, admin_note?, reason? }
 * Side effects: writes timeline events, commits stock once fulfilment begins / payment lands,
 * and restores stock on cancellation.
 */
export async function PATCH(req: Request) {
  const { supabase, user, err } = await requireAdmin(req);
  if (err) return err;
  const b = await req.json().catch(() => ({}));
  if (!b.id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const actor = user?.email || "admin";

  const { data: cur } = await supabase!.from("orders").select("*").eq("id", b.id).maybeSingle();
  if (!cur) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const patch: Record<string, any> = {};
  const events: { type: any; message: string }[] = [];
  const nowISO = new Date().toISOString();

  // --- fulfilment status ---
  if (typeof b.status === "string" && b.status !== cur.status) {
    if (!FULFILMENT.includes(b.status)) return NextResponse.json({ error: "Bad status" }, { status: 400 });
    patch.status = b.status;
    if (b.status === "shipped" && !cur.shipped_at) patch.shipped_at = nowISO;
    if (b.status === "delivered") {
      if (!cur.delivered_at) patch.delivered_at = nowISO;
      // COD is collected on delivery → mark paid unless already refunded/failed
      if (cur.payment_method?.toLowerCase() === "cod" && cur.payment_status === "unpaid") {
        patch.payment_status = "paid";
        events.push({ type: "payment", message: "Marked paid (COD collected on delivery)" });
      }
    }
    if (b.status === "cancelled") {
      patch.cancelled_at = nowISO;
      if (b.reason) patch.cancel_reason = String(b.reason).slice(0, 500);
      events.push({ type: "cancel", message: `Order cancelled${b.reason ? ` — ${b.reason}` : ""}` });
    } else {
      events.push({ type: "status", message: `Status → ${b.status}` });
    }
  }

  // --- payment status (explicit override) ---
  if (typeof b.payment_status === "string" && b.payment_status !== (patch.payment_status ?? cur.payment_status)) {
    if (!PAYMENT.includes(b.payment_status)) return NextResponse.json({ error: "Bad payment_status" }, { status: 400 });
    patch.payment_status = b.payment_status;
    events.push({ type: "payment", message: `Payment → ${b.payment_status}` });
  }

  // --- shipping / tracking ---
  const shipFields = ["carrier", "tracking_no", "tracking_url"] as const;
  const shipChanged = shipFields.filter((f) => b[f] !== undefined && (b[f] || null) !== (cur[f] || null));
  for (const f of shipChanged) patch[f] = b[f] ? String(b[f]).slice(0, 300) : null;
  if (shipChanged.length) {
    const tn = patch.tracking_no ?? cur.tracking_no;
    const ca = patch.carrier ?? cur.carrier;
    events.push({ type: "shipping", message: `Tracking updated${ca ? ` · ${ca}` : ""}${tn ? ` #${tn}` : ""}` });
  }

  // --- admin note ---
  if (typeof b.admin_note === "string" && b.admin_note !== (cur.admin_note || "")) {
    patch.admin_note = b.admin_note.slice(0, 2000) || null;
    if (b.admin_note.trim()) events.push({ type: "note", message: `Note: ${b.admin_note.trim().slice(0, 200)}` });
  }

  if (!Object.keys(patch).length) return NextResponse.json({ ok: true, unchanged: true });

  const { error } = await supabase!.from("orders").update(patch).eq("id", b.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // stock: reserve once fulfilment begins or money is in; give back on cancel.
  const finalStatus = patch.status ?? cur.status;
  const finalPay = patch.payment_status ?? cur.payment_status;
  if (finalStatus === "cancelled") {
    await restoreStockForOrder(supabase!, b.id);
  } else if (["processing", "shipped", "delivered"].includes(finalStatus) || finalPay === "paid") {
    await commitStockForOrder(supabase!, b.id);
  }

  for (const e of events) await logOrderEvent(supabase!, b.id, e.type, e.message, actor);

  // ── shipping-update email: on the ship transition, or a tracking edit while shipped ──
  const nowShipped = finalStatus === "shipped";
  const shipEmail = (patch.status === "shipped" || (shipChanged.length > 0 && nowShipped));
  if (shipEmail && cur.email) {
    const merged = { ...cur, ...patch };
    const mail = shippingUpdateEmail({
      order_no: merged.order_no, customer_name: merged.customer_name, email: merged.email,
      address: merged.address, city: merged.city, state: merged.state, pincode: merged.pincode,
      carrier: merged.carrier, tracking_no: merged.tracking_no, tracking_url: merged.tracking_url, total: merged.total,
    });
    await sendEmail({ to: merged.email, subject: mail.subject, html: mail.html });
  }

  return NextResponse.json({ ok: true });
}
