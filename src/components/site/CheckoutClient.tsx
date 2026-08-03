"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { colorName } from "@/lib/catalog";
import { inr, FREE_SHIP_OVER, SHIPPING_FEE } from "@/lib/format";
import { computeGST } from "@/lib/tax";
import { Img, Icon } from "@/components/home/primitives";
import { AuthForm } from "@/components/site/AuthForm";
import { DesignPreviewModal } from "@/components/site/DesignPreview";
import { AddressCard } from "@/components/site/AddressBook";
import { fetchAddresses, saveAddress, type Address } from "@/lib/addresses";

type Fields = {
  name: string; phone: string; email: string;
  address: string; city: string; state: string; pincode: string;
};
const EMPTY: Fields = { name: "", phone: "", email: "", address: "", city: "", state: "", pincode: "" };

// Online (Stripe) is shown only when the server reports it's configured; otherwise COD only.
const PAY_ONLINE = { id: "online", label: "Pay online", note: "Card, UPI & NetBanking — secured by Stripe." };
const PAY_COD = { id: "cod", label: "Cash on Delivery", note: "Pay in cash or UPI when your order arrives." };
const ALL_PAYMENTS = [PAY_ONLINE, PAY_COD];
const payLabel = (id: string) => ALL_PAYMENTS.find((p) => p.id === id)?.label || id.toUpperCase();

export function CheckoutClient() {
  const { views, subtotal, clear, remove } = useCart();
  const { user, token } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [pendingPlace, setPendingPlace] = useState(false);
  const [f, setF] = useState<Fields>(EMPTY);
  const [pay, setPay] = useState("cod");
  const [stripeOn, setStripeOn] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof Fields, boolean>>>({});
  const [placed, setPlaced] = useState<{ id: string; total: number | null } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState("");
  const [zoom, setZoom] = useState<any>(null);
  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [selectedAddrId, setSelectedAddrId] = useState<string | "new" | null>(null);
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<{ code: string; discount: number; free_shipping?: boolean; message: string } | null>(null);
  const [couponErr, setCouponErr] = useState("");
  const [couponBusy, setCouponBusy] = useState(false);

  // which payment methods are available (Stripe only if the server has keys)
  useEffect(() => {
    fetch("/api/payments/config")
      .then((r) => r.json())
      .then((d) => { if (d.stripe) { setStripeOn(true); setPay((p) => (p === "cod" ? "online" : p)); } })
      .catch(() => {});
  }, []);

  // handle the Stripe redirect return (?status=success|cancelled&order_no=…)
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const status = sp.get("status");
    const orderNo = sp.get("order_no");
    if (status === "success" && orderNo) {
      setPlaced({ id: orderNo, total: null });
      clear();
      window.history.replaceState({}, "", "/checkout");
      window.scrollTo({ top: 0 });
    } else if (status === "cancelled") {
      setSubmitErr("Payment was cancelled. Your order is saved as unpaid — you can try again.");
      window.history.replaceState({}, "", "/checkout");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const methods = stripeOn ? [PAY_ONLINE, PAY_COD] : [PAY_COD];

  // load saved addresses when logged in; preselect the default and fill the form
  useEffect(() => {
    if (!user) { setAddresses(null); return; }
    fetchAddresses(user.id).then((list) => {
      setAddresses(list);
      if (list.length) {
        const def = list.find((a) => a.is_default) || list[0];
        setSelectedAddrId(def.id);
        setF((p) => ({ ...p, name: def.name, phone: def.phone, address: def.address, city: def.city, state: def.state, pincode: def.pincode }));
      } else setSelectedAddrId("new");
    });
  }, [user]);

  const selectSaved = (a: Address) => {
    setSelectedAddrId(a.id);
    setErrors({});
    setF((p) => ({ ...p, name: a.name, phone: a.phone, address: a.address, city: a.city, state: a.state, pincode: a.pincode }));
  };
  const startNewAddress = () => {
    setSelectedAddrId("new");
    setErrors({});
    setF((p) => ({ ...p, name: "", phone: "", address: "", city: "", state: "", pincode: "" }));
  };

  const shipping = subtotal === 0 || subtotal >= FREE_SHIP_OVER ? 0 : SHIPPING_FEE;
  const discount = Math.min(coupon?.discount ?? 0, subtotal + shipping);
  const total = Math.max(0, subtotal + shipping - discount);
  const gst = computeGST(views.map((v) => ({ price: v.product.price, qty: v.qty }))); // GST portion inside subtotal

  // Validate a coupon against the current cart (server is source of truth).
  const applyCoupon = useCallback(async (rawCode: string, silent = false): Promise<void> => {
    const code = rawCode.trim().toUpperCase();
    if (!code) { setCouponErr("Enter a coupon code."); return; }
    if (!silent) setCouponBusy(true);
    setCouponErr("");
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ code, subtotal, shipping }),
      });
      const d = await res.json().catch(() => ({}));
      if (d.ok) setCoupon({ code: d.code, discount: d.discount, free_shipping: d.free_shipping, message: d.message });
      else { setCoupon(null); if (!silent) setCouponErr(d.message || "Invalid coupon."); }
    } finally { if (!silent) setCouponBusy(false); }
  }, [token, subtotal, shipping]);

  // Re-validate an applied coupon whenever the cart total changes (item add/remove).
  useEffect(() => {
    if (coupon?.code) applyCoupon(coupon.code, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal, shipping]);

  const set = (k: keyof Fields, v: string) => {
    setF((p) => ({ ...p, [k]: v }));
    setErrors((e) => ({ ...e, [k]: false }));
  };

  const validate = (): boolean => {
    const e: Partial<Record<keyof Fields, boolean>> = {};
    if (!f.name.trim()) e.name = true;
    if (!/^\d{10}$/.test(f.phone.trim())) e.phone = true;
    if (!f.address.trim()) e.address = true;
    if (!f.city.trim()) e.city = true;
    if (!f.state.trim()) e.state = true;
    if (!/^\d{6}$/.test(f.pincode.trim())) e.pincode = true;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const placingRef = useRef(false); // synchronous re-entry guard (survives StrictMode double-fire)

  // actually save the order (called once the user is logged in)
  const doPlace = useCallback(async () => {
    if (placingRef.current) return;
    placingRef.current = true;
    setSubmitting(true);
    setSubmitErr("");
    try {
      const payload = {
        customer: { name: f.name, phone: f.phone, email: f.email, address: f.address, city: f.city, state: f.state, pincode: f.pincode },
        payment_method: pay,
        subtotal, shipping, total,
        coupon_code: coupon?.code,
        items: views.map((v) => ({
          product_id: v.product.id,
          name: v.product.name,
          size: v.size,
          color: v.color,
          qty: v.qty,
          unit_price: v.product.price,
          line_total: v.lineTotal,
          is_custom: !!v.custom,
          design_image: v.custom ? v.product.image : undefined,
          design_spec: v.custom ? { meta: v.custom.meta, surfaces: v.custom.surfaces } : undefined,
        })),
      };
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not place your order. Please try again.");
      const id = data.order_no || "CM" + Math.floor(100000 + Math.random() * 900000);
      // save a freshly-typed address to the user's address book (default if it's their first)
      if (user && selectedAddrId === "new") {
        saveAddress(user.id, { name: f.name, phone: f.phone, address: f.address, city: f.city, state: f.state, pincode: f.pincode }, !(addresses && addresses.length)).catch(() => {});
      }

      // Online payment: hand off to Stripe Checkout (order is saved as pending; webhook marks it paid).
      if (pay === "online" && data.id) {
        const cs = await fetch("/api/payments/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ order_id: data.id }),
        });
        const cd = await cs.json().catch(() => ({}));
        if (cs.ok && cd.url) { window.location.href = cd.url; return; } // leaves cart intact until success return
        throw new Error(cd.error || "Couldn’t start online payment. Please try again or choose Cash on Delivery.");
      }

      setPlaced({ id, total: data.total ?? total }); // server total is authoritative (re-validated coupon)
      clear();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      setSubmitErr(err?.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
      placingRef.current = false; // allow a retry after a failed attempt / cancelled online payment
    }
  }, [submitting, f, pay, subtotal, shipping, total, views, token, clear, user, selectedAddrId, addresses, coupon]);

  // Place Order → require login first; the design/order is saved to the account
  const placeOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || submitting) return;
    if (!user) { setPendingPlace(true); setAuthOpen(true); return; }
    doPlace();
  };

  // once the customer logs in (via the gate), finish placing their order
  useEffect(() => {
    if (user && pendingPlace) {
      setPendingPlace(false);
      setAuthOpen(false);
      doPlace();
    }
  }, [user, pendingPlace, doPlace]);

  // Confirmation
  if (placed) {
    return (
      <section className="mx-auto max-w-xl px-5 py-20 text-center">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-[var(--lime)] text-[var(--ink)]">
          <Icon name="check" className="h-10 w-10" />
        </div>
        <h1 className="font-display mt-6 text-4xl font-extrabold">Order placed! 🎉</h1>
        <p className="mt-3 text-[var(--ink-2)]">
          Thank you for shopping with Campus Mode. Your order{" "}
          <span className="font-bold text-[var(--ink)]">#{placed.id}</span> is confirmed.
        </p>
        <div className="mx-auto mt-6 max-w-xs rounded-2xl border border-black/10 bg-white p-5 text-left text-sm">
          {placed.total != null && <div className="flex justify-between"><span className="text-[var(--ink-soft)]">Amount</span><span className="font-bold">{inr(placed.total)}</span></div>}
          <div className="mt-2 flex justify-between"><span className="text-[var(--ink-soft)]">Payment</span><span className="font-semibold">{payLabel(pay)}</span></div>
          <div className="mt-2 flex justify-between"><span className="text-[var(--ink-soft)]">Delivery</span><span className="font-semibold">4–6 days</span></div>
        </div>
        <Link href="/shop" className="mt-8 inline-block rounded-full bg-[var(--ink)] px-7 py-3.5 text-sm font-bold text-white">
          Continue shopping
        </Link>
      </section>
    );
  }

  if (views.length === 0) {
    return (
      <section className="mx-auto max-w-full px-5 py-20 text-center">
        <h1 className="font-display text-3xl font-extrabold">Your cart is empty</h1>
        <p className="mt-2 text-[var(--ink-soft)]">Add something before checking out.</p>
        <Link href="/shop" className="mt-6 inline-block rounded-full bg-[var(--ink)] px-7 py-3.5 text-sm font-semibold text-white">
          Start shopping
        </Link>
      </section>
    );
  }

  const inputCls = (bad?: boolean) =>
    `w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none transition-colors ${
      bad ? "border-[var(--coral)]" : "border-black/15 focus:border-[var(--green)]"
    }`;

  return (
    <section className="mx-auto max-w-full px-5 pt-10 pb-28 md:py-14">
      <h1 className="font-display text-[clamp(1.9rem,4.5vw,3rem)] font-extrabold leading-none">Checkout</h1>

      <form id="checkout-form" onSubmit={placeOrder} className="mt-8 grid gap-8 lg:grid-cols-[1.5fr_1fr]">
        {/* Left: address + payment */}
        <div className="space-y-8">
          <div>
            <h2 className="font-display text-lg font-extrabold">Delivery address</h2>

            {/* saved addresses — pick one, default preselected */}
            {user && addresses && addresses.length > 0 && (
              <div className="mt-4 space-y-2.5">
                {addresses.map((a) => (
                  <AddressCard key={a.id} a={a} selectable selected={selectedAddrId === a.id} onSelect={() => selectSaved(a)} />
                ))}
                <button type="button" onClick={startNewAddress}
                  className="w-full rounded-2xl border-2 border-dashed py-3 text-sm font-bold text-[var(--primary)]"
                  style={{ borderColor: selectedAddrId === "new" ? "var(--primary)" : "rgba(124,58,237,0.4)", background: selectedAddrId === "new" ? "rgba(124,58,237,0.05)" : "transparent" }}>
                  + Add new address
                </button>
              </div>
            )}

            {/* address entry form — shown when not logged in, no saved addresses, or adding a new one */}
            {(!user || !addresses || addresses.length === 0 || selectedAddrId === "new") && (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <input className={`col-span-2 ${inputCls(errors.name)}`} placeholder="Full name" value={f.name} onChange={(e) => set("name", e.target.value)} />
                <input className={inputCls(errors.phone)} placeholder="Phone (10 digits)" inputMode="numeric" value={f.phone} onChange={(e) => set("phone", e.target.value)} />
                <input className={inputCls()} placeholder="Email (optional)" value={f.email} onChange={(e) => set("email", e.target.value)} />
                <input className={`col-span-2 ${inputCls(errors.address)}`} placeholder="Address (house no, street, area)" value={f.address} onChange={(e) => set("address", e.target.value)} />
                <input className={inputCls(errors.city)} placeholder="City" value={f.city} onChange={(e) => set("city", e.target.value)} />
                <input className={inputCls(errors.state)} placeholder="State" value={f.state} onChange={(e) => set("state", e.target.value)} />
                <input className={inputCls(errors.pincode)} placeholder="Pincode (6 digits)" inputMode="numeric" value={f.pincode} onChange={(e) => set("pincode", e.target.value)} />
              </div>
            )}
            {Object.keys(errors).length > 0 && (
              <p className="mt-2 text-sm font-medium text-[var(--coral)]">Please fill the highlighted fields correctly.</p>
            )}
          </div>

          <div>
            <h2 className="font-display text-lg font-extrabold">Payment method</h2>
            <div className="mt-4 space-y-2.5">
              {methods.map((p) => (
                <label
                  key={p.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors ${
                    pay === p.id ? "border-[var(--ink)] bg-[var(--paper-2)]" : "border-black/15 bg-white"
                  }`}
                >
                  <input type="radio" name="pay" checked={pay === p.id} onChange={() => setPay(p.id)} className="mt-1 accent-[var(--green)]" />
                  <span>
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      {p.label}
                      {p.id === "cod" && <span className="rounded bg-[var(--lime)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--ink)]">POPULAR</span>}
                    </span>
                    <span className="mt-0.5 block text-xs text-[var(--ink-soft)]">{p.note}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Right: summary */}
        <div className="lg:sticky lg:top-28 lg:self-start">
          <div className="rounded-3xl border border-black/10 bg-white p-6">
            <h2 className="font-display text-lg font-extrabold">Order summary</h2>
            <div className="mt-4 max-h-64 space-y-3 overflow-auto pr-1">
              {views.map((v) => (
                <div key={v.key} className="flex gap-3">
                  <button type="button" onClick={() => setZoom(v)} title="View full design" className="group relative h-16 w-14 shrink-0 overflow-hidden rounded-lg border border-black/10">
                    <Img src={v.product.image} alt={v.product.name} tone={v.product.tone} className="h-full w-full" />
                    <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-[9px] font-bold text-transparent transition-all group-hover:bg-black/40 group-hover:text-white">VIEW</span>
                  </button>
                  <div className="flex-1 text-sm">
                    <p className="font-medium leading-tight">{v.product.name}</p>
                    <p className="text-xs text-[var(--ink-soft)]">{v.custom ? (v.custom.meta?.print_areas?.length ? `Print: ${v.custom.meta.print_areas.join(", ")}` : "Custom design") : colorName(v.color)} · {v.size} · Qty {v.qty}</p>
                    <button
                      type="button"
                      onClick={() => remove(v.key)}
                      className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-[var(--ink-soft)] transition-colors hover:text-[var(--coral)]"
                    >
                      <Icon name="close" className="h-3 w-3" /> Remove
                    </button>
                  </div>
                  <span className="text-sm font-semibold">{inr(v.lineTotal)}</span>
                </div>
              ))}
            </div>
            {/* coupon */}
            <div className="mt-4 border-t border-black/10 pt-4">
              {coupon ? (
                <div className="flex items-center justify-between rounded-xl bg-[var(--mint)]/15 px-3 py-2 text-sm">
                  <span className="font-semibold text-[var(--ink)]">🎟️ {coupon.code} <span className="font-normal text-[var(--ink-soft)]">applied</span></span>
                  <button type="button" onClick={() => { setCoupon(null); setCouponInput(""); setCouponErr(""); }} className="text-xs font-bold text-[var(--coral)]">Remove</button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input value={couponInput} onChange={(e) => { setCouponInput(e.target.value); setCouponErr(""); }}
                    placeholder="Coupon code" className="flex-1 rounded-xl border border-black/15 bg-white px-3 py-2.5 text-sm uppercase outline-none focus:border-[var(--green)]" />
                  <button type="button" onClick={() => applyCoupon(couponInput)} disabled={couponBusy}
                    className="rounded-xl bg-[var(--ink)] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{couponBusy ? "…" : "Apply"}</button>
                </div>
              )}
              {couponErr && <p className="mt-1.5 text-xs font-medium text-[var(--coral)]">{couponErr}</p>}
            </div>

            <dl className="mt-4 space-y-2.5 border-t border-black/10 pt-4 text-sm">
              <div className="flex justify-between"><dt className="text-[var(--ink-soft)]">Subtotal</dt><dd className="font-semibold">{inr(subtotal)}</dd></div>
              <div className="flex justify-between text-xs"><dt className="text-[var(--ink-soft)]">Incl. GST</dt><dd className="text-[var(--ink-soft)]">{inr(gst)}</dd></div>
              <div className="flex justify-between"><dt className="text-[var(--ink-soft)]">Shipping</dt><dd className="font-semibold">{shipping === 0 ? "FREE" : inr(shipping)}</dd></div>
              {discount > 0 && (
                <div className="flex justify-between text-[var(--mint)]"><dt className="font-semibold">Discount{coupon ? ` (${coupon.code})` : ""}</dt><dd className="font-semibold">−{inr(discount)}</dd></div>
              )}
              <div className="flex justify-between border-t border-black/10 pt-3 text-base"><dt className="font-bold">Total</dt><dd className="font-display font-extrabold">{inr(total)}</dd></div>
            </dl>
            <button type="submit" disabled={submitting} className="sheen mt-5 w-full rounded-xl bg-[var(--lime)] py-3.5 text-sm font-bold text-[var(--ink)] transition-transform hover:-translate-y-0.5 disabled:opacity-60">
              {submitting ? "Placing order…" : `Place Order · ${inr(total)}`}
            </button>
            {submitErr && <p className="mt-2 text-center text-sm font-medium text-[var(--coral)]">{submitErr}</p>}
            <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-[var(--ink-soft)]">
              <Icon name="lock" className="h-3.5 w-3.5" /> {user ? "100% secure · Easy 7-day returns" : "You’ll log in to confirm — saved to your account"}
            </p>
          </div>
        </div>
      </form>

      {/* Sticky mobile checkout bar — pay without scrolling to the bottom */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-black/10 bg-white/95 p-3 backdrop-blur md:hidden">
        <button type="submit" form="checkout-form" disabled={submitting}
          className="flex w-full items-center justify-between rounded-xl bg-[var(--lime)] px-5 py-3.5 text-sm font-bold text-[var(--ink)] transition-transform active:scale-[0.99] disabled:opacity-60">
          <span>{submitting ? "Placing order…" : "Place Order"}</span>
          <span className="font-display text-base font-extrabold">{inr(total)}</span>
        </button>
      </div>

      {/* ── "WHAT YOU'RE PAYING FOR" POPUP — every side, on the shirt ── */}
      <DesignPreviewModal view={zoom} onClose={() => setZoom(null)} />

      {/* ── LOGIN / SIGNUP GATE (shown when placing an order while logged out) ── */}
      {authOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" onClick={() => { setAuthOpen(false); setPendingPlace(false); }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => { setAuthOpen(false); setPendingPlace(false); }} className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full" style={{ background: "var(--paper-2)" }}>
              <Icon name="close" className="h-4 w-4" />
            </button>
            <h3 className="font-display text-xl font-extrabold">Log in to place your order</h3>
            <p className="mb-4 mt-1 text-[13px] text-[var(--ink-soft)]">So you can track it and see it under <b>My Orders</b>.</p>
            <AuthForm compact onDone={() => { /* effect finishes the order once user is set */ }} />
          </div>
        </div>
      )}
    </section>
  );
}
