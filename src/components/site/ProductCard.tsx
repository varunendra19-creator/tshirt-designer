"use client";

import { useState } from "react";
import Link from "next/link";
import type { Product } from "@/lib/catalog";
import { inr } from "@/lib/format";
import { useCart } from "@/context/CartContext";
import { useWishlist, toggleWishlist } from "@/lib/wishlist";
import { Img, Icon } from "@/components/home/primitives";

export function ProductCard({ p }: { p: Product }) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  const wished = useWishlist().includes(p.id);
  const off = p.compareAt ? Math.round((1 - p.price / p.compareAt) * 100) : 0;

  const toggleWish = (e: React.MouseEvent) => { e.preventDefault(); toggleWishlist(p.id); };

  const quickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    add({ id: p.id, size: p.sizes[Math.min(1, p.sizes.length - 1)], color: p.swatches[0], qty: 1 });
    setAdded(true);
    setTimeout(() => setAdded(false), 1400);
  };

  return (
    <div className="group flex flex-col">
      <Link
        href={`/products/${p.id}`}
        className="relative block overflow-hidden rounded-2xl border border-black/5 bg-white shadow-[0_10px_30px_-20px_rgba(31,41,55,0.35)] transition-shadow duration-300 hover:shadow-[0_20px_40px_-22px_rgba(124,58,237,0.4)]"
      >
        <Img
          src={p.image}
          alt={p.name}
          tone={p.tone}
          label={p.name}
          className="aspect-[4/5] w-full"
          imgClassName="transition-transform duration-500 group-hover:scale-105"
        />
        {off > 0 && (
          <span className="absolute left-2.5 top-2.5 rounded-lg bg-[#ef4444] px-2 py-0.5 text-[11px] font-bold text-white shadow">
            -{off}%
          </span>
        )}
        {!off && p.badge && (
          <span className="absolute left-2.5 top-2.5 rounded-lg bg-[var(--primary)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow">
            {p.badge}
          </span>
        )}
        <button
          aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
          aria-pressed={wished}
          onClick={toggleWish}
          className={`absolute right-2.5 top-2.5 grid h-8 w-8 place-items-center rounded-full bg-white/90 shadow backdrop-blur transition-colors hover:text-[var(--coral)] ${wished ? "text-[var(--coral)]" : "text-[var(--ink)]"}`}
        >
          <Icon name="heart" className="h-4 w-4" style={wished ? { fill: "var(--coral)" } : undefined} />
        </button>
      </Link>

      <div className="mt-2.5 px-0.5">
        <div className="flex items-center gap-1 text-xs text-[var(--ink-soft)]">
          <Icon name="star" className="h-3.5 w-3.5 text-[#f59e0b]" />
          <span className="font-semibold text-[var(--ink-2)]">{p.rating}</span>
          <span>({p.reviews})</span>
        </div>
        <h3 className="mt-1 truncate text-sm font-semibold text-[var(--ink)]">{p.name}</h3>
        <div className="mt-1 flex items-center justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className="font-display text-[15px] font-bold text-[var(--ink)]">{inr(p.price)}</span>
            {p.compareAt && (
              <span className="text-xs text-[var(--ink-soft)] line-through">{inr(p.compareAt)}</span>
            )}
          </div>
          <button
            onClick={quickAdd}
            aria-label={`Add ${p.name} to cart`}
            className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-white shadow-sm transition-transform hover:scale-110 ${
              added ? "bg-[var(--mint)]" : "bg-[var(--primary)]"
            }`}
          >
            <Icon name={added ? "check" : "plus"} className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
