import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

// Update the caller's own profile name/phone. Role is intentionally NOT
// updatable here — that stays admin-only via the DB.
export async function POST(req: Request) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 501 });

  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  const { data } = await supabase.auth.getUser(token);
  const uid = data?.user?.id;
  if (!uid) return NextResponse.json({ error: "Please log in." }, { status: 401 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }
  const name = typeof body?.name === "string" ? body.name.trim().slice(0, 80) : undefined;
  const phone = typeof body?.phone === "string" ? body.phone.trim().slice(0, 20) : undefined;

  const patch: Record<string, any> = {};
  if (name !== undefined) patch.name = name || null;
  if (phone !== undefined) patch.phone = phone || null;
  if (Object.keys(patch).length === 0) return NextResponse.json({ ok: true });

  const { error } = await supabase.from("profiles").update(patch).eq("id", uid);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, profile: patch });
}
