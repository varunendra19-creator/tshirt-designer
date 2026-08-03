import { NextResponse } from "next/server";
import { PRODUCTS } from "@/lib/catalog";
import { requireAdmin } from "@/lib/adminAuth";

export const runtime = "nodejs";

// One-off seed: create a stock row for every product × size × colour.
// Idempotent — only seeds when the table is empty. Default stock 40. Admin-only.
export async function POST(req: Request) {
  const { supabase, err } = await requireAdmin(req);
  if (err) return err;

  const { count } = await supabase!.from("product_variants").select("id", { count: "exact", head: true });
  if ((count ?? 0) > 0) return NextResponse.json({ ok: true, seeded: false, existing: count });

  const rows: any[] = [];
  for (const p of PRODUCTS) {
    const colors = p.swatches.length ? p.swatches : ["#000000"];
    for (const size of p.sizes) {
      for (const color of colors) {
        rows.push({
          product_id: p.id,
          size,
          color,
          sku: `${p.id}-${size}-${color.replace("#", "")}`.toLowerCase(),
          stock: 40,
        });
      }
    }
  }

  // insert in chunks to stay well under any payload limits
  for (let i = 0; i < rows.length; i += 200) {
    const { error } = await supabase!.from("product_variants").upsert(rows.slice(i, i + 200), { onConflict: "sku" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, seeded: true, variants: rows.length });
}
