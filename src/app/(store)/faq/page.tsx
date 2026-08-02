import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/site/ContentPage";
import { FAQS, SITE_URL, SUPPORT_EMAIL } from "@/lib/marketing";
import { safeJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  title: "FAQ — Delivery, Custom Designs, Returns & Payments",
  description:
    "Answers to common questions about Campus Mode: delivery times, how the custom t-shirt designer works, returns & exchanges, payment methods, COD, sizing and bulk orders.",
  alternates: { canonical: "/faq" },
};

// FAQPage structured data → eligible for rich results in search.
const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export default function FAQPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd({ ...faqJsonLd, url: `${SITE_URL}/faq` }) }} />
      <PageHero eyebrow="Help Centre" title="Frequently Asked Questions" subtitle="Quick answers to the things students ask us most." />
      <div className="mx-auto max-w-3xl px-5 py-12 md:py-16">
        <div className="space-y-3">
          {FAQS.map((f, i) => (
            <details key={i} className="group rounded-2xl border border-black/10 bg-white p-5 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer items-center justify-between gap-4 font-display text-[15px] font-bold text-[var(--ink)]">
                {f.q}
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-black/15 text-[var(--ink-soft)] transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-[14px] leading-relaxed text-[var(--ink-2)]">{f.a}</p>
            </details>
          ))}
        </div>
        <div className="mt-8 rounded-2xl border border-[var(--primary)]/20 bg-[var(--primary)]/[0.04] p-6 text-center">
          <p className="font-display text-lg font-extrabold">Still stuck?</p>
          <p className="mt-1 text-[14px] text-[var(--ink-2)]">
            Our team replies fast. Email{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-[var(--primary)]">{SUPPORT_EMAIL}</a> or head to our{" "}
            <Link href="/contact" className="font-semibold text-[var(--primary)] hover:underline">contact page</Link>.
          </p>
        </div>
      </div>
    </>
  );
}
