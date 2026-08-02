import Link from "next/link";
import type { ReactNode } from "react";

/** Shared building blocks for marketing / policy pages — consistent, on-brand typography. */

export function PageHero({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }) {
  return (
    <header className="border-b border-black/5 bg-[var(--paper-2)]">
      <div className="mx-auto max-w-3xl px-5 py-14 text-center md:py-20">
        <nav className="mb-4 text-xs text-[var(--ink-soft)]">
          <Link href="/" className="hover:text-[var(--ink)]">Home</Link>
          <span className="mx-1.5">/</span>
          <span className="text-[var(--ink)]">{title}</span>
        </nav>
        {eyebrow && <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-[var(--primary)]">{eyebrow}</p>}
        <h1 className="font-display text-[clamp(2rem,5vw,3.2rem)] font-extrabold leading-none">{title}</h1>
        {subtitle && <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-[var(--ink-2)]">{subtitle}</p>}
      </div>
    </header>
  );
}

export function Prose({ children, updated }: { children: ReactNode; updated?: string }) {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12 md:py-16">
      {updated && <p className="mb-8 text-xs text-[var(--ink-soft)]">Last updated: {updated}</p>}
      <div className="prose-cm space-y-5 text-[15px] leading-relaxed text-[var(--ink-2)]">{children}</div>
    </div>
  );
}

export function H2({ children }: { children: ReactNode }) {
  return <h2 className="font-display pt-4 text-xl font-extrabold text-[var(--ink)] md:text-2xl">{children}</h2>;
}

export function P({ children }: { children: ReactNode }) {
  return <p>{children}</p>;
}

export function UL({ items }: { items: ReactNode[] }) {
  return (
    <ul className="space-y-2 pl-1">
      {items.map((it, i) => (
        <li key={i} className="flex gap-2.5">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--primary)]" />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}

/** A soft callout box for support / CTA blocks. */
export function Callout({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl border border-[var(--primary)]/20 bg-[var(--primary)]/[0.04] p-5 text-[14px] text-[var(--ink-2)]">{children}</div>;
}
