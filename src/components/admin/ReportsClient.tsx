"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { inr } from "@/lib/format";

type Report = {
  range: { from: string | null; to: string | null };
  kpis: { revenue: number; gross: number; refunds: number; tax: number; units: number; paid_orders: number; total_orders: number; aov: number };
  daily: { date: string; revenue: number; orders: number }[];
  topProducts: { name: string; units: number; revenue: number }[];
  byMethod: Record<string, number>;
  byStatus: Record<string, number>;
};

const PRESETS = [
  { id: "7d", label: "7 days", days: 7 },
  { id: "30d", label: "30 days", days: 30 },
  { id: "90d", label: "90 days", days: 90 },
  { id: "all", label: "All time", days: 0 },
];
const iso = (d: Date) => d.toISOString().slice(0, 10);

export function ReportsClient() {
  const { user, token } = useAuth();
  const [preset, setPreset] = useState("30d");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [rep, setRep] = useState<Report | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "forbidden" | "error">("idle");
  const [msg, setMsg] = useState("");

  const range = useMemo(() => {
    if (preset === "custom") return { from, to };
    const p = PRESETS.find((x) => x.id === preset)!;
    if (p.days === 0) return { from: "", to: "" };
    const t = new Date();
    const f = new Date(); f.setDate(f.getDate() - p.days + 1);
    return { from: iso(f), to: iso(t) };
  }, [preset, from, to]);

  const load = useCallback(async () => {
    if (!token) return;
    setState("loading");
    const qs = new URLSearchParams();
    if (range.from) qs.set("from", range.from);
    if (range.to) qs.set("to", range.to);
    const r = await fetch(`/api/admin/reports?${qs}`, { headers: { Authorization: `Bearer ${token}` } });
    const d = await r.json().catch(() => ({}));
    if (r.status === 403) { setState("forbidden"); setMsg(d.error || ""); return; }
    if (!r.ok) { setState("error"); setMsg(d.error || "Failed"); return; }
    setRep(d); setState("idle");
  }, [token, range.from, range.to]);
  useEffect(() => { if (user && token) load(); }, [user, token, load]);

  const exportCsv = async (type: string) => {
    const qs = new URLSearchParams({ format: "csv", type });
    if (range.from) qs.set("from", range.from);
    if (range.to) qs.set("to", range.to);
    const r = await fetch(`/api/admin/reports?${qs}`, { headers: { Authorization: `Bearer ${token}` } });
    const blob = await r.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `campusmode-${type}.csv`;
    a.click();
  };

  if (state === "forbidden") return <Note>Not authorised — {msg}</Note>;
  const k = rep?.kpis;

  return (
    <div>
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-extrabold md:text-3xl">Reports</h1>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-full border border-black/15 bg-white p-0.5 text-sm font-semibold">
            {PRESETS.map((p) => (
              <button key={p.id} onClick={() => setPreset(p.id)}
                className={`rounded-full px-3 py-1.5 ${preset === p.id ? "bg-[var(--ink)] text-white" : "text-[var(--ink-2)]"}`}>{p.label}</button>
            ))}
            <button onClick={() => setPreset("custom")}
              className={`rounded-full px-3 py-1.5 ${preset === "custom" ? "bg-[var(--ink)] text-white" : "text-[var(--ink-2)]"}`}>Custom</button>
          </div>
          {preset === "custom" && (
            <span className="flex items-center gap-1 text-sm">
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-lg border border-black/15 px-2 py-1.5" />
              <span className="text-[var(--ink-soft)]">→</span>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-lg border border-black/15 px-2 py-1.5" />
            </span>
          )}
        </div>
      </div>

      {/* export bar */}
      <div className="no-print mb-5 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-[var(--ink-soft)]">Export:</span>
        <button onClick={() => exportCsv("orders")} className="rounded-full border border-black/15 bg-white px-3 py-1.5 text-xs font-bold">Orders CSV</button>
        <button onClick={() => exportCsv("items")} className="rounded-full border border-black/15 bg-white px-3 py-1.5 text-xs font-bold">Line items CSV</button>
        <button onClick={() => exportCsv("summary")} className="rounded-full border border-black/15 bg-white px-3 py-1.5 text-xs font-bold">Daily summary CSV</button>
        <button onClick={() => window.print()} className="rounded-full bg-[var(--primary)] px-3 py-1.5 text-xs font-bold text-white">🖨️ Print / PDF</button>
      </div>

      {state === "error" ? <Note>Couldn’t load: {msg}</Note>
        : !rep || state === "loading" ? <Note>Crunching numbers…</Note>
        : (
          <div id="invoice-print">
            <p className="mb-4 hidden text-lg font-bold print:block">Campus Mode — Sales report {range.from ? `(${range.from} → ${range.to})` : "(all time)"}</p>

            {/* KPIs */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Kpi label="Net revenue" value={inr(k!.revenue)} sub={`${k!.paid_orders} paid orders`} accent />
              <Kpi label="Avg order value" value={inr(k!.aov)} />
              <Kpi label="Units sold" value={String(k!.units)} />
              <Kpi label="GST collected" value={inr(k!.tax)} />
              <Kpi label="Gross sales" value={inr(k!.gross)} />
              <Kpi label="Refunds" value={inr(k!.refunds)} sub="deducted from net" />
              <Kpi label="Total orders" value={String(k!.total_orders)} sub="incl. unpaid" />
              <Kpi label="Conversion" value={k!.total_orders ? `${Math.round((k!.paid_orders / k!.total_orders) * 100)}%` : "—"} sub="paid / placed" />
            </div>

            {/* revenue chart */}
            <Card title="Net revenue over time">
              <RevenueChart daily={rep.daily} />
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              {/* top products */}
              <Card title="Top products">
                {rep.topProducts.length === 0 ? <Empty /> : (
                  <table className="w-full text-left text-[13px]">
                    <thead className="text-[11px] uppercase tracking-wide text-[var(--ink-soft)]">
                      <tr><th className="py-1.5">Product</th><th className="py-1.5 text-center">Units</th><th className="py-1.5 text-right">Revenue</th></tr>
                    </thead>
                    <tbody>
                      {rep.topProducts.map((p, i) => (
                        <tr key={i} className="border-t border-black/5">
                          <td className="py-1.5">{p.name}</td>
                          <td className="py-1.5 text-center">{p.units}</td>
                          <td className="py-1.5 text-right font-semibold">{inr(p.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Card>

              {/* breakdowns */}
              <Card title="Breakdown">
                <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-[var(--ink-soft)]">Revenue by payment method</p>
                {Object.keys(rep.byMethod).length === 0 ? <Empty /> : Object.entries(rep.byMethod).map(([m, v]) => (
                  <Bar key={m} label={m.toUpperCase()} value={v} max={Math.max(...Object.values(rep.byMethod), 1)} fmt={inr} />
                ))}
                <p className="mb-1 mt-4 text-[11px] font-bold uppercase tracking-wide text-[var(--ink-soft)]">Orders by status</p>
                {Object.entries(rep.byStatus).map(([s, v]) => (
                  <Bar key={s} label={s} value={v} max={Math.max(...Object.values(rep.byStatus), 1)} fmt={(n) => String(n)} />
                ))}
              </Card>
            </div>
          </div>
        )}
    </div>
  );
}

function RevenueChart({ daily }: { daily: { date: string; revenue: number; orders: number }[] }) {
  if (!daily.length) return <Empty />;
  const max = Math.max(...daily.map((d) => d.revenue), 1);
  const W = 720, H = 180, pad = 24, bw = Math.max(2, (W - pad * 2) / daily.length - 3);
  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="min-w-[560px]" role="img" aria-label="Revenue over time">
        {daily.map((d, i) => {
          const h = ((d.revenue / max) * (H - pad * 2));
          const x = pad + i * ((W - pad * 2) / daily.length);
          return (
            <g key={d.date}>
              <rect x={x} y={H - pad - h} width={bw} height={Math.max(1, h)} rx={2} fill="var(--primary)" opacity={0.85}>
                <title>{d.date}: {inr(d.revenue)} · {d.orders} orders</title>
              </rect>
            </g>
          );
        })}
        <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke="rgba(0,0,0,.15)" />
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-[var(--ink-soft)]">
        <span>{daily[0].date}</span><span>Peak {inr(max)}</span><span>{daily[daily.length - 1].date}</span>
      </div>
    </div>
  );
}

function Bar({ label, value, max, fmt }: { label: string; value: number; max: number; fmt: (n: number) => string }) {
  return (
    <div className="mb-1.5">
      <div className="flex justify-between text-[12px]"><span className="capitalize">{label}</span><span className="font-semibold">{fmt(value)}</span></div>
      <div className="h-2 rounded-full bg-black/[0.06]"><div className="h-2 rounded-full" style={{ width: `${(value / max) * 100}%`, background: "var(--aqua)" }} /></div>
    </div>
  );
}
function Kpi({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${accent ? "border-transparent bg-[var(--primary)] text-white" : "border-black/10 bg-white"}`}>
      <p className={`text-xs font-semibold ${accent ? "text-white/80" : "text-[var(--ink-soft)]"}`}>{label}</p>
      <p className="mt-1 text-2xl font-extrabold">{value}</p>
      {sub && <p className={`text-[11px] ${accent ? "text-white/70" : "text-[var(--ink-soft)]"}`}>{sub}</p>}
    </div>
  );
}
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
      <p className="mb-3 font-bold">{title}</p>
      {children}
    </div>
  );
}
function Empty() { return <p className="text-sm text-[var(--ink-soft)]">No data in this range.</p>; }
function Note({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-black/10 bg-white p-6 text-sm text-[var(--ink-2)]">{children}</div>;
}
