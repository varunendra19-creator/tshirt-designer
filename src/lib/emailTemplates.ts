/** Branded transactional-email HTML. Inline styles + table layout for email-client support. */

const BRAND = "#7c3aed";
const INK = "#1a1524";
const SOFT = "#6b6577";
const LINE = "#ece8f3";
const inr = (n: number) => "₹" + Math.round(n || 0).toLocaleString("en-IN");

export type EmailItem = { name: string; qty: number; size?: string | null; color?: string | null; line_total: number; is_custom?: boolean };
export type EmailOrder = {
  order_no: string;
  customer_name?: string | null;
  email?: string | null;
  address?: string | null; city?: string | null; state?: string | null; pincode?: string | null;
  payment_method?: string | null;
  subtotal?: number; shipping?: number; tax?: number; discount?: number; total: number;
  coupon_code?: string | null;
  carrier?: string | null; tracking_no?: string | null; tracking_url?: string | null;
  items?: EmailItem[];
};

function shell(preheader: string, heading: string, bodyHtml: string): string {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f5f3fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${INK}">
<span style="display:none;visibility:hidden;opacity:0;height:0;width:0;overflow:hidden">${preheader}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3fa;padding:24px 12px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid ${LINE}">
  <tr><td style="background:${BRAND};padding:22px 28px">
    <span style="font-size:20px;font-weight:800;color:#ffffff;letter-spacing:.3px">Campus Mode</span>
  </td></tr>
  <tr><td style="padding:28px 28px 8px">
    <h1 style="margin:0 0 6px;font-size:22px;font-weight:800;color:${INK}">${heading}</h1>
  </td></tr>
  <tr><td style="padding:0 28px 28px">${bodyHtml}</td></tr>
  <tr><td style="padding:18px 28px;background:#faf9fd;border-top:1px solid ${LINE};font-size:12px;color:${SOFT}">
    Campus Mode · College merch, printed on demand.<br/>
    Questions? Just reply to this email.
  </td></tr>
</table>
</td></tr></table></body></html>`;
}

function itemsTable(items: EmailItem[] = []): string {
  const rows = items.map((it) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid ${LINE};font-size:14px;color:${INK}">
        ${escapeHtml(it.name)}${it.is_custom ? ' <span style="color:' + BRAND + ';font-weight:700">· Custom</span>' : ""}
        <div style="font-size:12px;color:${SOFT}">${[it.size ? "Size " + escapeHtml(it.size) : "", "Qty " + it.qty].filter(Boolean).join(" · ")}</div>
      </td>
      <td style="padding:10px 0;border-bottom:1px solid ${LINE};font-size:14px;color:${INK};text-align:right;white-space:nowrap">${inr(it.line_total)}</td>
    </tr>`).join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>`;
}

function totalsBlock(o: EmailOrder): string {
  const row = (label: string, val: string, strong = false) =>
    `<tr><td style="padding:4px 0;font-size:14px;color:${strong ? INK : SOFT};${strong ? "font-weight:800" : ""}">${label}</td>
     <td style="padding:4px 0;font-size:14px;text-align:right;color:${strong ? INK : SOFT};${strong ? "font-weight:800" : ""}">${val}</td></tr>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px">
    ${o.subtotal != null ? row("Subtotal", inr(o.subtotal)) : ""}
    ${o.discount ? row(`Discount${o.coupon_code ? " (" + escapeHtml(o.coupon_code) + ")" : ""}`, "−" + inr(o.discount)) : ""}
    ${o.shipping != null ? row("Shipping", o.shipping ? inr(o.shipping) : "Free") : ""}
    ${o.tax ? row("incl. GST", inr(o.tax)) : ""}
    ${row("Total", inr(o.total), true)}
  </table>`;
}

function addressBlock(o: EmailOrder): string {
  if (!o.address) return "";
  const line = [o.address, [o.city, o.state].filter(Boolean).join(", "), o.pincode].filter(Boolean).join(" · ");
  return `<div style="margin-top:18px;padding:14px 16px;background:#faf9fd;border-radius:12px">
    <div style="font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:${SOFT};font-weight:700">Delivery address</div>
    <div style="margin-top:4px;font-size:14px;color:${INK}">${escapeHtml(o.customer_name || "")}<br/>${escapeHtml(line)}</div>
  </div>`;
}

export function orderConfirmationEmail(o: EmailOrder): { subject: string; html: string } {
  const method = (o.payment_method || "").toLowerCase() === "cod" ? "Cash on Delivery" : o.payment_method === "online" ? "Paid online" : (o.payment_method || "").toUpperCase();
  const body = `
    <p style="margin:0 0 4px;font-size:15px;color:${SOFT}">Hi ${escapeHtml((o.customer_name || "there").split(" ")[0])}, thanks for your order! We're getting it ready.</p>
    <div style="margin:16px 0;padding:12px 16px;background:#f3effe;border-radius:12px;font-size:14px">
      <b style="color:${INK}">Order #${escapeHtml(o.order_no)}</b>
      <span style="color:${SOFT}"> · ${method}</span>
    </div>
    ${itemsTable(o.items)}
    ${totalsBlock(o)}
    ${addressBlock(o)}
    <p style="margin:20px 0 0;font-size:13px;color:${SOFT}">Estimated delivery: 4–6 days. We'll email you the tracking details once it ships.</p>`;
  return { subject: `Order confirmed — #${o.order_no}`, html: shell(`Your Campus Mode order #${o.order_no} is confirmed`, "Order confirmed ✓", body) };
}

export function shippingUpdateEmail(o: EmailOrder): { subject: string; html: string } {
  const track = o.tracking_url
    ? `<a href="${escapeAttr(o.tracking_url)}" style="display:inline-block;margin-top:14px;background:${INK};color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 22px;border-radius:999px">Track your shipment</a>`
    : "";
  const body = `
    <p style="margin:0 0 4px;font-size:15px;color:${SOFT}">Good news ${escapeHtml((o.customer_name || "there").split(" ")[0])} — your order is on the way! 🚚</p>
    <div style="margin:16px 0;padding:14px 16px;background:#f3effe;border-radius:12px;font-size:14px">
      <b style="color:${INK}">Order #${escapeHtml(o.order_no)}</b><br/>
      ${o.carrier ? `<span style="color:${SOFT}">Carrier: </span><span style="color:${INK}">${escapeHtml(o.carrier)}</span><br/>` : ""}
      ${o.tracking_no ? `<span style="color:${SOFT}">Tracking #: </span><span style="color:${INK};font-weight:700">${escapeHtml(o.tracking_no)}</span>` : ""}
    </div>
    ${track}
    ${addressBlock(o)}`;
  return { subject: `Your order #${o.order_no} has shipped`, html: shell(`Order #${o.order_no} is on its way`, "Your order shipped 🚚", body) };
}

function escapeHtml(s: string): string {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/'/g, "&#39;");
}
