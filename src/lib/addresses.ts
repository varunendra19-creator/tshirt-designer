import { supabase } from "@/lib/supabaseClient";

export type Address = {
  id: string;
  name: string; phone: string; address: string; city: string; state: string; pincode: string;
  is_default: boolean;
};
export type AddressInput = Omit<Address, "id" | "is_default">;

export async function fetchAddresses(userId: string): Promise<Address[]> {
  if (!supabase) return [];
  const { data } = await supabase.from("addresses").select("*").eq("user_id", userId)
    .order("is_default", { ascending: false }).order("created_at", { ascending: true });
  return (data as any) ?? [];
}

export async function saveAddress(userId: string, a: AddressInput, makeDefault: boolean): Promise<Address | null> {
  if (!supabase) return null;
  if (makeDefault) await supabase.from("addresses").update({ is_default: false }).eq("user_id", userId);
  const { data } = await supabase.from("addresses").insert({ ...a, user_id: userId, is_default: makeDefault }).select().single();
  return (data as any) ?? null;
}

export async function updateAddress(id: string, a: AddressInput): Promise<void> {
  if (!supabase) return;
  await supabase.from("addresses").update(a).eq("id", id);
}

export async function deleteAddress(id: string): Promise<void> {
  if (!supabase) return;
  await supabase.from("addresses").delete().eq("id", id);
}

export async function setDefaultAddress(userId: string, id: string): Promise<void> {
  if (!supabase) return;
  await supabase.from("addresses").update({ is_default: false }).eq("user_id", userId);
  await supabase.from("addresses").update({ is_default: true }).eq("id", id);
}
