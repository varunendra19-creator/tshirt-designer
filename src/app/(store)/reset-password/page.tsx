"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";

export default function ResetPasswordPage() {
  const { updatePassword, ready } = useAuth();
  const router = useRouter();
  const [recovery, setRecovery] = useState<"checking" | "ready" | "none">("checking");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  // Supabase parses the recovery token from the URL hash and fires PASSWORD_RECOVERY.
  useEffect(() => {
    if (!supabase) return;
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setRecovery("ready");
    });
    // also catch the case where the session is already set by the time we mount
    supabase.auth.getSession().then(({ data }) => {
      setRecovery((r) => (data.session ? "ready" : r === "checking" ? "none" : r));
    });
    const t = setTimeout(() => setRecovery((r) => (r === "checking" ? "none" : r)), 2500);
    return () => { sub.subscription.unsubscribe(); clearTimeout(t); };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (pw.length < 6) return setErr("Password must be at least 6 characters.");
    if (pw !== pw2) return setErr("Passwords don’t match.");
    setBusy(true);
    const res = await updatePassword(pw);
    setBusy(false);
    if (res.error) return setErr(res.error);
    setDone(true);
    setTimeout(() => router.push("/account"), 1600);
  };

  const inputCls = "w-full rounded-xl border border-black/15 bg-white px-4 py-3 text-sm outline-none focus:border-[var(--primary)]";

  return (
    <section className="mx-auto max-w-sm px-5 py-16 md:py-24">
      <h1 className="font-display text-3xl font-extrabold">Reset your password</h1>

      {!ready ? (
        <p className="mt-4 text-sm text-[var(--ink-soft)]">Accounts aren’t configured yet.</p>
      ) : done ? (
        <div className="mt-6 rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
          <p className="font-semibold text-[var(--mint)]">Password updated! 🎉</p>
          <p className="mt-1 text-sm text-[var(--ink-soft)]">Taking you to your account…</p>
        </div>
      ) : recovery === "checking" ? (
        <p className="mt-6 text-sm text-[var(--ink-soft)]">Verifying your reset link…</p>
      ) : recovery === "none" ? (
        <div className="mt-6 rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
          <p className="font-semibold">This reset link is invalid or has expired.</p>
          <p className="mt-1 text-sm text-[var(--ink-soft)]">Request a new one from the login screen.</p>
          <Link href="/account" className="mt-4 inline-block rounded-full bg-[var(--primary)] px-5 py-2.5 text-sm font-bold text-white">Go to login</Link>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-3 rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
          <p className="text-sm text-[var(--ink-soft)]">Choose a new password for your account.</p>
          <input className={inputCls} type="password" placeholder="New password (min 6 chars)" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
          <input className={inputCls} type="password" placeholder="Confirm new password" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" />
          {err && <p className="text-sm font-medium text-[var(--coral)]">{err}</p>}
          <button type="submit" disabled={busy} className="w-full rounded-xl py-3.5 text-sm font-bold text-white disabled:opacity-60" style={{ background: "var(--primary)" }}>
            {busy ? "Updating…" : "Update password"}
          </button>
        </form>
      )}
    </section>
  );
}
