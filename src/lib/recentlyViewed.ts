// Client-side "recently viewed products" — stored in localStorage.
const KEY = "cm-recently-viewed";
const MAX = 12;

export function trackView(id: string) {
  if (typeof window === "undefined" || !id) return;
  try {
    const arr: string[] = JSON.parse(localStorage.getItem(KEY) || "[]").filter((x: string) => x !== id);
    arr.unshift(id);
    localStorage.setItem(KEY, JSON.stringify(arr.slice(0, MAX)));
  } catch {}
}

export function getRecentlyViewed(): string[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}

export function clearRecentlyViewed() {
  if (typeof window === "undefined") return;
  try { localStorage.removeItem(KEY); } catch {}
}
