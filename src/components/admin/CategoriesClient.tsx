"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";

type Cat = { slug: string; label: string; description: string | null; sort: number; active: boolean };

export function CategoriesClient() {
  const { token } = useAuth();
  const [cats, setCats] = useState<Cat[] | null>(null);
  const [err, setErr] = useState("");
  const [editing, setEditing] = useState<Cat | "new" | null>(null);

  const auth = useCallback(() => ({ "Content-Type": "application/json", Authorization: `Bearer ${token}` }), [token]);
  const load = useCallback(async () => {
    if (!token) return;
    const r = await fetch("/api/admin/categories", { headers: { Authorization: `Bearer ${token}` } });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return setErr(d.error || "Failed");
    setCats(d.categories);
  }, [token]);
  useEffect(() => { load(); }, [load]);

  const save = async (c: Partial<Cat>, isNew: boolean) => {
    await fetch("/api/admin/categories", { method: isNew ? "POST" : "PATCH", headers: auth(), body: JSON.stringify(c) });
    setEditing(null); load();
  };
  const del = async (slug: string) => {
    if (!confirm(`Delete category "${slug}"?`)) return;
    await fetch(`/api/admin/categories?slug=${slug}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    load();
  };

  if (err) return <p className="text-sm text-[var(--coral)]">{err}</p>;
  if (!cats) return <p className="text-[var(--ink-soft)]">Loading categories…</p>;

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="font-display text-2xl font-extrabold md:text-3xl">Categories <span className="text-[var(--ink-soft)]">({cats.length})</span></h1>
        <button onClick={() => setEditing("new")} className="rounded-full bg-[var(--primary)] px-4 py-2 text-sm font-bold text-white">+ New category</button>
      </div>

      <div className="space-y-2.5">
        {cats.map((c) => (
          <div key={c.slug} className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{c.label} {!c.active && <span className="ml-1 rounded-full bg-[var(--paper-2)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--ink-soft)]">HIDDEN</span>}</p>
              <p className="truncate text-xs text-[var(--ink-soft)]">/{c.slug} · {c.description || "—"}</p>
            </div>
            <button onClick={() => setEditing(c)} className="text-xs font-bold text-[var(--primary)]">Edit</button>
            <button onClick={() => del(c.slug)} className="text-xs font-bold text-[var(--coral)]">Delete</button>
          </div>
        ))}
      </div>

      {editing && <CatForm cat={editing === "new" ? null : editing} onSave={save} onCancel={() => setEditing(null)} />}
    </div>
  );
}

function CatForm({ cat, onSave, onCancel }: { cat: Cat | null; onSave: (c: any, isNew: boolean) => void; onCancel: () => void }) {
  const isNew = !cat;
  const [label, setLabel] = useState(cat?.label || "");
  const [slug, setSlug] = useState(cat?.slug || "");
  const [description, setDescription] = useState(cat?.description || "");
  const [sort, setSort] = useState(cat?.sort ?? 99);
  const [active, setActive] = useState(cat?.active ?? true);
  const cls = "w-full rounded-xl border border-black/15 bg-white px-4 py-2.5 text-sm text-[var(--ink)] placeholder:text-[var(--ink-soft)] outline-none focus:border-[var(--primary)]";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display mb-4 text-lg font-extrabold">{isNew ? "New category" : `Edit ${cat!.label}`}</h3>
        <div className="space-y-2.5">
          <input className={cls} placeholder="Label" value={label} onChange={(e) => setLabel(e.target.value)} />
          {isNew && <input className={cls} placeholder="Slug (optional — auto from label)" value={slug} onChange={(e) => setSlug(e.target.value)} />}
          <textarea className={cls} placeholder="Description (SEO)" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          <div className="flex items-center gap-3">
            <label className="text-sm">Sort <input type="number" className="ml-1 w-16 rounded-lg border border-black/15 px-2 py-1" value={sort} onChange={(e) => setSort(Number(e.target.value))} /></label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="accent-[var(--primary)]" /> Active</label>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={() => onSave(isNew ? { label, slug, description, sort, active } : { slug: cat!.slug, label, description, sort, active }, isNew)}
              className="rounded-full bg-[var(--primary)] px-5 py-2.5 text-sm font-bold text-white">{isNew ? "Create" : "Save"}</button>
            <button onClick={onCancel} className="rounded-full border border-black/15 px-5 py-2.5 text-sm font-semibold">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}
