import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { rateLimit } from "@/lib/rateLimit";
import { sanitizeSvg } from "@/lib/svgSanitize";

export const runtime = "nodejs";

// Per-asset size caps (decoded bytes). Rejects oversized uploads before storing.
const CAP = { svg: 2_000_000, hd: 12_000_000, preview: 4_000_000, shirt: 8_000_000 };

// Accepts one printed surface's assets and stores them in the `designs` bucket:
//   - svg  : print-ready vector (any DPI) — sanitised (no scripts/handlers)
//   - hd   : high-res PNG proof
//   - preview : small PNG for cart/admin display
// Returns their public URLs.
function decodeDataUrl(dataUrl: string): Buffer | null {
  const m = /^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/i.exec(dataUrl || "");
  return m ? Buffer.from(m[2], "base64") : null;
}

export async function POST(req: Request) {
  const limited = rateLimit(req, "design", 40, 60_000); // 40 uploads/min/IP
  if (limited) return limited;

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 501 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }
  const { designId, surface, svg, hd, preview, shirt } = body || {};
  if (!designId || !surface || !/^[a-z0-9_-]{1,64}$/i.test(designId) || !/^[a-z]{1,20}$/i.test(surface)) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const out: Record<string, string | null> = { svgUrl: null, hdUrl: null, previewUrl: null, shirtUrl: null };
  const pub = (path: string) => supabase.storage.from("designs").getPublicUrl(path).data.publicUrl;
  const tooBig = (n: number, cap: number) => n > cap;

  try {
    if (typeof svg === "string" && svg.trimStart().startsWith("<")) {
      if (tooBig(Buffer.byteLength(svg, "utf8"), CAP.svg)) return NextResponse.json({ error: "SVG too large" }, { status: 413 });
      const clean = sanitizeSvg(svg);
      const path = `${designId}/${surface}.svg`;
      const { error } = await supabase.storage.from("designs").upload(path, Buffer.from(clean, "utf8"), { contentType: "image/svg+xml", upsert: true });
      if (!error) out.svgUrl = pub(path);
    }
    const hdBuf = decodeDataUrl(hd);
    if (hdBuf) {
      if (tooBig(hdBuf.length, CAP.hd)) return NextResponse.json({ error: "HD image too large" }, { status: 413 });
      const path = `${designId}/${surface}-hd.png`;
      const { error } = await supabase.storage.from("designs").upload(path, hdBuf, { contentType: "image/png", upsert: true });
      if (!error) out.hdUrl = pub(path);
    }
    const prevBuf = decodeDataUrl(preview);
    if (prevBuf) {
      if (tooBig(prevBuf.length, CAP.preview)) return NextResponse.json({ error: "Preview too large" }, { status: 413 });
      const path = `${designId}/${surface}-preview.png`;
      const { error } = await supabase.storage.from("designs").upload(path, prevBuf, { contentType: "image/png", upsert: true });
      if (!error) out.previewUrl = pub(path);
    }
    const shirtBuf = decodeDataUrl(shirt);
    if (shirtBuf) {
      if (tooBig(shirtBuf.length, CAP.shirt)) return NextResponse.json({ error: "Image too large" }, { status: 413 });
      const ext = /^data:image\/jpeg/i.test(shirt) ? "jpg" : "png";
      const path = `${designId}/${surface}-shirt.${ext}`;
      const { error } = await supabase.storage.from("designs").upload(path, shirtBuf, { contentType: ext === "jpg" ? "image/jpeg" : "image/png", upsert: true });
      if (!error) out.shirtUrl = pub(path);
    }
  } catch (e) {
    console.error("[design] upload failed:", e);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, ...out });
}
