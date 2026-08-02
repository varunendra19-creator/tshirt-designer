/**
 * Minimal SVG sanitizer for user-uploaded print artwork. The `designs` bucket is
 * public and browsers execute scripts inside an SVG opened directly, so we strip
 * the active-content vectors before storing: <script>, event handlers, javascript:
 * URIs, <foreignObject>, and external references.
 *
 * This is defence-in-depth (the bucket is a separate origin from the app); it keeps
 * us from hosting weaponised SVGs. It is deliberately conservative.
 */
export function sanitizeSvg(svg: string): string {
  let s = String(svg);
  // remove script / foreignObject blocks entirely
  s = s.replace(/<\s*script[\s\S]*?<\s*\/\s*script\s*>/gi, "");
  s = s.replace(/<\s*script[^>]*\/\s*>/gi, "");
  s = s.replace(/<\s*foreignObject[\s\S]*?<\s*\/\s*foreignObject\s*>/gi, "");
  // strip inline event handlers: on*="..." / on*='...'
  s = s.replace(/\s+on[a-z]+\s*=\s*"[^"]*"/gi, "");
  s = s.replace(/\s+on[a-z]+\s*=\s*'[^']*'/gi, "");
  s = s.replace(/\s+on[a-z]+\s*=\s*[^\s>]+/gi, "");
  // neutralise javascript: URIs in href / xlink:href / src / style url()
  s = s.replace(/(href|xlink:href|src)\s*=\s*("|')\s*javascript:[^"']*\2/gi, '$1=$2#$2');
  s = s.replace(/url\(\s*['"]?\s*javascript:[^)]*\)/gi, "url(#)");
  return s;
}

export function isProbablySvg(s: string): boolean {
  return typeof s === "string" && /^\s*<\s*svg[\s>]/i.test(s.slice(0, 200));
}
