"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CATEGORY_LABELS, type CategoryId, type Product } from "@/lib/catalog";
import { ProductCard } from "./ProductCard";

const CATS: { id: string; label: string }[] = [
  { id: "all", label: "All" },
  ...(Object.keys(CATEGORY_LABELS) as (keyof typeof CATEGORY_LABELS)[]).map((k) => ({
    id: k,
    label: CATEGORY_LABELS[k],
  })),
];

const SORTS = [
  { id: "featured", label: "Featured" },
  { id: "price-asc", label: "Price: Low to High" },
  { id: "price-desc", label: "Price: High to Low" },
  { id: "rating", label: "Top Rated" },
];

const PRICE_BANDS = [
  { id: "all", label: "Any price", min: 0, max: Infinity },
  { id: "under-500", label: "Under ₹500", min: 0, max: 500 },
  { id: "500-1000", label: "₹500 – ₹1000", min: 500, max: 1000 },
  { id: "1000-2000", label: "₹1000 – ₹2000", min: 1000, max: 2000 },
  { id: "2000-plus", label: "₹2000+", min: 2000, max: Infinity },
];

export function ShopClient({ products = [] }: { products?: Product[] }) {
  const params = useSearchParams();
  const category = params.get("category") || "all";
  const sale = params.get("sale") === "1";
  const q = (params.get("q") || "").toLowerCase().trim();
  const [sort, setSort] = useState("featured");
  const [priceBand, setPriceBand] = useState("all");

  const heading = sale
    ? "Sale"
    : q
    ? `Search: “${params.get("q")}”`
    : category !== "all"
    ? CATEGORY_LABELS[category as CategoryId] ?? "Shop"
    : "All T-Shirts";

  const items = useMemo(() => {
    let list = products.slice();
    if (category !== "all") list = list.filter((p) => p.category === category);
    if (sale) list = list.filter((p) => p.compareAt);
    if (q) list = list.filter((p) => p.name.toLowerCase().includes(q));
    const band = PRICE_BANDS.find((b) => b.id === priceBand)!;
    list = list.filter((p) => p.price >= band.min && p.price < band.max);
    switch (sort) {
      case "price-asc":
        list.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        list.sort((a, b) => b.price - a.price);
        break;
      case "rating":
        list.sort((a, b) => b.rating - a.rating);
        break;
    }
    return list;
  }, [products, category, sale, q, sort, priceBand]);

  return (
    <section className="mx-auto max-w-full px-5 py-10 md:py-14">
      {/* breadcrumb */}
      <nav className="mb-3 text-xs text-[var(--ink-soft)]">
        <Link href="/" className="hover:text-[var(--ink)]">Home</Link>
        <span className="mx-1.5">/</span>
        <span className="text-[var(--ink)]">{heading}</span>
      </nav>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-[clamp(1.9rem,4.5vw,3rem)] font-extrabold leading-none">
          {heading}
        </h1>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-[var(--ink-soft)]">{items.length} items</span>
          <select
            value={priceBand}
            onChange={(e) => setPriceBand(e.target.value)}
            aria-label="Filter by price"
            className="rounded-full border border-black/15 bg-white px-4 py-2 text-sm font-medium outline-none focus:border-[var(--green)]"
          >
            {PRICE_BANDS.map((b) => (
              <option key={b.id} value={b.id}>{b.label}</option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            aria-label="Sort"
            className="rounded-full border border-black/15 bg-white px-4 py-2 text-sm font-medium outline-none focus:border-[var(--green)]"
          >
            {SORTS.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* category chips */}
      <div className="mt-5 flex flex-wrap gap-2">
        {CATS.map((c) => {
          const active = category === c.id && !sale;
          const href = c.id === "all" ? "/shop" : `/category/${c.id}`;
          return (
            <Link
              key={c.id}
              href={href}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                active
                  ? "border-[var(--ink)] bg-[var(--ink)] text-white"
                  : "border-black/15 bg-white text-[var(--ink-2)] hover:border-[var(--ink)]"
              }`}
            >
              {c.label}
            </Link>
          );
        })}
        <Link
          href="/sale"
          className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
            sale ? "border-[var(--coral)] bg-[var(--coral)] text-white" : "border-[var(--coral)] text-[var(--coral)] hover:bg-[var(--coral)] hover:text-white"
          }`}
        >
          Sale
        </Link>
      </div>

      {/* grid */}
      {items.length ? (
        <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-9 md:grid-cols-3 lg:grid-cols-4">
          {items.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
      ) : (
        <div className="mt-16 rounded-3xl border border-dashed border-black/15 py-20 text-center">
          <p className="font-display text-xl">Nothing here yet</p>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">Try a different category or search.</p>
          <Link href="/shop" className="mt-5 inline-block rounded-full bg-[var(--ink)] px-6 py-3 text-sm font-semibold text-white">
            View all t-shirts
          </Link>
        </div>
      )}
    </section>
  );
}
