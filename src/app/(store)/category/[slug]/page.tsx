import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CATEGORY_LABELS, type CategoryId } from "@/lib/catalog";
import { getDbCategory, getDbProductsByCategory } from "@/lib/catalogDb";
import { ProductCard } from "@/components/site/ProductCard";
import { safeJsonLd } from "@/lib/jsonld";

const SITE = "https://campusmode.in";
const CATEGORIES = Object.keys(CATEGORY_LABELS) as CategoryId[];
export const revalidate = 300; // reflect admin category edits within 5 min

const isCategory = (s: string): s is CategoryId => (CATEGORIES as string[]).includes(s);

const DESC: Record<CategoryId, string> = {
  oversized: "Shop oversized t-shirts for college — relaxed drop-shoulder fits in premium cotton. Student pricing, COD & free shipping over ₹999.",
  printed: "Printed graphic tees for developers, designers & campus life. Bold prints, soft cotton, made in India.",
  plain: "Plain everyday t-shirts in premium combed cotton. Minimal, comfy, colours that don't fade.",
  hoodies: "Cosy hoodies & sweatshirts for campus and hostel life. Heavyweight, warm, student-friendly prices.",
  sneakers: "Everyday campus sneakers — clean, comfy and street-ready.",
  accessories: "Caps, bags & campus accessories to finish the look.",
  bottoms: "Cargos, joggers & bottoms built for everyday campus wear.",
};

export function generateStaticParams() {
  return CATEGORIES.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  if (!isCategory(slug)) return { title: "Category not found", robots: { index: false } };
  const db = await getDbCategory(slug);
  const label = db?.label || CATEGORY_LABELS[slug];
  const title = `${label} for College Students — Buy Online`;
  const description = db?.description || DESC[slug];
  const url = `/category/${slug}`;
  return {
    title,
    description,
    keywords: [label, `buy ${label} online`, "college fashion India", "Campus Mode"],
    alternates: { canonical: url },
    openGraph: { type: "website", url, title, description, siteName: "Campus Mode", locale: "en_IN" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!isCategory(slug)) notFound();
  const cat = slug;
  const db = await getDbCategory(cat);
  const label = db?.label || CATEGORY_LABELS[cat];
  const desc = db?.description || DESC[cat];
  const products = await getDbProductsByCategory(cat);
  const url = `${SITE}/category/${cat}`;

  const ld = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: label,
    url,
    description: desc,
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
      { "@type": "ListItem", position: 2, name: label, item: url },
    ],
  };

  return (
    <section className="mx-auto max-w-full px-5 py-8 md:py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(ld) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbLd) }} />
      <nav aria-label="Breadcrumb" className="mb-4 text-xs text-[var(--ink-soft)]">
        <Link href="/" className="hover:text-[var(--ink)]">Home</Link>
        <span className="mx-1.5">/</span>
        <span className="text-[var(--ink)]">{label}</span>
      </nav>

      <h1 className="font-display text-[clamp(1.9rem,4.5vw,3rem)] font-extrabold leading-none">{label}</h1>
      <p className="mt-3 max-w-2xl text-[var(--ink-2)]">{desc}</p>

      {products.length === 0 ? (
        <p className="mt-10 text-[var(--ink-soft)]">Nothing here yet — <Link href="/shop" className="font-semibold text-[var(--primary)]">browse all products</Link>.</p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-9 md:grid-cols-4">
          {products.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      )}
    </section>
  );
}
