"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { AuthForm } from "@/components/site/AuthForm";
import {
  LayoutDashboard, ShoppingBag, Package, Tags, Users, BarChart3, TicketPercent, Star, LogOut,
} from "lucide-react";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/categories", label: "Categories", icon: Tags },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/reviews", label: "Reviews", icon: Star },
  { href: "/admin/reports", label: "Reports", icon: BarChart3 },
  { href: "/admin/coupons", label: "Coupons", icon: TicketPercent },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, loading, ready, token, signOut } = useAuth();
  const pathname = usePathname();
  const [state, setState] = useState<"loading" | "guest" | "forbidden" | "ok">("loading");
  const [role, setRole] = useState("");

  useEffect(() => {
    if (!ready) return;
    if (!token) { setState(user ? "loading" : "guest"); return; }
    fetch("/api/admin/me", { headers: { Authorization: `Bearer ${token}` } }).then(async (r) => {
      if (r.status === 200) { const d = await r.json(); setRole(d.role); setState("ok"); }
      else if (r.status === 403) setState("forbidden");
      else setState("guest");
    }).catch(() => setState("forbidden"));
  }, [ready, token, user]);

  if (!ready) return <Center>Admin isn’t configured yet.</Center>;
  if (loading || state === "loading") return <Center>Loading…</Center>;

  if (state === "guest") {
    return (
      <Center>
        <div className="w-full max-w-sm rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
          <h1 className="font-display mb-1 text-xl font-extrabold">Admin login</h1>
          <p className="mb-4 text-[13px] text-[var(--ink-soft)]">Log in with your admin account.</p>
          <AuthForm compact loginOnly />
        </div>
      </Center>
    );
  }
  if (state === "forbidden") {
    return (
      <Center>
        <div className="max-w-sm rounded-3xl border border-black/10 bg-white p-6 text-center shadow-sm">
          <p className="font-semibold">This account isn’t an admin.</p>
          <p className="mt-1 text-sm text-[var(--ink-soft)]">{user?.email}</p>
          <button onClick={signOut} className="mt-4 rounded-full border border-black/15 px-5 py-2 text-sm font-semibold">Sign out</button>
        </div>
      </Center>
    );
  }

  return (
    <div className="teevo flex min-h-screen" style={{ background: "var(--paper-2)", color: "var(--ink)" }}>
      {/* sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r bg-white md:flex" style={{ borderColor: "var(--line)" }}>
        <Link href="/" className="flex flex-col px-5 py-5 leading-none">
          <span className="font-display text-[20px] font-extrabold">Campus</span>
          <span className="font-display -mt-1.5 pl-7 text-[13px] font-semibold italic text-[var(--primary)]">Admin</span>
        </Link>
        <nav className="flex-1 space-y-1 px-3">
          {NAV.map((n) => {
            const active = n.exact ? pathname === n.href : pathname.startsWith(n.href);
            const Icon = n.icon;
            return (
              <Link key={n.href} href={n.href} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors"
                style={{ background: active ? "var(--primary)" : "transparent", color: active ? "#fff" : "var(--ink-2)" }}>
                <Icon size={18} /> {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t p-3" style={{ borderColor: "var(--line)" }}>
          <p className="px-2 pb-2 text-[11px] text-[var(--ink-soft)]">{role} · {user?.email}</p>
          <button onClick={signOut} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-[var(--ink-2)] hover:bg-[var(--paper-2)]">
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>

      {/* mobile top nav */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-1 overflow-x-auto border-b bg-white px-3 py-2 md:hidden" style={{ borderColor: "var(--line)" }}>
          {NAV.map((n) => {
            const active = n.exact ? pathname === n.href : pathname.startsWith(n.href);
            return (
              <Link key={n.href} href={n.href} className="shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold"
                style={{ background: active ? "var(--primary)" : "var(--paper-2)", color: active ? "#fff" : "var(--ink-2)" }}>
                {n.label}
              </Link>
            );
          })}
        </div>
        <main className="min-w-0 flex-1 p-5 md:p-8">{children}</main>
      </div>
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="teevo grid min-h-screen place-items-center p-5" style={{ background: "var(--paper-2)", color: "var(--ink)" }}>{children}</div>;
}
