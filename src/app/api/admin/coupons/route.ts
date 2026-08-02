import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { logAdminAction } from "@/lib/adminAudit";

export const runtime = "nodejs";

const TYPES = ["percent", "fixed", "free_shipping"];

function toRow(b: any) {
  const type = TYPES.includes(b.type) ? b.type : "percent";
  const num = (v: any) => (v === "" || v === null || v === undefined ? null : Math.round(Number(v)));
  return {
    type,
    value: type === "free_shipping" ? 0 : Math.max(0, Math.round(Number(b.value) || 0)),
    min_subtotal: Math.max(0, Math.round(Number(b.min_subtotal) || 0)),
    max_discount: num(b.max_discount),
    starts_at: b.starts_at || null,
    expires_at: b.expires_at || null,
    usage_limit: num(b.usage_limit),
    per_user_limit: num(b.per_user_limit),
    active: b.active !== false,
    description: String(b.description || "").trim() || null,
  };
}

export async function GET(req: Request) {
  const { supabase, err } = await requireAdmin(req);
  if (err) return err;
  const { data, error } = await supabase!.from("coupons").select("*").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ coupons: data });
}

export async function POST(req: Request) {
  const { supabase, user, err } = await requireAdmin(req);
  if (err) return err;
  const b = await req.json().catch(() => ({}));
  const code = String(b.code || "").trim().toUpperCase().replace(/\s+/g, "");
  if (!/^[A-Z0-9_-]{3,32}$/.test(code)) return NextResponse.json({ error: "Code must be 3–32 chars (A–Z, 0–9, - _)." }, { status: 400 });
  const row = toRow(b);
  if (row.type !== "free_shipping" && row.value <= 0) return NextResponse.json({ error: "Value must be greater than 0." }, { status: 400 });
  const { error } = await supabase!.from("coupons").insert({ code, used_count: 0, ...row });
  if (error) return NextResponse.json({ error: error.code === "23505" ? "That code already exists." : error.message }, { status: 400 });
  await logAdminAction(supabase!, user?.email || "admin", "create", "coupon", code, { type: row.type, value: row.value });
  return NextResponse.json({ ok: true, code });
}

export async function PATCH(req: Request) {
  const { supabase, user, err } = await requireAdmin(req);
  if (err) return err;
  const b = await req.json().catch(() => ({}));
  const code = String(b.code || "").trim().toUpperCase();
  if (!code) return NextResponse.json({ error: "code required" }, { status: 400 });
  const { error } = await supabase!.from("coupons").update(toRow(b)).eq("code", code);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await logAdminAction(supabase!, user?.email || "admin", "update", "coupon", code);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { supabase, user, err } = await requireAdmin(req);
  if (err) return err;
  const code = new URL(req.url).searchParams.get("code");
  if (!code) return NextResponse.json({ error: "code required" }, { status: 400 });
  const { error } = await supabase!.from("coupons").delete().eq("code", code.toUpperCase());
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await logAdminAction(supabase!, user?.email || "admin", "delete", "coupon", code.toUpperCase());
  return NextResponse.json({ ok: true });
}
