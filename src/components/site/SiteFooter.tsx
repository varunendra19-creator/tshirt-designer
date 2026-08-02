"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./SiteHeader";
import { Icon } from "@/components/home/primitives";

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Shop",
    links: [
      { label: "All T-Shirts", href: "/shop" },
      { label: "Oversized T-Shirts", href: "/category/oversized" },
      { label: "Printed T-Shirts", href: "/category/printed" },
      { label: "Plain T-Shirts", href: "/category/plain" },
      { label: "Hoodies", href: "/category/hoodies" },
      { label: "Accessories", href: "/category/accessories" },
    ],
  },
  {
    title: "Customer Care",
    links: [
      { label: "Track Order", href: "/account" },
      { label: "Returns & Exchange", href: "/returns" },
      { label: "Shipping Policy", href: "/shipping" },
      { label: "FAQs", href: "/faq" },
      { label: "Contact Us", href: "/contact" },
    ],
  },
  {
    title: "About",
    links: [
      { label: "About Us", href: "/about" },
      { label: "The Campus Journal", href: "/blog" },
      { label: "Design Studio", href: "/customize" },
      { label: "Contact Us", href: "/contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms & Conditions", href: "/terms" },
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Refund Policy", href: "/returns" },
    ],
  },
];

const PAYMENTS = ["VISA", "Mastercard", "UPI", "Paytm", "GPay"];

export function SiteFooter() {
  const pathname = usePathname();
  // Cart & checkout use app-style layouts with a pinned bottom bar on phones,
  // so hide the footer there on mobile (it competes with the sticky CTA).
  const hideOnMobile = pathname === "/cart" || pathname === "/checkout";
  return (
    <footer className={`border-t border-black/5 bg-[var(--paper-2)] ${hideOnMobile ? "hidden md:block" : ""}`}>
      <div className="mx-auto max-w-full px-5 pt-14 pb-8">
        <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr_1fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm text-[var(--ink-2)]">
              Style that fits your vibe. Made for college. Made for you.
            </p>
            <div className="mt-5 flex gap-2.5">
              {["instagram", "youtube", "heart", "sparkle"].map((n) => (
                <span
                  key={n}
                  className="grid h-9 w-9 place-items-center rounded-full border border-black/10 bg-white text-[var(--ink-2)] transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)]"
                >
                  <Icon name={n} className="h-4 w-4" />
                </span>
              ))}
            </div>
          </div>

          {/* Menu columns — horizontal swiper on mobile, grid cells on desktop */}
          <div className="flex snap-x gap-8 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:contents lg:overflow-visible">
            {COLUMNS.map((col) => (
              <div key={col.title} className="w-[42%] shrink-0 snap-start lg:w-auto lg:shrink">
                <h4 className="font-display text-sm font-bold text-[var(--ink)]">{col.title}</h4>
                <ul className="mt-4 space-y-2.5">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <Link href={l.href} className="text-sm text-[var(--ink-2)] transition-colors hover:text-[var(--primary)]">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-black/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-[var(--ink-soft)]">© {new Date().getFullYear()} Campus Mode. All Rights Reserved.</p>
          <div className="flex items-center gap-2">
            <span className="mr-1 text-xs font-semibold text-[var(--ink-2)]">Secure Payments</span>
            {PAYMENTS.map((p) => (
              <span key={p} className="rounded-md border border-black/10 bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[var(--ink-soft)]">
                {p}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
