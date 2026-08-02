import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/site/ContentPage";
import { BLOG_POSTS } from "@/lib/marketing";

export const metadata: Metadata = {
  title: "The Campus Journal — Design Tips, Style Guides & More",
  description:
    "Ideas and guides for college merch: how to design fest t-shirts, oversized vs regular fit, caring for printed tees, and more from the Campus Mode team.",
  alternates: { canonical: "/blog" },
};

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export default function BlogIndex() {
  const posts = [...BLOG_POSTS].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <>
      <PageHero eyebrow="The Campus Journal" title="Ideas, guides & tees" subtitle="Design tips, style guides and the occasional strong opinion — from the people who print your merch." />
      <div className="mx-auto max-w-5xl px-5 py-12 md:py-16">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => (
            <Link key={p.slug} href={`/blog/${p.slug}`} className="group flex flex-col rounded-3xl border border-black/10 bg-white p-6 transition-shadow hover:shadow-md">
              <span className="mb-3 inline-block w-fit rounded-full bg-[var(--primary)]/[0.08] px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-[var(--primary)]">{p.tag}</span>
              <h2 className="font-display text-lg font-extrabold leading-snug text-[var(--ink)] group-hover:text-[var(--primary)]">{p.title}</h2>
              <p className="mt-2 flex-1 text-[14px] leading-relaxed text-[var(--ink-2)]">{p.excerpt}</p>
              <p className="mt-4 text-xs text-[var(--ink-soft)]">{fmtDate(p.date)} · {p.readMins} min read</p>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
