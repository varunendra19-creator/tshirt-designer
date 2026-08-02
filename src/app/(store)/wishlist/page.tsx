"use client";

import Link from "next/link";
import { useWishlist } from "@/lib/wishlist";
import { getProduct } from "@/lib/catalog";
import { ProductCard } from "@/components/site/ProductCard";

export default function WishlistPage() {
  const ids = useWishlist();
  const products = ids.map((id) => getProduct(id)).filter(Boolean) as NonNullable<ReturnType<typeof getProduct>>[];

  return (
    <section className="mx-auto max-w-full px-5 py-10 md:py-14">
      <nav className="mb-3 text-xs text-[var(--ink-soft)]">
        <Link href="/" className="hover:text-[var(--ink)]">Home</Link>
        <span className="mx-1.5">/</span>
        <span className="text-[var(--ink)]">Wishlist</span>
      </nav>
      <div className="flex items-end justify-between gap-4">
        <h1 className="font-display text-[clamp(1.9rem,4.5vw,3rem)] font-extrabold leading-none">Wishlist</h1>
        {products.length > 0 && <span className="text-sm text-[var(--ink-soft)]">{products.length} item{products.length > 1 ? "s" : ""}</span>}
      </div>

      {products.length === 0 ? (
        <div className="mt-16 rounded-3xl border border-dashed border-black/15 py-20 text-center">
          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full text-2xl" style={{ background: "var(--paper-2)" }}>💜</div>
          <p className="font-display text-xl">Your wishlist is empty</p>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">Tap the heart on any product to save it here.</p>
          <Link href="/shop" className="mt-6 inline-block rounded-full bg-[var(--ink)] px-6 py-3 text-sm font-semibold text-white">Browse the shop</Link>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-9 md:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      )}
    </section>
  );
}
