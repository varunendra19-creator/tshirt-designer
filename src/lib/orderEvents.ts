import type { SupabaseClient } from "@supabase/supabase-js";

export type OrderEventType = "created" | "status" | "payment" | "shipping" | "cancel" | "refund" | "note";

/** Append one entry to an order's audit / customer-visible timeline. Never throws. */
export async function logOrderEvent(
  supabase: SupabaseClient,
  orderId: string,
  type: OrderEventType,
  message: string,
  actor = "system",
): Promise<void> {
  try {
    await supabase.from("order_events").insert({ order_id: orderId, type, message, actor });
  } catch {
    /* timeline is best-effort — a logging failure must never break the order action */
  }
}
