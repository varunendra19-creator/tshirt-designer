"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { getProduct } from "@/lib/catalog";

type Review = {
  id: string; product_id: string; user_id: string | null; author_name: string | null; author_email: string | null;
  rating: number; title: string | null; body: string | null; hidden: boolean; created_at: string;
};
const dt = (s: string) => new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

export function ReviewModerationClient() {
  const { user, token } = useAuth();
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "forbidden" | "error">("idle");
  const [msg, setMsg] = useState("");
  const [filter, setFilter] = useState<"all" | "visible" | "hidden" | "low">("all");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setState("loading");
    const r = await fetch("/api/admin/reviews", { headers: { Authorization: `Bearer ${token}` } });
    const d = await r.json().catch(() => ({}));
    if (r.status === 403) { setState("forbidden"); setMsg(d.error || ""); return; }
    if (!r.ok) { setState("error"); setMsg(d.error || "Failed"); return; }
    setReviews(d.reviews || []); setState("idle");
  }, [token]);
  useEffect(() => { if (user && token) load(); }, [user, token, load]);

  const setHidden = async (id: string, hidden: boolean) => {
    setBusy(id);
    try {
      await fetch("/api/admin/reviews", { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ id, hidden }) });
      setReviews((prev) => prev?.map((r) => (r.id === id ? { ...r, hidden } : r)) ?? prev);
    } finally { setBusy(null); }
  };
  const del = async (id: string) => {
    if (!confirm("Permanently delete this review?")) return;
    setBusy(id);
    try {
      await fetch(`/api/admin/reviews?id=${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      setReviews((prev) => prev?.filter((r) => r.id !== id) ?? prev);
    } finally { setBusy(null); }
  };

  const list = useMemo(() => {
    let l = reviews ?? [];
    if (filter === "visible") l = l.filter((r) => !r.hidden);
    else if (filter === "hidden") l = l.filter((r) => r.hidden);
    else if (filter === "low") l = l.filter((r) => r.rating <= 2);
    return l;
  }, [reviews, filter]);

  const counts = useMemo(() => ({
    all: reviews?.length ?? 0,
    hidden: reviews?.filter((r) => r.hidden).length ?? 0,
    low: reviews?.filter((r) => r.rating <= 2).length ?? 0,
  }), [reviews]);

  if (state === "forbidden") return <Note>Not authorised — {msg}</Note>;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-2xl font-extrabold md:text-3xl">Reviews {reviews?.length ? <span className="text-[var(--ink-soft)]">({reviews.length})</span> : null}</h1>
        <button onClick={load} className="rounded-full border border-black/15 bg-white px-3 py-1.5 text-xs font-semibold">Refresh</button>
      </div>

      <div className="mb-4 inline-flex rounded-full border border-black/15 bg-white p-0.5 text-sm font-semibold">
        {([["all", `All (${counts.all})`], ["visible", "Visible"], ["hidden", `Hidden (${counts.hidden})`], ["low", `Low ★≤2 (${counts.low})`]] as const).map(([id, label]) => (
          <button key={id} onClick={() => setFilter(id)} className={`rounded-full px-3.5 py-1.5 ${filter === id ? "bg-[var(--ink)] text-white" : "text-[var(--ink-2)]"}`}>{label}</button>
        ))}
      </div>

      {state === "error" ? <Note>Couldn’t load: {msg}</Note>
        : reviews === null || state === "loading" ? <Note>Loading reviews…</Note>
        : list.length === 0 ? <Note>{reviews.length ? "No reviews match this filter." : "No reviews yet."}</Note>
        : (
          <div className="space-y-3">
            {list.map((r) => {
              const p = getProduct(r.product_id);
              return (
                <div key={r.id} className={`rounded-2xl border bg-white p-4 shadow-sm ${r.hidden ? "border-[var(--coral)]/40 opacity-70" : "border-black/10"}`}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Stars n={r.rating} />
                        {r.hidden && <span className="rounded-full bg-[var(--coral)] px-2 py-0.5 text-[10px] font-bold uppercase text-white">Hidden</span>}
                      </div>
                      {r.title && <p className="mt-1 font-bold">{r.title}</p>}
                      {r.body && <p className="text-sm text-[var(--ink-2)]">{r.body}</p>}
                      <p className="mt-1.5 text-xs text-[var(--ink-soft)]">
                        {r.author_name || "Anonymous"}{r.author_email ? ` · ${r.author_email}` : ""} · {dt(r.created_at)} ·{" "}
                        <Link href={`/products/${r.product_id}`} className="font-semibold text-[var(--primary)]" target="_blank">{p?.name || r.product_id}</Link>
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button onClick={() => setHidden(r.id, !r.hidden)} disabled={busy === r.id}
                        className="rounded-full border border-black/15 px-3 py-1.5 text-xs font-bold disabled:opacity-50">
                        {r.hidden ? "Unhide" : "Hide"}
                      </button>
                      <button onClick={() => del(r.id)} disabled={busy === r.id}
                        className="rounded-full border border-[var(--coral)] px-3 py-1.5 text-xs font-bold text-[var(--coral)] disabled:opacity-50">Delete</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
    </div>
  );
}

function Stars({ n }: { n: number }) {
  return <span className="text-sm text-[var(--accent)]">{"★".repeat(n)}<span className="text-black/15">{"★".repeat(5 - n)}</span></span>;
}
function Note({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-black/10 bg-white p-6 text-sm text-[var(--ink-2)]">{children}</div>;
}
