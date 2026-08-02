import type { MetadataRoute } from "next";
import { PRODUCTS, CATEGORY_LABELS } from "@/lib/catalog";
import { BLOG_POSTS } from "@/lib/marketing";

const SITE = "https://campusmode.in";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes = [
    { path: "", priority: 1 },
    { path: "/shop", priority: 0.8 },
    { path: "/sale", priority: 0.7 },
    { path: "/customize", priority: 0.8 },
    { path: "/about", priority: 0.5 },
    { path: "/contact", priority: 0.5 },
    { path: "/faq", priority: 0.6 },
    { path: "/blog", priority: 0.6 },
    { path: "/shipping", priority: 0.4 },
    { path: "/returns", priority: 0.4 },
    { path: "/privacy", priority: 0.3 },
    { path: "/terms", priority: 0.3 },
  ].map(({ path, priority }) => ({
    url: `${SITE}${path}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority,
  }));

  const blogRoutes = BLOG_POSTS.map((p) => ({
    url: `${SITE}/blog/${p.slug}`,
    lastModified: new Date(p.date),
    changeFrequency: "monthly" as const,
    priority: 0.5,
  }));

  const categoryRoutes = (Object.keys(CATEGORY_LABELS) as string[]).map((cat) => ({
    url: `${SITE}/category/${cat}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  const productRoutes = PRODUCTS.map((p) => ({
    url: `${SITE}/products/${p.id}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [...staticRoutes, ...blogRoutes, ...categoryRoutes, ...productRoutes];
}
