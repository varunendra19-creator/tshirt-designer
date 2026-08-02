import { NextResponse } from "next/server";
import { PRODUCTS } from "@/lib/catalog";
import { requireAdmin } from "@/lib/adminAuth";

export const runtime = "nodejs";

// One-off seed of the products table from the static catalogue. Idempotent. Admin-only.
export async function POST(req: Request) {
  const { supabase, err } = await requireAdmin(req);
  if (err) return err;

  const { count } = await supabase!.from("products").select("id", { count: "exact", head: true });
  if ((count ?? 0) > 0) return NextResponse.json({ ok: true, seeded: false, existing: count });

  const rows = PRODUCTS.map((p, i) => ({
    id: p.id, name: p.name, price: p.price, compare_at: p.compareAt ?? null,
    rating: p.rating, reviews: p.reviews, badge: p.badge ?? null, category: p.category,
    sizes: p.sizes, swatches: p.swatches, image: p.image, images: p.image ? [p.image] : [],
    tone: p.tone, description: p.description, active: true, sort: i,
  }));

  const { error } = await supabase!.from("products").upsert(rows, { onConflict: "id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, seeded: true, products: rows.length });
}
