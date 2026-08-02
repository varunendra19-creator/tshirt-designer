"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { inr } from "@/lib/format";
import { InvoiceModal } from "./InvoiceModal";

/* ---------- types ---------- */
type Item = {
  id: string; name: string; size: string | null; color: string | null; qty: number;
  line_total: number; unit_price?: number; is_custom: boolean; design_image_url: string | null; design_spec: any | null;
};
type Event = { id: string; created_at: string; type: string; message: string; actor: string };
export type Order = {
  id: string; order_no: string; created_at: string; status: string; payment_status: string;
  total: number; subtotal: number; shipping: number; tax: number;
  payment_method: string; customer_name: string; phone: string; email: string | null;
  address: string; city: string; state: string; pincode: string;
  carrier: string | null; tracking_no: string | null; tracking_url: string | null;
  shipped_at: string | null; delivered_at: string | null; cancelled_at: string | null; cancel_reason: string | null;
  refund_amount: number; refunded_at: string | null; refund_reason: string | null; admin_note: string | null;
  order_items: Item[]; order_events?: Event[];
};

/* ---------- status config ---------- */
const FULFILMENT = ["pending", "processing", "shipped", "delivered", "cancelled"];
const PAYMENT = ["unpaid", "paid", "partially_refunded", "refunded", "failed"];
const F_COLOR: Record<string, string> = {
  pending: "var(--accent)", processing: "var(--aqua)", shipped: "#3b82f6",
  delivered: "var(--mint)", cancelled: "var(--coral)",
};
const P_COLOR: Record<string, string> = {
  unpaid: "var(--ink-soft)", paid: "var(--mint)", partially_refunded: "var(--accent)",
  refunded: "var(--coral)", failed: "var(--coral)",
};
const label = (s: string) => s.replace(/_/g, " ");
const dt = (s: string | null) =>
  s ? new Date(s).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "";

export function OrdersClient() {
  const { user, token } = useAuth();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "forbidden" | "error">("idle");
  const [msg, setMsg] = useState("");
  const [q, setQ] = useState("");
  const [fFilter, setFFilter] = useState("all");
  const [pFilter, setPFilter] = useState("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<Order | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setState("loading");
    const res = await fetch("/api/admin/orders", { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json().catch(() => ({}));
    if (res.status === 403) { setState("forbidden"); setMsg(data.error || "Not authorised"); return; }
    if (!res.ok) { setState("error"); setMsg(data.error || "Failed to load"); return; }
    setOrders(data.orders || []);
    setState("idle");
  }, [token]);

  useEffect(() => { if (user && token) load(); }, [user, token, load]);

  const patch = async (id: string, body: Record<string, any>, tag = "save") => {
    setBusy(`${id}:${tag}`);
    try {
      const r = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id, ...body }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { alert(d.error || "Update failed"); return false; }
      await load();
      return true;
    } finally { setBusy(null); }
  };

  const refund = async (id: string, amount: number | null, reason: string, restock: boolean) => {
    setBusy(`${id}:refund`);
    try {
      const r = await fetch("/api/admin/orders/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id, amount, reason, restock }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { alert(d.error || "Refund failed"); return; }
      await load();
    } finally { setBusy(null); }
  };

  const filtered = useMemo(() => {
    let list = orders ?? [];
    if (fFilter !== "all") list = list.filter((o) => o.status === fFilter);
    if (pFilter !== "all") list = list.filter((o) => o.payment_status === pFilter);
    const s = q.trim().toLowerCase();
    if (s) list = list.filter((o) =>
      [o.order_no, o.customer_name, o.phone, o.email, o.city, o.pincode]
        .some((v) => (v || "").toLowerCase().includes(s)));
    return list;
  }, [orders, fFilter, pFilter, q]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    (orders ?? []).forEach((o) => { c[o.status] = (c[o.status] || 0) + 1; });
    return c;
  }, [orders]);

  if (state === "forbidden") return <Note>Not authorised — {msg}</Note>;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-extrabold md:text-3xl">
          Orders {orders?.length ? <span className="text-[var(--ink-soft)]">({orders.length})</span> : null}
        </h1>
        <button onClick={load} className="rounded-full border border-black/15 bg-white px-3 py-1.5 text-xs font-semibold">Refresh</button>
      </div>

      {/* filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search order #, name, phone, email…"
          className="min-w-[220px] flex-1 rounded-full border border-black/15 bg-white px-4 py-2 text-sm outline-none focus:border-[var(--primary)]" />
        <select value={fFilter} onChange={(e) => setFFilter(e.target.value)}
          className="rounded-full border border-black/15 bg-white px-3 py-2 text-sm font-medium">
          <option value="all">All statuses</option>
          {FULFILMENT.map((s) => <option key={s} value={s}>{label(s)}{counts[s] ? ` (${counts[s]})` : ""}</option>)}
        </select>
        <select value={pFilter} onChange={(e) => setPFilter(e.target.value)}
          className="rounded-full border border-black/15 bg-white px-3 py-2 text-sm font-medium">
          <option value="all">All payments</option>
          {PAYMENT.map((s) => <option key={s} value={s}>{label(s)}</option>)}
        </select>
      </div>

      {state === "error" ? (
        <Note>Couldn’t load orders: {msg}</Note>
      ) : orders === null || state === "loading" ? (
        <Note>Loading orders…</Note>
      ) : filtered.length === 0 ? (
        <Note>{orders.length ? "No orders match these filters." : "No orders yet."}</Note>
      ) : (
        <div className="space-y-3">
          {filtered.map((o) => (
            <OrderCard key={o.id} o={o} open={openId === o.id} onToggle={() => setOpenId(openId === o.id ? null : o.id)}
              patch={patch} refund={refund} busy={busy} onInvoice={() => setInvoice(o)} />
          ))}
        </div>
      )}

      {invoice && <InvoiceModal order={invoice} onClose={() => setInvoice(null)} />}
    </div>
  );
}

/* ---------- one order ---------- */
function OrderCard({ o, open, onToggle, patch, refund, busy, onInvoice }: {
  o: Order; open: boolean; onToggle: () => void;
  patch: (id: string, body: any, tag?: string) => Promise<boolean | void>;
  refund: (id: string, amount: number | null, reason: string, restock: boolean) => Promise<void>;
  busy: string | null; onInvoice: () => void;
}) {
  const [carrier, setCarrier] = useState(o.carrier || "");
  const [trackingNo, setTrackingNo] = useState(o.tracking_no || "");
  const [trackingUrl, setTrackingUrl] = useState(o.tracking_url || "");
  const [note, setNote] = useState(o.admin_note || "");
  const [showRefund, setShowRefund] = useState(false);

  const isBusy = (tag: string) => busy === `${o.id}:${tag}`;
  const terminal = o.status === "cancelled";
  const refundable = ["paid", "partially_refunded"].includes(o.payment_status);
  const remaining = Math.max(0, (o.total || 0) - (o.refund_amount || 0));

  return (
    <div className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
      {/* summary row */}
      <button onClick={onToggle} className="flex w-full flex-wrap items-center justify-between gap-3 px-5 py-4 text-left">
        <div className="min-w-0">
          <p className="font-bold">#{o.order_no} · {inr(o.total)}
            {o.refund_amount ? <span className="ml-2 text-xs font-semibold text-[var(--coral)]">−{inr(o.refund_amount)} refunded</span> : null}
          </p>
          <p className="truncate text-xs text-[var(--ink-soft)]">
            {dt(o.created_at)} · {o.payment_method?.toUpperCase()} · {o.customer_name} · {o.order_items.length} item{o.order_items.length > 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge color={P_COLOR[o.payment_status]}>{label(o.payment_status)}</Badge>
          <Badge color={F_COLOR[o.status]}>{label(o.status)}</Badge>
          <span className="text-[var(--ink-soft)]">{open ? "▲" : "▼"}</span>
        </div>
      </button>

      {open && (
        <div className="border-t border-black/10 px-5 py-4">
          {/* customer + shipping */}
          <div className="grid gap-1 text-[13px] sm:grid-cols-2">
            <p><span className="text-[var(--ink-soft)]">Name:</span> <b>{o.customer_name}</b></p>
            <p><span className="text-[var(--ink-soft)]">Phone:</span> {o.phone}</p>
            <p className="sm:col-span-2"><span className="text-[var(--ink-soft)]">Email:</span> {o.email || "—"}</p>
            <p className="sm:col-span-2"><span className="text-[var(--ink-soft)]">Ship to:</span> {o.address}, {o.city}, {o.state} – {o.pincode}</p>
          </div>

          {/* management controls */}
          <div className="mt-4 grid gap-3 rounded-xl border border-black/10 p-3 md:grid-cols-2" style={{ background: "var(--paper-2)" }}>
            {/* status */}
            <label className="text-xs font-semibold text-[var(--ink-soft)]">
              Fulfilment status
              <select value={o.status} disabled={isBusy("status")}
                onChange={(e) => patch(o.id, { status: e.target.value }, "status")}
                className="mt-1 block w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm font-semibold text-[var(--ink)] disabled:opacity-50">
                {FULFILMENT.map((s) => <option key={s} value={s}>{label(s)}</option>)}
              </select>
            </label>
            {/* payment */}
            <label className="text-xs font-semibold text-[var(--ink-soft)]">
              Payment status
              <select value={o.payment_status} disabled={isBusy("payment")}
                onChange={(e) => patch(o.id, { payment_status: e.target.value }, "payment")}
                className="mt-1 block w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm font-semibold text-[var(--ink)] disabled:opacity-50">
                {PAYMENT.map((s) => <option key={s} value={s}>{label(s)}</option>)}
              </select>
            </label>

            {/* shipping / tracking */}
            <div className="md:col-span-2">
              <p className="mb-1 text-xs font-semibold text-[var(--ink-soft)]">Shipping &amp; tracking</p>
              <div className="grid gap-2 sm:grid-cols-3">
                <input value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="Carrier (Delhivery…)"
                  className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm" />
                <input value={trackingNo} onChange={(e) => setTrackingNo(e.target.value)} placeholder="Tracking #"
                  className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm" />
                <input value={trackingUrl} onChange={(e) => setTrackingUrl(e.target.value)} placeholder="Tracking URL"
                  className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm" />
              </div>
              <button disabled={isBusy("ship")}
                onClick={() => patch(o.id, { carrier, tracking_no: trackingNo, tracking_url: trackingUrl }, "ship")}
                className="mt-2 rounded-full bg-[var(--ink)] px-4 py-1.5 text-xs font-bold text-white disabled:opacity-50">
                {isBusy("ship") ? "Saving…" : "Save tracking"}
              </button>
            </div>

            {/* admin note */}
            <div className="md:col-span-2">
              <p className="mb-1 text-xs font-semibold text-[var(--ink-soft)]">Internal note</p>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2}
                className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm" placeholder="Visible to staff only" />
              <button disabled={isBusy("note")} onClick={() => patch(o.id, { admin_note: note }, "note")}
                className="mt-1 rounded-full border border-black/15 bg-white px-4 py-1.5 text-xs font-bold disabled:opacity-50">Save note</button>
            </div>

            {/* actions */}
            <div className="flex flex-wrap items-center gap-2 md:col-span-2">
              <button onClick={onInvoice} className="rounded-full bg-[var(--primary)] px-4 py-1.5 text-xs font-bold text-white">🧾 Invoice</button>
              {refundable && (
                <button onClick={() => setShowRefund((v) => !v)}
                  className="rounded-full border border-[var(--coral)] px-4 py-1.5 text-xs font-bold text-[var(--coral)]">
                  Refund{o.refund_amount ? ` (${inr(remaining)} left)` : ""}
                </button>
              )}
              {!terminal && (
                <button disabled={isBusy("status")}
                  onClick={() => { const r = prompt("Cancel this order? Reason (optional):", ""); if (r !== null) patch(o.id, { status: "cancelled", reason: r }, "status"); }}
                  className="rounded-full border border-black/15 px-4 py-1.5 text-xs font-bold text-[var(--ink-2)] disabled:opacity-50">Cancel order</button>
              )}
            </div>

            {showRefund && refundable && (
              <RefundBox remaining={remaining} busy={isBusy("refund")}
                onSubmit={(amt, reason, restock) => { refund(o.id, amt, reason, restock); setShowRefund(false); }} />
            )}
          </div>

          {/* items */}
          <div className="mt-4 space-y-4">
            {o.order_items.map((it) => <ItemBlock key={it.id} it={it} orderNo={o.order_no} />)}
          </div>

          {/* timeline */}
          {o.order_events && o.order_events.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">Timeline</p>
              <ol className="space-y-1.5 border-l-2 border-black/10 pl-4">
                {o.order_events.map((e) => (
                  <li key={e.id} className="relative text-[12px]">
                    <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full" style={{ background: "var(--primary)" }} />
                    <span className="font-semibold">{e.message}</span>
                    <span className="ml-2 text-[var(--ink-soft)]">{dt(e.created_at)} · {e.actor}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- refund box ---------- */
function RefundBox({ remaining, busy, onSubmit }: { remaining: number; busy: boolean; onSubmit: (amt: number | null, reason: string, restock: boolean) => void }) {
  const [amt, setAmt] = useState(String(remaining));
  const [reason, setReason] = useState("");
  const [restock, setRestock] = useState(true);
  return (
    <div className="rounded-lg border border-[var(--coral)]/40 bg-white p-3 md:col-span-2">
      <p className="text-xs font-bold text-[var(--coral)]">Record a refund (max {inr(remaining)})</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input type="number" value={amt} min={1} max={remaining} onChange={(e) => setAmt(e.target.value)}
          className="w-28 rounded-lg border border-black/15 px-3 py-2 text-sm" />
        <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason"
          className="min-w-[160px] flex-1 rounded-lg border border-black/15 px-3 py-2 text-sm" />
        <label className="flex items-center gap-1.5 text-xs font-semibold">
          <input type="checkbox" checked={restock} onChange={(e) => setRestock(e.target.checked)} /> Restock items
        </label>
        <button disabled={busy} onClick={() => onSubmit(Math.min(Number(amt) || 0, remaining), reason, restock)}
          className="rounded-full bg-[var(--coral)] px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
          {busy ? "Processing…" : "Confirm refund"}
        </button>
      </div>
      <p className="mt-1 text-[10px] text-[var(--ink-soft)]">Records the refund &amp; updates payment status. Gateway refund (Stripe) runs automatically once payments are live.</p>
    </div>
  );
}

/* ---------- shared bits ---------- */
function Badge({ children, color }: { children: React.ReactNode; color?: string }) {
  return <span className="rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white" style={{ background: color || "var(--ink-soft)" }}>{children}</span>;
}
function Note({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-black/10 bg-white p-6 text-sm text-[var(--ink-2)]">{children}</div>;
}
function Chip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border border-black/10 bg-white px-2 py-0.5 font-semibold text-[var(--ink-2)]">{children}</span>;
}

/* download helper */
async function download(url: string, name: string) {
  try {
    const r = await fetch(url); const b = await r.blob();
    const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = name; a.click();
  } catch { window.open(url, "_blank"); }
}
function DlBtn({ children, onClick, primary }: { children: React.ReactNode; onClick: () => void; primary?: boolean }) {
  return (
    <button onClick={onClick} className="rounded-full px-3 py-1 text-[11px] font-bold"
      style={primary ? { background: "var(--primary)", color: "#fff" } : { border: "1px solid var(--line)", color: "var(--ink-2)", background: "#fff" }}>
      {children}
    </button>
  );
}

/* One line item — full product + custom-design production spec (unchanged rich view). */
function ItemBlock({ it, orderNo }: { it: Item; orderNo: string }) {
  const spec = it.design_spec || {};
  const meta = spec.meta || {};
  const surfaces: any[] = spec.surfaces || [];
  return (
    <div className="rounded-xl border border-black/10 p-3" style={{ background: "var(--paper-2)" }}>
      <div className="flex items-start gap-3">
        <div className="h-16 w-14 shrink-0 overflow-hidden rounded-lg border border-black/10 bg-white">
          {it.design_image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={it.design_image_url} alt={it.name} className="h-full w-full object-contain" />
          )}
        </div>
        <div className="flex-1">
          <p className="font-bold leading-tight">{it.name}</p>
          <p className="text-xs text-[var(--ink-soft)]">Qty {it.qty} · {inr(it.line_total)}</p>
          <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
            {meta.fit && <Chip>{meta.fit}</Chip>}
            {meta.color_name && (
              <Chip><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ background: meta.color_hex || "#000", boxShadow: "0 0 0 1px rgba(0,0,0,.15)" }} />{meta.color_name}</Chip>
            )}
            {(it.size || meta.size) && <Chip>Size {it.size || meta.size}</Chip>}
            {meta.fabric && <Chip>{meta.fabric}{meta.fabric_note ? ` · ${meta.fabric_note}` : ""}</Chip>}
            {Array.isArray(meta.print_areas) && meta.print_areas.length > 0 && <Chip>Print: {meta.print_areas.join(", ")}</Chip>}
          </div>
        </div>
      </div>

      {surfaces.length > 0 && (
        <div className="mt-3 space-y-3">
          {surfaces.map((s) => (
            <div key={s.id} className="rounded-lg border border-black/10 bg-white p-3">
              <div className="flex items-center justify-between">
                <p className="text-[12px] font-bold uppercase tracking-wide text-[var(--primary)]">{s.label} print</p>
                <p className="text-[10px] text-[var(--ink-soft)]">
                  {s.print_mm ? `${s.print_mm.w}×${s.print_mm.h} mm` : ""}{s.print_px_300dpi ? ` · ${s.print_px_300dpi.w}×${s.print_px_300dpi.h}px @300dpi` : ""}
                </p>
              </div>
              <div className="mt-2 flex gap-3">
                {s.preview_url && (
                  <a href={s.preview_url} target="_blank" rel="noreferrer" className="h-24 w-20 shrink-0 overflow-hidden rounded-md border border-black/10" style={{ background: "var(--paper-2)" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={s.preview_url} alt={`${s.label} preview`} className="h-full w-full object-contain" />
                  </a>
                )}
                <div className="min-w-0 flex-1">
                  {(s.spec || []).map((el: any, i: number) => (
                    <div key={i} className="border-b border-black/5 py-1.5 text-[11px] last:border-0">
                      {el.type === "text" ? (
                        <>
                          <p className="truncate font-semibold">“{el.text}”</p>
                          <p className="text-[var(--ink-soft)]">
                            {el.font_family} · {el.font_size_pt}pt · {el.font_weight}{el.font_style === "italic" ? " · italic" : ""}{el.underline ? " · underline" : ""}
                            {"  "}<span className="ml-1 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ background: el.color, boxShadow: "0 0 0 1px rgba(0,0,0,.15)" }} /> {el.color}
                          </p>
                          <p className="text-[var(--ink-soft)]">pos {el.x_mm},{el.y_mm} mm ({el.x_pct}%, {el.y_pct}%){el.angle ? ` · ${el.angle}°` : ""} · align {el.align}</p>
                        </>
                      ) : (
                        <>
                          <p className="font-semibold capitalize">{el.type}{el.type === "vector" ? " (SVG)" : el.natural_px ? ` · ${el.natural_px.w}×${el.natural_px.h}px` : ""}</p>
                          <p className="text-[var(--ink-soft)]">{el.w_mm}×{el.h_mm} mm · pos {el.x_mm},{el.y_mm} mm{el.angle ? ` · ${el.angle}°` : ""}</p>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {s.hd_url && <DlBtn onClick={() => download(s.hd_url, `${orderNo}-${s.id}-hd.png`)}>↓ HD PNG</DlBtn>}
                {s.svg_url && <DlBtn onClick={() => download(s.svg_url, `${orderNo}-${s.id}.svg`)} primary>↓ Vector SVG</DlBtn>}
                {s.preview_url && <DlBtn onClick={() => download(s.preview_url, `${orderNo}-${s.id}.png`)}>↓ Preview</DlBtn>}
              </div>
            </div>
          ))}
        </div>
      )}

      {it.is_custom && surfaces.length === 0 && it.design_image_url && (
        <button onClick={() => download(it.design_image_url!, `${orderNo}-design.png`)}
          className="mt-2 inline-flex items-center gap-1 rounded-full bg-[var(--primary)] px-3 py-1 text-[11px] font-bold text-white">↓ Download design</button>
      )}
    </div>
  );
}
