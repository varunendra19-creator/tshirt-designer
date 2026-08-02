"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { NAV, PROMO } from "@/lib/homeContent";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useWishlist } from "@/lib/wishlist";
import { Icon } from "@/components/home/primitives";

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className="flex shrink-0 flex-col leading-none">
      <span className={`font-display text-[22px] font-extrabold tracking-tight ${light ? "text-white" : "text-[var(--ink)]"}`}>
        Campus
      </span>
      <span className="font-display -mt-1.5 pl-8 text-[17px] font-semibold italic text-[var(--primary)]">
        Mode
      </span>
    </Link>
  );
}

function PromoBar() {
  return (
    <div className="text-white" style={{ background: "var(--grad-band)" }}>
      <div className="mx-auto flex max-w-full items-center justify-between gap-3 px-5 py-1.5 text-[11px] font-medium">
        <span className="flex items-center gap-1.5">
          <Icon name="sparkle" className="h-3.5 w-3.5" />
          <span className="truncate">{PROMO.shipping}</span>
        </span>
        <span className="flex items-center gap-3">
          <span className="hidden sm:inline">{PROMO.codeText}</span>
          <span className="hidden items-center gap-2 md:flex">
            {["instagram", "youtube", "heart"].map((n) => (
              <Icon key={n} name={n} className="h-3.5 w-3.5 opacity-90" />
            ))}
          </span>
        </span>
      </div>
    </div>
  );
}

export function SiteHeader() {
  const [menu, setMenu] = useState(false);
  const [q, setQ] = useState("");
  const router = useRouter();
  const { count } = useCart();
  const { user } = useAuth();
  const wishCount = useWishlist().length;

  const search = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(q.trim() ? `/shop?q=${encodeURIComponent(q.trim())}` : "/shop");
    setMenu(false);
  };

  return (
    <header className="sticky top-0 z-50">
      <PromoBar />
      <div className="border-b border-black/5 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-full items-center gap-4 px-5 py-3">
          <Logo />

          <nav className="ml-3 hidden items-center gap-0.5 lg:flex">
            {NAV.map((l) => (
              <Link
                key={l.label}
                href={l.href}
                className={`group relative rounded-full px-3 py-2 text-sm font-medium transition-colors ${
                  l.hot ? "text-[var(--accent)]" : l.star ? "text-[var(--primary)]" : "text-[var(--ink-2)] hover:text-[var(--ink)]"
                }`}
              >
                {l.label}
                <span className="absolute inset-x-3 -bottom-0.5 h-[2px] origin-left scale-x-0 rounded-full bg-[var(--primary)] transition-transform duration-300 group-hover:scale-x-100" />
              </Link>
            ))}
          </nav>

          <form
            onSubmit={search}
            className="ml-auto hidden items-center gap-2 rounded-full border border-black/10 bg-[var(--paper-2)] px-3.5 py-2 md:flex md:w-44 lg:w-56"
          >
            <Icon name="search" className="h-4 w-4 text-[var(--ink-soft)]" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search for products…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--ink-soft)]"
            />
          </form>

          <div className="ml-auto flex items-center gap-0.5 md:ml-0">
            <Link href="/wishlist" aria-label="Wishlist" className="relative grid h-10 w-10 place-items-center rounded-full text-[var(--ink)] hover:bg-black/5">
              <Icon name="heart" className="h-5 w-5" style={wishCount ? { fill: "var(--coral)", color: "var(--coral)" } : undefined} />
              {wishCount > 0 && (
                <span className="absolute right-0.5 top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-[var(--coral)] px-1 text-[10px] font-bold text-white">
                  {wishCount}
                </span>
              )}
            </Link>
            <Link href="/account" aria-label="Account" className="relative hidden h-10 w-10 place-items-center rounded-full text-[var(--ink)] hover:bg-black/5 sm:grid">
              <Icon name="user" className="h-5 w-5" />
              {user && <span className="absolute right-2 top-2 h-2 w-2 rounded-full ring-2 ring-white" style={{ background: "var(--mint)" }} />}
            </Link>
            <Link href="/cart" aria-label="Cart" className="relative grid h-10 w-10 place-items-center rounded-full text-[var(--ink)] hover:bg-black/5">
              <Icon name="cart" className="h-5 w-5" />
              {count > 0 && (
                <span className="absolute right-0.5 top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-[var(--primary)] px-1 text-[10px] font-bold text-white">
                  {count}
                </span>
              )}
            </Link>
            <button onClick={() => setMenu((v) => !v)} className="ml-1 grid h-10 w-10 place-items-center rounded-full hover:bg-black/5 lg:hidden" aria-label="Menu">
              <Icon name={menu ? "close" : "menu"} className="h-5 w-5" />
            </button>
          </div>
        </div>

        {menu && (
          <div className="border-t border-black/10 bg-white px-5 py-3 lg:hidden">
            <form onSubmit={search} className="mb-2 flex items-center gap-2 rounded-full border border-black/10 bg-[var(--paper-2)] px-3.5 py-2">
              <Icon name="search" className="h-4 w-4 text-[var(--ink-soft)]" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search for products…" className="w-full bg-transparent text-sm outline-none" />
            </form>
            <nav className="grid grid-cols-2">
              {NAV.map((l) => (
                <Link
                  key={l.label}
                  href={l.href}
                  onClick={() => setMenu(false)}
                  className={`border-b border-black/5 py-3 text-sm font-medium ${l.hot ? "text-[var(--accent)]" : l.star ? "text-[var(--primary)]" : "text-[var(--ink-2)]"}`}
                >
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
