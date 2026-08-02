"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CATEGORY_STRIP,
  BUILDER,
  TRUST_ICONS,
  OUTFITS,
  CAMPUS_LOOKS,
  TESTIMONIALS,
  COLLEGES,
  img,
  inr,
} from "@/lib/homeContent";
import { TRENDING, NEW_ARRIVALS } from "@/lib/catalog";
import { Img, Icon, Reveal, Stars } from "./primitives";
import { ProductCard } from "@/components/site/ProductCard";

/* ---- Shared heading ----------------------------------------------------- */
function Head({ title, emoji, action }: { title: string; emoji?: string; action?: { label: string; href: string } }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <h2 className="font-display text-[clamp(1.4rem,3vw,2rem)] font-extrabold text-[var(--ink)]">
        {title} {emoji}
      </h2>
      {action && (
        <Link href={action.href} className="group inline-flex items-center gap-1 text-sm font-semibold text-[var(--primary)]">
          {action.label}
          <Icon name="arrow" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}

/* ---- 4. Category strip --------------------------------------------------- */
export function CategoryStrip() {
  return (
    <section id="categories" className="mx-auto max-w-full px-5 pt-7 pb-2">
      {/* Mobile: swipeable slider. Desktop: 6-up grid. */}
      <div className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:grid md:grid-cols-6 md:snap-none md:overflow-visible md:px-0">
        {CATEGORY_STRIP.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="group flex shrink-0 basis-[46%] snap-start items-center gap-3 rounded-2xl p-2.5 pr-3 transition-transform duration-200 hover:-translate-y-0.5 sm:basis-[31%] md:basis-auto md:shrink"
            style={{ background: c.bg }}
          >
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-white/40">
              <Img
                src={img(c.key)}
                alt={c.label}
                tone="linear-gradient(150deg,var(--primary),var(--aqua))"
                className="h-full w-full"
                imgClassName="transition-transform duration-500 group-hover:scale-110"
              />
            </div>
            <span className="flex-1 text-sm font-bold leading-tight text-[var(--ink)]">{c.label}</span>
            <Icon name="arrow" className="h-4 w-4 shrink-0 text-[var(--ink)]/55 transition-transform group-hover:translate-x-0.5" />
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ---- Flash sale strip (live countdown) ---------------------------------- */
const pad = (n: number) => String(n).padStart(2, "0");

function useCountdown() {
  const [t, setT] = useState({ d: 0, h: 0, m: 0, s: 0 });
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const end = new Date(now);
      end.setHours(23, 59, 59, 999); // ends tonight
      let diff = Math.max(0, end.getTime() - now.getTime());
      const d = Math.floor(diff / 86400000); diff -= d * 86400000;
      const h = Math.floor(diff / 3600000); diff -= h * 3600000;
      const m = Math.floor(diff / 60000); diff -= m * 60000;
      const s = Math.floor(diff / 1000);
      setT({ d, h, m, s });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return t;
}

export function FlashSale() {
  const t = useCountdown();
  const units = [
    { v: t.d, label: "Days" },
    { v: t.h, label: "Hrs" },
    { v: t.m, label: "Mins" },
    { v: t.s, label: "Secs" },
  ];
  return (
    <section id="flash-sale" className="w-full pt-2 pb-2 md:px-5">
      <div
        className="relative flex items-center justify-between gap-3 overflow-hidden rounded-none px-4 py-3 text-white shadow-lg md:flex-wrap md:gap-x-8 md:gap-y-5 md:rounded-2xl md:px-8 md:py-4"
        style={{ background: "linear-gradient(95deg,#f2426f 0%,#f56b53 42%,#f79a3c 74%,#f9c23c 100%)" }}
      >
        {/* Message — one line on mobile */}
        <div className="flex min-w-0 items-center gap-2.5 md:gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/20 md:h-11 md:w-11 md:rounded-xl">
            <Icon name="bolt" className="h-5 w-5 md:h-6 md:w-6" />
          </span>
          <div className="min-w-0 leading-none">
            <span className="hidden text-[11px] font-bold uppercase tracking-[0.18em] text-white/85 md:block">Flash Sale</span>
            <div className="flex items-baseline gap-2.5 md:mt-1">
              <span className="whitespace-nowrap font-display text-xl font-extrabold md:text-3xl">UP TO 50% OFF</span>
              <span className="hidden font-display text-lg italic text-yellow-100 md:inline">Ends Tonight!</span>
            </div>
          </div>
        </div>

        {/* Countdown — desktop only */}
        <div className="hidden items-center gap-3 md:flex">
          {units.map((u, i) => (
            <div key={u.label} className="flex items-center gap-3">
              <div className="text-center">
                <div className="font-display text-2xl font-extrabold tabular-nums md:text-[28px]">{pad(u.v)}</div>
                <div className="text-[10px] font-semibold uppercase tracking-wide text-white/75">{u.label}</div>
              </div>
              {i < units.length - 1 && <span className="text-2xl font-light text-white/40">|</span>}
            </div>
          ))}
        </div>

        {/* CTA */}
        <Link
          href="/sale"
          className="group inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[var(--ink)] px-4 py-2.5 text-[13px] font-bold text-white transition-transform hover:-translate-y-0.5 md:gap-2 md:px-6 md:py-3 md:text-sm"
        >
          <span className="md:hidden">Shop Now</span>
          <span className="hidden md:inline">Shop The Sale</span>
          <Icon name="arrow" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </section>
  );
}

/* ---- Best Sellers / Outfit Inspiration / New Arrivals (3-col band) ------- */
function ColHead({ title, href, accent }: { title: string; href: string; accent: string }) {
  return (
    <div className="mb-3.5 flex items-start justify-between">
      <div>
        <h2 className="font-display text-lg font-extrabold text-[var(--ink)]">{title}</h2>
        <span className="mt-1.5 block h-1 w-8 rounded-full" style={{ background: accent }} />
      </div>
      <Link href={href} className="group inline-flex items-center gap-1 text-xs font-semibold text-[var(--primary)]">
        View All <Icon name="arrow" className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </div>
  );
}

const scrollRow = "flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

export function ShowcaseRow() {
  return (
    <section id="showcase" className="w-full pt-2 pb-2 md:px-5">
      <div className="grid gap-3 md:gap-6 lg:grid-cols-[1.4fr_1fr_1.15fr]">
        {/* Best Sellers */}
        <Reveal className="min-w-0 border-y border-black/5 bg-white p-4 shadow-sm md:rounded-2xl md:border">
          <ColHead title="Best Sellers" href="/shop" accent="linear-gradient(90deg,var(--primary),#a855f7)" />
          <div className={scrollRow}>
            {TRENDING.map((p) => (
              <div key={p.id} className="w-[150px] shrink-0">
                <ProductCard p={p} />
              </div>
            ))}
          </div>
        </Reveal>

        {/* Outfit Inspiration */}
        <Reveal delay={80} className="min-w-0 border-y border-black/5 bg-white p-4 shadow-sm md:rounded-2xl md:border">
          <ColHead title="Outfit Inspiration" href="/shop" accent="linear-gradient(90deg,var(--aqua),#0891b2)" />
          <div className="grid grid-cols-3 gap-2">
            {OUTFITS.map((o) => (
              <Link key={o.label} href="/shop" className="group relative block aspect-[3/4] overflow-hidden rounded-xl">
                <Img src={img(o.key)} alt={o.label} tone="linear-gradient(150deg,var(--primary),var(--aqua))" className="absolute inset-0 h-full w-full" imgClassName="transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                <span className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-white/85 text-[var(--ink)]">
                  <Icon name="heart" className="h-3 w-3" />
                </span>
                <span className="absolute inset-x-0 bottom-0 p-2 text-[11px] font-bold leading-tight text-white">{o.label}</span>
              </Link>
            ))}
          </div>
        </Reveal>

        {/* New Arrivals */}
        <Reveal delay={160} className="min-w-0 border-y border-black/5 bg-white p-4 shadow-sm md:rounded-2xl md:border">
          <ColHead title="New Arrivals" href="/shop" accent="linear-gradient(90deg,var(--mint),#10b981)" />
          <div className={scrollRow}>
            {NEW_ARRIVALS.map((p) => (
              <div key={p.id} className="w-[150px] shrink-0">
                <ProductCard p={p} />
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---- 5. Custom T-Shirt Builder (MAIN FOCUS) ----------------------------- */
const TEAL = "#14b8a6";
// One tee silhouette per fit — the canvas swaps shape when a style is picked.
const TEE_VARIANTS = [
  { path: "M130,40 C138,62 182,62 190,40 L212,46 L266,116 L214,140 L222,316 C185,326 135,326 98,316 L106,140 L54,116 L108,46 Z", pocket: false }, // Regular
  { path: "M122,40 C132,64 188,64 198,40 L226,48 L284,108 L228,136 L234,328 C185,340 135,340 86,328 L92,136 L36,108 L94,48 Z", pocket: false }, // Oversized (boxy)
  { path: "M114,46 C128,74 192,74 206,46 L242,58 L290,118 L236,160 L240,322 C185,336 135,336 80,322 L84,160 L30,118 L78,58 Z", pocket: false }, // Drop Shoulder
  { path: "M130,40 C138,62 182,62 190,40 L212,46 L266,116 L214,140 L222,316 C185,326 135,326 98,316 L106,140 L54,116 L108,46 Z", pocket: true }, // Pocket Tee
];

function isDarkColor(hex: string) {
  const c = hex.replace("#", "");
  const r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b < 150;
}

function TeeShape({ variant = 0, fill, className = "", stroke = "rgba(0,0,0,0.1)" }: { variant?: number; fill: string; className?: string; stroke?: string }) {
  const v = TEE_VARIANTS[variant];
  const pocketStroke = isDarkColor(fill) ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.22)";
  return (
    <svg viewBox="0 0 320 340" className={className} aria-hidden>
      <path d={v.path} fill={fill} stroke={stroke} strokeWidth="4" strokeLinejoin="round" />
      {v.pocket && (
        <>
          <path d="M118,150 h32 v28 a4,4 0 0 1 -4,4 h-24 a4,4 0 0 1 -4,-4 z" fill="none" stroke={pocketStroke} strokeWidth="3" />
          <path d="M118,150 l16,9 l16,-9" fill="none" stroke={pocketStroke} strokeWidth="3" />
        </>
      )}
    </svg>
  );
}

function TeePreview({ color, variant, text, setText }: { color: string; variant: number; text: string; setText: (v: string) => void }) {
  const dark = isDarkColor(color);
  const pocket = TEE_VARIANTS[variant].pocket;
  const rows = Math.max(1, Math.min(4, text.split("\n").length));
  return (
    <div className="relative mx-auto w-[82%]" style={{ filter: "drop-shadow(0 20px 26px rgba(35,20,70,0.16))" }}>
      <TeeShape variant={variant} fill={color} className="w-full" />
      {/* Editable print (hidden on the pocket tee, which shows its pocket instead) */}
      {!pocket && (
        <div className="absolute left-1/2 top-[49%] w-[52%] -translate-x-1/2 -translate-y-1/2">
          <div className="relative">
            <div className="absolute -inset-x-4 -inset-y-4 -rotate-3 bg-[var(--primary-soft)]" style={{ borderRadius: "58% 42% 62% 38% / 56% 46% 54% 44%" }} />
            <div className="absolute -right-5 -top-3 h-2 w-2 rounded-full bg-[var(--primary-soft)]" />
            <div className="absolute -left-6 top-3 h-1.5 w-1.5 rounded-full bg-[var(--primary-soft)]" />
            <div className="absolute -bottom-4 left-2 h-1.5 w-1.5 rounded-full bg-[var(--primary-soft)]" />
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={rows}
              spellCheck={false}
              maxLength={40}
              aria-label="Edit your t-shirt text"
              className="relative block w-full resize-none cursor-text rounded-md border-0 bg-transparent text-center text-[clamp(17px,2.3vw,32px)] uppercase leading-[0.92] tracking-wide outline-none ring-2 ring-transparent transition hover:ring-[var(--primary)]/30 focus:ring-[var(--primary)]/60"
              style={{ fontFamily: "var(--font-print), sans-serif", color: dark ? "#fff" : "#161018", WebkitTextStroke: dark ? "0" : "0.7px rgba(255,255,255,0.5)" }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

const FEATURE_ICONS = ["text", "upload", "palette", "sparkle", "heart", "bolt"];
const FEATURE_COLORS = [
  "linear-gradient(135deg,var(--primary),#a855f7)",
  "linear-gradient(135deg,#14b8a6,#0d9488)",
  "linear-gradient(135deg,var(--accent),#f97316)",
  "linear-gradient(135deg,#ec4899,#db2777)",
  "linear-gradient(135deg,var(--info),#2563eb)",
  "linear-gradient(135deg,#22c55e,#16a34a)",
];

export function CustomBuilder() {
  const [style, setStyle] = useState(0);
  const [fabric, setFabric] = useState(0);
  const [color, setColor] = useState(BUILDER.colors[1]);
  const [print, setPrint] = useState("GOOD\nVIBES\nONLY");

  const price = BUILDER.basePrice + BUILDER.styles[style].add + BUILDER.fabrics[fabric].add;

  return (
    <section id="custom-builder" className="mx-auto max-w-full px-5 pt-2 pb-12">
      <Reveal>
        <div className="relative overflow-hidden rounded-[2rem] border border-black/5 bg-gradient-to-br from-[#efe9fb] via-white to-[#eef7f6] p-5 shadow-[var(--shadow)] md:p-8">
          {/* background texture + glow blobs */}
          <div
            className="pointer-events-none absolute inset-0 z-0"
            style={{ backgroundImage: "radial-gradient(rgba(124,58,237,0.08) 1.2px, transparent 1.2px)", backgroundSize: "22px 22px" }}
          />
          <div className="pointer-events-none absolute -left-16 -top-20 z-0 h-72 w-72 rounded-full bg-[var(--primary)] opacity-[0.12] blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 right-0 z-0 h-72 w-72 rounded-full bg-[#14b8a6] opacity-[0.12] blur-3xl" />

          <div className="relative z-10 grid gap-6 lg:grid-cols-[1fr_1.15fr_1fr]">
          {/* Left copy */}
          <div>
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white"
              style={{ background: `linear-gradient(90deg,${TEAL},#0d9488)`, boxShadow: "0 8px 18px -6px rgba(20,184,166,0.65)" }}
            >
              <Icon name="sparkle" className="h-3.5 w-3.5" /> Make it Yours
            </span>
            <h2 className="font-display mt-3 text-[clamp(1.7rem,3.4vw,2.5rem)] font-extrabold leading-[1.02] text-[var(--ink)]">
              Custom<br /><span className="text-[var(--primary)]">T-Shirt Design</span>
            </h2>
            <p className="mt-2 text-sm font-medium text-[var(--ink-2)]">Create a t-shirt that&apos;s 100% YOU!</p>
            <ul className="mt-5 space-y-1.5">
              {BUILDER.features.map((f, i) => (
                <li
                  key={f}
                  className="group flex items-center gap-3 rounded-xl px-2 py-1.5 text-sm font-semibold text-[var(--ink-2)] transition-colors hover:bg-white/70"
                >
                  <span
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-white shadow-sm transition-transform group-hover:scale-110"
                    style={{ background: FEATURE_COLORS[i % FEATURE_COLORS.length] }}
                  >
                    <Icon name={FEATURE_ICONS[i % FEATURE_ICONS.length]} className="h-3.5 w-3.5" />
                  </span>
                  {f}
                </li>
              ))}
            </ul>
            <Link href="/customize" className="sheen mt-6 inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-[var(--primary)]/25 transition-transform hover:-translate-y-0.5" style={{ background: "var(--grad-hero)" }}>
              Start Designing <Icon name="arrow" className="h-4 w-4" />
            </Link>
          </div>

          {/* Center preview */}
          <div className="flex items-center gap-4">
            <div className="flex flex-col gap-1 rounded-2xl border border-black/5 bg-white/95 p-2 shadow-[0_14px_30px_-10px_rgba(31,41,55,0.28)] backdrop-blur">
              {BUILDER.tools.map((t) => (
                <button key={t.label} className="flex w-14 flex-col items-center gap-0.5 rounded-xl py-2 text-[var(--ink-soft)] transition-colors hover:bg-[var(--paper-2)] hover:text-[var(--primary)]">
                  <Icon name={t.icon} className="h-4 w-4" />
                  <span className="text-[9px] font-semibold">{t.label}</span>
                </button>
              ))}
            </div>
            <div className="relative flex-1">
              <div
                className="relative flex aspect-square items-center justify-center overflow-hidden rounded-2xl border border-black/5 p-2 shadow-inner"
                style={{ background: "radial-gradient(circle at 50% 34%, #ffffff 0%, #eee7fb 58%, #e2d7f5 100%)" }}
              >
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{ backgroundImage: "radial-gradient(rgba(124,58,237,0.10) 1.3px, transparent 1.3px)", backgroundSize: "15px 15px" }}
                />
                <div className="relative z-10 flex w-full items-center justify-center">
                  <TeePreview color={color} variant={style} text={print} setText={setPrint} />
                </div>
              </div>
              {!TEE_VARIANTS[style].pocket && (
                <p className="mt-1.5 text-center text-[10px] font-medium text-[var(--ink-soft)]">
                  <Icon name="text" className="mr-1 inline h-3 w-3 align-[-2px] text-[var(--primary)]" /> Tap the text on the tee to edit
                </p>
              )}
              {/* colour dots */}
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2 rounded-full bg-white/90 px-3 py-2 shadow-sm">
                {BUILDER.colors.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    aria-label="colour"
                    className={`h-5 w-5 rounded-full ring-2 ring-offset-2 transition-transform hover:scale-110 ${color === c ? "ring-[var(--ink)]" : "ring-black/10"}`}
                    style={{ background: c }}
                  />
                ))}
                <span className="grid h-5 w-5 place-items-center rounded-full border border-dashed border-black/25 text-[var(--ink-soft)]">
                  <Icon name="plus" className="h-3 w-3" />
                </span>
              </div>
            </div>
          </div>

          {/* Right options */}
          <div className="relative rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: TEAL }}>Choose Your Style</p>
            <div className="mt-2 grid grid-cols-4 gap-1.5">
              {BUILDER.styles.map((s, i) => {
                const on = style === i;
                return (
                  <button
                    key={s.name}
                    onClick={() => setStyle(i)}
                    className="flex flex-col items-center gap-1 rounded-xl border p-2 text-[9px] font-semibold leading-tight transition-colors"
                    style={{
                      borderColor: on ? TEAL : "rgba(0,0,0,0.1)",
                      background: on ? "rgba(20,184,166,0.06)" : "#fff",
                      color: on ? TEAL : "var(--ink-soft)",
                    }}
                  >
                    <TeeShape variant={i} fill="#eef0f3" stroke="rgba(0,0,0,0.08)" className="h-8 w-8" />
                    {s.name}
                  </button>
                );
              })}
            </div>
            <p className="mt-4 text-[11px] font-bold uppercase tracking-wide" style={{ color: TEAL }}>Choose Your Fabric</p>
            <div className="mt-2 grid grid-cols-4 gap-1.5">
              {BUILDER.fabrics.map((f, i) => {
                const on = fabric === i;
                return (
                  <button
                    key={f.gsm}
                    onClick={() => setFabric(i)}
                    className="rounded-xl border p-2 text-center transition-colors"
                    style={{ borderColor: on ? TEAL : "rgba(0,0,0,0.1)", background: on ? "rgba(20,184,166,0.06)" : "#fff" }}
                  >
                    <span className="block text-[10px] font-bold text-[var(--ink)]">{f.gsm}</span>
                    <span className="block text-[8px] text-[var(--ink-soft)]">{f.note}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-5 flex items-center justify-between">
              <div>
                <span className="font-display text-2xl font-extrabold text-[var(--primary)]">{inr(price)}</span>
                <span className="block text-[10px] text-[var(--ink-soft)]">Only · from ₹399</span>
              </div>
              <Link
                href="/customize"
                className="sheen inline-flex items-center gap-1.5 rounded-full px-6 py-3 text-sm font-bold text-white shadow-md transition-transform hover:-translate-y-0.5"
                style={{ background: `linear-gradient(90deg,${TEAL},#0d9488)` }}
              >
                Add to Cart <Icon name="arrow" className="h-4 w-4" />
              </Link>
            </div>
            {/* It's that easy! */}
            <span className="pointer-events-none absolute -bottom-9 right-2 font-display text-lg italic text-[var(--primary)]">
              It&apos;s that easy!
              <Icon name="arrow" className="ml-1 inline h-4 w-4 -rotate-45" />
            </span>
          </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* ---- 6. Trust icons ----------------------------------------------------- */
export function TrustIcons() {
  return (
    <section id="trust" className="w-full pt-1 pb-4 md:px-5">
      <div className="bg-[#f1ecfb] px-4 py-5 md:rounded-2xl md:px-6 md:py-6">
        {/* Mobile: one-line horizontal swiper. Desktop: 5-up grid. */}
        <div className="-mx-4 flex snap-x snap-mandatory items-center gap-5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:grid md:grid-cols-3 md:gap-x-4 md:gap-y-6 md:overflow-visible md:px-0 md:pb-0 lg:grid-cols-5">
          {TRUST_ICONS.map((t) => (
            <div key={t.title} className="flex shrink-0 snap-start items-center gap-3 md:shrink md:justify-center">
              <Icon name={t.icon} className="h-8 w-8 shrink-0 text-[var(--primary)]" />
              <span className="whitespace-nowrap md:whitespace-normal">
                <span className="block text-[13px] font-bold leading-tight text-[var(--ink)]">{t.title}</span>
                <span className="block text-xs text-[var(--ink-soft)]">{t.sub}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---- Horizontal product row -------------------------------------------- */
function ProductRow({ items }: { items: typeof TRENDING }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {items.map((p) => (
        <div key={p.id} className="w-[46%] shrink-0 sm:w-[30%] lg:w-[calc((100%-4rem)/5)]">
          <ProductCard p={p} />
        </div>
      ))}
    </div>
  );
}

/* ---- 7. Trending -------------------------------------------------------- */
export function Trending() {
  return (
    <section id="trending" className="mx-auto max-w-full px-5 pt-6 pb-2">
      <Reveal>
        <Head title="Trending Now" emoji="🔥" action={{ label: "View All", href: "/shop" }} />
        <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-6">
          {TRENDING.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
      </Reveal>
    </section>
  );
}

/* ---- 8. Outfit inspiration --------------------------------------------- */
export function CampusLooks() {
  return (
    <section id="campus-looks" className="mx-auto max-w-full px-5 pt-2 pb-8">
      <Reveal>
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-[clamp(1.4rem,3vw,2rem)] font-extrabold text-[var(--ink)]">Campus Looks</h2>
            <p className="mt-0.5 text-sm text-[var(--ink-soft)]">Style Inspo for Your Everyday Life</p>
          </div>
          <Link href="/shop" className="group inline-flex items-center gap-1 text-sm font-semibold text-[var(--primary)]">
            View All <Icon name="arrow" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {CAMPUS_LOOKS.map((o) => (
            <Link key={o.label} href="/shop" className="group relative block aspect-[3/4] overflow-hidden rounded-2xl border border-black/5">
              <Img src={img(o.key)} alt={o.label} tone="linear-gradient(150deg,var(--primary),var(--aqua))" label={o.label} className="absolute inset-0 h-full w-full" imgClassName="transition-transform duration-500 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
              <span className="absolute right-2.5 top-2.5 grid h-7 w-7 place-items-center rounded-full bg-white/85 text-[var(--ink)] backdrop-blur transition-colors group-hover:text-[var(--coral)]">
                <Icon name="heart" className="h-3.5 w-3.5" />
              </span>
              <div className="absolute inset-x-0 bottom-0 p-3">
                <p className="font-display text-[15px] font-bold leading-tight text-white">{o.label}</p>
                <p className="text-[11px] text-white/80">{o.sub}</p>
              </div>
            </Link>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

/* ---- 9. New arrivals ---------------------------------------------------- */
export function NewArrivals() {
  return (
    <section className="mx-auto max-w-full px-5 py-10">
      <Reveal>
        <Head title="New Arrivals" emoji="✨" action={{ label: "View All", href: "/shop" }} />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {NEW_ARRIVALS.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
      </Reveal>
    </section>
  );
}

/* ---- 10. Testimonials --------------------------------------------------- */
export function Testimonials() {
  const perPage = 3;
  const pages = Math.ceil(TESTIMONIALS.length / perPage);
  const [page, setPage] = useState(0);
  const go = (p: number) => setPage((p + pages) % pages);
  const shown = TESTIMONIALS.slice(page * perPage, page * perPage + perPage);

  return (
    <section id="testimonials" className="mx-auto max-w-full px-5 py-10">
      <Reveal>
        <div className="mb-6 flex items-center justify-between gap-4">
          <h2 className="font-display text-[clamp(1.4rem,3vw,2rem)] font-extrabold text-[var(--ink)]">Loved by Students ❤️</h2>
          <div className="flex items-center gap-2">
            <button onClick={() => go(page - 1)} aria-label="Previous" className="grid h-9 w-9 place-items-center rounded-full border border-black/10 bg-white text-[var(--ink)] shadow-sm transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)]">
              <Icon name="chevron-left" className="h-4 w-4" />
            </button>
            <button onClick={() => go(page + 1)} aria-label="Next" className="grid h-9 w-9 place-items-center rounded-full border border-black/10 bg-white text-[var(--ink)] shadow-sm transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)]">
              <Icon name="chevron-right" className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div key={page} className="grid animate-[fadeSlideIn_0.35s_ease] gap-4 md:grid-cols-3">
          {shown.map((t) => (
            <div key={t.name} className="group relative overflow-hidden rounded-2xl border border-black/5 bg-white p-5 shadow-[0_14px_34px_-22px_rgba(31,41,55,0.5)] transition-transform hover:-translate-y-1">
              <span className="pointer-events-none absolute -right-1 -top-3 font-display text-[70px] leading-none text-[var(--primary)]/10">&rdquo;</span>
              <div className="relative flex items-center gap-3">
                <div className="rounded-full p-[2px]" style={{ background: "var(--grad-hero)" }}>
                  <Img src={img(t.key)} alt={t.name} tone="linear-gradient(150deg,var(--primary),var(--aqua))" className="h-12 w-12 rounded-full ring-2 ring-white" />
                </div>
                <div>
                  <p className="flex items-center gap-1 text-sm font-bold text-[var(--ink)]">
                    {t.name}
                    <span className="grid h-3.5 w-3.5 place-items-center rounded-full bg-[var(--mint)] text-white">
                      <Icon name="check" className="h-2.5 w-2.5" />
                    </span>
                  </p>
                  <p className="text-xs text-[var(--ink-soft)]">{t.college}</p>
                </div>
              </div>
              <div className="relative mt-3"><Stars rating={5} /></div>
              <p className="relative mt-2 text-sm leading-relaxed text-[var(--ink-2)]">&ldquo;{t.quote}&rdquo;</p>
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-center gap-1.5">
          {Array.from({ length: pages }).map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i)}
              aria-label={`Page ${i + 1}`}
              className={`h-2 rounded-full transition-all ${i === page ? "w-6 bg-[var(--primary)]" : "w-2 bg-black/15 hover:bg-black/30"}`}
            />
          ))}
        </div>
      </Reveal>
    </section>
  );
}

/* ---- 11. Trusted colleges ---------------------------------------------- */
export function Colleges() {
  return (
    <section id="colleges" className="w-full pt-2 pb-6 md:px-5">
      <div
        className="relative overflow-hidden px-5 py-8 text-white shadow-[0_18px_40px_-18px_rgba(124,58,237,0.55)] md:rounded-[1.6rem]"
        style={{ background: "linear-gradient(120deg,var(--primary-2) 0%,var(--primary) 55%,var(--primary) 100%)" }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.10) 1.2px, transparent 1.2px)", backgroundSize: "20px 20px" }}
        />
        <p className="relative text-center text-xs font-bold uppercase tracking-[0.22em] text-white/85">
          Trusted &amp; loved by students from top colleges
        </p>
        {/* Mobile: one-line swiper. Desktop: 6-up grid. */}
        <div className="relative mt-7 -mx-5 flex snap-x snap-mandatory items-stretch gap-3 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0 md:pb-0 lg:grid-cols-6">
          {COLLEGES.map((c) => (
            <div
              key={c.name}
              className="flex h-[74px] w-[136px] shrink-0 snap-start items-center justify-center rounded-2xl bg-white px-4 shadow-[0_10px_24px_-10px_rgba(0,0,0,0.45)] transition-transform hover:-translate-y-0.5 md:w-auto md:shrink"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.logo} alt={`${c.name} logo`} className="max-h-[46px] max-w-full object-contain" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---- 12. Newsletter ----------------------------------------------------- */
export function Newsletter() {
  return (
    <section id="newsletter" className="mx-auto max-w-full px-5 py-10">
      <Reveal>
        <div className="relative flex min-h-[150px] items-center overflow-hidden rounded-[1.5rem] text-white shadow-[0_18px_44px_-20px_rgba(124,58,237,0.5)]" style={{ background: "var(--grad-band)" }}>
          {/* decorative sparkles */}
          <Icon name="sparkle" className="pointer-events-none absolute left-[42%] top-4 h-4 w-4 text-white/25" />
          <Icon name="sparkle" className="pointer-events-none absolute left-[58%] bottom-5 h-3 w-3 text-white/25" />
          <Icon name="sparkle" className="pointer-events-none absolute right-[34%] top-6 h-3 w-3 text-white/20" />

          {/* content */}
          <div className="relative z-10 flex flex-1 flex-wrap items-center gap-x-8 gap-y-4 px-6 py-6 md:px-10 lg:pr-[230px]">
            <div className="min-w-[220px] flex-1">
              <h2 className="font-display flex items-center gap-2 text-[clamp(1.3rem,2.6vw,1.9rem)] font-extrabold uppercase leading-tight">
                Join the Campus Club! <Icon name="cap" className="h-6 w-6 shrink-0" />
              </h2>
              <p className="mt-1 text-sm text-white/85">Get exclusive offers, early access &amp; new drops.</p>
            </div>
            <form onSubmit={(e) => e.preventDefault()} className="flex shrink-0 items-center gap-2 rounded-full bg-white p-1.5 pl-5 shadow-lg">
              <input type="email" required placeholder="Enter your email" className="w-40 bg-transparent text-sm text-[var(--ink)] outline-none placeholder:text-[var(--ink-soft)] sm:w-52" />
              <button type="submit" className="shrink-0 rounded-full bg-[var(--primary)] px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-white transition-transform hover:-translate-y-0.5">
                Subscribe
              </button>
            </form>
          </div>

          {/* students image — absolute, fixed 200px, anchored bottom-right */}
          <div className="pointer-events-none absolute top-0 bottom-0 right-6 hidden h-[200px] w-[200px] lg:block">
            <Img src={img("newsletter-couple")} alt="Students wearing Campus Mode back-print tees" tone="transparent" className="h-full w-full" imgClassName="!object-contain object-bottom" />
          </div>
        </div>
      </Reveal>
    </section>
  );
}
