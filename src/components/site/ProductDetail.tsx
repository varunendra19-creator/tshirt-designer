"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { Product } from "@/lib/catalog";
import { colorName } from "@/lib/catalog";
import { inr } from "@/lib/format";
import { galleryFrom } from "@/lib/images";
import { useCart } from "@/context/CartContext";
import { Img, Icon, Stars } from "@/components/home/primitives";
import { trackView } from "@/lib/recentlyViewed";
import { fetchStock, vkey } from "@/lib/stock";
import { ProductReviews } from "@/components/site/ProductReviews";

const TRUST = [
  { icon: "truck", text: "Free shipping over ₹999" },
  { icon: "rupee", text: "Cash on delivery available" },
  { icon: "refresh", text: "Easy 7-day returns" },
  { icon: "shield", text: "100% combed cotton" },
];

export function ProductDetail({ product }: { product: Product }) {
  const router = useRouter();
  const { add } = useCart();
  const gallery = galleryFrom(product.image);
  const [active, setActive] = useState(0);
  const [color, setColor] = useState(product.swatches[0]);
  // when a colour has its own photo, it overrides the gallery image
  const [heroOverride, setHeroOverride] = useState<string | null>(product.colorImages?.[product.swatches[0]] || null);
  const heroImg = heroOverride ?? gallery[active] ?? product.image;
  const [size, setSize] = useState<string>("");
  const [qty, setQty] = useState(1);
  const [err, setErr] = useState(false);
  const [added, setAdded] = useState(false);
  const [stock, setStock] = useState<Record<string, number>>({});
  const off = product.compareAt ? Math.round((1 - product.price / product.compareAt) * 100) : 0;

  // lightweight toast + a target to scroll to when a required choice is missing
  const [toast, setToast] = useState<string | null>(null);
  const sizeRef = useRef<HTMLDivElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();
  const showToast = (msg: string) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => { trackView(product.id); }, [product.id]); // recently-viewed history
  useEffect(() => { fetchStock(product.id).then(setStock); }, [product.id]); // per-variant stock

  // stock helpers — Infinity means "no stock data" (store still works without Supabase)
  const stockFor = (sz: string, col: string) => { const v = stock[vkey(sz, col)]; return v === undefined ? Infinity : v; };
  const colorSoldOut = (col: string) => product.sizes.length > 0 && product.sizes.every((sz) => stockFor(sz, col) === 0);
  const selStock = size ? stockFor(size, color) : null;
  const maxQty = Math.max(1, Math.min(10, selStock ?? 10));

  useEffect(() => { setQty((q) => Math.min(q, maxQty)); }, [maxQty]);

  const doAdd = (): boolean => {
    if (!size) {                                            // no size → toast + scroll to the size picker
      setErr(true);
      showToast("Please select a size");
      sizeRef.current?.scrollIntoView({ behavior: "auto", block: "center" });
      return false;
    }
    if (selStock === 0) { showToast("Out of stock in this colour & size"); return false; }
    add({ id: product.id, size, color, qty: Math.min(qty, maxQty) });
    return true;
  };

  const onAdd = () => {
    if (added) { router.push("/cart"); return; }   // already added → go to the cart page
    if (doAdd()) setAdded(true);                    // added → button switches to "Go to Cart"
  };
  const onBuy = () => {
    if (doAdd()) router.push("/checkout");
  };

  return (
    <>
    <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
      {/* Gallery */}
      <div className="lg:sticky lg:top-28 lg:self-start">
        <Img
          src={heroImg}
          alt={product.name}
          tone={product.tone}
          label={product.name.replace(" Tee", "")}
          className="aspect-[4/5] w-full rounded-3xl border border-black/10"
          priority
        />
        {gallery.length > 1 && (
          <div className="mt-3 flex gap-3">
            {gallery.map((g, i) => (
              <button
                key={i}
                onClick={() => { setActive(i); setHeroOverride(null); }}
                className={`relative h-20 w-16 overflow-hidden rounded-xl border-2 transition-colors ${
                  active === i ? "border-[var(--ink)]" : "border-transparent"
                }`}
                aria-label={`View ${i + 1}`}
              >
                <Img src={g} alt="" tone={product.tone} className="h-full w-full" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div>
        {product.badge && (
          <span className="inline-block rounded-full bg-[var(--lime)] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[var(--ink)]">
            {product.badge}
          </span>
        )}
        <h1 className="font-display mt-3 text-[clamp(1.7rem,3.5vw,2.6rem)] font-extrabold leading-tight">
          {product.name}
        </h1>
        <div className="mt-2 flex items-center gap-2 text-sm text-[var(--ink-soft)]">
          <Stars rating={product.rating} />
          <span>{product.rating} · {product.reviews.toLocaleString("en-IN")} reviews</span>
        </div>

        <div className="mt-4 flex items-end gap-3">
          <span className="font-display text-3xl font-extrabold">{inr(product.price)}</span>
          {product.compareAt && (
            <>
              <span className="text-lg text-[var(--ink-soft)] line-through">{inr(product.compareAt)}</span>
              <span className="mb-1 rounded-md bg-[var(--coral)]/15 px-2 py-0.5 text-sm font-bold text-[var(--coral)]">
                {off}% OFF
              </span>
            </>
          )}
        </div>
        <p className="mt-1 text-xs text-[var(--ink-soft)]">Inclusive of all taxes</p>

        {/* Description — sanitised HTML on save (lib/richtext); render as rich text. */}
        <div
          className="mt-5 max-w-prose space-y-2 text-[15px] leading-relaxed text-[var(--ink-2)] [&_a]:text-[var(--primary)] [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_strong]:font-semibold [&_strong]:text-[var(--ink)]"
          dangerouslySetInnerHTML={{ __html: product.description || "" }}
        />

        {/* Colour */}
        <div className="mt-6">
          <p className="text-sm font-semibold">
            Colour: <span className="font-normal text-[var(--ink-soft)]">{colorName(color)}</span>
          </p>
          <div className="mt-2 flex gap-2.5">
            {product.swatches.map((s) => {
              const soldOut = colorSoldOut(s);
              return (
                <button
                  key={s}
                  onClick={() => { setColor(s); setHeroOverride(product.colorImages?.[s] || null); setAdded(false); }}
                  aria-label={`${colorName(s)}${soldOut ? " (sold out)" : ""}`}
                  title={soldOut ? "Sold out" : colorName(s)}
                  className={`relative h-9 w-9 rounded-full ring-2 ring-offset-2 ring-offset-[var(--paper)] transition-transform hover:scale-105 ${
                    color === s ? "ring-[var(--ink)]" : "ring-black/10"
                  } ${soldOut ? "opacity-40" : ""}`}
                  style={{ background: s }}
                >
                  {soldOut && <span className="pointer-events-none absolute inset-0 grid place-items-center text-[10px] font-black text-white/90">✕</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Size */}
        <div ref={sizeRef} className="mt-6 scroll-mt-24">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Size</p>
            <span className="text-xs text-[var(--ink-soft)]">Size guide</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {product.sizes.map((s) => {
              const oos = stockFor(s, color) === 0;
              return (
                <button
                  key={s}
                  disabled={oos}
                  onClick={() => { setSize(s); setErr(false); setAdded(false); }}
                  className={`h-11 min-w-11 rounded-xl border px-3 text-sm font-semibold transition-colors ${
                    oos
                      ? "cursor-not-allowed border-black/10 bg-[var(--paper-2)] text-[var(--ink-soft)] line-through"
                      : size === s
                        ? "border-[var(--ink)] bg-[var(--ink)] text-white"
                        : "border-black/15 bg-white hover:border-[var(--ink)]"
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>
          {err && <p className="mt-2 text-sm font-medium text-[var(--coral)]">Please select a size.</p>}
          {size && selStock !== null && selStock !== Infinity && (
            selStock === 0
              ? <p className="mt-2 text-sm font-semibold text-[var(--coral)]">Out of stock in this colour &amp; size.</p>
              : selStock <= 5
                ? <p className="mt-2 text-sm font-semibold" style={{ color: "var(--accent)" }}>Only {selStock} left — order soon!</p>
                : <p className="mt-2 text-sm font-medium" style={{ color: "var(--mint)" }}>In stock</p>
          )}
        </div>

        {/* Qty + actions */}
        <div className="mt-6 flex items-center gap-3">
          <div className="flex items-center rounded-xl border border-black/15 bg-white">
            <button onClick={() => { setQty((q) => Math.max(1, q - 1)); setAdded(false); }} className="grid h-11 w-11 place-items-center text-lg" aria-label="Decrease">−</button>
            <span className="w-8 text-center text-sm font-semibold">{qty}</span>
            <button onClick={() => { setQty((q) => Math.min(maxQty, q + 1)); setAdded(false); }} className="grid h-11 w-11 place-items-center text-lg disabled:opacity-40" disabled={qty >= maxQty} aria-label="Increase">+</button>
          </div>
          <button
            onClick={onAdd}
            disabled={selStock === 0}
            className={`flex-1 rounded-xl py-3.5 text-sm font-bold transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 ${
              added ? "bg-[var(--primary)] text-white" : "sheen bg-[var(--lime)] text-[var(--ink)]"
            }`}
          >
            {selStock === 0 ? (
              "Out of Stock"
            ) : added ? (
              <span className="inline-flex items-center justify-center gap-1.5">
                Go to Cart <Icon name="arrow" className="h-4 w-4" />
              </span>
            ) : (
              "Add to Cart"
            )}
          </button>
        </div>
        <button
          onClick={onBuy}
          className="mt-3 w-full rounded-xl bg-[var(--ink)] py-3.5 text-sm font-bold text-white transition-transform hover:-translate-y-0.5"
        >
          Buy Now
        </button>

        {/* Trust */}
        <ul className="mt-7 grid grid-cols-2 gap-3 border-t border-black/10 pt-6">
          {TRUST.map((t) => (
            <li key={t.text} className="flex items-center gap-2.5 text-sm text-[var(--ink-2)]">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--paper-2)] text-[var(--green)]">
                <Icon name={t.icon} className="h-4 w-4" />
              </span>
              {t.text}
            </li>
          ))}
        </ul>
      </div>
    </div>
    <ProductReviews productId={product.id} />

    {/* Sticky mobile add-to-cart bar — quick add without scrolling back up */}
    <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t border-black/10 bg-white/95 p-3 backdrop-blur md:hidden">
      <div className="min-w-0">
        <div className="flex items-baseline gap-1.5">
          <span className="font-display text-lg font-extrabold">{inr(product.price)}</span>
          {off > 0 && <span className="text-xs text-[var(--ink-soft)] line-through">{inr(product.compareAt!)}</span>}
        </div>
        <span className="block truncate text-[11px] text-[var(--ink-soft)]">{size ? `Size ${size} · ${colorName(color)}` : "Pick a size ↑"}</span>
      </div>
      <button onClick={onAdd} disabled={selStock === 0}
        className={`ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-xl px-6 py-3 text-sm font-bold transition-transform active:scale-[0.99] disabled:opacity-50 ${
          added ? "bg-[var(--primary)] text-white" : "bg-[var(--lime)] text-[var(--ink)]"
        }`}>
        {selStock === 0 ? "Out of Stock" : added ? <>Go to Cart <Icon name="arrow" className="h-4 w-4" /></> : "Add to Cart"}
      </button>
    </div>

    {/* Toast — floats above the sticky bar so it's visible no matter where the shopper tapped */}
    {toast && (
      <div
        role="status"
        aria-live="polite"
        className="fixed bottom-24 left-1/2 z-[60] -translate-x-1/2 animate-[fadeSlideIn_0.25s_ease] whitespace-nowrap rounded-full bg-[var(--ink)] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_-8px_rgba(0,0,0,0.5)] md:bottom-8">
        <span className="inline-flex items-center gap-2">
          <span className="grid h-4 w-4 place-items-center rounded-full bg-[var(--coral)] text-[10px] font-black">!</span>
          {toast}
        </span>
      </div>
    )}
    </>
  );
}
