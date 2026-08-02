import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";

export const runtime = "nodejs";

const EARNED = ["paid", "partially_refunded", "refunded"]; // payment states that count toward spend

// GET — every registered customer with order aggregates + addresses, plus guest (no-account) buyers.
export async function GET(req: Request) {
  const { supabase, err } = await requireAdmin(req);
  if (err) return err;

  const [{ data: profiles }, { data: orders }, { data: addresses }] = await Promise.all([
    supabase!.from("profiles").select("id, email, name, phone, role, created_at"),
    supabase!.from("orders").select("id, order_no, user_id, email, phone, customer_name, total, refund_amount, status, payment_status, created_at").order("created_at", { ascending: false }),
    supabase!.from("addresses").select("*"),
  ]);

  const ordersByUser: Record<string, any[]> = {};
  const guestByKey: Record<string, any[]> = {};
  for (const o of orders ?? []) {
    if (o.user_id) (ordersByUser[o.user_id] ??= []).push(o);
    else {
      // group guest (no-account) orders by email, then phone, else keep the order standalone
      const key = (o.email || "").toLowerCase() || o.phone || `order:${o.id}`;
      (guestByKey[key] ??= []).push(o);
    }
  }
  const addrByUser: Record<string, any[]> = {};
  for (const a of addresses ?? []) (addrByUser[a.user_id] ??= []).push(a);

  const spend = (list: any[]) =>
    list.filter((o) => EARNED.includes(o.payment_status)).reduce((s, o) => s + ((o.total || 0) - (o.refund_amount || 0)), 0);

  const customers = (profiles ?? []).map((p) => {
    const os = ordersByUser[p.id] || [];
    return {
      id: p.id, email: p.email, name: p.name, phone: p.phone, role: p.role || "customer", created_at: p.created_at,
      orders: os.map((o) => ({ id: o.id, order_no: o.order_no, total: o.total, status: o.status, payment_status: o.payment_status, created_at: o.created_at, refund_amount: o.refund_amount })),
      order_count: os.length,
      spent: spend(os),
      last_order: os[0]?.created_at || null,
      addresses: addrByUser[p.id] || [],
    };
  });
  // sort: most valuable first
  customers.sort((a, b) => b.spent - a.spent || b.order_count - a.order_count);

  const guests = Object.values(guestByKey).map((os) => ({
    email: os[0]?.email || null, phone: os[0]?.phone || null, name: os[0]?.customer_name || null,
    order_count: os.length, spent: spend(os), last_order: os[0]?.created_at || null,
    orders: os.map((o) => ({ id: o.id, order_no: o.order_no, total: o.total, status: o.status, payment_status: o.payment_status, created_at: o.created_at })),
  }));
  guests.sort((a, b) => b.spent - a.spent || b.order_count - a.order_count);

  return NextResponse.json({ customers, guests });
}

// PATCH — change a customer's role. Admin-only; can't demote yourself (avoid lockout).
export async function PATCH(req: Request) {
  const { supabase, user, role, err } = await requireAdmin(req);
  if (err) return err;
  if (role !== "admin") return NextResponse.json({ error: "Only an admin can change roles." }, { status: 403 });
  const b = await req.json().catch(() => ({}));
  const allowed = ["customer", "staff", "admin"];
  if (!b.id || !allowed.includes(b.role)) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  if (b.id === user!.id && b.role !== "admin")
    return NextResponse.json({ error: "You can’t remove your own admin access." }, { status: 400 });
  const { error } = await supabase!.from("profiles").update({ role: b.role }).eq("id", b.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
