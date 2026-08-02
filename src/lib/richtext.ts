/**
 * Rich-text helpers for product descriptions.
 * Descriptions may now contain limited HTML (bold/italic/lists/links). We
 * sanitise on save (server-authoritative) to a small allowlist, and strip to
 * plain text for meta descriptions + JSON-LD (which must never contain markup).
 */

const ALLOWED = new Set(["p", "br", "b", "strong", "i", "em", "u", "s", "ul", "ol", "li", "a", "h3", "h4", "blockquote"]);

export function sanitizeRichText(html: string): string {
  if (!html) return "";
  let s = String(html).slice(0, 20000);
  // drop dangerous blocks entirely
  s = s.replace(/<\s*(script|style|iframe|object|embed|link|meta|svg)[\s\S]*?<\s*\/\s*\1\s*>/gi, "");
  s = s.replace(/<\s*(script|style|iframe|object|embed|link|meta|svg)[^>]*\/?\s*>/gi, "");
  // strip inline event handlers + neutralise javascript: URIs
  s = s.replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  s = s.replace(/javascript:/gi, "");
  // keep only allowlisted tags (inner text of others is preserved)
  s = s.replace(/<\/?([a-z0-9]+)[^>]*>/gi, (m, tag) => {
    const name = String(tag).toLowerCase();
    if (!ALLOWED.has(name)) return "";
    if (name === "a" && !m.startsWith("</")) {
      const q = m.match(/href\s*=\s*("([^"]*)"|'([^']*)')/i);
      const url = q ? (q[2] ?? q[3] ?? "") : "";
      const safe = /^(https?:\/\/|mailto:|\/)/i.test(url) ? url : "#";
      return `<a href="${safe}" target="_blank" rel="noopener nofollow">`;
    }
    // all other allowed tags: drop every attribute
    return m.startsWith("</") ? `</${name}>` : `<${name}>`;
  });
  return s.trim();
}

/** HTML → plain text (for <meta description> and JSON-LD). */
export function stripHtml(html: string): string {
  return String(html || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}
