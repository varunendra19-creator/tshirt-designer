import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";

export const runtime = "nodejs";

// GET ?product=<id> → all variants for a product (for the stock editor).
export async function GET(req: Request) {
  const { supabase, err } = await requireAdmin(req);
  if (err) return err;
  const productId = new URL(req.url).searchParams.get("product");
  if (!productId) return NextResponse.json({ error: "product required" }, { status: 400 });
  const { data, error } = await supabase!
    .from("product_variants")
    .select("sku, size, color, stock")
    .eq("product_id", productId)
    .order("size").order("color");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ variants: data });
}

// PATCH { updates: [{ sku, stock }] } → set stock per SKU.
export async function PATCH(req: Request) {
  const { supabase, err } = await requireAdmin(req);
  if (err) return err;
  const body = await req.json().catch(() => ({}));
  const updates = Array.isArray(body.updates) ? body.updates : [];
  if (updates.length === 0) return NextResponse.json({ error: "no updates" }, { status: 400 });

  for (const u of updates) {
    if (typeof u.sku !== "string") continue;
    const stock = Math.max(0, Math.round(Number(u.stock) || 0));
    const { error } = await supabase!.from("product_variants").update({ stock }).eq("sku", u.sku);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, updated: updates.length });
}
