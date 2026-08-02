import { Suspense } from "react";
import type { Metadata } from "next";
import { ShopClient } from "@/components/site/ShopClient";
import { getDbProducts } from "@/lib/catalogDb";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Shop T-Shirts, Hoodies, Oversized & Accessories",
  description:
    "Browse Campus Mode's full range — oversized tees, printed & plain t-shirts, hoodies, sneakers and accessories for college students in India. Filter by category and sort by price.",
  alternates: { canonical: "/shop" },
};

export default async function ShopPage() {
  const products = await getDbProducts();
  return (
    <Suspense fallback={<div className="mx-auto max-w-full px-5 py-20 text-center text-[var(--ink-soft)]">Loading…</div>}>
      <ShopClient products={products} />
    </Suspense>
  );
}
