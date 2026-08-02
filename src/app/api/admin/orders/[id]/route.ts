import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";

export const runtime = "nodejs";

// GET one order (items + timeline) — used by the invoice / detail views.
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { supabase, err } = await requireAdmin(req);
  if (err) return err;
  const { data, error } = await supabase!
    .from("orders")
    .select("*, order_items(*), order_events(*)")
    .eq("id", params.id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  data.order_events?.sort((a: any, b: any) => a.created_at.localeCompare(b.created_at));
  return NextResponse.json({ order: data });
}
