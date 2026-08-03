import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHero } from "@/components/site/ContentPage";
import { BLOG_POSTS, getPost, SITE_URL, BRAND } from "@/lib/marketing";
import { safeJsonLd } from "@/lib/jsonld";

export function generateStaticParams() {
  return BLOG_POSTS.map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const post = getPost(params.slug);
  if (!post) return { title: "Post not found" };
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.excerpt,
      url: `/blog/${post.slug}`,
      publishedTime: post.date,
      authors: [post.author],
    },
    twitter: { card: "summary_large_image", title: post.title, description: post.excerpt },
  };
}

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

export default function BlogPost({ params }: { params: { slug: string } }) {
  const post = getPost(params.slug);
  if (!post) notFound();

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date,
    author: { "@type": "Organization", name: post.author },
    publisher: { "@type": "Organization", name: BRAND },
    mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE_URL}/blog/${post.slug}` },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(articleJsonLd) }} />
      <PageHero eyebrow={post.tag} title={post.title} />
      <article className="mx-auto max-w-3xl px-5 py-12 md:py-16">
        <p className="mb-8 text-xs text-[var(--ink-soft)]">{fmtDate(post.date)} · {post.readMins} min read · By {post.author}</p>
        <div className="space-y-5 text-[15px] leading-relaxed text-[var(--ink-2)]">
          {post.body.map((block, i) =>
            typeof block === "string" ? (
              <p key={i}>{block}</p>
            ) : (
              <h2 key={i} className="font-display pt-4 text-xl font-extrabold text-[var(--ink)] md:text-2xl">{block.h}</h2>
            ),
          )}
        </div>
        <div className="mt-12 rounded-2xl border border-[var(--primary)]/20 bg-[var(--primary)]/[0.04] p-6 text-center">
          <p className="font-display text-lg font-extrabold">Got an idea? Print it.</p>
          <p className="mt-1 text-[14px] text-[var(--ink-2)]">Turn it into a real tee in about ten minutes.</p>
          <Link href="/customize" className="mt-4 inline-block rounded-full bg-[var(--primary)] px-6 py-3 text-sm font-bold text-white transition-transform hover:-translate-y-0.5">Open the Design Studio</Link>
        </div>
        <div className="mt-10 border-t border-black/10 pt-6">
          <Link href="/blog" className="text-sm font-semibold text-[var(--primary)] hover:underline">← Back to the journal</Link>
        </div>
      </article>
    </>
  );
}
