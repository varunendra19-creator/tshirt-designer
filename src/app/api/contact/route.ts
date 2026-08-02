import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { sendEmail } from "@/lib/email";
import { SUPPORT_EMAIL } from "@/lib/marketing";
import { rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

// POST { name, email, subject, message } — store the message and notify support (email is best-effort).
export async function POST(req: Request) {
  const limited = rateLimit(req, "contact", 5, 60_000); // 5/min/IP — anti-spam
  if (limited) return limited;
  const b = await req.json().catch(() => ({}));
  const name = String(b.name || "").trim().slice(0, 120);
  const email = String(b.email || "").trim().slice(0, 200);
  const subject = String(b.subject || "").trim().slice(0, 200) || "New enquiry";
  const message = String(b.message || "").trim().slice(0, 4000);

  if (!name || !message) return NextResponse.json({ error: "Please add your name and a message." }, { status: 422 });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ error: "Please enter a valid email." }, { status: 422 });

  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { error } = await supabase.from("contact_messages").insert({ name, email, subject, message });
    if (error) console.error("[contact] insert failed:", error.message);
  }

  // notify support (no-op unless email is configured); reply-to the sender so support can respond directly
  await sendEmail({
    to: SUPPORT_EMAIL,
    replyTo: email,
    subject: `[Contact] ${subject}`,
    html: `<p><b>From:</b> ${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;</p><p><b>Subject:</b> ${escapeHtml(subject)}</p><p style="white-space:pre-wrap">${escapeHtml(message)}</p>`,
  });

  return NextResponse.json({ ok: true });
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
