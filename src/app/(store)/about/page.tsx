import type { Metadata } from "next";
import Link from "next/link";
import { PageHero, Prose, H2, P, UL } from "@/components/site/ContentPage";
import { BRAND } from "@/lib/marketing";

export const metadata: Metadata = {
  title: "About Us — Custom College Merch, Printed On Demand",
  description:
    "Campus Mode makes premium and custom t-shirts, hoodies and merch for college students across India. Learn our story, how we print on demand, and what we stand for.",
  alternates: { canonical: "/about" },
  openGraph: { title: `About ${BRAND}`, description: "Custom college merch, printed on demand — the Campus Mode story.", url: "/about" },
};

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="Our Story"
        title="Made for college. Made by people who get it."
        subtitle="Campus Mode started with a simple frustration: fest tees that felt cheap, took forever, and looked like everyone else's. So we built the studio we wished we had."
      />
      <Prose>
        <H2>Why we exist</H2>
        <P>
          College is the most expressive four years of your life — your merch should keep up. We make it stupidly easy to design a
          tee that looks exactly how you pictured it, print it at proper quality, and get it to your hostel in days, not weeks.
        </P>
        <H2>What we do differently</H2>
        <UL
          items={[
            <><b>Design in the browser.</b> Our studio lets you print on the front, back and both sleeves, at 300 DPI, with live mockups. What you see is what you get.</>,
            <><b>Made to order.</b> Custom pieces are printed just for you — no dead stock, less waste, more choice.</>,
            <><b>Student pricing.</b> Fair prices, GST-inclusive, with real bulk rates for societies and fests.</>,
            <><b>Delivered fast.</b> Ready styles ship in 24–48 hours and reach you in 4–6 days, anywhere in India.</>,
          ]}
        />
        <H2>Built for your batch</H2>
        <P>
          From society hoodies to farewell tees to that one cursed inside joke your whole hostel block will wear — if you can
          picture it, you can make it here. And if you're ordering in bulk, we'll give you a hand with the artwork and the price.
        </P>
        <P>
          Ready to make something?{" "}
          <Link href="/customize" className="font-semibold text-[var(--primary)] hover:underline">Open the Design Studio →</Link>
        </P>
      </Prose>
    </>
  );
}
