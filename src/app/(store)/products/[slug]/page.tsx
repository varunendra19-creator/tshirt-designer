import type { Metadata } from "next";
import { safeJsonLd } from "@/lib/jsonld";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PRODUCTS, CATEGORY_LABELS } from "@/lib/catalog";
import { getDbProduct, getDbRelated, getDbProductReviewStats, getDbProductInStock } from "@/lib/catalogDb";
import { stripHtml } from "@/lib/richtext";
import { ProductDetail } from "@/components/site/ProductDetail";
import { ProductCard } from "@/components/site/ProductCard";

const SITE = "https://campusmode.in";
export const revalidate = 300; // reflect admin product edits within 5 min

export function generateStaticParams() {
  return PRODUCTS.map((p) => ({ slug: p.id }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const p = await getDbProduct(params.slug);
  if (!p) return { title: "Product not found", robots: { index: false } };
  const title = `${p.name} — ${CATEGORY_LABELS[p.category]}`;
  const description = stripHtml(p.description).slice(0, 300) || `Buy ${p.name} online at Campus Mode.`;
  const url = `/products/${p.id}`;
  const images = p.image ? [{ url: p.image, width: 1200, height: 1200, alt: p.name }] : undefined;
  return {
    title,
    description,
    keywords: [p.name, CATEGORY_LABELS[p.category], "buy online India", "Campus Mode"],
    alternates: { canonical: url },
    openGraph: { type: "website", url, title, description, siteName: "Campus Mode", images, locale: "en_IN" },
    twitter: { card: "summary_large_image", title, description, images: p.image ? [p.image] : undefined },
  };
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await getDbProduct(params.slug);
  if (!product) notFound();
  const url = `${SITE}/products/${product.id}`;

  // Fetch related + real-review stats + stock in parallel (they're independent)
  // so the page renders faster. Structured-data rating uses REAL buyer reviews
  // only (never the editable display numbers), so Google never sees a fake rating.
  const [related, realReviews, inStock] = await Promise.all([
    getDbRelated(product),
    getDbProductReviewStats(product.id),
    getDbProductInStock(product.id),
  ]);
  // priceValidUntil ~1 year out (Google recommends the field on Offer).
  const priceValidUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const productLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: stripHtml(product.description),
    image: product.image || undefined,
    sku: product.id,
    brand: { "@type": "Brand", name: "Campus Mode" },
    ...(realReviews.count > 0 && {
      aggregateRating: { "@type": "AggregateRating", ratingValue: realReviews.avg, reviewCount: realReviews.count },
    }),
    offers: {
      "@type": "Offer",
      priceCurrency: "INR",
      price: product.price,
      priceValidUntil,
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url,
      itemCondition: "https://schema.org/NewCondition",
    },
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE },
      { "@type": "ListItem", position: 2, name: CATEGORY_LABELS[product.category], item: `${SITE}/category/${product.category}` },
      { "@type": "ListItem", position: 3, name: product.name, item: url },
    ],
  };

  return (
    <section className="mx-auto max-w-full px-5 pt-8 pb-24 md:py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(productLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbLd) }} />
      <nav aria-label="Breadcrumb" className="mb-5 text-xs text-[var(--ink-soft)]">
        <Link href="/" className="hover:text-[var(--ink)]">Home</Link>
        <span className="mx-1.5">/</span>
        <Link href={`/category/${product.category}`} className="hover:text-[var(--ink)]">{CATEGORY_LABELS[product.category]}</Link>
        <span className="mx-1.5">/</span>
        <span className="text-[var(--ink)]">{product.name}</span>
      </nav>

      <ProductDetail product={product} />

      {related.length > 0 && (
        <div className="mt-20">
          <h2 className="font-display text-2xl font-extrabold">You may also like</h2>
          <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-9 md:grid-cols-4">
            {related.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        </div>
      )}
    </section>
  );
}
