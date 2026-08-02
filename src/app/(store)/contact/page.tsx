import type { Metadata } from "next";
import { PageHero } from "@/components/site/ContentPage";
import { ContactForm } from "@/components/site/ContactForm";
import { SUPPORT_EMAIL, SUPPORT_PHONE, SUPPORT_HOURS } from "@/lib/marketing";

export const metadata: Metadata = {
  title: "Contact Us — We're Here to Help",
  description:
    "Get in touch with Campus Mode. Questions about an order, a custom design, or a bulk enquiry for your college society? Message us and we'll reply within a working day.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <>
      <PageHero eyebrow="Say Hi" title="Contact Us" subtitle="Order help, custom-design questions, or a bulk order for your fest — we've got you." />
      <div className="mx-auto grid max-w-5xl gap-8 px-5 py-12 md:grid-cols-[1fr_1.2fr] md:py-16">
        <div className="space-y-5">
          <div className="rounded-2xl border border-black/10 bg-white p-6">
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">Email</p>
            <a href={`mailto:${SUPPORT_EMAIL}`} className="font-display text-lg font-extrabold text-[var(--primary)]">{SUPPORT_EMAIL}</a>
            <p className="mt-3 text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">Phone</p>
            <p className="font-semibold">{SUPPORT_PHONE}</p>
            <p className="mt-3 text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">Hours</p>
            <p className="text-sm text-[var(--ink-2)]">{SUPPORT_HOURS}</p>
          </div>
          <div className="rounded-2xl border border-[var(--primary)]/20 bg-[var(--primary)]/[0.04] p-6">
            <p className="font-display font-extrabold">Bulk & society orders</p>
            <p className="mt-1 text-sm text-[var(--ink-2)]">
              Ordering 20+ for a fest, society or hostel? Mention it in your message for special pricing and design help.
            </p>
          </div>
        </div>
        <ContactForm />
      </div>
    </>
  );
}
