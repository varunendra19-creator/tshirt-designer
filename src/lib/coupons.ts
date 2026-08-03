import type { SupabaseClient } from "@supabase/supabase-js";

export type CouponResult = {
  ok: boolean;
  message: string;
  code?: string;
  type?: string;
  discount: number; // INR to subtract from the order
  free_shipping?: boolean;
};

/**
 * Server-authoritative coupon check. Never trust a client-sent discount — always call this.
 * `subtotal` and `shipping` are the current cart figures (INR).
 * Pass `userId` to enforce per-user limits (optional).
 */
export async function validateCoupon(
  supabase: SupabaseClient,
  rawCode: string,
  subtotal: number,
  shipping: number,
  userId?: string | null,
): Promise<CouponResult> {
  const fail = (message: string): CouponResult => ({ ok: false, message, discount: 0 });
  const code = String(rawCode || "").trim().toUpperCase();
  if (!code) return fail("Enter a coupon code.");

  const { data: c } = await supabase.from("coupons").select("*").eq("code", code).maybeSingle();
  if (!c || !c.active) return fail("Invalid coupon code.");

  const now = Date.now();
  if (c.starts_at && new Date(c.starts_at).getTime() > now) return fail("This coupon isn’t active yet.");
  if (c.expires_at && new Date(c.expires_at).getTime() < now) return fail("This coupon has expired.");
  if (c.usage_limit != null && c.used_count >= c.usage_limit) return fail("This coupon has reached its limit.");
  if ((c.min_subtotal || 0) > subtotal)
    return fail(`Add ₹${(c.min_subtotal || 0) - subtotal} more to use this coupon.`);

  if (c.per_user_limit != null && userId) {
    const { count } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("coupon_code", code);
    if ((count || 0) >= c.per_user_limit) return fail("You’ve already used this coupon.");
  }

  // ---- compute discount ----
  let discount = 0;
  let free_shipping = false;
  if (c.type === "percent") {
    discount = Math.round((subtotal * Math.max(0, Math.min(100, c.value))) / 100);
    if (c.max_discount != null) discount = Math.min(discount, c.max_discount);
  } else if (c.type === "fixed") {
    discount = Math.min(c.value, subtotal);
  } else if (c.type === "free_shipping") {
    discount = shipping;
    free_shipping = true;
  }
  discount = Math.max(0, Math.min(discount, subtotal + shipping));

  const pretty =
    c.type === "percent" ? `${c.value}% off` :
    c.type === "fixed" ? `₹${c.value} off` : "Free shipping";
  return { ok: true, message: `${code} applied — ${pretty}`, code, type: c.type, discount, free_shipping };
}
