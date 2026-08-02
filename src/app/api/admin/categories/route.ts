import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { logAdminAction } from "@/lib/adminAudit";
import { slugify } from "@/lib/slug";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { supabase, err } = await requireAdmin(req);
  if (err) return err;
  const { data, error } = await supabase!.from("categories").select("*").order("sort");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ categories: data });
}

export async function POST(req: Request) {
  const { supabase, user, err } = await requireAdmin(req);
  if (err) return err;
  const b = await req.json().catch(() => ({}));
  if (!b.label?.trim()) return NextResponse.json({ error: "label required" }, { status: 400 });
  const slug = (b.slug?.trim() && slugify(b.slug)) || slugify(b.label);
  const { data, error } = await supabase!.from("categories")
    .insert({ slug, label: b.label.trim(), description: b.description?.trim() || null, sort: b.sort ?? 99, active: b.active ?? true })
    .select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await logAdminAction(supabase!, user?.email || "admin", "create", "category", slug, { label: b.label.trim() });
  return NextResponse.json({ ok: true, category: data });
}

export async function PATCH(req: Request) {
  const { supabase, user, err } = await requireAdmin(req);
  if (err) return err;
  const b = await req.json().catch(() => ({}));
  if (!b.slug) return NextResponse.json({ error: "slug required" }, { status: 400 });
  const patch: any = {};
  if (b.label !== undefined) patch.label = String(b.label).trim();
  if (b.description !== undefined) patch.description = String(b.description).trim() || null;
  if (b.sort !== undefined) patch.sort = Number(b.sort) || 0;
  if (b.active !== undefined) patch.active = !!b.active;
  const { error } = await supabase!.from("categories").update(patch).eq("slug", b.slug);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await logAdminAction(supabase!, user?.email || "admin", "update", "category", b.slug, patch);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { supabase, user, err } = await requireAdmin(req);
  if (err) return err;
  const slug = new URL(req.url).searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 });
  const { error } = await supabase!.from("categories").delete().eq("slug", slug);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await logAdminAction(supabase!, user?.email || "admin", "delete", "category", slug);
  return NextResponse.json({ ok: true });
}
