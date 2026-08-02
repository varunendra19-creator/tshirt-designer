import type { Metadata } from "next";
import { PageHero, Prose, H2, P, UL, Callout } from "@/components/site/ContentPage";
import { SUPPORT_EMAIL } from "@/lib/marketing";

export const metadata: Metadata = {
  title: "Returns & Refund Policy — Easy Exchanges",
  description:
    "Campus Mode returns, exchange and refund policy: 7-day returns on ready-made items, defect/print-error replacements on custom items, and how refunds are processed.",
  alternates: { canonical: "/returns" },
};

export default function ReturnsPage() {
  return (
    <>
      <PageHero eyebrow="Customer Care" title="Returns & Refunds" subtitle="We want you in something you love. Here's how returns and exchanges work." />
      <Prose updated="July 2026">
        <H2>Ready-made items</H2>
        <UL
          items={[
            <>Return or exchange within <b>7 days of delivery</b>.</>,
            <>Item must be <b>unused, unwashed</b>, and have its original tags intact.</>,
            <>Wrong size? We'll exchange it for another size, subject to availability.</>,
          ]}
        />
        <H2>Custom-printed items</H2>
        <P>
          Custom pieces are printed just for you, so they can't be returned for a change of mind. But if your item arrives{" "}
          <b>defective, damaged, or with a printing error</b>, we'll replace it or refund you in full — no questions asked.
        </P>
        <H2>How to start a return</H2>
        <UL
          items={[
            <>Email <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-[var(--primary)]">{SUPPORT_EMAIL}</a> with your order number and, for defects, a photo.</>,
            <>We'll confirm the return and arrange pickup or share a return address.</>,
            <>Once we receive and check the item, your refund or exchange is processed.</>,
          ]}
        />
        <H2>Refunds</H2>
        <P>
          Approved refunds are issued to your original payment method within <b>5–7 working days</b>. For Cash on Delivery orders, we
          refund via UPI or bank transfer. You'll get an email at every step.
        </P>
        <H2>Non-returnable</H2>
        <P>Used, washed, or altered items, and custom items without a defect, can't be returned. Innerwear and masks are non-returnable for hygiene reasons.</P>
        <Callout>
          Not happy with something? Talk to us first — email <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-[var(--primary)]">{SUPPORT_EMAIL}</a> and we'll make it right.
        </Callout>
      </Prose>
    </>
  );
}
