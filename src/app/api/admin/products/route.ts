import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/adminAuth";
import { logAdminAction } from "@/lib/adminAudit";
import { CATEGORY_LABELS } from "@/lib/catalog";
import { slugify } from "@/lib/slug";
import { sanitizeRichText } from "@/lib/richtext";

export const runtime = "nodejs";

// bust ISR caches so admin edits appear on the store immediately
function bust(id?: string, category?: string) {
  revalidatePath("/"); revalidatePath("/shop");
  if (id) revalidatePath(`/products/${id}`);
  if (category) revalidatePath(`/category/${category}`);
}

const sku = (id: string, size: string, color: string) => `${id}-${size}-${color.replace("#", "")}`.toLowerCase();

// Ensure a variant row exists for every size×colour (keeps existing stock).
async function ensureVariants(supabase: SupabaseClient, p: { id: string; sizes: string[]; swatches: string[] }) {
  const rows: any[] = [];
  for (const size of p.sizes || []) for (const color of p.swatches || []) {
    rows.push({ product_id: p.id, size, color, sku: sku(p.id, size, color), stock: 0 });
  }
  if (rows.length) await supabase.from("product_variants").upsert(rows, { onConflict: "sku", ignoreDuplicates: true });
}

// GET — full product list (incl. inactive) with per-variant stock rollup.
export async function GET(req: Request) {
  const { supabase, err } = await requireAdmin(req);
  if (err) return err;
  const [{ data: products }, { data: variants }] = await Promise.all([
    supabase!.from("products").select("*").order("sort"),
    supabase!.from("product_variants").select("product_id, stock"),
  ]);
  const byProduct: Record<string, number[]> = {};
  (variants ?? []).forEach((v: any) => { (byProduct[v.product_id] ??= []).push(v.stock); });
  const rows = (products ?? []).map((p: any) => {
    const st = byProduct[p.id] || [];
    return {
      id: p.id, name: p.name, category: p.category, categoryLabel: (CATEGORY_LABELS as any)[p.category] || p.category,
      price: p.price, compareAt: p.compare_at, image: p.image, images: p.images || [], badge: p.badge,
      description: p.description, sizes: p.sizes || [], swatches: p.swatches || [], active: p.active, sort: p.sort,
      rating: p.rating, reviews: p.reviews, colorImages: p.color_images || {},
      variantCount: st.length, totalStock: st.reduce((s: number, n: number) => s + n, 0),
      low: st.filter((n: number) => n > 0 && n <= 5).length, oos: st.filter((n: number) => n === 0).length,
    };
  });
  return NextResponse.json({ products: rows });
}

function toRow(b: any) {
  return {
    name: String(b.name || "").trim(),
    price: Math.max(0, Math.round(Number(b.price) || 0)),
    compare_at: b.compareAt ? Math.round(Number(b.compareAt)) : null,
    category: String(b.category || "printed"),
    badge: b.badge || null,
    description: sanitizeRichText(String(b.description || "")) || null,
    sizes: Array.isArray(b.sizes) ? b.sizes : [],
    swatches: Array.isArray(b.swatches) ? b.swatches : [],
    image: (Array.isArray(b.images) && b.images[0]) || b.image || null,
    images: Array.isArray(b.images) ? b.images : b.image ? [b.image] : [],
    tone: b.tone || "linear-gradient(160deg,#2a2d34,#0e0f13)",
    active: b.active !== false,
    // Editable DISPLAY rating/count (social proof only). Google structured data
    // ignores these — it uses the real buyer-review table (see product page).
    rating: Math.min(5, Math.max(0, Number(b.rating) || 0)),
    reviews: Math.max(0, Math.round(Number(b.reviews) || 0)),
    // Per-colour photos: { "#hex": "url" }. Keep only string→non-empty-string pairs.
    color_images: cleanColorImages(b.colorImages),
  };
}

function cleanColorImages(v: any): Record<string, string> {
  const out: Record<string, string> = {};
  if (v && typeof v === "object") {
    for (const [k, url] of Object.entries(v)) {
      if (typeof url === "string" && url.trim()) out[k] = url.trim();
    }
  }
  return out;
}

// POST — create a product (+ its variants).
export async function POST(req: Request) {
  const { supabase, user, err } = await requireAdmin(req);
  if (err) return err;
  const b = await req.json().catch(() => ({}));
  if (!b.name?.trim() || !b.price) return NextResponse.json({ error: "name and price required" }, { status: 400 });
  const row = toRow(b);
  const id = (b.id?.trim() && slugify(b.id)) || slugify(row.name);
  // new products append at the end (max sort + 1) so they don't reshuffle the list
  const { data: mx } = await supabase!.from("products").select("sort").order("sort", { ascending: false }).limit(1).maybeSingle();
  const sort = Number.isFinite(b.sort) ? Number(b.sort) : (mx?.sort ?? 0) + 1;
  const { data, error } = await supabase!.from("products").insert({ id, ...row, sort }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await ensureVariants(supabase!, { id, sizes: row.sizes, swatches: row.swatches });
  await logAdminAction(supabase!, user?.email || "admin", "create", "product", id, { name: row.name, price: row.price });
  bust(id, row.category);
  return NextResponse.json({ ok: true, product: data });
}

// PATCH — update a product; sync any new size/colour variants.
export async function PATCH(req: Request) {
  const { supabase, user, err } = await requireAdmin(req);
  if (err) return err;
  const b = await req.json().catch(() => ({}));
  if (!b.id) return NextResponse.json({ error: "id required" }, { status: 400 });
  // Preserve the product's list position on edit — only change sort if explicitly sent.
  const row: Record<string, any> = { ...toRow(b), updated_at: new Date().toISOString() };
  if (Number.isFinite(b.sort)) row.sort = Number(b.sort);
  const { error } = await supabase!.from("products").update(row).eq("id", b.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await ensureVariants(supabase!, { id: b.id, sizes: row.sizes, swatches: row.swatches });
  await logAdminAction(supabase!, user?.email || "admin", "update", "product", b.id, { name: row.name, price: row.price, active: row.active });
  bust(b.id, row.category);
  return NextResponse.json({ ok: true });
}

// DELETE ?id= — remove product + its variants.
export async function DELETE(req: Request) {
  const { supabase, user, err } = await requireAdmin(req);
  if (err) return err;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await supabase!.from("product_variants").delete().eq("product_id", id);
  const { error } = await supabase!.from("products").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await logAdminAction(supabase!, user?.email || "admin", "delete", "product", id);
  bust(id);
  return NextResponse.json({ ok: true });
}
