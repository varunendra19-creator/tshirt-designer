import { supabase } from "@/lib/supabaseClient";

export const vkey = (size: string, color: string) => `${size}__${color}`.toLowerCase();

/** size__color → stock, for one product. Empty map if Supabase not configured
 *  (callers then treat everything as in stock, so the store still works). */
export async function fetchStock(productId: string): Promise<Record<string, number>> {
  if (!supabase) return {};
  const { data } = await supabase.from("product_variants").select("size, color, stock").eq("product_id", productId);
  const map: Record<string, number> = {};
  (data ?? []).forEach((v: any) => { map[vkey(v.size, v.color)] = v.stock; });
  return map;
}
