import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { validateCoupon } from "@/lib/coupons";
import { rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

// POST { code, subtotal, shipping } — preview a coupon at checkout. Does NOT redeem it.
export async function POST(req: Request) {
  const limited = rateLimit(req, "coupon-validate", 30, 60_000); // 30/min/IP — deters brute-forcing codes
  if (limited) return limited;
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ ok: false, message: "Coupons unavailable.", discount: 0 });
  const b = await req.json().catch(() => ({}));
  const subtotal = Math.max(0, Math.round(Number(b.subtotal) || 0));
  const shipping = Math.max(0, Math.round(Number(b.shipping) || 0));

  // identify the user (optional) for per-user limits
  let userId: string | null = null;
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (token) { const { data } = await supabase.auth.getUser(token); userId = data?.user?.id ?? null; }

  const result = await validateCoupon(supabase, b.code, subtotal, shipping, userId);
  return NextResponse.json(result);
}
