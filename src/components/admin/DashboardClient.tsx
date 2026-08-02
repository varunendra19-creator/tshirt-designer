"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { inr } from "@/lib/format";

type Stats = {
  revenue: number; ordersCount: number; pending: number; cancelled: number; aov: number;
  customers: number; lowStock: number; outOfStock: number;
  series: { date: string; label: string; revenue: number; orders: number }[];
  payments: Record<string, number>;
};

export function DashboardClient() {
  const { token } = useAuth();
  const [s, setS] = useState<Stats | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!token) return;
    fetch("/api/admin/stats", { headers: { Authorization: `Bearer ${token}` } })
      .then(async (r) => { if (!r.ok) throw new Error((await r.json()).error || "Failed"); return r.json(); })
      .then(setS).catch((e) => setErr(e.message));
  }, [token]);

  if (err) return <p className="text-sm text-[var(--coral)]">{err}</p>;
  if (!s) return <p className="text-[var(--ink-soft)]">Loading dashboard…</p>;

  const maxRev = Math.max(1, ...s.series.map((d) => d.revenue));

  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold md:text-3xl">Dashboard</h1>
      <p className="mt-1 text-sm text-[var(--ink-soft)]">Sales, orders and stock at a glance.</p>

      {/* stat cards */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Revenue (paid)" value={inr(s.revenue)} accent="var(--mint)" />
        <Stat label="Orders" value={String(s.ordersCount)} sub={`${s.pending} pending`} accent="var(--primary)" />
        <Stat label="Avg order value" value={inr(s.aov)} accent="var(--aqua)" />
        <Stat label="Customers" value={String(s.customers)} accent="var(--accent)" />
      </div>

      {/* revenue chart */}
      <div className="mt-6 rounded-3xl border border-black/10 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="font-display text-lg font-extrabold">Revenue · last 14 days</h2>
          <span className="text-sm text-[var(--ink-soft)]">{inr(s.series.reduce((a, d) => a + d.revenue, 0))}</span>
        </div>
        <div className="flex items-end gap-1.5" style={{ height: 160 }}>
          {s.series.map((d) => (
            <div key={d.date} className="group flex flex-1 flex-col items-center justify-end gap-1">
              <span className="text-[9px] font-bold text-[var(--ink-soft)] opacity-0 group-hover:opacity-100">{d.revenue ? inr(d.revenue) : ""}</span>
              <div className="w-full rounded-t-md transition-all" title={`${d.label}: ${inr(d.revenue)} · ${d.orders} orders`}
                style={{ height: `${Math.max(2, (d.revenue / maxRev) * 130)}px`, background: d.revenue ? "var(--primary)" : "var(--line)" }} />
              <span className="text-[9px] text-[var(--ink-soft)]">{d.label.split(" ")[0]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* stock + quick links */}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm">
          <h2 className="font-display text-lg font-extrabold">Stock health</h2>
          <div className="mt-3 flex gap-6">
            <div><p className="font-display text-2xl font-extrabold" style={{ color: "var(--accent)" }}>{s.lowStock}</p><p className="text-xs text-[var(--ink-soft)]">low stock (≤5)</p></div>
            <div><p className="font-display text-2xl font-extrabold" style={{ color: "var(--coral)" }}>{s.outOfStock}</p><p className="text-xs text-[var(--ink-soft)]">out of stock</p></div>
          </div>
          <Link href="/admin/products" className="mt-4 inline-block text-sm font-bold text-[var(--primary)]">Manage products →</Link>
        </div>
        <div className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm">
          <h2 className="font-display text-lg font-extrabold">Payment methods</h2>
          <div className="mt-3 space-y-1.5 text-sm">
            {Object.entries(s.payments).length === 0 && <p className="text-[var(--ink-soft)]">No orders yet.</p>}
            {Object.entries(s.payments).map(([k, v]) => (
              <div key={k} className="flex justify-between"><span className="uppercase text-[var(--ink-2)]">{k}</span><span className="font-semibold">{v}</span></div>
            ))}
          </div>
          <Link href="/admin/orders" className="mt-4 inline-block text-sm font-bold text-[var(--primary)]">View orders →</Link>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent: string }) {
  return (
    <div className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm">
      <div className="mb-2 h-1 w-8 rounded-full" style={{ background: accent }} />
      <p className="font-display text-2xl font-extrabold leading-none">{value}</p>
      <p className="mt-1.5 text-[13px] text-[var(--ink-soft)]">{label}</p>
      {sub && <p className="text-[11px] font-semibold" style={{ color: accent }}>{sub}</p>}
    </div>
  );
}
