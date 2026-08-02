"use client";

import { useState } from "react";
import type { Address, AddressInput } from "@/lib/addresses";

const EMPTY: AddressInput = { name: "", phone: "", address: "", city: "", state: "", pincode: "" };

export function AddressForm({ initial, onSubmit, onCancel, submitLabel = "Save address", defaultChecked }: {
  initial?: Partial<AddressInput>;
  onSubmit: (a: AddressInput, makeDefault: boolean) => Promise<void> | void;
  onCancel?: () => void; submitLabel?: string; defaultChecked?: boolean;
}) {
  const [f, setF] = useState<AddressInput>({ ...EMPTY, ...initial });
  const [makeDefault, setMakeDefault] = useState(!!defaultChecked);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const set = (k: keyof AddressInput, v: string) => setF((p) => ({ ...p, [k]: v }));
  const valid = () => f.name.trim() && /^\d{10}$/.test(f.phone.trim()) && f.address.trim() && f.city.trim() && f.state.trim() && /^\d{6}$/.test(f.pincode.trim());
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid()) { setErr("Fill all fields — 10-digit phone, 6-digit pincode."); return; }
    setErr(""); setBusy(true); await onSubmit({ ...f, name: f.name.trim(), phone: f.phone.trim(), pincode: f.pincode.trim() }, makeDefault); setBusy(false);
  };
  const cls = "w-full rounded-xl border border-black/15 bg-white px-4 py-2.5 text-sm outline-none focus:border-[var(--primary)]";
  return (
    <form onSubmit={submit} className="grid grid-cols-2 gap-2.5">
      <input className={`col-span-2 ${cls}`} placeholder="Full name" value={f.name} onChange={(e) => set("name", e.target.value)} />
      <input className={cls} placeholder="Phone (10 digits)" inputMode="numeric" value={f.phone} onChange={(e) => set("phone", e.target.value)} />
      <input className={cls} placeholder="Pincode (6 digits)" inputMode="numeric" value={f.pincode} onChange={(e) => set("pincode", e.target.value)} />
      <input className={`col-span-2 ${cls}`} placeholder="Address (house no, street, area)" value={f.address} onChange={(e) => set("address", e.target.value)} />
      <input className={cls} placeholder="City" value={f.city} onChange={(e) => set("city", e.target.value)} />
      <input className={cls} placeholder="State" value={f.state} onChange={(e) => set("state", e.target.value)} />
      <label className="col-span-2 flex items-center gap-2 text-sm text-[var(--ink-2)]"><input type="checkbox" checked={makeDefault} onChange={(e) => setMakeDefault(e.target.checked)} className="accent-[var(--primary)]" /> Set as default address</label>
      {err && <p className="col-span-2 text-sm font-medium text-[var(--coral)]">{err}</p>}
      <div className="col-span-2 flex gap-2 pt-1">
        <button type="submit" disabled={busy} className="rounded-full bg-[var(--primary)] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">{busy ? "Saving…" : submitLabel}</button>
        {onCancel && <button type="button" onClick={onCancel} className="rounded-full border border-black/15 px-5 py-2.5 text-sm font-semibold">Cancel</button>}
      </div>
    </form>
  );
}

export function AddressCard({ a, selectable, selected, onSelect, onEdit, onDelete, onSetDefault }: {
  a: Address; selectable?: boolean; selected?: boolean;
  onSelect?: () => void; onEdit?: () => void; onDelete?: () => void; onSetDefault?: () => void;
}) {
  return (
    <div onClick={selectable ? onSelect : undefined} className={`rounded-2xl border p-4 transition-colors ${selectable ? "cursor-pointer" : ""}`}
      style={{ borderColor: selected ? "var(--primary)" : "var(--line)", background: selected ? "rgba(124,58,237,0.05)" : "#fff" }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold">{a.name}{a.is_default && <span className="ml-2 rounded-full bg-[var(--mint)] px-1.5 py-0.5 text-[10px] font-bold text-white">DEFAULT</span>}</p>
          <p className="text-sm text-[var(--ink-2)]">{a.address}, {a.city}, {a.state} – {a.pincode}</p>
          <p className="text-xs text-[var(--ink-soft)]">{a.phone}</p>
        </div>
        {selectable && <span className="mt-1 grid h-4.5 w-4.5 shrink-0 place-items-center rounded-full border-2" style={{ width: 18, height: 18, borderColor: selected ? "var(--primary)" : "var(--line)" }}>{selected && <span className="h-2 w-2 rounded-full" style={{ background: "var(--primary)" }} />}</span>}
      </div>
      {(onEdit || onDelete || onSetDefault) && (
        <div className="mt-2.5 flex gap-4 text-xs font-bold">
          {onEdit && <button type="button" onClick={(e) => { e.stopPropagation(); onEdit(); }} className="text-[var(--primary)]">Edit</button>}
          {onSetDefault && !a.is_default && <button type="button" onClick={(e) => { e.stopPropagation(); onSetDefault(); }} className="text-[var(--ink-2)]">Set default</button>}
          {onDelete && <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-[var(--coral)]">Delete</button>}
        </div>
      )}
    </div>
  );
}
