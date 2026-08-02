"use client";

import { useEffect, useState } from "react";

// Client-side wishlist / favourites — localStorage, works for guests and logged-in users.
const KEY = "teevo-wishlist-v1";
const EVENT = "teevo-wishlist-change";

export function getWishlist(): string[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}

function save(ids: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids));
    window.dispatchEvent(new Event(EVENT));
  } catch {}
}

export function isWished(id: string): boolean {
  return getWishlist().includes(id);
}

/** Add/remove a product; returns the new wished state. */
export function toggleWishlist(id: string): boolean {
  const ids = getWishlist();
  const has = ids.includes(id);
  save(has ? ids.filter((x) => x !== id) : [id, ...ids]);
  return !has;
}

export function removeWish(id: string) {
  save(getWishlist().filter((x) => x !== id));
}

/** Subscribe to wishlist changes (this tab via custom event, other tabs via storage). */
export function onWishlistChange(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => { window.removeEventListener(EVENT, cb); window.removeEventListener("storage", cb); };
}

/** Reactive wishlist ids for components (header badge, cards, /wishlist page). */
export function useWishlist(): string[] {
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => {
    setIds(getWishlist());
    return onWishlistChange(() => setIds(getWishlist()));
  }, []);
  return ids;
}
