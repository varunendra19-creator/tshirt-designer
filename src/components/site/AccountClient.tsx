"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { inr } from "@/lib/format";
import { getProduct } from "@/lib/catalog";
import { getRecentlyViewed } from "@/lib/recentlyViewed";
import { useWishlist, removeWish } from "@/lib/wishlist";
import { AuthForm } from "@/components/site/AuthForm";
import { DesignPreviewModal, OnShirt } from "@/components/site/DesignPreview";
import { AddressForm, AddressCard } from "@/components/site/AddressBook";
import { fetchAddresses, saveAddress, updateAddress, deleteAddress, setDefaultAddress, type Address, type AddressInput } from "@/lib/addresses";
import { Img, Stars } from "@/components/home/primitives";

type OrderItem = { id: string; product_id: string | null; name: string; size: string | null; color: string | null; qty: number; line_total: number; is_custom: boolean; design_image_url: string | null; design_spec: any | null };
type OrderEvent = { id: string; created_at: string; type: string; message: string };
type Order = {
  id: string; order_no: string; created_at: string; status: string; payment_status: string | null;
  total: number; discount: number | null; coupon_code: string | null; payment_method: string;
  carrier: string | null; tracking_no: string | null; tracking_url: string | null;
  order_items: OrderItem[]; order_events?: OrderEvent[];
};
type Review = { id: string; product_id: string; rating: number; title: string | null; body: string | null; created_at: string };

const STATUS_COLOR: Record<string, string> = { pending: "var(--accent)", processing: "var(--aqua)", shipped: "var(--info)", delivered: "var(--mint)", cancelled: "var(--coral)" };
const STATUS_STEPS = ["pending", "processing", "shipped", "delivered"];
const STEP_LABEL: Record<string, string> = { pending: "Placed", processing: "Packing", shipped: "Shipped", delivered: "Delivered" };
const PAY_COLOR: Record<string, string> = { unpaid: "var(--ink-soft)", paid: "var(--mint)", partially_refunded: "var(--accent)", refunded: "var(--coral)", failed: "var(--coral)" };
const TABS = [
  { id: "orders", label: "Orders" },
  { id: "addresses", label: "Addresses" },
  { id: "profile", label: "Profile" },
  { id: "reviews", label: "Reviews" },
  { id: "wishlist", label: "Wishlist" },
  { id: "viewed", label: "Recently viewed" },
] as const;
type Tab = (typeof TABS)[number]["id"];

const toView = (it: OrderItem) => ({
  product: { name: it.name, image: it.design_image_url, tone: "#efeafd" },
  size: it.size, qty: it.qty, lineTotal: it.line_total,
  custom: it.is_custom ? { name: it.name, image: it.design_image_url, meta: it.design_spec?.meta, surfaces: it.design_spec?.surfaces } : null,
});
const heroSurface = (it: OrderItem) => {
  const s = it.design_spec?.surfaces as any[] | undefined;
  return s?.find((x) => x.id === "front") || s?.[0] || null;
};

export function AccountClient() {
  const { user, loading, signOut, ready, token, resendVerification } = useAuth();
  const [tab, setTab] = useState<Tab>("orders");
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [err, setErr] = useState("");
  const [zoom, setZoom] = useState<any>(null);
  const wishIds = useWishlist();

  useEffect(() => {
    if (!user || !supabase) return;
    setErr("");
    supabase.from("orders")
      .select("id, order_no, created_at, status, payment_status, total, discount, coupon_code, payment_method, carrier, tracking_no, tracking_url, order_items(id, product_id, name, size, color, qty, line_total, is_custom, design_image_url, design_spec), order_events(id, created_at, type, message)")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) setErr(error.message);
        const rows = (data as any as Order[]) ?? [];
        rows.forEach((o) => o.order_events?.sort((a, b) => a.created_at.localeCompare(b.created_at)));
        setOrders(rows);
      });
    supabase.from("reviews").select("id, product_id, rating, title, body, created_at").eq("user_id", user.id)
      .then(({ data }) => setReviews((data as any) ?? []));
  }, [user]);

  if (!ready) return <Shell><Note>Accounts aren’t configured yet.</Note></Shell>;
  if (loading) return <Shell><Note>Loading…</Note></Shell>;

  if (!user) {
    return (
      <Shell>
        <div className="mx-auto max-w-sm rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
          <h2 className="font-display mb-1 text-xl font-extrabold">Log in to your account</h2>
          <p className="mb-4 text-[13px] text-[var(--ink-soft)]">See your orders, custom designs, reviews and more.</p>
          <AuthForm compact />
        </div>
      </Shell>
    );
  }

  const name = (user.user_metadata?.name as string) || (user.email || "").split("@")[0];
  const initial = (name || "?").charAt(0).toUpperCase();

  return (
    <Shell>
      {/* profile header */}
      <div className="flex items-center gap-4 rounded-3xl border border-black/10 bg-white p-5 shadow-sm">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full text-xl font-extrabold text-white" style={{ background: "var(--grad-hero)" }}>{initial}</div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-extrabold leading-tight">{name}</p>
          <p className="truncate text-[13px] text-[var(--ink-soft)]">{user.email}</p>
        </div>
        <button onClick={signOut} className="shrink-0 rounded-full border border-black/15 px-4 py-2 text-sm font-semibold transition-colors hover:bg-[var(--paper-2)]">Sign out</button>
      </div>

      {/* email verification banner */}
      {!(user as any).email_confirmed_at && (
        <VerifyBanner email={user.email || ""} resend={resendVerification} />
      )}

      {/* tabs */}
      <div className="mt-6 flex gap-1 overflow-x-auto rounded-full border border-black/10 bg-white p-1 shadow-sm">
        {TABS.map((t) => {
          const on = tab === t.id;
          const badge = t.id === "orders" ? orders?.length : t.id === "reviews" ? reviews?.length : t.id === "wishlist" ? (wishIds.length || undefined) : undefined;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} className="shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-[13px] font-bold transition-all"
              style={{ background: on ? "var(--primary)" : "transparent", color: on ? "#fff" : "var(--ink-2)" }}>
              {t.label}{badge ? ` (${badge})` : ""}
            </button>
          );
        })}
      </div>

      {err && <p className="mt-3 text-sm text-[var(--coral)]">{err}</p>}

      <div className="mt-6">
        {tab === "orders" && <OrdersTab orders={orders} onZoom={setZoom} />}
        {tab === "addresses" && <AddressesTab userId={user.id} />}
        {tab === "profile" && <ProfileTab email={user.email || ""} token={token} initialName={name} isGoogle={user.app_metadata?.provider === "google"} />}
        {tab === "reviews" && <ReviewsTab orders={orders} reviews={reviews} />}
        {tab === "wishlist" && <WishlistTab />}
        {tab === "viewed" && <ViewedTab />}
      </div>

      <DesignPreviewModal view={zoom} onClose={() => setZoom(null)} />
    </Shell>
  );
}

/* ── Orders ─────────────────────────────────────────────────────────────── */
function OrdersTab({ orders, onZoom }: { orders: Order[] | null; onZoom: (v: any) => void }) {
  if (orders === null) return <Note>Loading your orders…</Note>;
  if (orders.length === 0) return <Empty emoji="🛍️" title="No orders yet" sub="Design a tee and it’ll show up here." href="/customize" cta="Design your first tee" />;
  return (
    <div className="space-y-5">
      {orders.map((o) => {
        const step = STATUS_STEPS.indexOf(o.status);
        return (
          <div key={o.id} className="overflow-hidden rounded-3xl border border-black/10 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/5 px-5 py-4">
              <div>
                <p className="font-display text-lg font-extrabold">#{o.order_no}</p>
                <p className="text-xs text-[var(--ink-soft)]">{new Date(o.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} · {o.payment_method?.toUpperCase()}</p>
              </div>
              <div className="flex items-center gap-2">
                {o.payment_status && o.payment_status !== "unpaid" && (
                  <span className="rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white" style={{ background: PAY_COLOR[o.payment_status] || "var(--ink-soft)" }}>{o.payment_status.replace(/_/g, " ")}</span>
                )}
                <span className="rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white" style={{ background: STATUS_COLOR[o.status] || "var(--ink-soft)" }}>{o.status}</span>
              </div>
            </div>
            {o.status !== "cancelled" ? (
              <div className="flex items-center gap-1.5 px-5 pt-4">
                {STATUS_STEPS.map((s, i) => (
                  <div key={s} className="flex-1">
                    <div className="h-1.5 rounded-full" style={{ background: i <= step ? "var(--mint)" : "var(--line)" }} />
                    <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide" style={{ color: i <= step ? "var(--ink-2)" : "var(--ink-soft)" }}>{STEP_LABEL[s]}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="px-5 pt-4 text-sm font-semibold text-[var(--coral)]">This order was cancelled.</p>
            )}

            {/* tracking */}
            {(o.tracking_no || o.carrier) && o.status !== "cancelled" && (
              <div className="mx-5 mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-[var(--paper-2)] px-4 py-3">
                <div className="text-[13px]">
                  <p className="font-semibold">🚚 {o.carrier || "Shipment"}{o.tracking_no ? ` · ${o.tracking_no}` : ""}</p>
                  <p className="text-xs text-[var(--ink-soft)]">Your order is on its way.</p>
                </div>
                {o.tracking_url && (
                  <a href={o.tracking_url} target="_blank" rel="noreferrer" className="rounded-full bg-[var(--ink)] px-4 py-2 text-xs font-bold text-white">Track shipment</a>
                )}
              </div>
            )}

            <div className="mt-4 divide-y divide-black/5 px-5">
              {o.order_items.map((it) => {
                const hs = heroSurface(it);
                return (
                  <div key={it.id} className="flex items-center gap-3 py-4">
                    {it.is_custom ? (
                      <button type="button" onClick={() => onZoom(toView(it))} title="View all sides" className="group relative h-20 w-16 shrink-0 overflow-hidden rounded-xl border border-black/10" style={{ background: "var(--paper-2)" }}>
                        {hs ? <OnShirt gender={it.design_spec?.meta?.fit} surface={hs.id} colorHex={it.design_spec?.meta?.color_hex} printUrl={hs.preview_url || hs.shirt_url} />
                          : it.design_image_url ? <img src={it.design_image_url} alt={it.name} className="h-full w-full object-contain" /> : null}
                        <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-[9px] font-bold text-transparent transition-all group-hover:bg-black/40 group-hover:text-white">VIEW</span>
                      </button>
                    ) : (
                      <div className="h-20 w-16 shrink-0 overflow-hidden rounded-xl border border-black/10" style={{ background: "var(--paper-2)" }}>
                        {it.design_image_url && <img src={it.design_image_url} alt={it.name} className="h-full w-full object-cover" />}
                      </div>
                    )}
                    <div className="min-w-0 flex-1 text-sm">
                      <p className="font-semibold leading-tight">{it.name}</p>
                      <p className="text-xs text-[var(--ink-soft)]">
                        {it.is_custom ? (it.design_spec?.meta?.print_areas?.length ? `Print: ${it.design_spec.meta.print_areas.join(", ")}` : "Custom design") : ""}
                        {it.size ? `${it.is_custom ? " · " : ""}Size ${it.size}` : ""} · Qty {it.qty}
                      </p>
                      {it.is_custom && <p className="mt-0.5 text-[11px] font-semibold text-[var(--primary)]">Tap to view all sides →</p>}
                    </div>
                    <span className="text-sm font-bold">{inr(it.line_total)}</span>
                  </div>
                );
              })}
            </div>
            {/* timeline */}
            {o.order_events && o.order_events.length > 0 && <OrderTimeline events={o.order_events} />}

            <div className="flex items-center justify-between bg-[var(--paper-2)] px-5 py-3">
              <span className="text-xs uppercase tracking-widest text-[var(--ink-soft)]">
                Total{o.coupon_code ? <span className="ml-1 normal-case text-[var(--mint)]">· {o.coupon_code} −{inr(o.discount || 0)}</span> : ""}
              </span>
              <span className="font-display text-lg font-extrabold">{inr(o.total)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function OrderTimeline({ events }: { events: OrderEvent[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-black/5 px-5 py-3">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">
        Order updates ({events.length})
        <span>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <ol className="mt-3 space-y-2 border-l-2 border-black/10 pl-4">
          {events.map((e) => (
            <li key={e.id} className="relative text-[12px]">
              <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full" style={{ background: "var(--primary)" }} />
              <span className="font-semibold">{e.message}</span>
              <span className="ml-2 text-[var(--ink-soft)]">{new Date(e.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/* ── Addresses ──────────────────────────────────────────────────────────── */
function AddressesTab({ userId }: { userId: string }) {
  const [list, setList] = useState<Address[] | null>(null);
  const [mode, setMode] = useState<"list" | "add" | string>("list"); // "add" or an address id (edit)

  const reload = useCallback(async () => setList(await fetchAddresses(userId)), [userId]);
  useEffect(() => { reload(); }, [reload]);

  const onSave = async (a: AddressInput, makeDefault: boolean) => {
    if (mode === "add") await saveAddress(userId, a, makeDefault || (list?.length ?? 0) === 0);
    else { await updateAddress(mode, a); if (makeDefault) await setDefaultAddress(userId, mode); }
    setMode("list"); reload();
  };

  if (list === null) return <Note>Loading addresses…</Note>;

  if (mode !== "list") {
    const editing = list.find((a) => a.id === mode);
    return (
      <div className="max-w-md rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
        <h3 className="font-display mb-4 text-lg font-extrabold">{mode === "add" ? "Add a new address" : "Edit address"}</h3>
        <AddressForm initial={editing} defaultChecked={editing?.is_default} submitLabel={mode === "add" ? "Add address" : "Save changes"} onSubmit={onSave} onCancel={() => setMode("list")} />
      </div>
    );
  }

  return (
    <div>
      {list.length === 0 ? (
        <Note>No saved addresses yet. Add one so checkout is one tap.</Note>
      ) : (
        <div className="space-y-3">
          {list.map((a) => (
            <AddressCard key={a.id} a={a}
              onEdit={() => setMode(a.id)}
              onDelete={async () => { await deleteAddress(a.id); reload(); }}
              onSetDefault={async () => { await setDefaultAddress(userId, a.id); reload(); }} />
          ))}
        </div>
      )}
      <button onClick={() => setMode("add")} className="mt-4 w-full rounded-2xl border-2 border-dashed py-3 text-sm font-bold text-[var(--primary)]" style={{ borderColor: "rgba(124,58,237,0.4)" }}>
        + Add new address
      </button>
    </div>
  );
}

/* ── email verification banner ──────────────────────────────────────────── */
function VerifyBanner({ email, resend }: { email: string; resend: (email: string) => Promise<{ error?: string }> }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "err">("idle");
  const [msg, setMsg] = useState("");
  const send = async () => {
    setState("sending");
    const res = await resend(email);
    if (res.error) { setState("err"); setMsg(res.error); }
    else { setState("sent"); }
  };
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--accent)]/40 bg-[var(--accent)]/10 px-4 py-3">
      <div className="text-[13px]">
        <p className="font-bold text-[var(--ink)]">✉️ Verify your email</p>
        <p className="text-[var(--ink-soft)]">{state === "sent" ? "Verification email sent — check your inbox." : state === "err" ? msg : `Confirm ${email} to secure your account.`}</p>
      </div>
      {state !== "sent" && (
        <button onClick={send} disabled={state === "sending"} className="shrink-0 rounded-full bg-[var(--ink)] px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
          {state === "sending" ? "Sending…" : "Resend email"}
        </button>
      )}
    </div>
  );
}

/* ── Profile ────────────────────────────────────────────────────────────── */
function ProfileTab({ email, token, initialName, isGoogle }: { email: string; token: string | null; initialName: string; isGoogle?: boolean }) {
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!supabase) return;
    supabase.from("profiles").select("name, phone").limit(1).single().then(({ data }) => {
      if (data?.name) setName(data.name);
      if (data?.phone) setPhone(data.phone);
    });
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setMsg("");
    const res = await fetch("/api/profile", { method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ name, phone }) });
    setBusy(false);
    setMsg(res.ok ? "Saved!" : "Couldn’t save. Try again.");
  };

  const cls = "w-full rounded-xl border border-black/15 bg-white px-4 py-3 text-sm text-[var(--ink)] placeholder:text-[var(--ink-soft)] outline-none focus:border-[var(--primary)]";
  return (
    <form onSubmit={save} className="max-w-md rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
      <h3 className="font-display mb-4 text-lg font-extrabold">Profile details</h3>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Name</label>
      <input value={name} onChange={(e) => setName(e.target.value)} className={`${cls} mb-4`} placeholder="Your name" />
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Phone</label>
      <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="numeric" className={`${cls} mb-4`} placeholder="10-digit mobile" />
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Email</label>
      <input value={email} disabled className={`${cls} mb-5 opacity-60`} />
      <div className="flex items-center gap-3">
        <button type="submit" disabled={busy} className="rounded-full bg-[var(--primary)] px-6 py-3 text-sm font-bold text-white disabled:opacity-60">{busy ? "Saving…" : "Save changes"}</button>
        {msg && <span className="text-sm font-medium" style={{ color: msg === "Saved!" ? "var(--mint)" : "var(--coral)" }}>{msg}</span>}
      </div>
      {!isGoogle && <ChangePassword />}
    </form>
  );
}

/* Change password (email/password accounts only). */
function ChangePassword() {
  const { updatePassword } = useAuth();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const save = async (e: React.MouseEvent) => {
    e.preventDefault();
    setMsg(null);
    if (pw.length < 6) return setMsg({ ok: false, text: "Password must be at least 6 characters." });
    if (pw !== pw2) return setMsg({ ok: false, text: "Passwords don’t match." });
    setBusy(true);
    const res = await updatePassword(pw);
    setBusy(false);
    if (res.error) setMsg({ ok: false, text: res.error });
    else { setMsg({ ok: true, text: "Password changed!" }); setPw(""); setPw2(""); }
  };

  const cls = "w-full rounded-xl border border-black/15 bg-white px-4 py-3 text-sm text-[var(--ink)] placeholder:text-[var(--ink-soft)] outline-none focus:border-[var(--primary)]";
  return (
    <div className="mt-6 border-t border-black/10 pt-5">
      <h4 className="font-display mb-3 text-base font-extrabold">Change password</h4>
      <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} className={`${cls} mb-3`} placeholder="New password (min 6 chars)" autoComplete="new-password" />
      <input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} className={`${cls} mb-4`} placeholder="Confirm new password" autoComplete="new-password" />
      <div className="flex items-center gap-3">
        <button type="button" onClick={save} disabled={busy} className="rounded-full border border-black/15 px-6 py-3 text-sm font-bold disabled:opacity-60">{busy ? "Updating…" : "Update password"}</button>
        {msg && <span className="text-sm font-medium" style={{ color: msg.ok ? "var(--mint)" : "var(--coral)" }}>{msg.text}</span>}
      </div>
    </div>
  );
}

/* ── Reviews ────────────────────────────────────────────────────────────── */
function ReviewsTab({ orders, reviews }: { orders: Order[] | null; reviews: Review[] | null }) {
  const reviewedIds = new Set((reviews || []).map((r) => r.product_id));
  // catalog products the user bought (non-custom), deduped
  const boughtIds = Array.from(new Set((orders || []).flatMap((o) => o.order_items).filter((it) => !it.is_custom && it.product_id && getProduct(it.product_id)).map((it) => it.product_id as string)));
  const toReview = boughtIds.filter((id) => !reviewedIds.has(id));

  if (orders === null || reviews === null) return <Note>Loading…</Note>;

  return (
    <div className="space-y-8">
      {/* awaiting review */}
      <div>
        <h3 className="font-display mb-3 text-lg font-extrabold">Awaiting your review {toReview.length > 0 && <span className="text-[var(--ink-soft)]">({toReview.length})</span>}</h3>
        {toReview.length === 0 ? (
          <Note>Nothing to review right now.</Note>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {toReview.map((id) => {
              const p = getProduct(id)!;
              return (
                <Link key={id} href={`/products/${id}`} className="group rounded-2xl border border-black/10 bg-white p-2 transition-shadow hover:shadow-md">
                  <Img src={p.image} alt={p.name} tone={p.tone} className="aspect-square w-full rounded-xl" />
                  <p className="mt-2 truncate text-[13px] font-semibold">{p.name}</p>
                  <p className="text-[11px] font-bold text-[var(--primary)]">Write a review →</p>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* my reviews */}
      <div>
        <h3 className="font-display mb-3 text-lg font-extrabold">Your reviews {reviews.length > 0 && <span className="text-[var(--ink-soft)]">({reviews.length})</span>}</h3>
        {reviews.length === 0 ? (
          <Note>You haven’t written any reviews yet.</Note>
        ) : (
          <div className="space-y-3">
            {reviews.map((r) => {
              const p = getProduct(r.product_id);
              return (
                <div key={r.id} className="flex gap-3 rounded-2xl border border-black/10 bg-white p-4">
                  {p && <Img src={p.image} alt={p.name} tone={p.tone} className="h-16 w-14 shrink-0 rounded-lg" />}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <Link href={`/products/${r.product_id}`} className="truncate font-semibold hover:underline">{p?.name || r.product_id}</Link>
                      <Stars rating={r.rating} />
                    </div>
                    {r.title && <p className="mt-1 text-sm font-bold">{r.title}</p>}
                    {r.body && <p className="text-sm text-[var(--ink-2)]">{r.body}</p>}
                    <Link href={`/products/${r.product_id}`} className="mt-1 inline-block text-[11px] font-bold text-[var(--primary)]">Edit →</Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Wishlist ───────────────────────────────────────────────────────────── */
function WishlistTab() {
  const ids = useWishlist();
  const products = ids.map((id) => getProduct(id)).filter(Boolean) as NonNullable<ReturnType<typeof getProduct>>[];
  if (products.length === 0) return <Empty emoji="💜" title="No saved items" sub="Tap the heart on any product to save it here." href="/shop" cta="Browse the shop" />;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {products.map((p) => (
        <div key={p.id} className="group relative rounded-2xl border border-black/10 bg-white p-2 transition-shadow hover:shadow-md">
          <button onClick={() => removeWish(p.id)} aria-label="Remove from wishlist"
            className="absolute right-3 top-3 z-10 grid h-7 w-7 place-items-center rounded-full bg-white/90 text-sm font-bold text-[var(--coral)] shadow">
            ✕
          </button>
          <Link href={`/products/${p.id}`}>
            <Img src={p.image} alt={p.name} tone={p.tone} className="aspect-square w-full rounded-xl" />
            <p className="mt-2 truncate text-[13px] font-semibold">{p.name}</p>
            <p className="text-[13px] font-bold">{inr(p.price)}</p>
          </Link>
        </div>
      ))}
    </div>
  );
}

/* ── Recently viewed ────────────────────────────────────────────────────── */
function ViewedTab() {
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => { setIds(getRecentlyViewed()); }, []);
  const products = ids.map((id) => getProduct(id)).filter(Boolean) as ReturnType<typeof getProduct>[];
  if (products.length === 0) return <Empty emoji="👀" title="Nothing here yet" sub="Products you view will appear here." href="/shop" cta="Browse the shop" />;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {products.map((p) => p && (
        <Link key={p.id} href={`/products/${p.id}`} className="group rounded-2xl border border-black/10 bg-white p-2 transition-shadow hover:shadow-md">
          <Img src={p.image} alt={p.name} tone={p.tone} className="aspect-square w-full rounded-xl" />
          <p className="mt-2 truncate text-[13px] font-semibold">{p.name}</p>
          <p className="text-[13px] font-bold">{inr(p.price)}</p>
        </Link>
      ))}
    </div>
  );
}

/* ── shared ─────────────────────────────────────────────────────────────── */
function Empty({ emoji, title, sub, href, cta }: { emoji: string; title: string; sub: string; href: string; cta: string }) {
  return (
    <div className="rounded-3xl border border-black/10 bg-white p-10 text-center shadow-sm">
      <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full text-2xl" style={{ background: "var(--paper-2)" }}>{emoji}</div>
      <p className="font-semibold text-[var(--ink)]">{title}</p>
      <p className="mt-1 text-sm text-[var(--ink-soft)]">{sub}</p>
      <Link href={href} className="mt-5 inline-block rounded-full bg-[var(--primary)] px-6 py-3 text-sm font-bold text-white transition-transform hover:-translate-y-0.5">{cta}</Link>
    </div>
  );
}
function Note({ children }: { children: React.ReactNode }) {
  return <div className="rounded-3xl border border-black/10 bg-white p-6 text-sm text-[var(--ink-2)] shadow-sm">{children}</div>;
}
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <section className="teevo mx-auto max-w-2xl px-5 py-10 md:py-14" style={{ color: "var(--ink)" }}>
      <h1 className="font-display text-[clamp(1.9rem,4.5vw,3rem)] font-extrabold leading-none">My Account</h1>
      <div className="mt-8">{children}</div>
    </section>
  );
}
