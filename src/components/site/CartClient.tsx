"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { colorName } from "@/lib/catalog";
import { inr, FREE_SHIP_OVER, SHIPPING_FEE } from "@/lib/format";
import { computeGST } from "@/lib/tax";
import { Img, Icon } from "@/components/home/primitives";
import { DesignPreviewModal } from "@/components/site/DesignPreview";

export function CartClient() {
  const { views, subtotal, setQty, remove } = useCart();
  const [zoom, setZoom] = useState<any>(null);
  const shipping = subtotal === 0 || subtotal >= FREE_SHIP_OVER ? 0 : SHIPPING_FEE;
  const total = subtotal + shipping;
  const gst = computeGST(views.map((v) => ({ price: v.product.price, qty: v.qty })));
  const toFree = Math.max(0, FREE_SHIP_OVER - subtotal);

  if (views.length === 0) {
    return (
      <section className="mx-auto max-w-full px-5 py-20 text-center">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-[var(--paper-2)] text-[var(--green)]">
          <Icon name="cart" className="h-9 w-9" />
        </div>
        <h1 className="font-display mt-5 text-3xl font-extrabold">Your cart is empty</h1>
        <p className="mt-2 text-[var(--ink-soft)]">Looks like you haven&apos;t added anything yet.</p>
        <Link href="/shop" className="mt-6 inline-block rounded-full bg-[var(--ink)] px-7 py-3.5 text-sm font-semibold text-white">
          Start shopping
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-full px-5 py-10 md:py-14">
      <h1 className="font-display text-[clamp(1.9rem,4.5vw,3rem)] font-extrabold leading-none">
        Your Cart <span className="text-[var(--ink-soft)]">({views.length})</span>
      </h1>

      {toFree > 0 && (
        <div className="mt-5 rounded-2xl bg-[var(--paper-2)] px-5 py-3.5 text-sm font-medium">
          Add <span className="font-bold">{inr(toFree)}</span> more for <span className="font-bold">FREE shipping</span> 🚚
        </div>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        {/* Lines */}
        <div className="divide-y divide-black/10">
          {views.map((v) => (
            <div key={v.key} className="flex gap-4 py-5 first:pt-0">
              {v.custom ? (
                <button type="button" onClick={() => setZoom(v)} title="View full design" className="group relative h-28 w-24 shrink-0 overflow-hidden rounded-xl border border-black/10">
                  <Img src={v.product.image} alt={v.product.name} tone={v.product.tone} className="h-full w-full" />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-[10px] font-bold text-transparent transition-all group-hover:bg-black/40 group-hover:text-white">VIEW ALL SIDES</span>
                </button>
              ) : (
                <Link href={`/products/${v.product.id}`} className="shrink-0">
                  <Img src={v.product.image} alt={v.product.name} tone={v.product.tone} className="h-28 w-24 rounded-xl border border-black/10" />
                </Link>
              )}
              <div className="flex flex-1 flex-col">
                <div className="flex justify-between gap-3">
                  <div>
                    {v.custom ? (
                      <span className="font-semibold leading-snug">{v.product.name}</span>
                    ) : (
                      <Link href={`/products/${v.product.id}`} className="font-semibold leading-snug hover:underline">
                        {v.product.name}
                      </Link>
                    )}
                    <p className="mt-1 text-xs text-[var(--ink-soft)]">
                      {v.custom ? `${v.custom.meta?.print_areas?.length ? `Print: ${v.custom.meta.print_areas.join(", ")}` : "Custom design"} · Size ${v.size}` : `${colorName(v.color)} · Size ${v.size}`}
                    </p>
                  </div>
                  <button onClick={() => remove(v.key)} aria-label="Remove" className="h-fit text-[var(--ink-soft)] hover:text-[var(--coral)]">
                    <Icon name="close" className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-auto flex items-center justify-between pt-3">
                  <div className="flex items-center rounded-lg border border-black/15 bg-white">
                    <button onClick={() => setQty(v.key, v.qty - 1)} className="grid h-9 w-9 place-items-center" aria-label="Decrease">−</button>
                    <span className="w-7 text-center text-sm font-semibold">{v.qty}</span>
                    <button onClick={() => setQty(v.key, v.qty + 1)} className="grid h-9 w-9 place-items-center" aria-label="Increase">+</button>
                  </div>
                  <span className="font-display font-bold">{inr(v.lineTotal)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="lg:sticky lg:top-28 lg:self-start">
          <div className="rounded-3xl border border-black/10 bg-white p-6">
            <h2 className="font-display text-lg font-extrabold">Order summary</h2>
            <dl className="mt-4 space-y-2.5 text-sm">
              <div className="flex justify-between"><dt className="text-[var(--ink-soft)]">Subtotal</dt><dd className="font-semibold">{inr(subtotal)}</dd></div>
              <div className="flex justify-between text-xs"><dt className="text-[var(--ink-soft)]">Incl. GST</dt><dd className="text-[var(--ink-soft)]">{inr(gst)}</dd></div>
              <div className="flex justify-between">
                <dt className="text-[var(--ink-soft)]">Shipping</dt>
                <dd className="font-semibold">{shipping === 0 ? "FREE" : inr(shipping)}</dd>
              </div>
              <div className="mt-2 flex justify-between border-t border-black/10 pt-3 text-base">
                <dt className="font-bold">Total</dt><dd className="font-display font-extrabold">{inr(total)}</dd>
              </div>
            </dl>
            <Link href="/checkout" className="mt-5 block rounded-xl bg-[var(--ink)] py-3.5 text-center text-sm font-bold text-white transition-transform hover:-translate-y-0.5">
              Checkout
            </Link>
            <Link href="/shop" className="mt-3 block text-center text-sm font-medium text-[var(--ink-2)] hover:text-[var(--ink)]">
              Continue shopping
            </Link>
            <div className="mt-5 flex items-center justify-center gap-2 text-xs text-[var(--ink-soft)]">
              <Icon name="lock" className="h-3.5 w-3.5" /> Secure checkout · UPI · COD
            </div>
          </div>
        </div>
      </div>

      <DesignPreviewModal view={zoom} onClose={() => setZoom(null)} />
    </section>
  );
}
