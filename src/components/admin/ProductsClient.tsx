"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { inr } from "@/lib/format";
import { colorName, CATEGORY_LABELS } from "@/lib/catalog";
import { OnShirt } from "@/components/site/DesignPreview";
import { RichText } from "@/components/admin/RichText";

type Row = {
  id: string; name: string; category: string; categoryLabel: string; price: number; compareAt: number | null;
  image: string; images: string[]; badge: string | null; description: string; sizes: string[]; swatches: string[];
  active: boolean; sort: number; variantCount: number; totalStock: number; low: number; oos: number;
  rating?: number; reviews?: number; colorImages?: Record<string, string>;
};
type Variant = { sku: string; size: string; color: string; stock: number };
const BADGES = ["", "NEW", "BESTSELLER", "SALE"];

export function ProductsClient() {
  const { token } = useAuth();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [stockFor, setStockFor] = useState<Row | null>(null);
  const [formFor, setFormFor] = useState<Row | "new" | null>(null);

  const auth = useCallback(() => ({ Authorization: `Bearer ${token}` }), [token]);
  const authJson = useCallback(() => ({ "Content-Type": "application/json", Authorization: `Bearer ${token}` }), [token]);
  const load = useCallback(async () => {
    if (!token) return;
    const r = await fetch("/api/admin/products", { headers: auth() });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return setErr(d.error || "Failed to load");
    setRows(d.products);
  }, [token, auth]);
  useEffect(() => { load(); }, [load]);

  const del = async (id: string) => {
    if (!confirm(`Delete "${id}"? This removes the product and its variants.`)) return;
    await fetch(`/api/admin/products?id=${id}`, { method: "DELETE", headers: auth() });
    load();
  };
  const saveProduct = async (body: any, isNew: boolean) => {
    await fetch("/api/admin/products", { method: isNew ? "POST" : "PATCH", headers: authJson(), body: JSON.stringify(body) });
    setFormFor(null); load();
  };

  if (err) return <p className="text-sm text-[var(--coral)]">{err}</p>;
  if (!rows) return <p className="text-[var(--ink-soft)]">Loading products…</p>;
  const shown = lowOnly ? rows.filter((r) => r.low > 0 || r.oos > 0) : rows;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-extrabold md:text-3xl">Products <span className="text-[var(--ink-soft)]">({rows.length})</span></h1>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} className="accent-[var(--primary)]" /> Low / OOS only</label>
          <button onClick={() => setFormFor("new")} className="rounded-full bg-[var(--primary)] px-4 py-2 text-sm font-bold text-white">+ New product</button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-black/10 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/10 text-left text-[11px] uppercase tracking-wide text-[var(--ink-soft)]">
              <th className="px-4 py-3">Product</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Price</th><th className="px-4 py-3">Stock</th><th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id} className="border-b border-black/5 last:border-0">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={r.image} alt="" className="h-10 w-9 rounded-md border border-black/10 object-cover" style={{ background: "var(--paper-2)" }} />
                    <span className="font-semibold">{r.name}{!r.active && <span className="ml-2 rounded-full bg-[var(--paper-2)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--ink-soft)]">HIDDEN</span>}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-[var(--ink-2)]">{r.categoryLabel}</td>
                <td className="px-4 py-3 font-semibold">{inr(r.price)}</td>
                <td className="px-4 py-3">
                  <span className="font-semibold">{r.totalStock}</span>
                  {r.oos > 0 && <span className="ml-2 rounded-full bg-[var(--coral)]/15 px-1.5 py-0.5 text-[10px] font-bold text-[var(--coral)]">{r.oos} OOS</span>}
                  {r.low > 0 && <span className="ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold" style={{ background: "rgba(251,146,60,0.15)", color: "var(--accent)" }}>{r.low} low</span>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-3 whitespace-nowrap text-xs font-bold">
                    <button onClick={() => setStockFor(r)} className="text-[var(--ink-2)]">Stock</button>
                    <button onClick={() => setFormFor(r)} className="text-[var(--primary)]">Edit</button>
                    <button onClick={() => del(r.id)} className="text-[var(--coral)]">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {stockFor && <StockEditor row={stockFor} auth={auth} onClose={() => setStockFor(null)} onSaved={() => { setStockFor(null); load(); }} />}
      {formFor && <ProductForm product={formFor === "new" ? null : formFor} onSave={saveProduct} onCancel={() => setFormFor(null)} />}
    </div>
  );
}

/* ── create / edit product ─────────────────────────────────────────────── */
function ProductForm({ product, onSave, onCancel }: { product: Row | null; onSave: (b: any, isNew: boolean) => void; onCancel: () => void }) {
  const isNew = !product;
  const [name, setName] = useState(product?.name || "");
  const [price, setPrice] = useState(product?.price || 0);
  const [compareAt, setCompareAt] = useState(product?.compareAt || 0);
  const [category, setCategory] = useState(product?.category || "printed");
  const [badge, setBadge] = useState(product?.badge || "");
  const [description, setDescription] = useState(product?.description || "");
  const [sizes, setSizes] = useState((product?.sizes || ["S", "M", "L", "XL", "XXL"]).join(", "));
  const [swatches, setSwatches] = useState<string[]>(product?.swatches?.length ? product.swatches : ["#111111"]);
  const [images, setImages] = useState<string[]>(product?.images?.length ? product.images : [""]);
  const [active, setActive] = useState(product?.active ?? true);
  const [rating, setRating] = useState(product?.rating ?? 0);
  const [reviews, setReviews] = useState(product?.reviews ?? 0);
  const [previewColor, setPreviewColor] = useState(product?.swatches?.[0] || "#1e1b4b");
  const [colorImages, setColorImages] = useState<Record<string, string>>(product?.colorImages || {});
  const cls = "w-full rounded-xl border border-black/15 bg-white px-3 py-2 text-sm text-[var(--ink)] placeholder:text-[var(--ink-soft)] outline-none focus:border-[var(--primary)]";
  // flex-row variant: grows to fill and can shrink (min-w-0) so long URLs don't collapse the field
  const clsRow = "min-w-0 flex-1 rounded-xl border border-black/15 bg-white px-3 py-2 text-sm text-[var(--ink)] placeholder:text-[var(--ink-soft)] outline-none focus:border-[var(--primary)]";

  const moveImg = (i: number, dir: -1 | 1) => setImages((a) => { const b = a.slice(); const j = i + dir; if (j < 0 || j >= b.length) return a; [b[i], b[j]] = [b[j], b[i]]; return b; });

  const submit = () => {
    const body = {
      id: isNew ? undefined : product!.id, name, price: Number(price), compareAt: Number(compareAt) || undefined,
      category, badge: badge || undefined, description,
      sizes: sizes.split(",").map((s) => s.trim()).filter(Boolean),
      swatches: swatches.filter(Boolean), images: images.filter((u) => u.trim()), active,
      rating: Math.min(5, Math.max(0, Number(rating) || 0)), reviews: Math.max(0, Math.round(Number(reviews) || 0)),
      colorImages,
    };
    onSave(body, isNew);
  };

  const off = compareAt && compareAt > price ? Math.round((1 - price / compareAt) * 100) : 0;
  const primaryImg = images.find((u) => u.trim());
  const tint = previewColor || swatches[0] || "#1e1b4b";
  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section className="space-y-2">
      <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--ink-soft)]">{title}</p>
      {children}
    </section>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* header */}
        <div className="flex items-center justify-between border-b border-black/10 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--primary)]/10 text-[var(--primary)]">🎨</div>
            <div>
              <h3 className="font-display text-lg font-extrabold leading-tight">{isNew ? "New product" : `Edit ${product!.name}`}</h3>
              <p className="text-[11px] text-[var(--ink-soft)]">Live preview updates as you edit →</p>
            </div>
          </div>
          <button onClick={onCancel} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-full text-[var(--ink-soft)] hover:bg-black/5">✕</button>
        </div>

        {/* body: form (left) + live preview (right) */}
        <div className="grid min-h-0 flex-1 gap-0 overflow-hidden lg:grid-cols-[1fr_300px]">
          <div className="min-h-0 space-y-5 overflow-y-auto p-5">
            <Section title="Basics">
              <input className={cls} placeholder="Product name" value={name} onChange={(e) => setName(e.target.value)} />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <input className={cls} type="number" placeholder="Price ₹" value={price || ""} onChange={(e) => setPrice(Number(e.target.value))} />
                  {off > 0 && <p className="mt-1 text-[11px] font-semibold text-[var(--mint)]">{off}% off vs compare-at</p>}
                </div>
                <input className={cls} type="number" placeholder="Compare-at ₹ (optional)" value={compareAt || ""} onChange={(e) => setCompareAt(Number(e.target.value))} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select className={cls} value={category} onChange={(e) => setCategory(e.target.value)}>
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <select className={cls} value={badge} onChange={(e) => setBadge(e.target.value)}>
                  {BADGES.map((b) => <option key={b} value={b}>{b || "No badge"}</option>)}
                </select>
              </div>
            </Section>

            <Section title="Description">
              <RichText value={description} onChange={setDescription} />
            </Section>

            <Section title="Sizes">
              <input className={cls} placeholder="Sizes (comma-separated)" value={sizes} onChange={(e) => setSizes(e.target.value)} />
            </Section>

            <Section title="Display rating (shown on cards — not sent to Google)">
              <div className="grid grid-cols-2 gap-2">
                <input className={cls} type="number" step="0.1" min="0" max="5" placeholder="Rating 0–5 (e.g. 4.6)" value={rating || ""} onChange={(e) => setRating(Number(e.target.value))} />
                <input className={cls} type="number" min="0" placeholder="Review count (e.g. 128)" value={reviews || ""} onChange={(e) => setReviews(Number(e.target.value))} />
              </div>
              <p className="text-[11px] text-[var(--ink-soft)]">Google star snippets use only real verified buyer reviews (Reviews tab), never these.</p>
            </Section>

            <Section title="Colours (click to preview · add a photo per colour, optional)">
              <div className="space-y-2">
                {swatches.map((s, i) => (
                  <div key={i} className={`flex items-center gap-2 rounded-xl border p-2 transition-colors ${tint === s ? "border-[var(--primary)] ring-1 ring-[var(--primary)]/30" : "border-black/10"}`}>
                    <button type="button" onClick={() => setPreviewColor(s)} title="Preview this colour" className="h-7 w-7 shrink-0 rounded-full" style={{ background: s, boxShadow: "inset 0 0 0 1px rgba(0,0,0,.15)" }} />
                    <input type="color" value={s} onChange={(e) => { const v = e.target.value; setSwatches((a) => a.map((x, j) => (j === i ? v : x))); setColorImages((m) => { if (!m[s]) return m; const n = { ...m }; n[v] = n[s]; delete n[s]; return n; }); if (tint === s) setPreviewColor(v); }} className="h-7 w-7 shrink-0 cursor-pointer rounded" aria-label="Edit colour" />
                    <input className={clsRow} placeholder="Photo URL for this colour (optional)" value={colorImages[s] || ""} onChange={(e) => setColorImages((m) => ({ ...m, [s]: e.target.value }))} />
                    <button onClick={() => { setSwatches((a) => a.filter((_, j) => j !== i)); setColorImages((m) => { const n = { ...m }; delete n[s]; return n; }); }} className="shrink-0 px-1 text-xs text-[var(--coral)]">×</button>
                  </div>
                ))}
                <button onClick={() => setSwatches((a) => [...a, "#000000"])} className="rounded-lg border border-dashed border-black/25 px-2 py-1 text-xs font-bold text-[var(--primary)]">+ colour</button>
              </div>
            </Section>

            <Section title="Images (first = primary)">
              {images.map((u, i) => (
                <div key={i} className="mb-1.5 flex items-center gap-1.5">
                  {u ? <img src={u} alt="" className="h-8 w-7 shrink-0 rounded border border-black/10 object-cover" /> : <span className="h-8 w-7 shrink-0 rounded border border-dashed border-black/20" />}
                  <input className={clsRow} placeholder="Image URL" value={u} onChange={(e) => setImages((a) => a.map((x, j) => (j === i ? e.target.value : x)))} />
                  <div className="flex shrink-0 items-center">
                    <button onClick={() => moveImg(i, -1)} disabled={i === 0} title="Move up" className="px-1 text-xs disabled:opacity-30">↑</button>
                    <button onClick={() => moveImg(i, 1)} disabled={i === images.length - 1} title="Move down" className="px-1 text-xs disabled:opacity-30">↓</button>
                    <button onClick={() => setImages((a) => a.filter((_, j) => j !== i))} title="Remove" className="px-1 text-xs text-[var(--coral)]">×</button>
                  </div>
                </div>
              ))}
              <button onClick={() => setImages((a) => [...a, ""])} className="rounded-lg border border-dashed border-black/25 px-2 py-1 text-xs font-bold text-[var(--primary)]">+ image</button>
            </Section>

            <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="accent-[var(--primary)]" /> Active (visible on store)</label>
          </div>

          {/* live preview */}
          <aside className="hidden min-h-0 overflow-y-auto border-l border-black/10 bg-[var(--paper-2)] p-4 lg:block">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[var(--ink-soft)]">Colour preview</p>
            <div className="rounded-2xl border border-black/10 bg-white p-3">
              {colorImages[tint] ? (
                <div className="aspect-[4/5] w-full overflow-hidden rounded-xl bg-[var(--paper-2)]">
                  <img src={colorImages[tint]} alt="" className="h-full w-full object-cover" />
                </div>
              ) : (
                <OnShirt gender="male" surface="front" colorHex={tint} />
              )}
              <p className="mt-1 text-center text-[11px] text-[var(--ink-soft)]">{colorName(tint)}{colorImages[tint] ? " · photo" : ""}</p>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {swatches.map((s, i) => (
                <button key={i} type="button" onClick={() => setPreviewColor(s)} title={colorName(s)} className={`h-6 w-6 rounded-full transition-transform hover:scale-110 ${tint === s ? "ring-2 ring-offset-1 ring-[var(--primary)]" : ""}`} style={{ background: s, boxShadow: "inset 0 0 0 1px rgba(0,0,0,.2)" }} />
              ))}
            </div>

            <p className="mb-2 mt-5 text-[11px] font-bold uppercase tracking-wide text-[var(--ink-soft)]">Card preview</p>
            <div className="overflow-hidden rounded-2xl border border-black/10 bg-white">
              <div className="relative aspect-[4/5] bg-[var(--paper-2)]">
                {primaryImg ? <img src={primaryImg} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-xs text-[var(--ink-soft)]">No image</div>}
                {badge && <span className="absolute left-2 top-2 rounded-lg bg-[var(--ink)] px-2 py-0.5 text-[10px] font-bold uppercase text-white">{badge}</span>}
              </div>
              <div className="p-3">
                <p className="truncate text-sm font-bold">{name || "Product name"}</p>
                <div className="mt-0.5 flex items-center gap-1 text-[11px] text-[var(--ink-soft)]">
                  <span className="text-[var(--accent)]">{"★".repeat(Math.max(0, Math.round(rating)))}{"☆".repeat(Math.max(0, 5 - Math.round(rating)))}</span>
                  <span>{rating || 0} ({reviews || 0})</span>
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-display text-base font-extrabold">{inr(price || 0)}</span>
                  {off > 0 && <span className="text-xs text-[var(--ink-soft)] line-through">{inr(compareAt)}</span>}
                  {off > 0 && <span className="text-xs font-bold text-[var(--coral)]">{off}% off</span>}
                </div>
              </div>
            </div>
          </aside>
        </div>

        {/* footer */}
        <div className="flex gap-2 border-t border-black/10 px-5 py-4">
          <button onClick={submit} className="rounded-full bg-[var(--primary)] px-6 py-2.5 text-sm font-bold text-white transition-transform hover:-translate-y-0.5">{isNew ? "Create product" : "Save changes"}</button>
          <button onClick={onCancel} className="rounded-full border border-black/15 px-6 py-2.5 text-sm font-semibold hover:bg-[var(--paper-2)]">Cancel</button>
        </div>
      </div>
    </div>
  );
}

/* ── per-variant stock editor ──────────────────────────────────────────── */
function StockEditor({ row, auth, onClose, onSaved }: { row: Row; auth: () => Record<string, string>; onClose: () => void; onSaved: () => void }) {
  const [variants, setVariants] = useState<Variant[] | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { fetch(`/api/admin/variants?product=${row.id}`, { headers: auth() }).then((r) => r.json()).then((d) => setVariants(d.variants || [])); }, [row.id, auth]);
  const setStock = (sku: string, stock: number) => setVariants((prev) => prev?.map((v) => (v.sku === sku ? { ...v, stock } : v)) ?? prev);
  const restockAll = (n: number) => setVariants((prev) => prev?.map((v) => ({ ...v, stock: n })) ?? prev);
  const save = async () => {
    if (!variants) return; setBusy(true);
    await fetch("/api/admin/variants", { method: "PATCH", headers: { "Content-Type": "application/json", ...auth() }, body: JSON.stringify({ updates: variants.map((v) => ({ sku: v.sku, stock: v.stock })) }) });
    setBusy(false); onSaved();
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative flex max-h-[85dvh] w-full max-w-md flex-col rounded-3xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between"><h3 className="font-display text-lg font-extrabold">Stock · {row.name}</h3><button onClick={onClose} className="text-sm font-semibold text-[var(--ink-soft)]">Close</button></div>
        {!variants ? <p className="text-sm text-[var(--ink-soft)]">Loading variants…</p> : (
          <>
            <div className="mb-3 flex items-center gap-2 text-xs"><span className="text-[var(--ink-soft)]">Restock all:</span>{[0, 10, 25, 40].map((n) => <button key={n} onClick={() => restockAll(n)} className="rounded-full border border-black/15 px-2.5 py-1 font-semibold">{n}</button>)}</div>
            <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-black/10">
              <table className="w-full text-sm"><thead><tr className="sticky top-0 bg-white text-left text-[11px] uppercase text-[var(--ink-soft)]"><th className="px-3 py-2">Size</th><th className="px-3 py-2">Colour</th><th className="px-3 py-2">Stock</th></tr></thead>
                <tbody>{variants.map((v) => (
                  <tr key={v.sku} className="border-t border-black/5"><td className="px-3 py-2 font-semibold">{v.size}</td><td className="px-3 py-2"><span className="mr-1.5 inline-block h-3 w-3 rounded-full align-middle" style={{ background: v.color, boxShadow: "0 0 0 1px rgba(0,0,0,.15)" }} />{colorName(v.color)}</td>
                  <td className="px-3 py-2"><input type="number" min={0} value={v.stock} onChange={(e) => setStock(v.sku, Math.max(0, Number(e.target.value)))} className={`w-20 rounded-lg border px-2 py-1 text-sm ${v.stock === 0 ? "border-[var(--coral)] text-[var(--coral)]" : v.stock <= 5 ? "border-[var(--accent)]" : "border-black/15"}`} /></td></tr>
                ))}</tbody>
              </table>
            </div>
            <button onClick={save} disabled={busy} className="mt-4 w-full rounded-full bg-[var(--primary)] py-3 text-sm font-bold text-white disabled:opacity-60">{busy ? "Saving…" : "Save stock"}</button>
          </>
        )}
      </div>
    </div>
  );
}
