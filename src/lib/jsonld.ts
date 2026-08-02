/**
 * Serialize an object for a <script type="application/ld+json"> tag.
 * JSON.stringify does NOT escape "<", so a value containing "</script>"
 * (e.g. a product name/description) could break out of the tag → XSS.
 * Escaping "<" (and the U+2028/U+2029 line separators JSON allows raw) closes it.
 */
export function safeJsonLd(obj: unknown): string {
  const s = JSON.stringify(obj);
  let out = "";
  for (const ch of s) {
    const code = ch.charCodeAt(0);
    if (ch === "<") out += "\\u003c";
    else if (code === 0x2028) out += "\\u2028";
    else if (code === 0x2029) out += "\\u2029";
    else out += ch;
  }
  return out;
}
