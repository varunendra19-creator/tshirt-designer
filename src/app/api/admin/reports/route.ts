import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";

export const runtime = "nodejs";

const EARNED = ["paid", "partially_refunded", "refunded"]; // money actually collected

function csvCell(v: any): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function toCsv(rows: any[][]): string {
  return rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
}
const dayKey = (iso: string) => iso.slice(0, 10);

// GET — sales report. JSON aggregates by default; ?format=csv&type=orders|items|summary streams a CSV.
export async function GET(req: Request) {
  const { supabase, err } = await requireAdmin(req);
  if (err) return err;
  const url = new URL(req.url);
  const from = url.searchParams.get("from"); // yyyy-mm-dd inclusive
  const to = url.searchParams.get("to");     // yyyy-mm-dd inclusive
  const format = url.searchParams.get("format");
  const type = url.searchParams.get("type") || "summary";

  let query = supabase!.from("orders").select("*, order_items(*)").order("created_at", { ascending: false });
  if (from) query = query.gte("created_at", `${from}T00:00:00`);
  if (to) query = query.lte("created_at", `${to}T23:59:59`);
  const { data: orders, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const all = orders ?? [];
  const earned = all.filter((o) => EARNED.includes(o.payment_status));

  // ---- CSV exports ----
  if (format === "csv") {
    let rows: any[][];
    let name: string;
    if (type === "items") {
      rows = [["Order", "Date", "Product", "Custom", "Size", "Color", "Qty", "Unit", "Line total"]];
      for (const o of all) for (const it of o.order_items || [])
        rows.push([o.order_no, dayKey(o.created_at), it.name, it.is_custom ? "yes" : "", it.size, it.color, it.qty, it.unit_price ?? "", it.line_total]);
      name = "line-items";
    } else if (type === "orders") {
      rows = [["Order", "Date", "Customer", "Email", "Phone", "Status", "Payment", "Method", "Subtotal", "Tax", "Shipping", "Total", "Refunded"]];
      for (const o of all)
        rows.push([o.order_no, dayKey(o.created_at), o.customer_name, o.email, o.phone, o.status, o.payment_status, o.payment_method, o.subtotal, o.tax, o.shipping, o.total, o.refund_amount || 0]);
      name = "orders";
    } else {
      // summary: daily series
      const byDay: Record<string, { rev: number; orders: number }> = {};
      for (const o of earned) {
        const k = dayKey(o.created_at);
        (byDay[k] ??= { rev: 0, orders: 0 });
        byDay[k].rev += (o.total || 0) - (o.refund_amount || 0);
        byDay[k].orders += 1;
      }
      rows = [["Date", "Orders", "Net revenue"]];
      Object.keys(byDay).sort().forEach((k) => rows.push([k, byDay[k].orders, byDay[k].rev]));
      name = "summary";
    }
    const csv = toCsv(rows);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="campusmode-${name}-${from || "all"}_${to || "now"}.csv"`,
      },
    });
  }

  // ---- JSON aggregates ----
  const net = (o: any) => (o.total || 0) - (o.refund_amount || 0);
  const gross = earned.reduce((s, o) => s + (o.total || 0), 0);
  const refunds = all.reduce((s, o) => s + (o.refund_amount || 0), 0);
  const revenue = earned.reduce((s, o) => s + net(o), 0);
  const tax = earned.reduce((s, o) => s + (o.tax || 0), 0);
  const units = earned.reduce((s, o) => s + (o.order_items || []).reduce((n: number, it: any) => n + (it.qty || 0), 0), 0);

  const byDayMap: Record<string, { revenue: number; orders: number }> = {};
  for (const o of earned) {
    const k = dayKey(o.created_at);
    (byDayMap[k] ??= { revenue: 0, orders: 0 });
    byDayMap[k].revenue += net(o); byDayMap[k].orders += 1;
  }
  const daily = Object.keys(byDayMap).sort().map((date) => ({ date, ...byDayMap[date] }));

  const prodMap: Record<string, { name: string; units: number; revenue: number }> = {};
  for (const o of earned) for (const it of o.order_items || []) {
    const key = it.product_id || it.name;
    (prodMap[key] ??= { name: it.name, units: 0, revenue: 0 });
    prodMap[key].units += it.qty || 0;
    prodMap[key].revenue += it.line_total || 0;
  }
  const topProducts = Object.values(prodMap).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

  const byMethod: Record<string, number> = {};
  for (const o of earned) byMethod[o.payment_method || "—"] = (byMethod[o.payment_method || "—"] || 0) + net(o);
  const byStatus: Record<string, number> = {};
  for (const o of all) byStatus[o.status] = (byStatus[o.status] || 0) + 1;

  return NextResponse.json({
    range: { from: from || null, to: to || null },
    kpis: {
      revenue, gross, refunds, tax, units,
      paid_orders: earned.length, total_orders: all.length,
      aov: earned.length ? Math.round(revenue / earned.length) : 0,
    },
    daily, topProducts, byMethod, byStatus,
  });
}
