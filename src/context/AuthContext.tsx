"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

type AuthResult = { error?: string };
type AuthCtx = {
  ready: boolean;         // supabase configured
  loading: boolean;       // still resolving initial session
  user: User | null;
  session: Session | null;
  token: string | null;
  signUp: (email: string, password: string, name?: string) => Promise<AuthResult>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signInGoogle: () => Promise<AuthResult>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<AuthResult>;
  updatePassword: (password: string) => Promise<AuthResult>;
  resendVerification: (email: string) => Promise<AuthResult>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const signUp = useCallback(async (email: string, password: string, name?: string): Promise<AuthResult> => {
    if (!supabase) return { error: "Auth is not configured yet." };
    const { error } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
    return { error: error?.message };
  }, []);

  const signIn = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    if (!supabase) return { error: "Auth is not configured yet." };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message };
  }, []);

  const signInGoogle = useCallback(async (): Promise<AuthResult> => {
    if (!supabase) return { error: "Auth is not configured yet." };
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: typeof window !== "undefined" ? window.location.origin + "/account" : undefined },
    });
    return { error: error?.message };
  }, []);

  const signOut = useCallback(async () => { await supabase?.auth.signOut(); }, []);

  // Send a password-reset email; the link lands on /reset-password (recovery session).
  const resetPassword = useCallback(async (email: string): Promise<AuthResult> => {
    if (!supabase) return { error: "Auth is not configured yet." };
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: typeof window !== "undefined" ? window.location.origin + "/reset-password" : undefined,
    });
    return { error: error?.message };
  }, []);

  // Set a new password for the current (logged-in or recovery) session.
  const updatePassword = useCallback(async (password: string): Promise<AuthResult> => {
    if (!supabase) return { error: "Auth is not configured yet." };
    const { error } = await supabase.auth.updateUser({ password });
    return { error: error?.message };
  }, []);

  // Re-send the signup confirmation email.
  const resendVerification = useCallback(async (email: string): Promise<AuthResult> => {
    if (!supabase) return { error: "Auth is not configured yet." };
    const { error } = await supabase.auth.resend({
      type: "signup", email,
      options: { emailRedirectTo: typeof window !== "undefined" ? window.location.origin + "/account" : undefined },
    });
    return { error: error?.message };
  }, []);

  const value: AuthCtx = {
    ready: !!supabase,
    loading,
    user: session?.user ?? null,
    session,
    token: session?.access_token ?? null,
    signUp, signIn, signInGoogle, signOut,
    resetPassword, updatePassword, resendVerification,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
