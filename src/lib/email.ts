/**
 * Transactional email — env-gated, dormant until a provider key + EMAIL_FROM are set.
 * Supports Resend (RESEND_API_KEY) or Brevo (BREVO_API_KEY); whichever is configured.
 * sendEmail NEVER throws — a failed/absent email must not break order placement.
 *
 * NOTE: password-reset and email-verification messages are sent by **Supabase Auth**
 * (configure the templates + SMTP in the Supabase dashboard), not through this module.
 */
export function emailEnabled(): boolean {
  return !!((process.env.RESEND_API_KEY || process.env.BREVO_API_KEY) && process.env.EMAIL_FROM);
}

// EMAIL_FROM may be "Campus Mode <orders@campusmode.in>" or just "orders@campusmode.in".
function parseFrom(): { name: string; email: string } {
  const raw = (process.env.EMAIL_FROM || "").trim();
  const m = raw.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  if (m) return { name: m[1] || "Campus Mode", email: m[2].trim() };
  return { name: "Campus Mode", email: raw };
}

type SendArgs = { to: string; subject: string; html: string; text?: string; replyTo?: string };
type SendResult = { ok: boolean; skipped?: boolean; id?: string; error?: string };

export async function sendEmail({ to, subject, html, text, replyTo }: SendArgs): Promise<SendResult> {
  if (!to || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) return { ok: false, error: "invalid recipient" };
  if (!emailEnabled()) {
    console.log(`[email skipped — not configured] "${subject}" → ${to}`);
    return { ok: false, skipped: true };
  }
  const from = parseFrom();
  const plain = text || html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  try {
    if (process.env.RESEND_API_KEY) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: `${from.name} <${from.email}>`, to, subject, html, text: plain, ...(replyTo ? { reply_to: replyTo } : {}) }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, error: d?.message || `resend ${res.status}` };
      return { ok: true, id: d?.id };
    }
    // Brevo
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": process.env.BREVO_API_KEY!, "Content-Type": "application/json", accept: "application/json" },
      body: JSON.stringify({ sender: from, to: [{ email: to }], subject, htmlContent: html, textContent: plain, ...(replyTo ? { replyTo: { email: replyTo } } : {}) }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: d?.message || `brevo ${res.status}` };
    return { ok: true, id: d?.messageId };
  } catch (e: any) {
    console.error("[email error]", e?.message || e);
    return { ok: false, error: e?.message || "send failed" };
  }
}
