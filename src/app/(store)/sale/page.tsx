import type { Metadata } from "next";
import Link from "next/link";
import { getDbProducts } from "@/lib/catalogDb";
import { ProductCard } from "@/components/site/ProductCard";
import { safeJsonLd } from "@/lib/jsonld";

const SITE = "https://campusmode.in";
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Sale — Student Discounts on Tees, Hoodies & More",
  description:
    "Shop the Campus Mode sale — discounted oversized tees, printed t-shirts, hoodies and accessories for college students. Limited-time student prices, COD & free shipping over ₹999.",
  keywords: ["t-shirt sale India", "college fashion sale", "discount hoodies", "Campus Mode sale"],
  alternates: { canonical: "/sale" },
  openGraph: { type: "website", url: "/sale", title: "Sale — Campus Mode", description: "Discounted college merch — limited-time student prices.", siteName: "Campus Mode", locale: "en_IN" },
  twitter: { card: "summary_large_image", title: "Sale — Campus Mode" },
};

export default async function SalePage() {
  const all = await getDbProducts();
  const products = all.filter((p) => p.compareAt && p.compareAt > p.price);
  const maxOff = products.reduce((m, p) => Math.max(m, Math.round((1 - p.price / (p.compareAt as number)) * 100)), 0);
  const url = `${SITE}/sale`;

  const ld = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Sale",
    url,
    description: "Discounted t-shirts, hoodies and accessories for college students.",
    mainEntity: {
      "@type": "ItemList",
      itemListElement: products.map((p, i) => ({
        "@type": "ListItem", position: i + 1, url: `${SITE}/products/${p.id}`, name: p.name,
      })),
    },
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE },
      { "@type": "ListItem", position: 2, name: "Sale", item: url },
    ],
  };

  return (
    <section className="mx-auto max-w-full px-5 py-8 md:py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(ld) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbLd) }} />
      <nav aria-label="Breadcrumb" className="mb-4 text-xs text-[var(--ink-soft)]">
        <Link href="/" className="hover:text-[var(--ink)]">Home</Link>
        <span className="mx-1.5">/</span>
        <span className="text-[var(--ink)]">Sale</span>
      </nav>

      <div className="flex flex-wrap items-end gap-3">
        <h1 className="font-display text-[clamp(1.9rem,4.5vw,3rem)] font-extrabold leading-none">Sale</h1>
        {maxOff > 0 && (
          <span className="mb-1 rounded-full bg-[var(--coral)] px-3 py-1 text-sm font-bold text-white">Up to {maxOff}% off</span>
        )}
      </div>
      <p className="mt-3 max-w-2xl text-[var(--ink-2)]">
        Limited-time student prices across tees, hoodies and more. Grab them before they’re gone.
      </p>

      {products.length === 0 ? (
        <p className="mt-10 text-[var(--ink-soft)]">No offers running right now — <Link href="/shop" className="font-semibold text-[var(--primary)]">browse all products</Link>.</p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-9 md:grid-cols-4">
          {products.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      )}
    </section>
  );
}
