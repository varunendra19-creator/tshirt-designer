"use client";

import { useEffect, useRef, useState } from "react";

/* --------------------------------------------------------------------------
   Img — renders a real image once it exists, otherwise a tasteful gradient
   placeholder with a garment glyph. This is what lets the page look finished
   before scripts/generate-images.mjs has run: the <img> onError swaps to the
   placeholder. Once /generated/*.jpg exist, the photos take over automatically.
   -------------------------------------------------------------------------- */
export function Img({
  src,
  alt,
  tone,
  label,
  className = "",
  imgClassName = "",
  priority = false,
}: {
  src: string;
  alt: string;
  tone: string;
  label?: string;
  className?: string;
  imgClassName?: string;
  /** Above-the-fold (e.g. hero / product hero): load eagerly with high fetch priority. */
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(!src);
  return (
    <div className={`relative overflow-hidden ${className}`} style={{ background: tone }}>
      {!failed && src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          decoding="async"
          onError={() => setFailed(true)}
          className={`absolute inset-0 h-full w-full object-cover ${imgClassName}`}
        />
      )}
      {failed && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(rgba(255,255,255,0.14) 1px, transparent 1px)",
              backgroundSize: "9px 9px",
            }}
          />
          <div className="absolute inset-0 bg-black/10" />
          <TeeGlyph className="relative h-12 w-12 text-white/70" />
          {label && (
            <span className="font-display relative text-[11px] uppercase tracking-[0.25em] text-white/75">
              {label}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/* Scroll-reveal wrapper — adds .is-visible when scrolled into view. */
export function Reveal({
  children,
  delay = 0,
  className = "",
  as: Tag = "div",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: any;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as any}
      className={`reveal ${shown ? "is-visible" : ""} ${className}`}
      style={{ ["--reveal-delay" as any]: `${delay}ms` }}
    >
      {children}
    </Tag>
  );
}

export function Stars({ rating, className = "" }: { rating: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`} aria-label={`${rating} out of 5`}>
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, rating - i));
        return (
          <span key={i} className="relative inline-block h-3.5 w-3.5">
            <StarIcon className="absolute inset-0 h-3.5 w-3.5 text-[var(--ink)]/15" filled />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <StarIcon className="h-3.5 w-3.5 text-[#f4a63b]" filled />
            </span>
          </span>
        );
      })}
    </span>
  );
}

/* ---- Icons (inline SVG so there is no asset dependency) ------------------ */

export function TeeGlyph({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M8 3 4.5 5.5 6 9l2-1v10.5A1.5 1.5 0 0 0 9.5 20h5a1.5 1.5 0 0 0 1.5-1.5V8l2 1 1.5-3.5L16 3s-1 1.6-4 1.6S8 3 8 3Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StarIcon({ className = "", filled = false }: { className?: string; filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} className={className} aria-hidden>
      <path
        d="m12 3.5 2.6 5.27 5.82.85-4.21 4.1.99 5.79L12 16.9l-5.2 2.7.99-5.79-4.21-4.1 5.82-.85L12 3.5Z"
        stroke="currentColor"
        strokeWidth={filled ? 0 : 1.4}
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Icon({ name, className = "", style }: { name: string; className?: string; style?: React.CSSProperties }) {
  const common = {
    className,
    style,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (name) {
    case "shield":
      return (<svg {...common}><path d="M12 3 5 6v5c0 4.2 2.9 7.6 7 9 4.1-1.4 7-4.8 7-9V6l-7-3Z" /><path d="m9 12 2 2 4-4" /></svg>);
    case "truck":
      return (<svg {...common}><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z" /><circle cx="7" cy="18" r="1.6" /><circle cx="17.5" cy="18" r="1.6" /></svg>);
    case "refresh":
      return (<svg {...common}><path d="M20 11a8 8 0 1 0-2.3 5.7" /><path d="M20 4v5h-5" /></svg>);
    case "lock":
      return (<svg {...common}><rect x="5" y="10.5" width="14" height="9.5" rx="2" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></svg>);
    case "rupee":
      return (<svg {...common}><path d="M7 5h10M7 9h10M16.5 5c0 3-2.4 4-5 4H7l7 8" /></svg>);
    case "shirt":
      return (<svg {...common}><path d="M8 3 4 5.5 6 9l2-1v10.5A1.5 1.5 0 0 0 9.5 20h5a1.5 1.5 0 0 0 1.5-1.5V8l2 1 2-3.5L16 3s-1 1.6-4 1.6S8 3 8 3Z" /></svg>);
    case "droplet":
      return (<svg {...common}><path d="M12 3.5c3 3.6 5.5 6.3 5.5 9.2A5.5 5.5 0 0 1 6.5 12.7c0-2.9 2.5-5.6 5.5-9.2Z" /></svg>);
    case "image":
      return (<svg {...common}><rect x="4" y="5" width="16" height="14" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="m5 17 4.5-4 3.5 3 3-2.5L20 17" /></svg>);
    case "upload":
      return (<svg {...common}><path d="M12 15V4m0 0 4 4m-4-4L8 8" /><path d="M5 16v2.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V16" /></svg>);
    case "palette":
      return (<svg {...common}><path d="M12 3a9 9 0 1 0 0 18c1.2 0 2-.9 2-2 0-1.2-1-1.8-1-2.8 0-.8.7-1.4 1.5-1.4H16a5 5 0 0 0 5-5c0-3.9-4-6.8-9-6.8Z" /><circle cx="8" cy="11" r="1" /><circle cx="12" cy="8" r="1" /><circle cx="16" cy="11" r="1" /></svg>);
    case "grid":
      return (<svg {...common}><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></svg>);
    case "text":
      return (<svg {...common}><path d="M5 6h14M12 6v13M9 19h6" /></svg>);
    case "plus":
      return (<svg {...common}><path d="M12 5v14M5 12h14" /></svg>);
    case "chevron-right":
      return (<svg {...common}><path d="m9 6 6 6-6 6" /></svg>);
    case "chevron-left":
      return (<svg {...common}><path d="m15 6-6 6 6 6" /></svg>);
    case "instagram":
      return (<svg {...common}><rect x="4" y="4" width="16" height="16" rx="4.5" /><circle cx="12" cy="12" r="3.4" /><circle cx="16.6" cy="7.4" r="0.9" fill="currentColor" stroke="none" /></svg>);
    case "youtube":
      return (<svg {...common}><rect x="3" y="6" width="18" height="12" rx="3.5" /><path d="m10.5 9.5 4.5 2.5-4.5 2.5Z" fill="currentColor" /></svg>);
    case "star":
      return (<svg {...common}><path d="m12 4 2.3 4.7 5.2.8-3.75 3.65.9 5.15L12 15.9l-4.65 2.45.9-5.15L4.5 9.5l5.2-.8Z" /></svg>);
    case "bolt":
      return (<svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden><path d="M13.5 2 4 13.6h5.4L8.3 22 20 9.8h-5.7L15.6 2z" /></svg>);
    case "tag":
      return (<svg {...common}><path d="M4 12.6V5.6A1.6 1.6 0 0 1 5.6 4h7l7.4 7.4a1.6 1.6 0 0 1 0 2.2l-5.8 5.8a1.6 1.6 0 0 1-2.2 0L4 12.6Z" /><circle cx="8.4" cy="8.4" r="1.2" /></svg>);
    case "cap":
      return (<svg {...common}><path d="M3 12a9 9 0 0 1 18 0" /><path d="M12 12V6.5c3.6.2 6 1.4 6 2.8 0 .9-1 1.6-2.6 2.1" /><rect x="3" y="12" width="18" height="2.4" rx="1.2" /></svg>);
    case "headset":
      return (<svg {...common}><path d="M5 13v-1a7 7 0 0 1 14 0v1" /><rect x="3.5" y="13" width="3.5" height="6" rx="1.5" /><rect x="17" y="13" width="3.5" height="6" rx="1.5" /><path d="M19 19a4 4 0 0 1-4 3h-2" /></svg>);
    case "search":
      return (<svg {...common}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></svg>);
    case "user":
      return (<svg {...common}><circle cx="12" cy="8" r="3.5" /><path d="M5 20a7 7 0 0 1 14 0" /></svg>);
    case "heart":
      return (<svg {...common}><path d="M12 20s-7-4.6-9.2-9C1.3 8 3 4.5 6.4 4.5c2 0 3.2 1.2 3.6 2 .4-.8 1.6-2 3.6-2C17 4.5 18.7 8 17.2 11 15 15.4 12 20 12 20Z" /></svg>);
    case "cart":
      return (<svg {...common}><path d="M4 5h2l1.5 10.5A2 2 0 0 0 9.5 17h7.7a2 2 0 0 0 2-1.6L21 8H7" /><circle cx="9.5" cy="20" r="1.4" /><circle cx="17.5" cy="20" r="1.4" /></svg>);
    case "arrow":
      return (<svg {...common}><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg>);
    case "sparkle":
      return (<svg {...common}><path d="M12 3v6M12 15v6M3 12h6M15 12h6" /><path d="m6.5 6.5 3 3M14.5 14.5l3 3M17.5 6.5l-3 3M9.5 14.5l-3 3" /></svg>);
    case "check":
      return (<svg {...common}><path d="m5 12 4.5 4.5L19 7" /></svg>);
    case "menu":
      return (<svg {...common}><path d="M4 7h16M4 12h16M4 17h16" /></svg>);
    case "close":
      return (<svg {...common}><path d="M6 6l12 12M18 6 6 18" /></svg>);
    default:
      return null;
  }
}
