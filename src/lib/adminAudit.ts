import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Record an admin mutation to the admin_audit trail. Best-effort — never throws,
 * so an audit-write hiccup can't fail the underlying admin action.
 */
export async function logAdminAction(
  supabase: SupabaseClient,
  actor: string,
  action: string,
  entity: string,
  entityId?: string | null,
  meta?: Record<string, unknown> | null,
): Promise<void> {
  try {
    await supabase.from("admin_audit").insert({
      actor, action, entity,
      entity_id: entityId != null ? String(entityId) : null,
      meta: meta ?? null,
    });
  } catch (e) {
    console.error("[audit] write failed:", e);
  }
}
