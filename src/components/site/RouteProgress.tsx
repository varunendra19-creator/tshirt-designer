"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Navigation feedback for internal link clicks:
 *  - a thin top progress bar that starts the instant a link is clicked, and
 *  - a centered "Loading…" spinner overlay that appears if the destination
 *    takes more than a moment (so fast navigations don't flash, but slow ones
 *    clearly tell the user something is happening).
 * Both clear as soon as the new route renders.
 */
export function RouteProgress() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);   // bar (immediate)
  const [overlay, setOverlay] = useState(false);  // spinner (slightly delayed)
  const [runId, setRunId] = useState(0);
  const overlayTimer = useRef<ReturnType<typeof setTimeout>>();
  const safety = useRef<ReturnType<typeof setTimeout>>();

  const stop = () => {
    setActive(false);
    setOverlay(false);
    clearTimeout(overlayTimer.current);
    clearTimeout(safety.current);
  };

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement)?.closest?.("a");
      if (!a) return;
      if (a.target === "_blank" || a.hasAttribute("download")) return;
      let url: URL;
      try { url = new URL(a.href); } catch { return; }
      if (url.origin !== location.origin) return;          // external
      if (url.pathname === location.pathname) return;       // same page / hash only

      setRunId((n) => n + 1);
      setActive(true);
      clearTimeout(overlayTimer.current);
      overlayTimer.current = setTimeout(() => setOverlay(true), 140); // only for non-instant navs
      clearTimeout(safety.current);
      safety.current = setTimeout(stop, 12000); // never get stuck
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  // route changed → navigation complete
  useEffect(() => { stop(); }, [pathname]);
  useEffect(() => () => stop(), []);

  return (
    <>
      {/* top progress bar */}
      <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[9999] h-[3px]">
        {active && (
          <div
            key={runId}
            className="route-bar h-full rounded-r-full bg-[var(--primary)]"
            style={{ boxShadow: "0 0 10px var(--primary), 0 0 4px var(--primary)" }}
          />
        )}
      </div>

      {/* centered spinner — appears for slower navigations */}
      {overlay && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-white/45 backdrop-blur-[1.5px]" role="status" aria-live="polite">
          <div className="flex items-center gap-3 rounded-2xl border border-black/5 bg-white px-5 py-3.5 shadow-xl">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
            <span className="text-sm font-semibold text-[var(--ink)]">Loading…</span>
          </div>
        </div>
      )}
    </>
  );
}
