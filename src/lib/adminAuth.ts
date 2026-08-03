import { NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export type AdminResult = { supabase?: SupabaseClient; user?: User; role?: string; err?: NextResponse };

/**
 * Gate for admin API routes. Admin = profiles.role in (admin, staff)
 * OR email in ADMIN_EMAILS (env fallback). 401 if not logged in, 403 if not admin.
 */
export async function requireAdmin(req: Request): Promise<AdminResult> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { err: NextResponse.json({ error: "Not configured" }, { status: 501 }) };

  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return { err: NextResponse.json({ error: "Please log in." }, { status: 401 }) };

  const { data } = await supabase.auth.getUser(token);
  const user = data?.user;
  if (!user) return { err: NextResponse.json({ error: "Please log in." }, { status: 401 }) };

  const { data: prof } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const role = (prof?.role as string) || "customer";
  const envAdmins = (process.env.ADMIN_EMAILS || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  const isAdmin = role === "admin" || role === "staff" || (!!user.email && envAdmins.includes(user.email.toLowerCase()));

  if (!isAdmin) return { err: NextResponse.json({ error: "This account isn’t an admin." }, { status: 403 }) };
  return { supabase, user, role };
}
