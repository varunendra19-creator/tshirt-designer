"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

/**
 * Email/password login + signup, with a Google button. Calls onDone() on success.
 * `loginOnly` → just email + password login (no signup toggle, no Google) — used for admin.
 */
export function AuthForm({ onDone, compact, loginOnly }: { onDone?: () => void; compact?: boolean; loginOnly?: boolean }) {
  const { signIn, signUp, signInGoogle, resetPassword, ready } = useAuth();
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [notice, setNotice] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setErr(""); setNotice("");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return setErr("Enter a valid email.");

    // forgot-password: only needs an email
    if (mode === "forgot") {
      setBusy(true);
      const res = await resetPassword(email);
      setBusy(false);
      if (res.error) return setErr(res.error);
      setNotice("If that email has an account, a password-reset link is on its way. Check your inbox.");
      return;
    }

    if (password.length < 6) return setErr("Password must be at least 6 characters.");
    setBusy(true);
    const res = mode === "login" ? await signIn(email, password) : await signUp(email, password, name.trim() || undefined);
    setBusy(false);
    if (res.error) {
      // if signup says user exists, nudge to login
      setErr(res.error);
      return;
    }
    if (mode === "signup") {
      // If email confirmation is ON in Supabase, there's no session yet.
      setNotice("Account created! If asked, confirm via the email we sent, then log in.");
    }
    onDone?.();
  };

  const google = async () => {
    setErr("");
    const res = await signInGoogle();
    if (res.error) setErr(res.error.includes("provider is not enabled")
      ? "Google login isn’t enabled yet (enable it in Supabase → Auth → Providers)."
      : res.error);
    // OAuth redirects away; onDone handled after redirect back.
  };

  const inputCls = "w-full rounded-xl border border-black/15 bg-white px-4 py-3 text-sm outline-none focus:border-[var(--primary)]";

  return (
    <div className={compact ? "" : "mx-auto max-w-sm"}>
      {!loginOnly && (
        <div className="mb-4 flex rounded-full p-1" style={{ background: "var(--paper-2)" }}>
          {(["login", "signup"] as const).map((m) => (
            <button key={m} type="button" onClick={() => { setMode(m); setErr(""); setNotice(""); }}
              className="flex-1 rounded-full py-2 text-[13px] font-bold capitalize transition-all"
              style={{ background: mode === m ? "var(--primary)" : "transparent", color: mode === m ? "#fff" : "var(--ink-2)" }}>
              {m === "login" ? "Log in" : "Sign up"}
            </button>
          ))}
        </div>
      )}

      {!loginOnly && mode !== "forgot" && (
        <>
          <button type="button" onClick={google} disabled={!ready}
            className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl border border-black/15 bg-white py-3 text-sm font-semibold disabled:opacity-50">
            <GoogleGlyph /> Continue with Google
          </button>
          <div className="my-3 flex items-center gap-3 text-[11px] text-[var(--ink-soft)]">
            <span className="h-px flex-1" style={{ background: "var(--line)" }} /> or {mode === "login" ? "log in" : "sign up"} with email <span className="h-px flex-1" style={{ background: "var(--line)" }} />
          </div>
        </>
      )}

      {mode === "forgot" && (
        <p className="mb-3 text-[13px] text-[var(--ink-soft)]">Enter your email and we’ll send a link to reset your password.</p>
      )}

      <form onSubmit={submit} className="space-y-2.5">
        {mode === "signup" && !loginOnly && (
          <input className={inputCls} placeholder="Full name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
        )}
        <input className={inputCls} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        {mode !== "forgot" && (
          <input className={inputCls} type="password" placeholder="Password (min 6 chars)" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} />
        )}
        {mode === "login" && !loginOnly && (
          <div className="text-right">
            <button type="button" onClick={() => { setMode("forgot"); setErr(""); setNotice(""); }} className="text-xs font-semibold text-[var(--primary)]">Forgot password?</button>
          </div>
        )}
        {err && <p className="text-sm font-medium text-[var(--coral)]">{err}</p>}
        {notice && <p className="text-sm font-medium" style={{ color: "var(--mint)" }}>{notice}</p>}
        <button type="submit" disabled={busy}
          className="w-full rounded-xl py-3.5 text-sm font-bold text-white shadow-sm disabled:opacity-60" style={{ background: "var(--primary)" }}>
          {busy ? "Please wait…" : mode === "login" ? "Log in" : mode === "signup" ? "Create account" : "Send reset link"}
        </button>
        {mode === "forgot" && (
          <button type="button" onClick={() => { setMode("login"); setErr(""); setNotice(""); }} className="w-full text-center text-xs font-semibold text-[var(--ink-soft)]">← Back to log in</button>
        )}
      </form>
    </div>
  );
}

function GoogleGlyph() {
  return (
    <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.3 26.7 36 24 36c-5.2 0-9.6-3.3-11.2-7.9l-6.5 5C9.6 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2C39.9 36.5 44 31 44 24c0-1.3-.1-2.3-.4-3.5z" />
    </svg>
  );
}
