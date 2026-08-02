import type { SupabaseClient } from "@supabase/supabase-js";

const sku = (productId: string, size: string, color: string) => `${productId}-${size}-${color.replace("#", "")}`.toLowerCase();

type LineIn = { product_id?: string; size?: string; color?: string; qty: number; is_custom?: boolean };

/** Validate that every catalogue (non-custom) line has enough stock.
 *  Returns null if OK, else a human message. Custom designs have no variant. */
export async function checkStock(supabase: SupabaseClient, items: LineIn[]): Promise<string | null> {
  for (const it of items) {
    if (it.is_custom || !it.product_id || !it.size || !it.color) continue;
    const { data } = await supabase.from("product_variants").select("stock").eq("sku", sku(it.product_id, it.size, it.color)).maybeSingle();
    if (data && typeof data.stock === "number" && data.stock < it.qty) {
      return `Sorry, only ${data.stock} left of ${it.product_id} (${it.size}). Please adjust and retry.`;
    }
  }
  return null;
}

/** Decrement stock for a paid order, exactly once (guarded by orders.stock_committed). */
export async function commitStockForOrder(supabase: SupabaseClient, orderId: string): Promise<void> {
  const { data: order } = await supabase.from("orders").select("id, stock_committed").eq("id", orderId).maybeSingle();
  if (!order || order.stock_committed) return; // already committed or missing

  const { data: items } = await supabase
    .from("order_items")
    .select("product_id, size, color, qty, is_custom")
    .eq("order_id", orderId);

  for (const it of items ?? []) {
    if (it.is_custom || !it.product_id || !it.size || !it.color) continue;
    const s = sku(it.product_id, it.size, it.color);
    const { data: v } = await supabase.from("product_variants").select("stock").eq("sku", s).maybeSingle();
    if (v && typeof v.stock === "number") {
      await supabase.from("product_variants").update({ stock: Math.max(0, v.stock - it.qty) }).eq("sku", s);
    }
  }
  await supabase.from("orders").update({ stock_committed: true }).eq("id", orderId);
}

/** Give stock back for a cancelled/refunded order, exactly once (guarded by orders.stock_restored).
 *  Only restores if the order's stock had actually been committed. */
export async function restoreStockForOrder(supabase: SupabaseClient, orderId: string): Promise<void> {
  const { data: order } = await supabase
    .from("orders")
    .select("id, stock_committed, stock_restored")
    .eq("id", orderId)
    .maybeSingle();
  if (!order || order.stock_restored || !order.stock_committed) return; // nothing to give back

  const { data: items } = await supabase
    .from("order_items")
    .select("product_id, size, color, qty, is_custom")
    .eq("order_id", orderId);

  for (const it of items ?? []) {
    if (it.is_custom || !it.product_id || !it.size || !it.color) continue;
    const s = sku(it.product_id, it.size, it.color);
    const { data: v } = await supabase.from("product_variants").select("stock").eq("sku", s).maybeSingle();
    if (v && typeof v.stock === "number") {
      await supabase.from("product_variants").update({ stock: v.stock + it.qty }).eq("sku", s);
    }
  }
  await supabase.from("orders").update({ stock_restored: true }).eq("id", orderId);
}
