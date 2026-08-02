import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";

export const runtime = "nodejs";

const PAID = new Set(["paid", "shipped"]);

export async function GET(req: Request) {
  const { supabase, err } = await requireAdmin(req);
  if (err) return err;

  const [{ data: orders }, { count: customers }, { data: variants }] = await Promise.all([
    supabase!.from("orders").select("created_at, status, total, payment_method"),
    supabase!.from("profiles").select("id", { count: "exact", head: true }).eq("role", "customer"),
    supabase!.from("product_variants").select("stock"),
  ]);

  const all = orders ?? [];
  const revenue = all.filter((o) => PAID.has(o.status)).reduce((s, o) => s + (o.total || 0), 0);
  const ordersCount = all.length;
  const pending = all.filter((o) => o.status === "pending").length;
  const cancelled = all.filter((o) => o.status === "cancelled").length;
  const aov = ordersCount ? Math.round(revenue / Math.max(1, all.filter((o) => PAID.has(o.status)).length || 1)) : 0;

  const vs = variants ?? [];
  const lowStock = vs.filter((v) => v.stock > 0 && v.stock <= 5).length;
  const outOfStock = vs.filter((v) => v.stock === 0).length;

  // 14-day revenue series (by local date, paid/shipped)
  const days: { date: string; label: string; revenue: number; orders: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({ date: key, label: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }), revenue: 0, orders: 0 });
  }
  const byDate = new Map(days.map((d) => [d.date, d]));
  for (const o of all) {
    const key = (o.created_at || "").slice(0, 10);
    const bucket = byDate.get(key);
    if (bucket) { bucket.orders += 1; if (PAID.has(o.status)) bucket.revenue += o.total || 0; }
  }

  // payment method split
  const byPay: Record<string, number> = {};
  for (const o of all) byPay[o.payment_method || "other"] = (byPay[o.payment_method || "other"] || 0) + 1;

  return NextResponse.json({
    revenue, ordersCount, pending, cancelled, aov,
    customers: customers ?? 0,
    lowStock, outOfStock,
    series: days,
    payments: byPay,
  });
}
