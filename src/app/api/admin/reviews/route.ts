import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";

export const runtime = "nodejs";

// GET — every review (incl. hidden) with author email, newest first.
export async function GET(req: Request) {
  const { supabase, err } = await requireAdmin(req);
  if (err) return err;
  const { data: reviews, error } = await supabase!
    .from("reviews")
    .select("id, product_id, user_id, author_name, rating, title, body, hidden, created_at")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // attach author email from profiles
  const ids = Array.from(new Set((reviews ?? []).map((r) => r.user_id).filter(Boolean)));
  const emailById: Record<string, string> = {};
  if (ids.length) {
    const { data: profs } = await supabase!.from("profiles").select("id, email").in("id", ids);
    (profs ?? []).forEach((p: any) => { emailById[p.id] = p.email; });
  }
  const rows = (reviews ?? []).map((r) => ({ ...r, author_email: r.user_id ? emailById[r.user_id] || null : null }));
  return NextResponse.json({ reviews: rows });
}

// PATCH { id, hidden } — hide or unhide a review.
export async function PATCH(req: Request) {
  const { supabase, err } = await requireAdmin(req);
  if (err) return err;
  const b = await req.json().catch(() => ({}));
  if (!b.id || typeof b.hidden !== "boolean") return NextResponse.json({ error: "Bad request" }, { status: 400 });
  const { error } = await supabase!.from("reviews").update({ hidden: b.hidden }).eq("id", b.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE ?id= — permanently remove a review.
export async function DELETE(req: Request) {
  const { supabase, err } = await requireAdmin(req);
  if (err) return err;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const { error } = await supabase!.from("reviews").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
