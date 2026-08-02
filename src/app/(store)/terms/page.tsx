import type { Metadata } from "next";
import { PageHero, Prose, H2, P, UL } from "@/components/site/ContentPage";
import { SUPPORT_EMAIL, LEGAL_ENTITY } from "@/lib/marketing";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description:
    "The terms and conditions governing your use of Campus Mode — orders, pricing, custom-design content rules, intellectual property, and liability.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <>
      <PageHero eyebrow="Legal" title="Terms & Conditions" subtitle="The ground rules for using Campus Mode." />
      <Prose updated="July 2026">
        <P>
          These Terms govern your use of the Campus Mode website and services, operated by {LEGAL_ENTITY}. By placing an order or using
          the site, you agree to these Terms.
        </P>
        <H2>Orders & acceptance</H2>
        <P>
          An order is an offer to buy. We confirm it by email, and a contract forms when we accept it. We may decline or cancel an order
          (with a full refund) if an item is unavailable, mispriced, or the order looks fraudulent.
        </P>
        <H2>Pricing & payment</H2>
        <UL
          items={[
            <>All prices are in Indian Rupees and are inclusive of GST unless stated otherwise.</>,
            <>We may change prices at any time, but changes won't affect orders we've already accepted.</>,
            <>Payment is via the methods shown at checkout (Cash on Delivery, and online payment where enabled).</>,
          ]}
        />
        <H2>Custom designs & your content</H2>
        <UL
          items={[
            <>You are responsible for the artwork, text and images you upload, and confirm you have the right to use them.</>,
            <>You must not upload content that is illegal, hateful, infringing, or that violates someone else's intellectual property or privacy.</>,
            <>We may refuse to print any design that breaches these rules, and will refund such orders.</>,
            <>You keep ownership of your own artwork; you grant us the limited right to reproduce it solely to fulfil your order.</>,
          ]}
        />
        <H2>Intellectual property</H2>
        <P>
          The Campus Mode name, logo, site design and content are our property and may not be copied or reused without permission.
        </P>
        <H2>Returns</H2>
        <P>
          Returns and refunds are governed by our{" "}
          <a href="/returns" className="font-semibold text-[var(--primary)]">Returns &amp; Refund Policy</a>, which forms part of these Terms.
        </P>
        <H2>Limitation of liability</H2>
        <P>
          We provide the service with reasonable care, but to the extent permitted by law our liability for any order is limited to the
          amount you paid for it. We are not liable for indirect or consequential losses.
        </P>
        <H2>Changes & governing law</H2>
        <P>
          We may update these Terms from time to time; the current version always lives on this page. These Terms are governed by the
          laws of India, and disputes are subject to the courts of India.
        </P>
        <H2>Contact</H2>
        <P>
          Questions? Email{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-[var(--primary)]">{SUPPORT_EMAIL}</a>.
        </P>
      </Prose>
    </>
  );
}
