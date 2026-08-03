"use client";

import { inr } from "@/lib/format";
import { Icon } from "@/components/home/primitives";
import { teeImageFor, teeAspectFor, printRectFor, toGender } from "@/lib/teeMockups";

/* Composites a design (bare print) ONTO the shirt at display time — works for
   any line whether or not a pre-rendered on-shirt image exists. */
export function OnShirt({ gender, surface, colorHex, printUrl }: { gender: any; surface: string; colorHex?: string; printUrl?: string | null }) {
  const g = toGender(gender);
  const tee = teeImageFor(g, surface);
  const aspectHW = teeAspectFor(g, surface);
  const rect = printRectFor(g, surface);
  const white = (colorHex || "").toUpperCase() === "#FFFFFF";
  return (
    <div className="relative mx-auto w-full" style={{ aspectRatio: String(1 / aspectHW) }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={tee} alt="" className="absolute inset-0 h-full w-full object-fill" draggable={false} />
      {!white && colorHex && (
        <div className="absolute inset-0" style={{
          background: colorHex, mixBlendMode: "multiply",
          WebkitMaskImage: `url(${tee})`, maskImage: `url(${tee})`,
          WebkitMaskSize: "100% 100%", maskSize: "100% 100%",
          WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat",
        }} />
      )}
      {printUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={printUrl} alt="" draggable={false} className="absolute object-contain"
          style={{ left: `${rect.x * 100}%`, top: `${rect.y * 100}%`, width: `${rect.w * 100}%`, height: `${rect.h * 100}%` }} />
      )}
    </div>
  );
}

/* "What you're paying for" popup — every printed side shown on the shirt. */
export function DesignPreviewModal({ view, onClose }: { view: any; onClose: () => void }) {
  if (!view) return null;
  const custom = view.custom;
  const meta = custom?.meta || {};
  const surfaces: any[] = custom?.surfaces || [];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-xl font-extrabold leading-tight">{view.product.name}</h3>
            <p className="text-[13px] text-[var(--ink-soft)]">This is exactly what will be printed · {inr(view.lineTotal)}</p>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ background: "var(--paper-2)" }}>
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>

        {custom ? (
          <>
            <div className="mb-3 flex flex-wrap gap-1.5 text-[11px]">
              {meta.fit && <Chip>{meta.fit}</Chip>}
              {meta.color_name && <Chip><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ background: meta.color_hex || "#000", boxShadow: "0 0 0 1px rgba(0,0,0,.15)" }} />{meta.color_name}</Chip>}
              <Chip>Size {view.size}</Chip>
              {meta.fabric && <Chip>{meta.fabric}</Chip>}
            </div>

            {surfaces.length > 0 ? (
              <div className={`grid gap-3 ${surfaces.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
                {surfaces.map((s: any, i: number) => (
                  <div key={i} className="overflow-hidden rounded-2xl border border-black/10">
                    <div className="p-3" style={{ background: "var(--paper-2)" }}>
                      <OnShirt gender={meta.fit} surface={s.id} colorHex={meta.color_hex} printUrl={s.preview_url || s.shirt_url} />
                    </div>
                    <p className="bg-white py-1.5 text-center text-[12px] font-bold uppercase tracking-wide text-[var(--primary)]">{s.label}</p>
                  </div>
                ))}
              </div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={view.product.image} alt={view.product.name} className="mx-auto max-h-[55dvh] w-auto rounded-2xl" style={{ background: "var(--paper-2)" }} />
            )}
          </>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={view.product.image} alt={view.product.name} className="mx-auto max-h-[60dvh] w-auto rounded-2xl" style={{ background: "var(--paper-2)" }} />
        )}
      </div>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border border-black/10 bg-[var(--paper-2)] px-2 py-0.5 font-semibold text-[var(--ink-2)]">{children}</span>;
}
