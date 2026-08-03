"use client";

/* ---------------------------------------------------------------------------
   Campus Mode — 2D T-Shirt Designer
   A flat-mockup editor: the realistic SVG garment sits behind a Fabric.js
   canvas that is aligned exactly to the printable area. Every design object
   (text / image / template) is a native Fabric object, so it drags, scales and
   rotates freely — and each of the four print surfaces (Front / Back / Left &
   Right sleeve) keeps its own independent design.
   Themed with the Campus Mode tokens (.teevo) so it matches the storefront.
--------------------------------------------------------------------------- */

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Type, Image as ImageIcon, LayoutTemplate, Shirt, Palette,
  Undo2, Redo2, Trash2, Copy, RotateCw, FlipHorizontal,
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight, ChevronsUp, ChevronsDown,
  Plus, Minus, Download, Eye, ShoppingCart, X, Check, Bold, Italic,
  Underline, AlignLeft, AlignCenter, AlignRight, Upload, Sparkles,
  CloudUpload, Layers,
} from "lucide-react";
import { SHIRT_COLORS, FONTS } from "@/lib/tshirtData";
import { TEMPLATE_DESIGNS, TEMPLATE_CATEGORIES } from "@/lib/templateDesigns";
import { useCart } from "@/context/CartContext";

/* ── real ghost-mannequin tee mockups (from awwfisaf.com) ──────────────────
   White base per gender/side; any colour is a multiply-tint over it, masked to
   the tee shape, so black/white photos drive the full palette realistically.
   print = chest/back print box as a fraction of the image. */
const REAL_TEES = {
  male: {
    label: "Men",
    front: { img: "/tees/male-white-front.webp", aspect: 1.1795, print: { x: 0.315, y: 0.25, w: 0.37, h: 0.40 } },
    back:  { img: "/tees/male-white-back.webp",  aspect: 1.1523, print: { x: 0.305, y: 0.20, w: 0.39, h: 0.46 } },
    // sleeve prints sit on the front photo's actual sleeves so it reads clearly
    sleeveLeft:  { x: 0.085, y: 0.245, w: 0.155, h: 0.135 },
    sleeveRight: { x: 0.760, y: 0.245, w: 0.155, h: 0.135 },
  },
  female: {
    label: "Women",
    front: { img: "/tees/female-white-front.webp", aspect: 1.0, print: { x: 0.35, y: 0.27, w: 0.30, h: 0.34 } },
    back:  { img: "/tees/female-white-back.webp",  aspect: 1.0, print: { x: 0.34, y: 0.22, w: 0.32, h: 0.40 } },
    sleeveLeft:  { x: 0.115, y: 0.255, w: 0.130, h: 0.110 },
    sleeveRight: { x: 0.755, y: 0.255, w: 0.130, h: 0.110 },
  },
} as const;
type Gender = keyof typeof REAL_TEES;

const loadImg = (src: string) => new Promise<HTMLImageElement>((res, rej) => {
  const im = new Image(); im.crossOrigin = "anonymous"; im.onload = () => res(im); im.onerror = rej; im.src = src;
});

const VIEWS = [
  { id: "front", label: "Front" },
  { id: "back", label: "Back" },
  { id: "left", label: "Left Sleeve" },
  { id: "right", label: "Right Sleeve" },
] as const;
type ViewId = (typeof VIEWS)[number]["id"];

const FABRIC_OPTS = [
  { gsm: "180 GSM", note: "Soft cotton", add: 0 },
  { gsm: "200 GSM", note: "Bio-washed", add: 80 },
  { gsm: "240 GSM", note: "Premium heavy", add: 150 },
];
const SIZES = ["S", "M", "L", "XL", "XXL"];
const BASE_PRICE = 399;
const PRINT_ADD: Record<string, number> = { front: 0, back: 49, left: 39, right: 39 };

// physical print-area size per surface (mm) — used to report real placement + 300 DPI targets
const PRINT_MM: Record<string, { w: number; h: number }> = {
  front: { w: 300, h: 400 }, back: { w: 300, h: 400 },
  left: { w: 90, h: 90 }, right: { w: 90, h: 90 },
};
const MM_PER_IN = 25.4;

const STAGE_W = 820; // base px width of the garment stage (design coordinate space)

function isLight(hex: string) {
  const c = hex.replace("#", "");
  const r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b > 140;
}

/* geometry of the current print surface, in base px */
type Stage = {
  pxW: number; pxH: number;
  print: { x: number; y: number; w: number; h: number };
  kind: "real" | "side"; img: string; side: "left" | "right" | null;
};
function stageFor(gender: Gender, view: ViewId): Stage {
  const g = REAL_TEES[gender];
  if (view === "left" || view === "right") {
    // real front photo, zoomed to the actual sleeve (see focus below); print on the sleeve
    const t = g.front;
    const pxW = STAGE_W, pxH = STAGE_W * t.aspect;
    const p = view === "left" ? g.sleeveLeft : g.sleeveRight;
    return { pxW, pxH, print: { x: p.x * pxW, y: p.y * pxH, w: p.w * pxW, h: p.h * pxH }, kind: "real", img: t.img, side: view };
  }
  const t = g[view];
  const pxW = STAGE_W, pxH = STAGE_W * t.aspect;
  const p = t.print;
  return { pxW, pxH, print: { x: p.x * pxW, y: p.y * pxH, w: p.w * pxW, h: p.h * pxH }, kind: "real", img: t.img, side: null };
}

const hasObjects = (json: any) => !!(json && json.objects && json.objects.length > 0);

type Tab = "product" | "text" | "upload" | "templates";

export function Customizer() {
  const { add, count } = useCart();
  const router = useRouter();

  const [gender, setGender] = useState<Gender>("male");
  const [color, setColor] = useState("#111111");
  const [view, setView] = useState<ViewId>("front");
  const [size, setSize] = useState("M");
  const [fabricIdx, setFabricIdx] = useState(0);
  const [tab, setTab] = useState<Tab>("product");
  const [mobileSheet, setMobileSheet] = useState<Tab | null>(null);

  const [ready, setReady] = useState(false);
  const [active, setActive] = useState<any>(null);
  const [, bump] = useState(0);
  const forceBump = useCallback(() => bump((n) => n + 1), []);
  const [printedViews, setPrintedViews] = useState<ViewId[]>(["front"]);
  const [scale, setScale] = useState(1);
  const [stage, setStage] = useState(() => stageFor("male", "front"));
  const [histState, setHistState] = useState({ pos: -1, len: 0 });
  const [toast, setToast] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [cartAdded, setCartAdded] = useState(false);
  const [savingCart, setSavingCart] = useState(false);

  const wrapRef = useRef<HTMLDivElement>(null);
  const centerRef = useRef<HTMLDivElement>(null);
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const fabricNS = useRef<any>(null);
  const fcRef = useRef<any>(null);
  const designs = useRef<Record<ViewId, any>>({ front: null, back: null, left: null, right: null });
  const viewRef = useRef<ViewId>("front");
  const genderRef = useRef<Gender>("male");
  const history = useRef<string[]>([]);
  const histPos = useRef(-1);

  /* ── init Fabric once ─────────────────────────────────────────────────── */
  useEffect(() => {
    let disposed = false;
    (async () => {
      const mod = await import("fabric");
      const fabric = (mod as any).fabric ?? mod;
      if (disposed || !canvasElRef.current) return;
      fabricNS.current = fabric;
      const st = stageFor(genderRef.current, viewRef.current);
      const fc = new fabric.Canvas(canvasElRef.current, {
        width: st.print.w,
        height: st.print.h,
        backgroundColor: "transparent",
        preserveObjectStacking: true,
        selection: true,
        enableRetinaScaling: false, // keep backing-store == logical size so pointer mapping stays exact under the CSS-scaled stage
      });
      fc.setDimensions({ width: st.print.w, height: st.print.h });
      // brand-coloured selection controls
      fabric.Object.prototype.set({
        transparentCorners: false,
        cornerColor: "#7c3aed",
        cornerStrokeColor: "#ffffff",
        borderColor: "#7c3aed",
        cornerSize: 12,
        cornerStyle: "circle",
        padding: 4,
        borderScaleFactor: 1.5,
      });

      const onSel = () => { setActive(fc.getActiveObject() ?? null); forceBump(); };
      fc.on("selection:created", onSel);
      fc.on("selection:updated", onSel);
      fc.on("selection:cleared", () => { setActive(null); forceBump(); });
      fc.on("object:moving", (e: any) => { clampObject(fc, e.target); forceBump(); });
      fc.on("object:scaling", forceBump);
      fc.on("object:rotating", forceBump);
      fc.on("object:modified", () => { pushHistory(); refreshPrinted(); });
      fc.on("object:added", () => { refreshPrinted(); });
      fc.on("object:removed", () => { refreshPrinted(); });

      fcRef.current = fc;
      if (process.env.NODE_ENV !== "production") (window as any).__cmFC = fc;
      setReady(true);
      pushHistory(); // baseline empty state
      requestAnimationFrame(() => fc.calcOffset());
    })();
    return () => {
      disposed = true;
      try { fcRef.current?.dispose(); } catch {}
      fcRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* keep object centres inside the print area */
  const clampObject = (fc: any, obj: any) => {
    if (!obj) return;
    obj.left = Math.max(0, Math.min(fc.getWidth(), obj.left));
    obj.top = Math.max(0, Math.min(fc.getHeight(), obj.top));
    obj.setCoords();
  };

  /* focus = the sub-region of the stage shown on screen. Sleeve views zoom into
     the sleeve so its print zone is big and obvious; front/back show the whole tee. */
  const focus = useMemo(() => {
    if (stage.side) {
      const p = stage.print;
      const padX = p.w * 0.6, padY = p.h * 0.7; // tighter crop → zoomed further into the sleeve
      const x = Math.max(0, p.x - padX), y = Math.max(0, p.y - padY);
      const w = Math.min(stage.pxW - x, p.w + padX * 2), h = Math.min(stage.pxH - y, p.h + padY * 2);
      return { x, y, w, h };
    }
    return { x: 0, y: 0, w: stage.pxW, h: stage.pxH };
  }, [stage]);

  /* ── responsive scaling (fixed intrinsic canvas, CSS-scaled stage) ─────── */
  useEffect(() => {
    const el = centerRef.current;
    if (!el) return;
    const compute = () => {
      const pad = 24;
      const availW = el.clientWidth - pad * 2;
      const availH = el.clientHeight - pad * 2;
      const s = Math.max(0.2, Math.min(availW / focus.w, availH / focus.h, stage.side ? 3.4 : 1.35));
      setScale(s);
      requestAnimationFrame(() => fcRef.current?.calcOffset());
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    window.addEventListener("scroll", () => fcRef.current?.calcOffset(), true);
    return () => ro.disconnect();
  }, [focus, stage.side]);

  /* ── history ──────────────────────────────────────────────────────────── */
  const syncCurrent = () => {
    const fc = fcRef.current; if (!fc) return;
    designs.current[viewRef.current] = fc.toJSON();
  };
  const pushHistory = () => {
    syncCurrent();
    const snap = JSON.stringify(designs.current);
    history.current = history.current.slice(0, histPos.current + 1);
    history.current.push(snap);
    if (history.current.length > 50) history.current.shift();
    histPos.current = history.current.length - 1;
    setHistState({ pos: histPos.current, len: history.current.length });
  };
  const restore = (idx: number) => {
    const snap = history.current[idx]; if (!snap) return;
    designs.current = JSON.parse(snap);
    histPos.current = idx;
    setHistState({ pos: idx, len: history.current.length });
    loadView(viewRef.current, false);
    refreshPrinted();
  };
  const undo = () => { if (histPos.current > 0) restore(histPos.current - 1); };
  const redo = () => { if (histPos.current < history.current.length - 1) restore(histPos.current + 1); };

  /* ── view / style geometry ────────────────────────────────────────────── */
  const applyGeometry = (v: ViewId) => {
    const fc = fcRef.current; if (!fc) return;
    const st = stageFor(genderRef.current, v);
    fc.setDimensions({ width: st.print.w, height: st.print.h });
    setStage(st);
  };
  const loadView = (v: ViewId, save = true) => {
    const fc = fcRef.current; if (!fc) return;
    if (save) syncCurrent();
    viewRef.current = v;
    applyGeometry(v);
    const json = designs.current[v];
    if (json) fc.loadFromJSON(json, () => { fc.renderAll(); requestAnimationFrame(() => fc.calcOffset()); });
    else { fc.clear(); fc.backgroundColor = "transparent"; fc.renderAll(); }
    setActive(null);
  };

  // switch print surface
  const switchView = (v: ViewId) => {
    if (v === viewRef.current) return;
    loadView(v, true);
    setView(v);
  };
  // switch men's / women's garment (front/back mockup + print rect differ)
  const changeGender = (g: Gender) => {
    genderRef.current = g;
    setGender(g);
    if (fcRef.current) { syncCurrent(); applyGeometry(viewRef.current); const j = designs.current[viewRef.current]; if (j) fcRef.current.loadFromJSON(j, () => fcRef.current.renderAll()); }
  };

  const refreshPrinted = () => {
    syncCurrent();
    const used = VIEWS.map((v) => v.id).filter((v) => hasObjects(designs.current[v]));
    setPrintedViews(used.length ? (used as ViewId[]) : []);
  };

  /* ── add / edit objects ───────────────────────────────────────────────── */
  const centre = () => { const fc = fcRef.current; return { x: fc.getWidth() / 2, y: fc.getHeight() / 2 }; };

  const addText = (opts: any = {}) => {
    const fc = fcRef.current, fabric = fabricNS.current; if (!fc) return;
    const c = centre();
    const t = new fabric.IText(opts.content ?? "Your Text", {
      left: c.x, top: c.y, originX: "center", originY: "center",
      fontFamily: opts.fontFamily ?? "Arial", fontSize: opts.fontSize ?? 34,
      fontWeight: opts.fontWeight ?? "bold", fontStyle: opts.fontStyle ?? "normal",
      fill: opts.fill ?? (isLight(color) ? "#1f2937" : "#ffffff"),
      textAlign: opts.textAlign ?? "center", underline: !!opts.underline,
      editable: true,
    });
    fc.add(t); fc.setActiveObject(t); fc.renderAll();
    setActive(t); pushHistory(); closeSheet();
  };

  const addImageFile = (file: File) => {
    const isSvg = file.type === "image/svg+xml" || /\.svg$/i.test(file.name);
    if (isSvg) {
      const r = new FileReader();
      r.onload = () => addSvg(String(r.result));      // vector → stays crisp at any print size
      r.readAsText(file);
    } else if (file.type.startsWith("image/")) {
      const r = new FileReader();
      r.onload = () => addImageUrl(String(r.result));  // base64 (not blob) so it embeds in the SVG/HD export
      r.readAsDataURL(file);
    }
  };
  const addImageUrl = (url: string) => {
    const fc = fcRef.current, fabric = fabricNS.current; if (!fc) return;
    fabric.Image.fromURL(url, (img: any) => {
      const c = centre();
      const max = Math.min(fc.getWidth(), fc.getHeight()) * 0.7;
      const s = Math.min(max / (img.width || max), max / (img.height || max), 1);
      img.set({ left: c.x, top: c.y, originX: "center", originY: "center", scaleX: s, scaleY: s });
      fc.add(img); fc.setActiveObject(img); fc.renderAll();
      setActive(img); pushHistory(); closeSheet();
    }, { crossOrigin: "anonymous" });
  };
  const addSvg = (svgText: string) => {
    const fc = fcRef.current, fabric = fabricNS.current; if (!fc) return;
    fabric.loadSVGFromString(svgText, (objects: any[], options: any) => {
      if (!objects || !objects.length) return;
      const obj = fabric.util.groupSVGElements(objects, options);
      const c = centre();
      const max = Math.min(fc.getWidth(), fc.getHeight()) * 0.7;
      const s = Math.min(max / (obj.width || max), max / (obj.height || max), 1);
      obj.set({ left: c.x, top: c.y, originX: "center", originY: "center", scaleX: s, scaleY: s });
      obj.isVector = true;
      fc.add(obj); fc.setActiveObject(obj); fc.renderAll();
      setActive(obj); pushHistory(); closeSheet();
    });
  };

  const addTemplate = (lines: any[]) => {
    const fc = fcRef.current, fabric = fabricNS.current; if (!fc) return;
    const objs = lines.map((ln, i) =>
      new fabric.IText(ln.text, {
        left: 0, top: i * (ln.size * 1.05), originX: "center", originY: "top",
        fontFamily: ln.font, fontSize: ln.size, fontWeight: ln.weight,
        fontStyle: ln.style ?? "normal", fill: ln.color, textAlign: "center",
      })
    );
    const group = new fabric.Group(objs, { originX: "center", originY: "center", left: centre().x, top: centre().y });
    // fit into ~75% of the print area
    const max = Math.min(fc.getWidth(), fc.getHeight()) * 0.78;
    const s = Math.min(max / (group.width || max), 1);
    group.scale(s);
    fc.add(group); fc.setActiveObject(group); fc.renderAll();
    setActive(group); pushHistory(); closeSheet();
  };

  const styleActive = (patch: Record<string, any>) => {
    const fc = fcRef.current, obj = fc?.getActiveObject(); if (!obj) return false;
    if (obj.type === "group") obj.getObjects().forEach((o: any) => o.set(patch));
    else obj.set(patch);
    obj.setCoords?.(); fc.renderAll(); forceBump(); pushHistory(); return true;
  };
  const withActive = (fn: (fc: any, obj: any) => void) => {
    const fc = fcRef.current, obj = fc?.getActiveObject(); if (!fc || !obj) return;
    fn(fc, obj); obj.setCoords?.(); fc.renderAll(); forceBump(); pushHistory();
  };
  const nudge = (dx: number, dy: number) => withActive((fc, o) => { o.left += dx; o.top += dy; clampObject(fc, o); });
  const scaleActive = (f: number) => withActive((_fc, o) => { o.scaleX = Math.max(0.05, o.scaleX * f); o.scaleY = Math.max(0.05, o.scaleY * f); });
  const rotateActive = (d: number) => withActive((_fc, o) => { o.angle = Math.round(((o.angle || 0) + d) % 360); });
  const flipActive = () => withActive((_fc, o) => { o.flipX = !o.flipX; });
  const setOpacityActive = (v: number) => withActive((_fc, o) => { o.opacity = v; });
  const forwardActive = () => withActive((fc, o) => fc.bringForward(o));
  const backwardActive = () => withActive((fc, o) => fc.sendBackwards(o));
  const centerHActive = () => withActive((fc, o) => { o.left = fc.getWidth() / 2; });
  const centerVActive = () => withActive((fc, o) => { o.top = fc.getHeight() / 2; });
  const duplicateActive = () => {
    const fc = fcRef.current, o = fc?.getActiveObject(); if (!fc || !o) return;
    o.clone((c: any) => { c.set({ left: o.left + 18, top: o.top + 18 }); fc.add(c); fc.setActiveObject(c); fc.renderAll(); setActive(c); pushHistory(); });
  };
  const deleteActive = () => { const fc = fcRef.current, o = fc?.getActiveObject(); if (!o) return; fc.remove(o); fc.discardActiveObject(); fc.renderAll(); setActive(null); pushHistory(); };

  const closeSheet = () => setMobileSheet(null);

  /* keyboard nudge / delete when a design is selected */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      const fc = fcRef.current; const o = fc?.getActiveObject(); if (!o) return;
      if (o.isEditing) return;
      const step = e.shiftKey ? 10 : 1;
      if (e.key === "ArrowUp") { nudge(0, -step); e.preventDefault(); }
      else if (e.key === "ArrowDown") { nudge(0, step); e.preventDefault(); }
      else if (e.key === "ArrowLeft") { nudge(-step, 0); e.preventDefault(); }
      else if (e.key === "ArrowRight") { nudge(step, 0); e.preventDefault(); }
      else if (e.key === "Delete" || e.key === "Backspace") { deleteActive(); e.preventDefault(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── compose full mock-up (shirt + print) into a PNG ──────────────────── */
  const composeView = useCallback(async (v: ViewId): Promise<string> => {
    const fc = fcRef.current; if (!fc) return "";
    if (v !== viewRef.current) loadView(v, true);
    const st = stageFor(genderRef.current, v);
    const mult = 2;
    const out = document.createElement("canvas");
    out.width = st.pxW * mult; out.height = st.pxH * mult;
    const ctx = out.getContext("2d")!;
    // draw garment — real photo, tinted to the chosen colour
    try {
      const im = await loadImg(st.img);
      ctx.drawImage(im, 0, 0, out.width, out.height);                   // white base (with fabric shading)
      if (color.toUpperCase() !== "#FFFFFF") {
        ctx.globalCompositeOperation = "multiply";                       // tint to chosen colour
        ctx.fillStyle = color; ctx.fillRect(0, 0, out.width, out.height);
        ctx.globalCompositeOperation = "destination-in";                 // clip tint back to the tee shape
        ctx.drawImage(im, 0, 0, out.width, out.height);
        ctx.globalCompositeOperation = "source-over";
      }
    } catch {}
    // draw the print on top
    const printUrl = fc.toDataURL({ format: "png", multiplier: mult });
    await new Promise<void>((res) => {
      const im = new Image();
      im.onload = () => { ctx.drawImage(im, st.print.x * mult, st.print.y * mult, st.print.w * mult, st.print.h * mult); res(); };
      im.onerror = () => res();
      im.src = printUrl;
    });
    return out.toDataURL("image/png");
  }, [color]);

  const openPreview = async () => { const url = await composeView(viewRef.current); setPreview(url); };
  const download = async () => {
    const url = await composeView(viewRef.current);
    const a = document.createElement("a"); a.href = url; a.download = `campus-mode-${view}-${Date.now()}.png`; a.click();
  };
  // small JPEG of the composed mockup, sized for the cart/checkout thumbnail
  const composeThumb = useCallback(async (): Promise<string> => {
    const full = await composeView(viewRef.current);
    if (!full) return "";
    return await new Promise<string>((res) => {
      const im = new Image();
      im.onload = () => {
        const w = 380, h = Math.round((im.height * w) / im.width);
        const c = document.createElement("canvas"); c.width = w; c.height = h;
        const ctx = c.getContext("2d")!;
        ctx.fillStyle = "#f4f0ff"; ctx.fillRect(0, 0, w, h);
        ctx.drawImage(im, 0, 0, w, h);
        res(c.toDataURL("image/jpeg", 0.82));
      };
      im.onerror = () => res(full);
      im.src = full;
    });
  }, [composeView]);

  // Compose a specific surface's design ON the shirt, fully offscreen (doesn't
  // disturb the live canvas) — used for a stable cart/checkout thumbnail.
  const composeSurfaceOnShirt = useCallback(async (surfaceId: ViewId): Promise<string> => {
    const fabric = fabricNS.current; if (!fabric) return "";
    const st = stageFor(genderRef.current, surfaceId);
    const json = designs.current[surfaceId] || { objects: [] };
    const el = document.createElement("canvas");
    const sc = new fabric.StaticCanvas(el, { width: st.print.w, height: st.print.h });
    await new Promise<void>((res) => sc.loadFromJSON(json, () => { sc.renderAll(); res(); }));
    const printUrl = sc.toDataURL({ format: "png", multiplier: 2 });
    sc.dispose();
    const mult = 2;
    const out = document.createElement("canvas"); out.width = st.pxW * mult; out.height = st.pxH * mult;
    const ctx = out.getContext("2d")!;
    try {
      const im = await loadImg(st.img);
      ctx.drawImage(im, 0, 0, out.width, out.height);
      if (color.toUpperCase() !== "#FFFFFF") {
        ctx.globalCompositeOperation = "multiply"; ctx.fillStyle = color; ctx.fillRect(0, 0, out.width, out.height);
        ctx.globalCompositeOperation = "destination-in"; ctx.drawImage(im, 0, 0, out.width, out.height);
        ctx.globalCompositeOperation = "source-over";
      }
    } catch {}
    await new Promise<void>((res) => { const p = new Image(); p.onload = () => { ctx.drawImage(p, st.print.x * mult, st.print.y * mult, st.print.w * mult, st.print.h * mult); res(); }; p.onerror = () => res(); p.src = printUrl; });
    return await new Promise<string>((res) => {
      const im = new Image();
      im.onload = () => {
        const w = 420, h = Math.round((im.height * w) / im.width);
        const c = document.createElement("canvas"); c.width = w; c.height = h;
        const cx = c.getContext("2d")!; cx.fillStyle = "#f4f0ff"; cx.fillRect(0, 0, w, h); cx.drawImage(im, 0, 0, w, h);
        res(c.toDataURL("image/jpeg", 0.85));
      };
      im.onerror = () => res(out.toDataURL("image/png"));
      im.src = out.toDataURL("image/png");
    });
  }, [color]);

  /* Build the full production spec: per printed surface → object list (text
     fonts/sizes/positions in mm + %, images, vectors), a print-ready SVG (vector),
     and a high-res PNG. Rendered offscreen so the live canvas isn't disturbed. */
  const buildDesignPackage = useCallback(async () => {
    const fabric = fabricNS.current; if (!fabric) return null;
    designs.current[viewRef.current] = fcRef.current?.toJSON();
    const used = VIEWS.filter((v) => hasObjects(designs.current[v.id]));
    const surfaces: any[] = [];
    for (const v of used) {
      const st = stageFor(genderRef.current, v.id);
      const json = designs.current[v.id];
      const el = document.createElement("canvas");
      const sc = new fabric.StaticCanvas(el, { width: st.print.w, height: st.print.h });
      await new Promise<void>((res) => sc.loadFromJSON(json, () => { sc.renderAll(); res(); }));
      const W = sc.getWidth(), H = sc.getHeight();
      const mm = PRINT_MM[v.id] || PRINT_MM.front;
      const spec = sc.getObjects().map((o: any) => {
        const sw = o.getScaledWidth?.() ?? 0, sh = o.getScaledHeight?.() ?? 0;
        const isText = o.type === "i-text" || o.type === "text" || o.type === "textbox";
        const b: any = {
          type: isText ? "text" : o.type === "image" ? "image" : o.isVector ? "vector" : o.type,
          x_mm: +((o.left / W) * mm.w).toFixed(1),
          y_mm: +((o.top / H) * mm.h).toFixed(1),
          w_mm: +((sw / W) * mm.w).toFixed(1),
          h_mm: +((sh / H) * mm.h).toFixed(1),
          x_pct: +((o.left / W) * 100).toFixed(1),
          y_pct: +((o.top / H) * 100).toFixed(1),
          angle: Math.round(o.angle || 0),
        };
        if (isText) {
          const effPx = (o.fontSize || 0) * (o.scaleY || 1);
          b.text = o.text;
          b.font_family = o.fontFamily;
          b.font_size_pt = +(((effPx / H) * mm.h) / 0.3528).toFixed(1);
          b.font_weight = o.fontWeight;
          b.font_style = o.fontStyle;
          b.underline = !!o.underline;
          b.color = o.fill;
          b.align = o.textAlign;
        }
        if (o.type === "image") {
          b.natural_px = { w: o._element?.naturalWidth || o.width, h: o._element?.naturalHeight || o.height };
        }
        return b;
      });
      const svg = sc.toSVG();
      const mult = Math.min(9, Math.max(3, Math.round(2000 / Math.max(W, H))));
      const hd = sc.toDataURL({ format: "png", multiplier: mult });
      const preview = sc.toDataURL({ format: "png", multiplier: 2 });
      sc.dispose();
      surfaces.push({
        id: v.id, label: v.label, print_mm: mm,
        print_px_300dpi: { w: Math.round((mm.w / MM_PER_IN) * 300), h: Math.round((mm.h / MM_PER_IN) * 300) },
        spec, svg, hd, preview,
      });
    }
    const colorName = SHIRT_COLORS.find((c) => c.value.toLowerCase() === color.toLowerCase())?.name || color;
    const meta = {
      fit: gender === "male" ? "Men" : "Women",
      color_hex: color, color_name: colorName,
      size, fabric: FABRIC_OPTS[fabricIdx].gsm, fabric_note: FABRIC_OPTS[fabricIdx].note,
      print_areas: used.map((v) => v.label),
    };
    return { meta, surfaces };
  }, [color, gender, size, fabricIdx]);

  const addToCart = async () => {
    if (savingCart) return;
    setSavingCart(true);
    const pkg = await buildDesignPackage();
    const designId = `d_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    const surfacesOut: any[] = [];
    for (const s of pkg?.surfaces ?? []) {
      const base = { id: s.id, label: s.label, print_mm: s.print_mm, print_px_300dpi: s.print_px_300dpi, spec: s.spec };
      const shirt = await composeSurfaceOnShirt(s.id as ViewId); // this side shown ON the shirt
      try {
        const res = await fetch("/api/design", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ designId, surface: s.id, svg: s.svg, hd: s.hd, preview: s.preview, shirt }),
        });
        const d = await res.json().catch(() => ({}));
        surfacesOut.push({ ...base, svg_url: d.svgUrl ?? null, hd_url: d.hdUrl ?? null, preview_url: d.previewUrl ?? null, shirt_url: d.shirtUrl ?? null });
      } catch {
        surfacesOut.push(base);
      }
    }
    // thumbnail = the FRONT of the shirt (hero view), or the first printed surface — never just "the last view"
    const hero = (hasObjects(designs.current.front) ? "front" : VIEWS.find((v) => hasObjects(designs.current[v.id]))?.id) as ViewId | undefined;
    const thumb = hero ? await composeSurfaceOnShirt(hero) : await composeThumb();
    const id = `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    const name = `Custom ${gender === "male" ? "Men’s" : "Women’s"} Tee`;
    add({ id, size, color, qty: 1, custom: { name, image: thumb, price, meta: pkg?.meta, surfaces: surfacesOut } });
    setSavingCart(false);
    setCartAdded(true);
  };
  const openCart = () => { setCartAdded(false); setCartOpen(true); };

  /* ── derived ──────────────────────────────────────────────────────────── */
  const price = useMemo(() => {
    let p = BASE_PRICE + FABRIC_OPTS[fabricIdx].add;
    printedViews.forEach((v) => (p += PRINT_ADD[v] ?? 0));
    return p;
  }, [fabricIdx, printedViews]);

  const canUndo = histState.pos > 0;
  const canRedo = histState.pos < histState.len - 1;

  const isImg = active && active.type === "image";
  const isText = active && (active.type === "i-text" || active.type === "text" || active.type === "textbox");

  /* ── garment background for the current view ──────────────────────────── */
  const isWhite = color.toUpperCase() === "#FFFFFF" || color.toUpperCase() === "#FFF";

  /* ======================================================================= */
  return (
    <div className="teevo flex h-[100dvh] w-full flex-col overflow-hidden" style={{ background: "var(--paper-2)", color: "var(--ink)" }}>
      {/* ── TOP BAR ─────────────────────────────────────────────────────── */}
      <header className="flex shrink-0 items-center gap-2 border-b bg-white px-3 py-2.5 md:gap-4 md:px-5" style={{ borderColor: "var(--line)" }}>
        <Link href="/" className="flex shrink-0 flex-col leading-none">
          <span className="font-display text-[19px] font-extrabold tracking-tight md:text-[22px]">Campus</span>
          <span className="font-display -mt-1.5 pl-6 text-[13px] font-semibold italic text-[var(--primary)] md:pl-8 md:text-[15px]">Mode</span>
        </Link>

        <div className="ml-auto flex items-center gap-1.5 md:gap-2">
          <IconGhost title="Undo" disabled={!canUndo} onClick={undo}><Undo2 size={17} /></IconGhost>
          <IconGhost title="Redo" disabled={!canRedo} onClick={redo}><Redo2 size={17} /></IconGhost>
          <div className="mx-1 hidden h-6 w-px md:block" style={{ background: "var(--line)" }} />
          <button onClick={openPreview} className="hidden items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-semibold md:flex" style={{ borderColor: "var(--line)", color: "var(--ink-2)" }}>
            <Eye size={16} /> Preview
          </button>
          <button onClick={download} title="Download" className="flex h-9 w-9 items-center justify-center rounded-full border md:h-auto md:w-auto md:px-3.5 md:py-2" style={{ borderColor: "var(--line)", color: "var(--ink-2)" }}>
            <Download size={16} />
          </button>
          <Link href="/cart" title="View cart" className="relative flex h-9 w-9 items-center justify-center rounded-full border" style={{ borderColor: "var(--line)", color: "var(--ink-2)" }}>
            <ShoppingCart size={16} />
            {count > 0 && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white" style={{ background: "var(--accent)" }}>{count}</span>}
          </Link>
          <button onClick={openCart} className="flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-bold text-white shadow-sm" style={{ background: "var(--primary)" }}>
            <ShoppingCart size={16} /> Add to Cart
          </button>
        </div>
      </header>

      {/* mobile view tabs */}
      <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-b bg-white px-3 py-2 md:hidden" style={{ borderColor: "var(--line)" }}>
        {VIEWS.map((v) => {
          const on = view === v.id;
          return (
            <button key={v.id} onClick={() => switchView(v.id)} className="relative shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-semibold"
              style={{ background: on ? "var(--primary)" : "var(--paper-2)", color: on ? "#fff" : "var(--ink-2)" }}>
              {v.label}
              {printedViews.includes(v.id) && <span className="absolute -right-0 -top-0 h-1.5 w-1.5 rounded-full" style={{ background: "var(--aqua)" }} />}
            </button>
          );
        })}
      </div>

      <div className="flex min-h-0 flex-1">
        {/* ── LEFT TOOLS (desktop) ──────────────────────────────────────── */}
        <aside className="hidden w-[300px] shrink-0 flex-col border-r bg-white md:flex" style={{ borderColor: "var(--line)" }}>
          <div className="flex shrink-0 gap-1 border-b p-2" style={{ borderColor: "var(--line)" }}>
            {([["product", Shirt, "Product"], ["text", Type, "Text"], ["upload", ImageIcon, "Upload"], ["templates", LayoutTemplate, "Templates"]] as const).map(([id, Ic, label]) => {
              const on = tab === id;
              return (
                <button key={id} onClick={() => setTab(id)} className="flex flex-1 flex-col items-center gap-1 rounded-xl py-2 text-[11px] font-semibold transition-all"
                  style={{ background: on ? "var(--paper-2)" : "transparent", color: on ? "var(--primary)" : "var(--ink-soft)" }}>
                  <Ic size={18} /> {label}
                </button>
              );
            })}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <ToolPanel
              tab={tab}
              gender={gender} color={color} size={size} fabricIdx={fabricIdx}
              onGender={changeGender} onColor={setColor} onSize={setSize} onFabric={setFabricIdx}
              onAddText={addText} onAddImageFile={addImageFile} onAddTemplate={addTemplate}
              hasSelection={!!active} isText={!!isText} onStyleActive={styleActive}
            />
          </div>
        </aside>

        {/* ── CENTER COLUMN (view tabs + stage) ─────────────────────────── */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {/* view tabs, right above the canvas (desktop) */}
          <div className="hidden shrink-0 items-center justify-center border-b bg-white px-3 py-2.5 md:flex" style={{ borderColor: "var(--line)" }}>
            <div className="flex items-center gap-1 rounded-full p-1" style={{ background: "var(--paper-2)" }}>
              {VIEWS.map((v) => {
                const on = view === v.id;
                const used = printedViews.includes(v.id);
                return (
                  <button key={v.id} onClick={() => switchView(v.id)}
                    className="relative rounded-full px-5 py-1.5 text-[13px] font-semibold transition-all"
                    style={{ background: on ? "var(--primary)" : "transparent", color: on ? "#fff" : "var(--ink-2)" }}>
                    {v.label}
                    {used && <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full" style={{ background: on ? "#fff" : "var(--aqua)" }} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* stage */}
          <main ref={centerRef} className="relative flex flex-1 items-center justify-center overflow-hidden p-4"
            style={{ background: "radial-gradient(circle at 50% 30%, #ffffff 0%, var(--paper-2) 70%)" }}>
            <div ref={wrapRef} className="relative overflow-hidden" style={{ width: focus.w * scale, height: focus.h * scale }}>
            <div className="absolute" style={{ left: -focus.x * scale, top: -focus.y * scale, width: stage.pxW, height: stage.pxH, transform: `scale(${scale})`, transformOrigin: "0 0" }}
              onPointerDown={() => fcRef.current?.calcOffset()}>
              {/* garment — real ghost-mannequin photo, tinted to the chosen colour */}
              <div className="pointer-events-none absolute inset-0 select-none">
                {/* soft contact shadow */}
                <div className="absolute left-1/2 top-[86%] h-[6%] w-[52%] -translate-x-1/2 rounded-[50%]" style={{ background: "rgba(31,41,55,0.16)", filter: "blur(8px)" }} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={stage.img} alt="T-shirt" className="absolute inset-0 h-full w-full object-contain" draggable={false} />
                {/* colour tint — masked to the tee shape, multiply keeps fabric shading. skipped for pure white */}
                {!isWhite && (
                  <div className="absolute inset-0" style={{
                    background: color, mixBlendMode: "multiply",
                    WebkitMaskImage: `url(${stage.img})`, maskImage: `url(${stage.img})`,
                    WebkitMaskSize: "100% 100%", maskSize: "100% 100%",
                    WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat",
                  }} />
                )}
              </div>
              {/* print-area guide */}
              <div className="pointer-events-none absolute flex items-center justify-center rounded-md" style={{
                left: stage.print.x, top: stage.print.y, width: stage.print.w, height: stage.print.h,
                border: active ? "1.5px dashed rgba(124,58,237,0.7)" : "1.5px dashed rgba(124,58,237,0.5)",
                background: active ? "transparent" : "rgba(124,58,237,0.12)",
                boxShadow: active ? "none" : "0 0 0 1px rgba(255,255,255,0.35)",
              }}>
                {!active && (
                  <span className="select-none px-1 text-center font-semibold uppercase tracking-wide text-[var(--primary)]"
                    style={{ fontSize: Math.max(9, Math.min(stage.print.w * 0.09, 13)) }}>
                    Print here
                  </span>
                )}
              </div>
              {/* fabric canvas overlay */}
              <div className="absolute" style={{ left: stage.print.x, top: stage.print.y, width: stage.print.w, height: stage.print.h }}>
                <canvas ref={canvasElRef} />
              </div>
            </div>
          </div>

          {!ready && <div className="absolute inset-0 flex items-center justify-center text-sm" style={{ color: "var(--ink-soft)" }}>Loading designer…</div>}

          {/* floating object toolbar (all breakpoints) */}
          {active && (
            <ObjectBar
              isImg={!!isImg} opacity={active.opacity ?? 1}
              onNudge={nudge} onScale={scaleActive} onRotate={rotateActive} onFlip={flipActive}
              onForward={forwardActive} onBackward={backwardActive} onCenterH={centerHActive} onCenterV={centerVActive}
              onDuplicate={duplicateActive} onDelete={deleteActive} onOpacity={setOpacityActive}
            />
          )}
          </main>
        </div>

        {/* ── RIGHT: quick help (desktop) ───────────────────────────────── */}
        <aside className="hidden w-[220px] shrink-0 flex-col gap-3 border-l bg-white p-4 lg:flex" style={{ borderColor: "var(--line)" }}>
          <button onClick={openPreview} className="flex items-center justify-center gap-2 rounded-xl border py-2.5 text-[13px] font-semibold" style={{ borderColor: "var(--line)", color: "var(--ink-2)" }}>
            <Eye size={15} /> Preview design
          </button>
          <div className="rounded-2xl p-3 text-[12px] leading-relaxed" style={{ background: "var(--paper-2)", color: "var(--ink-2)" }}>
            <p className="mb-1.5 flex items-center gap-1.5 font-bold" style={{ color: "var(--primary)" }}><Sparkles size={13} /> Tips</p>
            Drag to move anywhere · corner handles to resize/rotate · arrow keys to nudge · switch <b>Front / Back / Sleeves</b> above — each keeps its own design. Choose <b>size &amp; fabric</b> when you hit Add to Cart.
          </div>
        </aside>
      </div>

      {/* ── MOBILE BOTTOM TOOLBAR ─────────────────────────────────────────── */}
      <nav className="flex shrink-0 items-stretch border-t bg-white md:hidden" style={{ borderColor: "var(--line)" }}>
        {([["product", Shirt, "Product"], ["text", Type, "Text"], ["upload", ImageIcon, "Upload"], ["templates", LayoutTemplate, "Design"]] as const).map(([id, Ic, label]) => (
          <button key={id} onClick={() => setMobileSheet(id)} className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-semibold" style={{ color: "var(--ink-2)" }}>
            <Ic size={19} /> {label}
          </button>
        ))}
      </nav>

      {/* mobile bottom sheet */}
      {mobileSheet && (
        <div className="fixed inset-0 z-40 flex flex-col justify-end md:hidden" onClick={closeSheet}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative max-h-[72dvh] overflow-y-auto rounded-t-3xl bg-white p-4 pb-6" onClick={(e) => e.stopPropagation()} style={{ animation: "sheetUp .22s ease" }}>
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full" style={{ background: "var(--line)" }} />
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-lg font-extrabold capitalize">{mobileSheet === "templates" ? "Designs" : mobileSheet}</h3>
              <button onClick={closeSheet} className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: "var(--paper-2)" }}><X size={16} /></button>
            </div>
            <ToolPanel
              tab={mobileSheet}
              gender={gender} color={color} size={size} fabricIdx={fabricIdx}
              onGender={changeGender} onColor={setColor} onSize={setSize} onFabric={setFabricIdx}
              onAddText={addText} onAddImageFile={addImageFile} onAddTemplate={addTemplate}
              hasSelection={!!active} isText={!!isText} onStyleActive={styleActive}
            />
          </div>
        </div>
      )}

      {/* ── PREVIEW MODAL ─────────────────────────────────────────────────── */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-xl font-extrabold">Your Design · {VIEWS.find((v) => v.id === view)?.label}</h3>
              <button onClick={() => setPreview(null)} className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: "var(--paper-2)" }}><X size={16} /></button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Design preview" className="mx-auto max-h-[50dvh] w-auto rounded-xl" style={{ background: "var(--paper-2)" }} />
            <div className="mt-4 flex items-center justify-end gap-2">
              <button onClick={download} className="flex items-center gap-1.5 rounded-full border px-4 py-2.5 text-sm font-semibold" style={{ borderColor: "var(--line)" }}><Download size={15} /> Save</button>
              <button onClick={() => { setPreview(null); openCart(); }} className="flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-bold text-white" style={{ background: "var(--primary)" }}><ShoppingCart size={15} /> Add to Cart</button>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD TO CART MODAL (pick size + fabric, then see price) ─────────── */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" onClick={() => setCartOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm overflow-hidden rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()} style={{ animation: "sheetUp .22s ease" }}>
            {!cartAdded ? (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-display text-xl font-extrabold">Almost done 🎉</h3>
                  <button onClick={() => setCartOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: "var(--paper-2)" }}><X size={16} /></button>
                </div>

                <SizeFabricPicker size={size} fabricIdx={fabricIdx} onSize={setSize} onFabric={setFabricIdx} />

                {/* price breakdown */}
                <div className="mt-4 rounded-2xl p-4 text-white" style={{ background: "var(--grad-hero)" }}>
                  <div className="space-y-1 text-[12px] text-white/85">
                    <Row l={`Base tee · ${size}`} r={`₹${BASE_PRICE}`} />
                    {FABRIC_OPTS[fabricIdx].add > 0 && <Row l={FABRIC_OPTS[fabricIdx].gsm} r={`+₹${FABRIC_OPTS[fabricIdx].add}`} />}
                    {printedViews.filter((v) => v !== "front").map((v) => <Row key={v} l={{ back: "Back print", left: "Left sleeve", right: "Right sleeve" }[v] as string} r={`+₹${v === "back" ? 49 : 39}`} />)}
                  </div>
                  <div className="mt-3 flex items-end justify-between border-t border-white/20 pt-3">
                    <span className="text-[11px] uppercase tracking-widest text-white/70">Total</span>
                    <span className="font-display text-3xl font-extrabold leading-none">₹{price}</span>
                  </div>
                </div>

                <button onClick={addToCart} disabled={savingCart} className="mt-4 flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-bold text-white shadow-md disabled:opacity-70" style={{ background: "var(--primary)" }}>
                  <ShoppingCart size={17} /> {savingCart ? "Saving design…" : `Add to Cart · ₹${price}`}
                </button>
                <p className="mt-2 text-center text-[11px]" style={{ color: "var(--ink-soft)" }}>Free shipping over ₹999 · 7-day easy returns</p>
              </>
            ) : (
              /* ── success step → route to checkout ── */
              <div className="py-2 text-center">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full" style={{ background: "rgba(52,211,153,0.15)" }}>
                  <Check size={30} className="text-[var(--mint)]" />
                </div>
                <h3 className="font-display text-xl font-extrabold">Added to cart!</h3>
                <p className="mt-1 text-[13px]" style={{ color: "var(--ink-2)" }}>{size} · {FABRIC_OPTS[fabricIdx].gsm} · <b>₹{price}</b></p>

                <button onClick={() => router.push("/checkout")} className="mt-5 flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-bold text-white shadow-md" style={{ background: "var(--primary)" }}>
                  Proceed to Checkout <ArrowRight size={16} />
                </button>
                <button onClick={() => router.push("/cart")} className="mt-2 flex w-full items-center justify-center gap-2 rounded-full border py-3 text-sm font-semibold" style={{ borderColor: "var(--line)", color: "var(--ink-2)" }}>
                  <ShoppingCart size={15} /> View Cart ({count})
                </button>
                <button onClick={() => { setCartOpen(false); setCartAdded(false); }} className="mt-2 w-full py-2 text-[13px] font-semibold" style={{ color: "var(--ink-soft)" }}>
                  Keep designing
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* toast */}
      {toast && (
        <div className="fixed bottom-20 left-1/2 z-[60] -translate-x-1/2 md:bottom-6">
          <div className="flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-white shadow-lg" style={{ background: "var(--ink)" }}>
            <Check size={16} className="text-[var(--mint)]" /> {toast}
          </div>
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*,.svg" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) addImageFile(f); e.target.value = ""; }} />
      <style jsx global>{`
        @keyframes sheetUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .teevo input[type="range"] { accent-color: var(--primary); }
      `}</style>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Small presentational helpers
   ───────────────────────────────────────────────────────────────────────── */

function IconGhost({ children, title, onClick, disabled }: { children: React.ReactNode; title: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button title={title} onClick={onClick} disabled={disabled}
      className="flex h-9 w-9 items-center justify-center rounded-full transition-all disabled:opacity-30"
      style={{ color: "var(--ink-2)" }}
      onMouseEnter={(e) => { if (!disabled) (e.currentTarget as HTMLElement).style.background = "var(--paper-2)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
      {children}
    </button>
  );
}

function ObjectBar(props: {
  isImg: boolean; opacity: number;
  onNudge: (dx: number, dy: number) => void; onScale: (f: number) => void; onRotate: (d: number) => void; onFlip: () => void;
  onForward: () => void; onBackward: () => void; onCenterH: () => void; onCenterV: () => void;
  onDuplicate: () => void; onDelete: () => void; onOpacity: (v: number) => void;
}) {
  const B = ({ children, title, onClick, danger }: any) => (
    <button title={title} onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded-lg transition-all"
      style={{ background: danger ? "rgba(239,68,68,0.1)" : "var(--paper-2)", color: danger ? "#ef4444" : "var(--ink-2)" }}>
      {children}
    </button>
  );
  return (
    <div className="absolute bottom-3 left-1/2 z-30 -translate-x-1/2">
      <div className="flex max-w-[94vw] items-center gap-1 overflow-x-auto rounded-2xl border bg-white/95 p-1.5 shadow-xl backdrop-blur" style={{ borderColor: "var(--line)" }}>
        <div className="flex items-center gap-0.5 rounded-xl p-0.5" style={{ background: "var(--paper-2)" }}>
          <B title="Left" onClick={() => props.onNudge(-2, 0)}><ArrowLeft size={16} /></B>
          <div className="flex flex-col">
            <B title="Up" onClick={() => props.onNudge(0, -2)}><ArrowUp size={16} /></B>
            <B title="Down" onClick={() => props.onNudge(0, 2)}><ArrowDown size={16} /></B>
          </div>
          <B title="Right" onClick={() => props.onNudge(2, 0)}><ArrowRight size={16} /></B>
        </div>
        <Sep />
        <B title="Smaller" onClick={() => props.onScale(0.9)}><Minus size={16} /></B>
        <B title="Bigger" onClick={() => props.onScale(1.1)}><Plus size={16} /></B>
        <B title="Rotate" onClick={() => props.onRotate(15)}><RotateCw size={16} /></B>
        <B title="Flip" onClick={props.onFlip}><FlipHorizontal size={16} /></B>
        <Sep />
        <B title="Bring forward" onClick={props.onForward}><ChevronsUp size={16} /></B>
        <B title="Send back" onClick={props.onBackward}><ChevronsDown size={16} /></B>
        <B title="Center H" onClick={props.onCenterH}><AlignCenter size={16} /></B>
        <Sep />
        <B title="Duplicate" onClick={props.onDuplicate}><Copy size={16} /></B>
        <B title="Delete" danger onClick={props.onDelete}><Trash2 size={16} /></B>
      </div>
    </div>
  );
}
const Sep = () => <div className="mx-0.5 h-6 w-px shrink-0" style={{ background: "var(--line)" }} />;

const Row = ({ l, r }: { l: string; r: string }) => (
  <div className="flex items-center justify-between"><span>{l}</span><span className="font-semibold">{r}</span></div>
);

/* ── the tab content, shared by desktop sidebar + mobile sheet ──────────── */
function ToolPanel(props: {
  tab: Tab;
  gender: Gender; color: string; size: string; fabricIdx: number;
  onGender: (g: Gender) => void; onColor: (c: string) => void; onSize: (s: string) => void; onFabric: (i: number) => void;
  onAddText: (o: any) => void; onAddImageFile: (f: File) => void; onAddTemplate: (lines: any[]) => void;
  hasSelection: boolean; isText: boolean; onStyleActive: (patch: Record<string, any>) => boolean;
}) {
  const { tab } = props;
  if (tab === "product") return <ProductPanel {...props} />;
  if (tab === "text") return <TextPanel {...props} />;
  if (tab === "upload") return <UploadPanel {...props} />;
  return <TemplatesPanel {...props} />;
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="mb-2 mt-4 text-[11px] font-bold uppercase tracking-widest first:mt-0" style={{ color: "var(--ink-soft)" }}>{children}</p>;
}

function ProductPanel({ gender, color, size, fabricIdx, onGender, onColor, onSize, onFabric }: any) {
  return (
    <div>
      <Label>Fit</Label>
      <div className="grid grid-cols-2 gap-2">
        {(["male", "female"] as Gender[]).map((g) => {
          const active = gender === g;
          return (
            <button key={g} onClick={() => onGender(g)}
              className="flex items-center justify-center gap-2 overflow-hidden rounded-xl border p-2 text-[12px] font-bold transition-all"
              style={{ borderColor: active ? "var(--primary)" : "var(--line)", background: active ? "rgba(124,58,237,0.06)" : "#fff", color: active ? "var(--primary)" : "var(--ink-2)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={REAL_TEES[g].front.img} alt={REAL_TEES[g].label} className="h-10 w-10 object-contain" />
              {REAL_TEES[g].label}
            </button>
          );
        })}
      </div>

      <Label>Colour</Label>
      <div className="flex flex-wrap gap-2">
        {SHIRT_COLORS.map((c) => (
          <button key={c.value} title={c.name} onClick={() => onColor(c.value)}
            className="h-8 w-8 rounded-full transition-transform"
            style={{ background: c.value, border: color === c.value ? "2.5px solid var(--primary)" : `1.5px solid ${c.border ?? "rgba(0,0,0,0.1)"}`, transform: color === c.value ? "scale(1.12)" : "scale(1)" }} />
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2 rounded-xl border p-2" style={{ borderColor: "var(--line)" }}>
        <input type="color" value={color} onChange={(e) => onColor(e.target.value)} className="h-8 w-8 shrink-0 cursor-pointer rounded" style={{ border: "none", background: "transparent" }} />
        <span className="text-xs" style={{ color: "var(--ink-2)" }}>Custom colour</span>
        <span className="ml-auto font-mono text-xs" style={{ color: "var(--ink-soft)" }}>{color}</span>
      </div>

      <div className="mt-4 rounded-xl p-3 text-[12px] leading-relaxed" style={{ background: "var(--paper-2)", color: "var(--ink-2)" }}>
        Pick your <b>size</b> &amp; <b>fabric</b> at checkout — hit <b style={{ color: "var(--primary)" }}>Add to Cart</b> when your design is ready.
      </div>
    </div>
  );
}

/* Size + Fabric picker, shared by the Add-to-Cart modal */
function SizeFabricPicker({ size, fabricIdx, onSize, onFabric }: any) {
  return (
    <>
      <p className="mb-2 text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--ink-soft)" }}>Size</p>
      <div className="flex gap-2">
        {SIZES.map((s) => (
          <button key={s} onClick={() => onSize(s)} className="h-10 flex-1 rounded-lg text-[13px] font-bold transition-all"
            style={{ background: size === s ? "var(--primary)" : "var(--paper-2)", color: size === s ? "#fff" : "var(--ink-2)" }}>{s}</button>
        ))}
      </div>
      <p className="mb-2 mt-4 text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--ink-soft)" }}>Fabric</p>
      <div className="space-y-2">
        {FABRIC_OPTS.map((f, i) => (
          <button key={f.gsm} onClick={() => onFabric(i)} className="flex w-full items-center justify-between rounded-xl border p-2.5 text-left transition-all"
            style={{ borderColor: fabricIdx === i ? "var(--primary)" : "var(--line)", background: fabricIdx === i ? "rgba(124,58,237,0.05)" : "#fff" }}>
            <div>
              <p className="text-[13px] font-bold" style={{ color: "var(--ink)" }}>{f.gsm}</p>
              <p className="text-[11px]" style={{ color: "var(--ink-soft)" }}>{f.note}</p>
            </div>
            <span className="text-[12px] font-semibold" style={{ color: f.add ? "var(--primary)" : "var(--mint)" }}>{f.add ? `+₹${f.add}` : "Included"}</span>
          </button>
        ))}
      </div>
    </>
  );
}

function TextPanel({ onAddText, hasSelection, isText, onStyleActive }: any) {
  const [font, setFont] = useState("Arial");
  const [col, setCol] = useState("#111111");
  const [bold, setBold] = useState(true);
  const [italic, setItalic] = useState(false);
  const [underline, setUnderline] = useState(false);
  const [align, setAlign] = useState<"left" | "center" | "right">("center");
  return (
    <div>
      <button onClick={() => onAddText({ content: "Your Text", fontFamily: font, fill: col, fontWeight: bold ? "bold" : "normal", fontStyle: italic ? "italic" : "normal", underline, textAlign: align })}
        className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white shadow-sm" style={{ background: "var(--primary)" }}>
        <Plus size={16} /> Add Text
      </button>
      <div className="grid grid-cols-2 gap-2">
        {[{ l: "Heading", s: 64, w: "bold" }, { l: "Subhead", s: 40, w: "600" }, { l: "Body", s: 26, w: "normal" }, { l: "Small", s: 18, w: "normal" }].map((p) => (
          <button key={p.l} onClick={() => onAddText({ content: p.l, fontFamily: font, fontSize: p.s, fill: col, fontWeight: p.w, textAlign: align })}
            className="rounded-xl border py-2.5 text-center transition-all" style={{ borderColor: "var(--line)" }}>
            <span style={{ fontWeight: p.w as any, fontSize: Math.min(p.s * 0.32, 20) }}>Aa</span>
            <p className="text-[11px]" style={{ color: "var(--ink-soft)" }}>{p.l}</p>
          </button>
        ))}
      </div>

      <Label>Style {isText ? "· selected text" : "· new text"}</Label>
      {!hasSelection && <p className="-mt-1 mb-2 text-[11px]" style={{ color: "var(--ink-soft)" }}>Select text on the shirt to restyle it.</p>}
      <select value={font} onChange={(e) => { setFont(e.target.value); onStyleActive({ fontFamily: e.target.value }); }}
        className="mb-2 w-full rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "var(--line)", color: "var(--ink)", background: "#fff" }}>
        {FONTS.filter((f) => f !== "Inter").map((f) => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
      </select>
      <div className="mb-2 flex items-center gap-2">
        <input type="color" value={col} onChange={(e) => { setCol(e.target.value); onStyleActive({ fill: e.target.value }); }} className="h-9 w-12 cursor-pointer rounded" style={{ border: "none" }} />
        <span className="font-mono text-xs" style={{ color: "var(--ink-soft)" }}>{col}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {[
          { Ic: Bold, on: bold, t: () => { const v = !bold; setBold(v); onStyleActive({ fontWeight: v ? "bold" : "normal" }); } },
          { Ic: Italic, on: italic, t: () => { const v = !italic; setItalic(v); onStyleActive({ fontStyle: v ? "italic" : "normal" }); } },
          { Ic: Underline, on: underline, t: () => { const v = !underline; setUnderline(v); onStyleActive({ underline: v }); } },
        ].map(({ Ic, on, t }, i) => (
          <button key={i} onClick={t} className="flex h-9 w-9 items-center justify-center rounded-lg transition-all"
            style={{ background: on ? "var(--primary)" : "var(--paper-2)", color: on ? "#fff" : "var(--ink-2)" }}><Ic size={15} /></button>
        ))}
        {[{ Ic: AlignLeft, v: "left" }, { Ic: AlignCenter, v: "center" }, { Ic: AlignRight, v: "right" }].map(({ Ic, v }) => (
          <button key={v} onClick={() => { setAlign(v as any); onStyleActive({ textAlign: v }); }} className="flex h-9 w-9 items-center justify-center rounded-lg transition-all"
            style={{ background: align === v ? "var(--primary)" : "var(--paper-2)", color: align === v ? "#fff" : "var(--ink-2)" }}><Ic size={15} /></button>
        ))}
      </div>
    </div>
  );
}

function UploadPanel({ onAddImageFile }: any) {
  const ref = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  return (
    <div>
      <div onClick={() => ref.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) onAddImageFile(f); }}
        className="cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all"
        style={{ borderColor: drag ? "var(--primary)" : "rgba(124,58,237,0.35)", background: drag ? "rgba(124,58,237,0.06)" : "var(--paper-2)" }}>
        <CloudUpload size={30} className="mx-auto mb-2" style={{ color: "var(--primary)" }} />
        <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>Drop image or <span style={{ color: "var(--primary)" }}>browse</span></p>
        <p className="mt-1 text-[11px]" style={{ color: "var(--ink-soft)" }}>PNG · JPG · WEBP · <b>SVG (vector)</b> — for print, upload SVG or 300 DPI art</p>
      </div>
      <input ref={ref} type="file" accept="image/*,.svg" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onAddImageFile(f); e.target.value = ""; }} />
      <div className="mt-4 rounded-xl p-3 text-[12px] leading-relaxed" style={{ background: "var(--paper-2)", color: "var(--ink-2)" }}>
        <Layers size={14} className="mb-1 inline text-[var(--primary)]" /> Add your logo, photo or artwork — then drag, resize and rotate it anywhere in the print area. <b>SVG stays razor-sharp</b> at any print size.
      </div>
    </div>
  );
}

function TemplatesPanel({ onAddTemplate }: any) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const list = TEMPLATE_DESIGNS.filter((t: any) => (cat === "All" || t.category === cat) && (q === "" || t.name.toLowerCase().includes(q.toLowerCase())));
  return (
    <div>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search designs…" className="mb-2 w-full rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "var(--line)" }} />
      <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {TEMPLATE_CATEGORIES.map((c: string) => (
          <button key={c} onClick={() => setCat(c)} className="shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold transition-all"
            style={{ background: cat === c ? "var(--primary)" : "var(--paper-2)", color: cat === c ? "#fff" : "var(--ink-2)" }}>{c}</button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {list.map((t: any) => (
          <button key={t.id} onClick={() => onAddTemplate(t.lines)} className="rounded-xl border p-2 transition-all hover:shadow-md" style={{ borderColor: "var(--line)", aspectRatio: "1.5", background: "#fff" }}>
            <div className="flex h-full flex-col items-center justify-center gap-0.5 overflow-hidden">
              {t.lines.map((ln: any, i: number) => (
                <span key={i} style={{ fontFamily: ln.font, fontWeight: ln.weight, fontStyle: ln.style ?? "normal", color: ln.color === "#ffffff" ? "#1f2937" : ln.color, fontSize: Math.min(ln.size * 0.26, 13), lineHeight: 1.05 }}>{ln.text}</span>
              ))}
            </div>
          </button>
        ))}
        {list.length === 0 && <p className="col-span-2 py-6 text-center text-sm" style={{ color: "var(--ink-soft)" }}>No designs found</p>}
      </div>
    </div>
  );
}
