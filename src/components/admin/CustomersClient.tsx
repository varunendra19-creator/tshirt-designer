"use client";

import { Fragment, useEffect, useMemo, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { inr } from "@/lib/format";

type Order = { id: string; order_no: string; total: number; status: string; payment_status: string; created_at: string; refund_amount?: number };
type Address = { id: string; name: string; phone: string; address: string; city: string; state: string; pincode: string; is_default: boolean };
type Customer = {
  id: string; email: string; name: string | null; phone: string | null; role: string; created_at: string;
  orders: Order[]; order_count: number; spent: number; last_order: string | null; addresses: Address[];
};
type Guest = { email: string | null; phone: string | null; name: string | null; order_count: number; spent: number; last_order: string | null; orders: Order[] };

const dt = (s: string | null) => (s ? new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—");
const ROLE_COLOR: Record<string, string> = { admin: "var(--primary)", staff: "var(--aqua)", customer: "var(--ink-soft)" };

export function CustomersClient() {
  const { user, token } = useAuth();
  const [data, setData] = useState<{ customers: Customer[]; guests: Guest[] } | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "forbidden" | "error">("idle");
  const [msg, setMsg] = useState("");
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"registered" | "guests">("registered");
  const [openId, setOpenId] = useState<string | null>(null);
  const [savingRole, setSavingRole] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setState("loading");
    const r = await fetch("/api/admin/customers", { headers: { Authorization: `Bearer ${token}` } });
    const d = await r.json().catch(() => ({}));
    if (r.status === 403) { setState("forbidden"); setMsg(d.error || ""); return; }
    if (!r.ok) { setState("error"); setMsg(d.error || "Failed"); return; }
    setData(d); setState("idle");
  }, [token]);
  useEffect(() => { if (user && token) load(); }, [user, token, load]);

  const setRole = async (id: string, role: string) => {
    setSavingRole(id);
    try {
      const r = await fetch("/api/admin/customers", {
        method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id, role }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { alert(d.error || "Failed"); return; }
      setData((prev) => prev ? { ...prev, customers: prev.customers.map((c) => c.id === id ? { ...c, role } : c) } : prev);
    } finally { setSavingRole(null); }
  };

  const customers = useMemo(() => {
    const s = q.trim().toLowerCase();
    let list = data?.customers ?? [];
    if (s) list = list.filter((c) => [c.name, c.email, c.phone].some((v) => (v || "").toLowerCase().includes(s)));
    return list;
  }, [data, q]);
  const guests = useMemo(() => {
    const s = q.trim().toLowerCase();
    let list = data?.guests ?? [];
    if (s) list = list.filter((g) => [g.name, g.email, g.phone].some((v) => (v || "").toLowerCase().includes(s)));
    return list;
  }, [data, q]);

  if (state === "forbidden") return <Note>Not authorised — {msg}</Note>;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-extrabold md:text-3xl">Customers</h1>
        <button onClick={load} className="rounded-full border border-black/15 bg-white px-3 py-1.5 text-xs font-semibold">Refresh</button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-full border border-black/15 bg-white p-0.5 text-sm font-semibold">
          <button onClick={() => setTab("registered")} className={`rounded-full px-4 py-1.5 ${tab === "registered" ? "bg-[var(--ink)] text-white" : "text-[var(--ink-2)]"}`}>
            Registered {data ? `(${data.customers.length})` : ""}
          </button>
          <button onClick={() => setTab("guests")} className={`rounded-full px-4 py-1.5 ${tab === "guests" ? "bg-[var(--ink)] text-white" : "text-[var(--ink-2)]"}`}>
            Guests {data ? `(${data.guests.length})` : ""}
          </button>
        </div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, phone…"
          className="min-w-[220px] flex-1 rounded-full border border-black/15 bg-white px-4 py-2 text-sm outline-none focus:border-[var(--primary)]" />
      </div>

      {state === "error" ? <Note>Couldn’t load: {msg}</Note>
        : data === null || state === "loading" ? <Note>Loading customers…</Note>
        : tab === "registered" ? (
          customers.length === 0 ? <Note>No customers match.</Note> : (
            <div className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="bg-[var(--paper-2)] text-[11px] uppercase tracking-wide text-[var(--ink-soft)]">
                  <tr>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3 text-center">Orders</th>
                    <th className="px-4 py-3 text-right">Spent</th>
                    <th className="px-4 py-3">Last order</th>
                    <th className="px-4 py-3">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <Fragment key={c.id}>
                      <tr className="cursor-pointer border-t border-black/5 hover:bg-black/[0.02]" onClick={() => setOpenId(openId === c.id ? null : c.id)}>
                        <td className="px-4 py-3">
                          <p className="font-semibold">{c.name || "—"}</p>
                          <p className="text-xs text-[var(--ink-soft)]">{c.email}{c.phone ? ` · ${c.phone}` : ""}</p>
                        </td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <select value={c.role} disabled={savingRole === c.id} onChange={(e) => setRole(c.id, e.target.value)}
                            className="rounded-full px-2.5 py-1 text-[11px] font-bold uppercase text-white disabled:opacity-50"
                            style={{ background: ROLE_COLOR[c.role] || "var(--ink-soft)" }}>
                            <option className="bg-white text-[var(--ink)]" value="customer">customer</option>
                            <option className="bg-white text-[var(--ink)]" value="staff">staff</option>
                            <option className="bg-white text-[var(--ink)]" value="admin">admin</option>
                          </select>
                        </td>
                        <td className="px-4 py-3 text-center font-semibold">{c.order_count}</td>
                        <td className="px-4 py-3 text-right font-semibold">{inr(c.spent)}</td>
                        <td className="px-4 py-3 text-[var(--ink-2)]">{dt(c.last_order)}</td>
                        <td className="px-4 py-3 text-[var(--ink-2)]">{dt(c.created_at)}</td>
                      </tr>
                      {openId === c.id && (
                        <tr className="border-t border-black/5 bg-[var(--paper-2)]">
                          <td colSpan={6} className="px-4 py-4">
                            <Detail orders={c.orders} addresses={c.addresses} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          guests.length === 0 ? <Note>No guest orders.</Note> : (
            <div className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="bg-[var(--paper-2)] text-[11px] uppercase tracking-wide text-[var(--ink-soft)]">
                  <tr><th className="px-4 py-3">Guest</th><th className="px-4 py-3 text-center">Orders</th><th className="px-4 py-3 text-right">Spent</th><th className="px-4 py-3">Last order</th></tr>
                </thead>
                <tbody>
                  {guests.map((g, i) => (
                    <tr key={g.email || g.phone || i} className="border-t border-black/5">
                      <td className="px-4 py-3"><p className="font-semibold">{g.name || "—"}</p><p className="text-xs text-[var(--ink-soft)]">{g.email || g.phone || "no contact on file"}</p></td>
                      <td className="px-4 py-3 text-center font-semibold">{g.order_count}</td>
                      <td className="px-4 py-3 text-right font-semibold">{inr(g.spent)}</td>
                      <td className="px-4 py-3 text-[var(--ink-2)]">{dt(g.last_order)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
    </div>
  );
}

function Detail({ orders, addresses }: { orders: Order[]; addresses: Address[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">Orders ({orders.length})</p>
        {orders.length === 0 ? <p className="text-sm text-[var(--ink-soft)]">No orders yet.</p> : (
          <ul className="space-y-1.5">
            {orders.map((o) => (
              <li key={o.id} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-[13px]">
                <span className="font-semibold">#{o.order_no}</span>
                <span className="text-[var(--ink-soft)]">{dt(o.created_at)}</span>
                <span className="capitalize text-[var(--ink-2)]">{o.status}</span>
                <span className="font-semibold">{inr(o.total)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">Addresses ({addresses.length})</p>
        {addresses.length === 0 ? <p className="text-sm text-[var(--ink-soft)]">No saved addresses.</p> : (
          <ul className="space-y-1.5">
            {addresses.map((a) => (
              <li key={a.id} className="rounded-lg bg-white px-3 py-2 text-[13px]">
                <p className="font-semibold">{a.name} {a.is_default && <span className="ml-1 rounded bg-[var(--mint)]/20 px-1.5 text-[10px] font-bold text-[var(--mint)]">DEFAULT</span>}</p>
                <p className="text-[var(--ink-soft)]">{a.address}, {a.city}, {a.state} – {a.pincode} · {a.phone}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-black/10 bg-white p-6 text-sm text-[var(--ink-2)]">{children}</div>;
}
