"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import { getProduct, type Product } from "@/lib/catalog";

// `custom` carries a self-contained design (from /customize) that has no catalog product.
export type CustomDesign = { name: string; image: string; price: number; meta?: any; surfaces?: any[] };
export type CartLine = { id: string; size: string; color: string; qty: number; custom?: CustomDesign };
export type CartLineView = CartLine & { product: Product; lineTotal: number; key: string };

const STORAGE_KEY = "teevo-cart-v1";
const keyOf = (l: Pick<CartLine, "id" | "size" | "color">) => `${l.id}__${l.size}__${l.color}`;

type CartCtx = {
  lines: CartLine[];
  views: CartLineView[];
  count: number;
  subtotal: number;
  add: (line: CartLine) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
};

const Ctx = createContext<CartCtx | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  // Hydrate from localStorage after mount (avoids SSR mismatch).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setLines(JSON.parse(raw));
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {}
  }, [lines, ready]);

  const add = useCallback((line: CartLine) => {
    setLines((prev) => {
      const k = keyOf(line);
      const existing = prev.find((l) => keyOf(l) === k);
      if (existing) {
        return prev.map((l) => (keyOf(l) === k ? { ...l, qty: Math.min(l.qty + line.qty, 10) } : l));
      }
      return [...prev, { ...line, qty: Math.min(line.qty, 10) }];
    });
  }, []);

  const setQty = useCallback((key: string, qty: number) => {
    setLines((prev) =>
      prev
        .map((l) => (keyOf(l) === key ? { ...l, qty: Math.max(0, Math.min(qty, 10)) } : l))
        .filter((l) => l.qty > 0)
    );
  }, []);

  const remove = useCallback((key: string) => {
    setLines((prev) => prev.filter((l) => keyOf(l) !== key));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const views = useMemo<CartLineView[]>(() => {
    return lines
      .map((l) => {
        // custom designs from /customize carry their own name/image/price
        const product = l.custom
          ? ({
              id: l.id, name: l.custom.name, price: l.custom.price, image: l.custom.image,
              tone: "#efeafd", rating: 5, reviews: 0, category: "printed",
              sizes: [], swatches: [], description: "Your custom design",
            } as unknown as Product)
          : getProduct(l.id);
        if (!product) return null;
        return { ...l, product, key: keyOf(l), lineTotal: product.price * l.qty };
      })
      .filter(Boolean) as CartLineView[];
  }, [lines]);

  const count = useMemo(() => lines.reduce((n, l) => n + l.qty, 0), [lines]);
  const subtotal = useMemo(() => views.reduce((s, v) => s + v.lineTotal, 0), [views]);

  const value: CartCtx = { lines, views, count, subtotal, add, setQty, remove, clear };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart(): CartCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
