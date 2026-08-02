"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { inr } from "@/lib/format";

type Coupon = {
  code: string; type: string; value: number; min_subtotal: number; max_discount: number | null;
  starts_at: string | null; expires_at: string | null; usage_limit: number | null; used_count: number;
  per_user_limit: number | null; active: boolean; description: string | null;
};
const BLANK: Coupon = {
  code: "", type: "percent", value: 10, min_subtotal: 0, max_discount: null,
  starts_at: null, expires_at: null, usage_limit: null, used_count: 0, per_user_limit: null, active: true, description: null,
};
const dt = (s: string | null) => (s ? new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—");
const summary = (c: Coupon) =>
  c.type === "percent" ? `${c.value}% off${c.max_discount ? ` (max ${inr(c.max_discount)})` : ""}` :
  c.type === "fixed" ? `${inr(c.value)} off` : "Free shipping";

export function CouponsClient() {
  const { user, token } = useAuth();
  const [coupons, setCoupons] = useState<Coupon[] | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "forbidden" | "error">("idle");
  const [msg, setMsg] = useState("");
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [isNew, setIsNew] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setState("loading");
    const r = await fetch("/api/admin/coupons", { headers: { Authorization: `Bearer ${token}` } });
    const d = await r.json().catch(() => ({}));
    if (r.status === 403) { setState("forbidden"); setMsg(d.error || ""); return; }
    if (!r.ok) { setState("error"); setMsg(d.error || "Failed"); return; }
    setCoupons(d.coupons || []); setState("idle");
  }, [token]);
  useEffect(() => { if (user && token) load(); }, [user, token, load]);

  const del = async (code: string) => {
    if (!confirm(`Delete coupon ${code}?`)) return;
    await fetch(`/api/admin/coupons?code=${encodeURIComponent(code)}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    load();
  };
  const toggle = async (c: Coupon) => {
    await fetch("/api/admin/coupons", { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ ...c, active: !c.active }) });
    load();
  };

  if (state === "forbidden") return <Note>Not authorised — {msg}</Note>;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-2xl font-extrabold md:text-3xl">Coupons {coupons?.length ? <span className="text-[var(--ink-soft)]">({coupons.length})</span> : null}</h1>
        <button onClick={() => { setEditing({ ...BLANK }); setIsNew(true); }} className="rounded-full bg-[var(--ink)] px-4 py-2 text-sm font-bold text-white">+ New coupon</button>
      </div>

      {state === "error" ? <Note>Couldn’t load: {msg}</Note>
        : coupons === null || state === "loading" ? <Note>Loading coupons…</Note>
        : coupons.length === 0 ? <Note>No coupons yet. Create one to run a promo.</Note>
        : (
          <div className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--paper-2)] text-[11px] uppercase tracking-wide text-[var(--ink-soft)]">
                <tr>
                  <th className="px-4 py-3">Code</th><th className="px-4 py-3">Discount</th><th className="px-4 py-3">Min cart</th>
                  <th className="px-4 py-3">Used</th><th className="px-4 py-3">Expires</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((c) => (
                  <tr key={c.code} className="border-t border-black/5">
                    <td className="px-4 py-3"><span className="rounded bg-[var(--paper-2)] px-2 py-1 font-mono font-bold">{c.code}</span>{c.description && <p className="mt-1 text-xs text-[var(--ink-soft)]">{c.description}</p>}</td>
                    <td className="px-4 py-3">{summary(c)}</td>
                    <td className="px-4 py-3">{c.min_subtotal ? inr(c.min_subtotal) : "—"}</td>
                    <td className="px-4 py-3">{c.used_count}{c.usage_limit ? ` / ${c.usage_limit}` : ""}</td>
                    <td className="px-4 py-3 text-[var(--ink-2)]">{dt(c.expires_at)}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggle(c)} className="rounded-full px-2.5 py-1 text-[11px] font-bold uppercase text-white" style={{ background: c.active ? "var(--mint)" : "var(--ink-soft)" }}>
                        {c.active ? "active" : "off"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => { setEditing(c); setIsNew(false); }} className="mr-2 text-xs font-bold text-[var(--primary)]">Edit</button>
                      <button onClick={() => del(c.code)} className="text-xs font-bold text-[var(--coral)]">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      {editing && <CouponForm coupon={editing} isNew={isNew} token={token!} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </div>
  );
}

function CouponForm({ coupon, isNew, token, onClose, onSaved }: { coupon: Coupon; isNew: boolean; token: string; onClose: () => void; onSaved: () => void }) {
  const [c, setC] = useState<Coupon>(coupon);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const set = (k: keyof Coupon, v: any) => setC((p) => ({ ...p, [k]: v }));
  const dateVal = (s: string | null) => (s ? s.slice(0, 10) : "");

  const save = async () => {
    setSaving(true); setErr("");
    try {
      const r = await fetch("/api/admin/coupons", {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(c),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(d.error || "Save failed"); return; }
      onSaved();
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-auto bg-black/50 p-4" onClick={onClose}>
      <div className="mt-6 w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-xl font-extrabold">{isNew ? "New coupon" : `Edit ${c.code}`}</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <L label="Code" full>
            <input value={c.code} disabled={!isNew} onChange={(e) => set("code", e.target.value.toUpperCase())}
              placeholder="CAMPUS20" className="w-full rounded-lg border border-black/15 px-3 py-2 font-mono uppercase disabled:bg-black/5" />
          </L>
          <L label="Type">
            <select value={c.type} onChange={(e) => set("type", e.target.value)} className="w-full rounded-lg border border-black/15 px-3 py-2">
              <option value="percent">Percent off</option>
              <option value="fixed">Fixed ₹ off</option>
              <option value="free_shipping">Free shipping</option>
            </select>
          </L>
          {c.type !== "free_shipping" && (
            <L label={c.type === "percent" ? "Percent (%)" : "Amount (₹)"}>
              <input type="number" value={c.value} onChange={(e) => set("value", Number(e.target.value))} className="w-full rounded-lg border border-black/15 px-3 py-2" />
            </L>
          )}
          {c.type === "percent" && (
            <L label="Max discount (₹, optional)">
              <input type="number" value={c.max_discount ?? ""} onChange={(e) => set("max_discount", e.target.value === "" ? null : Number(e.target.value))} className="w-full rounded-lg border border-black/15 px-3 py-2" />
            </L>
          )}
          <L label="Min cart subtotal (₹)">
            <input type="number" value={c.min_subtotal} onChange={(e) => set("min_subtotal", Number(e.target.value))} className="w-full rounded-lg border border-black/15 px-3 py-2" />
          </L>
          <L label="Total usage limit (optional)">
            <input type="number" value={c.usage_limit ?? ""} onChange={(e) => set("usage_limit", e.target.value === "" ? null : Number(e.target.value))} className="w-full rounded-lg border border-black/15 px-3 py-2" />
          </L>
          <L label="Per-user limit (optional)">
            <input type="number" value={c.per_user_limit ?? ""} onChange={(e) => set("per_user_limit", e.target.value === "" ? null : Number(e.target.value))} className="w-full rounded-lg border border-black/15 px-3 py-2" />
          </L>
          <L label="Starts">
            <input type="date" value={dateVal(c.starts_at)} onChange={(e) => set("starts_at", e.target.value || null)} className="w-full rounded-lg border border-black/15 px-3 py-2" />
          </L>
          <L label="Expires">
            <input type="date" value={dateVal(c.expires_at)} onChange={(e) => set("expires_at", e.target.value || null)} className="w-full rounded-lg border border-black/15 px-3 py-2" />
          </L>
          <L label="Description" full>
            <input value={c.description ?? ""} onChange={(e) => set("description", e.target.value)} placeholder="Freshers' week promo" className="w-full rounded-lg border border-black/15 px-3 py-2" />
          </L>
          <label className="col-span-2 flex items-center gap-2 font-semibold">
            <input type="checkbox" checked={c.active} onChange={(e) => set("active", e.target.checked)} /> Active
          </label>
        </div>
        {err && <p className="mt-3 text-sm font-medium text-[var(--coral)]">{err}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-full border border-black/15 px-4 py-2 text-sm font-semibold">Cancel</button>
          <button onClick={save} disabled={saving} className="rounded-full bg-[var(--ink)] px-5 py-2 text-sm font-bold text-white disabled:opacity-50">{saving ? "Saving…" : "Save"}</button>
        </div>
      </div>
    </div>
  );
}

function L({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return <label className={`text-xs font-semibold text-[var(--ink-soft)] ${full ? "col-span-2" : ""}`}>{label}<div className="mt-1">{children}</div></label>;
}
function Note({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-black/10 bg-white p-6 text-sm text-[var(--ink-2)]">{children}</div>;
}
