"use client";

import { useState } from "react";

export function ContactForm() {
  const [f, setF] = useState({ name: "", email: "", subject: "", message: "" });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF((p) => ({ ...p, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setErr("");
    try {
      const res = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Couldn't send your message. Please try again.");
      setDone(true);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const cls = "w-full rounded-xl border border-black/15 bg-white px-4 py-3 text-sm outline-none focus:border-[var(--primary)]";

  if (done) {
    return (
      <div className="rounded-2xl border border-[var(--mint)]/40 bg-[var(--mint)]/[0.08] p-8 text-center">
        <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-[var(--mint)] text-xl text-white">✓</div>
        <p className="font-display text-lg font-extrabold">Message sent!</p>
        <p className="mt-1 text-sm text-[var(--ink-2)]">Thanks for reaching out — we'll get back to you within a working day.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Name</label>
          <input value={f.name} onChange={set("name")} required className={cls} placeholder="Your name" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Email</label>
          <input value={f.email} onChange={set("email")} type="email" required className={cls} placeholder="you@college.edu" />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Subject</label>
        <input value={f.subject} onChange={set("subject")} className={cls} placeholder="What's this about?" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Message</label>
        <textarea value={f.message} onChange={set("message")} required rows={5} className={`${cls} resize-y`} placeholder="Tell us what you need…" />
      </div>
      {err && <p className="text-sm text-[var(--coral)]">{err}</p>}
      <button type="submit" disabled={busy} className="w-full rounded-full bg-[var(--primary)] px-6 py-3.5 text-sm font-bold text-white transition-transform hover:-translate-y-0.5 disabled:opacity-60">
        {busy ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
