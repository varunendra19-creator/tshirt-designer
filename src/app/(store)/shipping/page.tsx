import type { Metadata } from "next";
import { PageHero, Prose, H2, P, UL, Callout } from "@/components/site/ContentPage";
import { SUPPORT_EMAIL } from "@/lib/marketing";

export const metadata: Metadata = {
  title: "Shipping Policy — Delivery Times & Charges",
  description:
    "Campus Mode shipping policy: dispatch times, delivery estimates across India, shipping charges, Cash on Delivery, and order tracking.",
  alternates: { canonical: "/shipping" },
};

export default function ShippingPage() {
  return (
    <>
      <PageHero eyebrow="Customer Care" title="Shipping Policy" subtitle="Everything about how and when your order reaches you." />
      <Prose updated="July 2026">
        <H2>Dispatch & delivery times</H2>
        <UL
          items={[
            <><b>Ready-to-ship styles</b> are dispatched within 24–48 hours of your order.</>,
            <><b>Custom-printed items</b> are made to order and dispatched in 3–4 working days.</>,
            <>Once dispatched, delivery takes <b>4–6 working days</b> to most Indian pincodes; remote areas may take a little longer.</>,
          ]}
        />
        <H2>Shipping charges</H2>
        <P>
          Shipping is calculated at checkout based on your order value and destination. Orders above the free-shipping threshold shown
          in your cart ship free. Any applicable charge is displayed clearly before you pay.
        </P>
        <H2>Cash on Delivery</H2>
        <P>
          COD is available on all serviceable pincodes across India. Choose Cash on Delivery at checkout and pay in cash or UPI when
          your order arrives.
        </P>
        <H2>Tracking your order</H2>
        <P>
          The moment your order ships, we email you the carrier and tracking number. You can also follow it live from the{" "}
          <b>Orders</b> tab in My Account.
        </P>
        <H2>Delays</H2>
        <P>
          Occasionally, weather, strikes or courier issues can slow things down. If your order seems stuck, give it a day and then
          reach out — we'll chase it for you.
        </P>
        <Callout>
          Questions about a shipment? Email <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-[var(--primary)]">{SUPPORT_EMAIL}</a> with your order number and we'll help right away.
        </Callout>
      </Prose>
    </>
  );
}
