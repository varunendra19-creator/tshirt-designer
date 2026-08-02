"use client";

import Link from "next/link";
import { img, HERO_TRUST } from "@/lib/homeContent";
import { Img, Icon } from "./primitives";

const NAVY = "#1e1b4b";

const CHIP_STYLES = [
  { bg: "rgba(124,58,237,0.12)", fg: "#6d28d9" }, // violet
  { bg: "rgba(6,182,212,0.14)", fg: "#0891b2" }, // cyan
  { bg: "rgba(16,185,129,0.14)", fg: "#059669" }, // mint
];

export function Hero() {
  return (
    <section>
      <div
        className="relative overflow-hidden min-h-[420px] md:min-h-[500px]"
        style={{ background: "linear-gradient(160deg,#e9dff7 0%,#f2ecfb 48%,#f9f6fe 78%,#ffffff 100%)" }}
      >
        {/* Desktop image — layered above the gradient with a straight diagonal (slanted) edge */}
        <div
          className="absolute inset-y-0 right-0 z-0 hidden w-[64%] lg:block"
          style={{ clipPath: "polygon(16% 0, 100% 0, 100% 100%, 0 100%)" }}
        >
          <Img
            src={img("hero-students")}
            alt="Happy college students wearing Campus Mode"
            tone="linear-gradient(150deg,#7c3aed,#6d28d9 55%,#22d3ee)"
            className="h-full w-full"
            imgClassName="object-[center_20%]"
            priority
          />
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-xl px-6 py-10 md:px-12 md:py-14">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-white shadow-md shadow-[var(--primary)]/25"
            style={{ background: "linear-gradient(90deg,#7c3aed,#22d3ee)" }}
          >
            <Icon name="sparkle" className="h-3.5 w-3.5" />
            New Semester Drop
            <span className="ml-1 rounded-full bg-white/25 px-2 py-0.5 text-[10px]">Extra 10% Off</span>
          </span>

          <h1 className="font-display mt-4 text-[clamp(2.4rem,5.4vw,4.1rem)] font-extrabold leading-[1.02] tracking-tight" style={{ color: NAVY }}>
            Level Up Your
            <br />
            Campus Style
          </h1>
          <span className="mt-3 block h-1.5 w-36 rounded-full" style={{ background: "linear-gradient(90deg,#7c3aed,#22d3ee)" }} />

          <p className="mt-5 max-w-md text-[17px] font-medium leading-relaxed text-[#39365a]">
            Shop <strong className="font-bold text-[var(--primary)]">oversized tees, hoodies &amp; custom-printed designs</strong> made
            for college life — bio-washed 100% cotton, student-friendly prices &amp; fast delivery across India.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              href="/shop"
              className="group inline-flex items-center gap-2 rounded-full bg-[var(--primary)] px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[var(--primary)]/25 transition-transform hover:-translate-y-0.5"
            >
              Shop Now
              <Icon name="arrow" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 rounded-full border-2 border-[var(--primary)]/25 bg-white px-7 py-3.5 text-sm font-semibold transition-colors hover:border-[var(--primary)]"
              style={{ color: NAVY }}
            >
              Explore Collection
            </Link>
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-2">
            {HERO_TRUST.map((t, i) => {
              const s = CHIP_STYLES[i % CHIP_STYLES.length];
              return (
                <span
                  key={t.text}
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold"
                  style={{ background: s.bg, color: s.fg }}
                >
                  <Icon name={t.icon} className="h-3.5 w-3.5" />
                  {t.text}
                </span>
              );
            })}
          </div>

          {/* Mobile image */}
          <div className="mt-8 lg:hidden">
            <Img
              src={img("hero-students")}
              alt="Happy college students wearing Campus Mode"
              tone="linear-gradient(150deg,#7c3aed,#22d3ee)"
              className="aspect-[16/10] w-full rounded-2xl border border-white"
              priority
            />
          </div>
        </div>

        {/* Floating student offer card */}
        <div className="absolute right-4 top-1/2 z-20 hidden w-36 -translate-y-1/2 rounded-2xl border border-black/5 bg-white/95 p-4 text-center shadow-[var(--shadow)] backdrop-blur lg:block xl:right-8">
          <p className="text-[11px] font-medium text-[var(--ink-2)]">Students Get Extra</p>
          <p className="font-display mt-0.5 text-3xl font-extrabold leading-none text-[var(--primary)]">
            10<span className="text-xl">%</span>
          </p>
          <p className="font-display text-sm font-bold" style={{ color: NAVY }}>OFF</p>
          <p className="mt-0.5 text-[10px] text-[var(--ink-soft)]">On All Orders</p>
          <span className="mt-2 inline-block rounded-md bg-[var(--primary)] px-2 py-1 text-[10px] font-bold text-white">
            CODE: CAMPUS10
          </span>
        </div>
      </div>
    </section>
  );
}
