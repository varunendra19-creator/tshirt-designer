import type { Metadata } from "next";
import { PageHero, Prose, H2, P, UL } from "@/components/site/ContentPage";
import { SUPPORT_EMAIL, LEGAL_ENTITY } from "@/lib/marketing";

export const metadata: Metadata = {
  title: "Privacy Policy — How We Handle Your Data",
  description:
    "How Campus Mode collects, uses and protects your personal information — what we store, why, who we share it with, and your rights.",
  alternates: { canonical: "/privacy" },
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <>
      <PageHero eyebrow="Legal" title="Privacy Policy" subtitle="Your data, and what we do (and don't do) with it." />
      <Prose updated="July 2026">
        <P>
          This policy explains how {LEGAL_ENTITY} (&ldquo;Campus Mode&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) collects and uses your
          information when you use our website and services. By using Campus Mode, you agree to this policy.
        </P>
        <H2>What we collect</H2>
        <UL
          items={[
            <><b>Account & contact details</b> — name, email, phone, and shipping address you provide.</>,
            <><b>Order information</b> — items purchased, custom designs you create, and delivery details.</>,
            <><b>Payment information</b> — processed by our payment partner (Stripe). We never see or store your full card details.</>,
            <><b>Usage data</b> — basic analytics about how you use the site, to help us improve it.</>,
          ]}
        />
        <H2>How we use it</H2>
        <UL
          items={[
            <>To process and deliver your orders and send order, shipping and support emails.</>,
            <>To provide your account, order history and saved designs.</>,
            <>To prevent fraud and keep the service secure.</>,
            <>To improve our products, and — only if you opt in — to send occasional offers.</>,
          ]}
        />
        <H2>Who we share it with</H2>
        <P>
          We share data only with the partners needed to run the store — payment processors, shipping couriers, and email providers —
          and only what they need to do their job. We do not sell your personal data to anyone.
        </P>
        <H2>Data security & retention</H2>
        <P>
          Your data is stored on secured infrastructure with access controls, and payments run over encrypted connections. We keep your
          information only as long as needed to provide the service and meet legal obligations.
        </P>
        <H2>Your rights</H2>
        <P>
          You can access, correct or delete your account data at any time from My Account, or by emailing us. You can also opt out of
          marketing emails using the unsubscribe link in any such email.
        </P>
        <H2>Cookies</H2>
        <P>
          We use essential cookies to keep you signed in and remember your cart, plus basic analytics cookies. You can control cookies
          through your browser settings.
        </P>
        <H2>Contact</H2>
        <P>
          Questions about your privacy? Email{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-[var(--primary)]">{SUPPORT_EMAIL}</a>.
        </P>
      </Prose>
    </>
  );
}
