import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { PRODUCTS, getProduct as staticGetProduct, type Product } from "@/lib/catalog";

export type ProductWithGallery = Product & { images?: string[] };

function rowToProduct(r: any): ProductWithGallery {
  return {
    id: r.id, name: r.name, price: r.price, compareAt: r.compare_at ?? undefined,
    rating: Number(r.rating), reviews: r.reviews, badge: r.badge ?? undefined,
    category: r.category, sizes: r.sizes || [], swatches: r.swatches || [],
    image: r.image, tone: r.tone, description: r.description,
    colorImages: r.color_images && typeof r.color_images === "object" ? r.color_images : {},
    images: r.images?.length ? r.images : r.image ? [r.image] : [],
  };
}

/** All active products — DB if seeded, else the static catalogue (safe fallback). */
export async function getDbProducts(): Promise<ProductWithGallery[]> {
  const s = getSupabaseAdmin();
  if (!s) return PRODUCTS;
  const { data } = await s.from("products").select("*").eq("active", true).order("sort");
  return data && data.length ? data.map(rowToProduct) : PRODUCTS;
}

/** One product by slug/id — DB first, then static fallback. */
export async function getDbProduct(slug: string): Promise<ProductWithGallery | null> {
  const s = getSupabaseAdmin();
  if (!s) return staticGetProduct(slug) ?? null;
  const { data } = await s.from("products").select("*").eq("id", slug).eq("active", true).maybeSingle();
  if (data) return rowToProduct(data);
  return staticGetProduct(slug) ?? null;
}

export async function getDbProductsByCategory(cat: string): Promise<ProductWithGallery[]> {
  return (await getDbProducts()).filter((p) => p.category === cat);
}

export async function getDbRelated(product: Product, n = 4): Promise<ProductWithGallery[]> {
  const all = await getDbProducts();
  return all.filter((p) => p.category === product.category && p.id !== product.id).slice(0, n);
}

export type DbCategory = { slug: string; label: string; description: string | null; active: boolean; sort: number };

/** Read a category from the DB (admin-managed). Null if not configured / not found. */
export async function getDbCategory(slug: string): Promise<DbCategory | null> {
  const s = getSupabaseAdmin();
  if (!s) return null;
  const { data } = await s.from("categories").select("slug, label, description, active, sort").eq("slug", slug).maybeSingle();
  return (data as DbCategory) ?? null;
}

export async function getDbCategories(): Promise<DbCategory[]> {
  const s = getSupabaseAdmin();
  if (!s) return [];
  const { data } = await s.from("categories").select("slug, label, description, active, sort").eq("active", true).order("sort");
  return (data as DbCategory[]) ?? [];
}

/** True if the product has any variant stock left (feeds Offer.availability). Defaults true if unknown. */
export async function getDbProductInStock(id: string): Promise<boolean> {
  const s = getSupabaseAdmin();
  if (!s) return true;
  const { data } = await s.from("product_variants").select("stock").eq("product_id", id);
  if (!data || !data.length) return true; // no variant data → don't mark OOS
  return data.some((v: any) => Number(v.stock) > 0);
}

/**
 * REAL review aggregate for a product — from the buyer-gated `reviews` table only
 * (never the editable display `products.reviews` seed). This is what feeds Google
 * `aggregateRating`, so structured data can never contain fabricated ratings.
 */
export async function getDbProductReviewStats(id: string): Promise<{ count: number; avg: number }> {
  const s = getSupabaseAdmin();
  if (!s) return { count: 0, avg: 0 };
  const { data } = await s.from("reviews").select("rating").eq("product_id", id).eq("hidden", false);
  const ratings = (data ?? []).map((r: any) => Number(r.rating)).filter((n) => Number.isFinite(n));
  if (!ratings.length) return { count: 0, avg: 0 };
  const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
  return { count: ratings.length, avg: Math.round(avg * 10) / 10 };
}
