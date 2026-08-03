"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";

type Review = { id: string; user_id: string; author_name: string | null; rating: number; title: string | null; body: string | null; created_at: string };

function StarRow({ value, onSet, size = 16 }: { value: number; onSet?: (n: number) => void; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" disabled={!onSet} onClick={() => onSet?.(n)} className={onSet ? "cursor-pointer" : "cursor-default"} aria-label={`${n} star`}>
          <svg width={size} height={size} viewBox="0 0 24 24" fill={n <= value ? "#f4a63b" : "none"} stroke="#f4a63b" strokeWidth="1.5">
            <path d="m12 3.5 2.6 5.27 5.82.85-4.21 4.1.99 5.79L12 16.9l-5.2 2.7.99-5.79-4.21-4.1 5.82-.85L12 3.5Z" strokeLinejoin="round" />
          </svg>
        </button>
      ))}
    </span>
  );
}

export function ProductReviews({ productId }: { productId: string }) {
  const { user, token } = useAuth();
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [bought, setBought] = useState(false);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    if (!supabase) { setReviews([]); return; }
    const { data } = await supabase.from("reviews").select("*").eq("product_id", productId).eq("hidden", false).order("created_at", { ascending: false });
    setReviews((data as any) ?? []);
  }, [productId]);

  useEffect(() => { load(); }, [load]);

  // only customers who bought this product may write a review
  useEffect(() => {
    if (!user || !supabase) { setBought(false); return; }
    supabase.from("order_items").select("id").eq("product_id", productId).limit(1).then(({ data }) => setBought(!!data?.length));
  }, [user, productId]);

  // prefill the form if the user already reviewed this product
  useEffect(() => {
    if (!user || !reviews) return;
    const mine = reviews.find((r) => r.user_id === user.id);
    if (mine) { setRating(mine.rating); setTitle(mine.title || ""); setBody(mine.body || ""); }
  }, [user, reviews]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !user || busy) return;
    setBusy(true); setMsg("");
    const author = (user.user_metadata?.name as string) || (user.email || "").split("@")[0];
    const { error } = await supabase.from("reviews").upsert(
      { product_id: productId, user_id: user.id, author_name: author, rating, title: title.trim() || null, body: body.trim() || null },
      { onConflict: "product_id,user_id" },
    );
    setBusy(false);
    if (error) { setMsg(error.message); return; }
    setMsg("Thanks — your review is live!");
    load();
  };

  const avg = reviews && reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const mine = user && reviews?.find((r) => r.user_id === user.id);

  return (
    <section className="mt-12 border-t border-black/10 pt-8">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <h2 className="font-display text-2xl font-extrabold">Reviews</h2>
        {reviews && reviews.length > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <StarRow value={Math.round(avg)} />
            <span className="font-bold">{avg.toFixed(1)}</span>
            <span className="text-[var(--ink-soft)]">({reviews.length})</span>
          </div>
        )}
      </div>

      {/* write / edit — only verified buyers */}
      {user && bought ? (
        <form onSubmit={submit} className="mb-8 rounded-2xl border border-black/10 bg-white p-5">
          <p className="mb-2 text-sm font-bold">{mine ? "Edit your review" : "Write a review"}</p>
          <div className="mb-3 flex items-center gap-2"><span className="text-sm text-[var(--ink-soft)]">Your rating:</span><StarRow value={rating} onSet={setRating} size={22} /></div>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (optional)" className="mb-2 w-full rounded-xl border border-black/15 px-4 py-2.5 text-sm outline-none focus:border-[var(--primary)]" />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Share your experience…" rows={3} className="mb-3 w-full resize-y rounded-xl border border-black/15 px-4 py-2.5 text-sm outline-none focus:border-[var(--primary)]" />
          <div className="flex items-center gap-3">
            <button type="submit" disabled={busy} className="rounded-full bg-[var(--primary)] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">{busy ? "Saving…" : mine ? "Update review" : "Post review"}</button>
            {msg && <span className="text-sm font-medium" style={{ color: "var(--mint)" }}>{msg}</span>}
          </div>
        </form>
      ) : user ? (
        <div className="mb-8 rounded-2xl border border-black/10 bg-[var(--paper-2)] p-4 text-sm text-[var(--ink-2)]">
          🛍️ Only customers who’ve <b>bought this product</b> can write a review.
        </div>
      ) : (
        <div className="mb-8 rounded-2xl border border-black/10 bg-[var(--paper-2)] p-4 text-sm text-[var(--ink-2)]">
          <Link href="/account" className="font-bold text-[var(--primary)]">Log in</Link> to write a review (verified buyers only).
        </div>
      )}

      {/* list */}
      {reviews === null ? (
        <p className="text-sm text-[var(--ink-soft)]">Loading reviews…</p>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-[var(--ink-soft)]">No reviews yet — be the first!</p>
      ) : (
        <div className="space-y-4">
          {reviews.map((r) => (
            <div key={r.id} className="rounded-2xl border border-black/10 bg-white p-4">
              <div className="flex items-center justify-between">
                <p className="font-semibold">{r.author_name || "Customer"}{user && r.user_id === user.id && <span className="ml-2 rounded-full bg-[var(--paper-2)] px-2 py-0.5 text-[10px] font-bold text-[var(--ink-soft)]">YOU</span>}</p>
                <span className="text-xs text-[var(--ink-soft)]">{new Date(r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
              </div>
              <div className="mt-1"><StarRow value={r.rating} size={14} /></div>
              {r.title && <p className="mt-1.5 text-sm font-bold">{r.title}</p>}
              {r.body && <p className="mt-0.5 text-sm text-[var(--ink-2)]">{r.body}</p>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
