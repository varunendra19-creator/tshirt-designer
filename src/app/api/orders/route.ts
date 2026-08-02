import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { checkStock } from "@/lib/stockServer";
import { computeGST } from "@/lib/tax";
import { validateCoupon } from "@/lib/coupons";
import { sendEmail } from "@/lib/email";
import { orderConfirmationEmail } from "@/lib/emailTemplates";
import { rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

type ItemIn = {
  product_id?: string;
  name: string;
  size?: string;
  color?: string;
  qty: number;
  unit_price: number;
  line_total: number;
  is_custom?: boolean;
  design_image?: string;  // base64 data URL OR a storage URL (custom designs only)
  design_spec?: any;      // full production spec { meta, surfaces[] }
};
type OrderIn = {
  customer: { name: string; phone: string; email?: string; address: string; city: string; state: string; pincode: string };
  payment_method: string;
  items: ItemIn[];
  subtotal: number;
  shipping: number;
  total: number;
  coupon_code?: string;
};

const genOrderNo = () => "CM" + Math.floor(100000 + Math.random() * 900000);

// data:image/jpeg;base64,XXXX → { buffer, ext }
function decodeDataUrl(dataUrl: string): { buffer: Buffer; ext: string } | null {
  const m = /^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/i.exec(dataUrl);
  if (!m) return null;
  const ext = m[1].toLowerCase() === "jpeg" ? "jpg" : m[1].toLowerCase();
  return { buffer: Buffer.from(m[2], "base64"), ext };
}

export async function POST(req: Request) {
  const limited = rateLimit(req, "orders", 12, 60_000); // 12/min/IP
  if (limited) return limited;

  let body: OrderIn;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  // ── validation ──
  const c = body?.customer;
  if (!c?.name?.trim() || !/^\d{10}$/.test(c.phone || "") || !c.address?.trim() ||
      !c.city?.trim() || !c.state?.trim() || !/^\d{6}$/.test(c.pincode || "") ||
      !Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: "Missing or invalid fields" }, { status: 422 });
  }

  const supabase = getSupabaseAdmin();
  // Not configured yet → tell the client to fall back to a local confirmation,
  // so checkout keeps working before Supabase keys are added.
  if (!supabase) {
    return NextResponse.json({ ok: true, configured: false, order_no: genOrderNo() });
  }

  // ── validate stock (catalogue items only; custom designs skip) ──
  const stockErr = await checkStock(supabase, body.items as any[]);
  if (stockErr) return NextResponse.json({ error: stockErr }, { status: 409 });

  // ── GST (prices are inclusive; store the tax portion for invoices) ──
  const tax = computeGST(body.items.map((it) => ({ price: it.unit_price, qty: it.qty })));

  const order_no = genOrderNo();

  // ── resolve the logged-in user from the bearer token (if any) ──
  let userId: string | null = null;
  let accountEmail: string | null = null;
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (token) {
    const { data: u } = await supabase.auth.getUser(token);
    userId = u?.user?.id ?? null;
    accountEmail = u?.user?.email ?? null;
  }

  // ── coupon: re-validate server-side (never trust a client-sent discount) ──
  const subtotalR = Math.round(body.subtotal);
  const shippingR = Math.round(body.shipping);
  let discount = 0;
  let couponCode: string | null = null;
  if (body.coupon_code) {
    const cr = await validateCoupon(supabase, body.coupon_code, subtotalR, shippingR, userId);
    if (cr.ok) { discount = cr.discount; couponCode = cr.code ?? null; }
  }
  const totalFinal = Math.max(0, subtotalR + shippingR - discount);

  // ── insert order ──
  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .insert({
      order_no,
      user_id: userId,
      customer_name: c.name.trim(),
      phone: c.phone.trim(),
      email: c.email?.trim() || accountEmail || null, // fall back to the account email
      address: c.address.trim(),
      city: c.city.trim(),
      state: c.state.trim(),
      pincode: c.pincode.trim(),
      payment_method: body.payment_method,
      subtotal: subtotalR,
      shipping: shippingR,
      tax,
      discount,
      coupon_code: couponCode,
      total: totalFinal,
    })
    .select("id, order_no")
    .single();

  if (orderErr || !order) {
    console.error("[orders] insert order failed:", orderErr);
    return NextResponse.json({ error: "Could not save order" }, { status: 500 });
  }

  // ── upload custom design images, then insert items ──
  const items = [];
  for (let i = 0; i < body.items.length; i++) {
    const it = body.items[i];
    let design_image_url: string | null = null;

    if (it.is_custom && it.design_image) {
      if (/^https?:\/\//.test(it.design_image)) {
        design_image_url = it.design_image;          // already uploaded (preview URL from /api/design)
      } else {
        const decoded = decodeDataUrl(it.design_image);
        if (decoded) {
          const path = `${order.id}/${i}.${decoded.ext}`;
          const { error: upErr } = await supabase.storage
            .from("designs")
            .upload(path, decoded.buffer, { contentType: `image/${decoded.ext === "jpg" ? "jpeg" : decoded.ext}`, upsert: true });
          if (!upErr) design_image_url = supabase.storage.from("designs").getPublicUrl(path).data.publicUrl;
          else console.error("[orders] design upload failed:", upErr);
        }
      }
    }

    items.push({
      order_id: order.id,
      product_id: it.product_id ?? null,
      name: it.name,
      size: it.size ?? null,
      color: it.color ?? null,
      qty: it.qty,
      unit_price: Math.round(it.unit_price),
      line_total: Math.round(it.line_total),
      is_custom: !!it.is_custom,
      design_image_url,
      design_spec: it.design_spec ?? null,
    });
  }

  const { error: itemsErr } = await supabase.from("order_items").insert(items);
  if (itemsErr) {
    console.error("[orders] insert items failed:", itemsErr);
    // best-effort cleanup so we don't leave an order with no items
    await supabase.from("orders").delete().eq("id", order.id);
    return NextResponse.json({ error: "Could not save order items" }, { status: 500 });
  }

  // ── redeem the coupon (atomic; over-limit races are logged, not fatal — order already placed) ──
  if (couponCode) {
    const { data: newCount } = await supabase.rpc("redeem_coupon", { p_code: couponCode });
    if (newCount === -1) console.warn("[orders] coupon exhausted at redeem:", couponCode);
  }

  // ── order-confirmation email (no-op unless a provider is configured; never fatal) ──
  // For online payment we wait for the webhook (payment success) so we don't "confirm"
  // an order the customer abandoned at the payment step. COD confirms at placement.
  const recipient = c.email?.trim() || accountEmail || "";
  if (recipient && body.payment_method !== "online") {
    const mail = orderConfirmationEmail({
      order_no: order.order_no, customer_name: c.name, email: recipient,
      address: c.address, city: c.city, state: c.state, pincode: c.pincode,
      payment_method: body.payment_method, subtotal: subtotalR, shipping: shippingR, tax, discount, total: totalFinal,
      coupon_code: couponCode,
      items: items.map((it) => ({ name: it.name, qty: it.qty, size: it.size, color: it.color, line_total: it.line_total, is_custom: it.is_custom })),
    });
    await sendEmail({ to: recipient, subject: mail.subject, html: mail.html });
  }

  return NextResponse.json({ ok: true, configured: true, id: order.id, order_no: order.order_no, discount, total: totalFinal });
}
