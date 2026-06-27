"use client";

import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import { getTshirtSVG, PRINTABLE_AREA } from "@/lib/tshirtData";

interface DesignCanvasProps {
  canvasRef: any;
  shirtStyle: string;
  shirtColor: string;
  viewSide: "front" | "back";
  onSaveHistory: () => void;
  isReady: boolean;
}

const CANVAS_W = 560;
const CANVAS_H = 600;

export const DesignCanvas = forwardRef<any, DesignCanvasProps>(({
  canvasRef, shirtStyle, shirtColor, viewSide, onSaveHistory, isReady,
}, ref) => {
  const prevStyle = useRef("");
  const prevColor = useRef("");
  const prevSide = useRef("");

  const loadShirt = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || !isReady) return;
    const svgStr = getTshirtSVG(shirtStyle, shirtColor, viewSide === "back");
    const blob = new Blob([svgStr], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const { fabric } = await import("fabric");
    fabric.loadSVGFromURL(url, (objects: any[], options: any) => {
      URL.revokeObjectURL(url);
      const group = fabric.util.groupSVGElements(objects, options);
      const scale = Math.min((CANVAS_W * 0.82) / (group.width ?? 280), (CANVAS_H * 0.88) / (group.height ?? 320));
      group.set({ left: CANVAS_W/2, top: CANVAS_H/2, scaleX: scale, scaleY: scale, originX: "center", originY: "center", selectable: false, evented: false, name: "tshirt", hoverCursor: "default" });
      canvas.getObjects().filter((o: any) => ["tshirt","printable"].includes(o.name)).forEach((o: any) => canvas.remove(o));
      canvas.insertAt(group, 0);
      const area = PRINTABLE_AREA[shirtStyle as keyof typeof PRINTABLE_AREA] || PRINTABLE_AREA.classic;
      const pw = CANVAS_W * area.w, ph = CANVAS_H * area.h;
      const px = CANVAS_W * area.x + pw/2, py = CANVAS_H * area.y + ph/2;
      canvas.insertAt(new fabric.Rect({ left: px, top: py, width: pw, height: ph, originX: "center", originY: "center", fill: "transparent", stroke: "rgba(147,112,219,0.5)", strokeWidth: 1.5, strokeDashArray: [6,5], selectable: false, evented: false, name: "printable" }), 1);
      canvas.renderAll();
    });
  }, [canvasRef, shirtStyle, shirtColor, viewSide, isReady]);

  useEffect(() => {
    if (isReady && (prevStyle.current !== shirtStyle || prevColor.current !== shirtColor || prevSide.current !== viewSide)) {
      prevStyle.current = shirtStyle; prevColor.current = shirtColor; prevSide.current = viewSide;
      loadShirt();
    }
  }, [isReady, shirtStyle, shirtColor, viewSide, loadShirt]);

  const addImage = useCallback(async (file: File) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { fabric } = await import("fabric");
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const printable = canvas.getObjects().find((o: any) => o.name === "printable");
      const maxW = printable ? printable.width * 0.85 : 180;
      const maxH = printable ? printable.height * 0.75 : 180;
      const cx = printable ? printable.left : CANVAS_W/2;
      const cy = printable ? printable.top : CANVAS_H/2;
      if (file.type === "image/svg+xml") {
        fabric.loadSVGFromURL(dataUrl, (objects: any[], options: any) => {
          const group = fabric.util.groupSVGElements(objects, options);
          const scale = Math.min(maxW/(group.width??1), maxH/(group.height??1));
          group.set({ left: cx, top: cy, scaleX: scale, scaleY: scale, originX: "center", originY: "center" });
          canvas.add(group); canvas.setActiveObject(group); canvas.renderAll(); onSaveHistory();
        });
      } else {
        fabric.Image.fromURL(dataUrl, (img: any) => {
          const scale = Math.min(maxW/(img.width??1), maxH/(img.height??1));
          img.set({ left: cx, top: cy, scaleX: scale, scaleY: scale, originX: "center", originY: "center" });
          canvas.add(img); canvas.setActiveObject(img); canvas.renderAll(); onSaveHistory();
        });
      }
    };
    reader.readAsDataURL(file);
  }, [canvasRef, onSaveHistory]);

  const addText = useCallback(async (options: {
    content: string; fontFamily: string; fontSize: number; fontWeight: string;
    fontStyle: string; fill: string; textAlign: string; underline: boolean;
  }) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { fabric } = await import("fabric");
    const printable = canvas.getObjects().find((o: any) => o.name === "printable");
    const cx = printable ? printable.left : CANVAS_W/2;
    const cy = printable ? printable.top : CANVAS_H/2;
    const maxW = printable ? printable.width * 0.88 : 220;
    const normalizedContent = options.content.replace(/\\n/g, "\n").replace(/\r\n/g, "\n");
    const text = new fabric.Textbox(normalizedContent, {
      left: cx, top: cy, width: maxW, originX: "center", originY: "center",
      fontFamily: options.fontFamily, fontSize: options.fontSize, fontWeight: options.fontWeight,
      fontStyle: options.fontStyle, fill: options.fill, textAlign: options.textAlign as any,
      underline: options.underline, splitByGrapheme: false,
    });
    const textW = text.getScaledWidth();
    if (textW > maxW) text.set({ scaleX: maxW/textW, scaleY: maxW/textW });
    canvas.add(text); canvas.setActiveObject(text); canvas.renderAll(); onSaveHistory();
  }, [canvasRef, onSaveHistory]);

  useImperativeHandle(ref, () => ({ addImage, addText, loadShirt }));

  return (
    <div className="relative flex items-center justify-center w-full h-full">
      <div className="absolute inset-0" style={{ backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`, backgroundSize: "32px 32px" }} />
      <div className="relative" style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.06), 0 24px 64px rgba(0,0,0,0.5)", borderRadius: 12, overflow: "hidden" }}>
        <canvas id="designCanvas" width={CANVAS_W} height={CANVAS_H} />
      </div>
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-xs px-3 py-1 rounded-full" style={{ background: "rgba(147,112,219,0.15)", border: "0.5px solid rgba(147,112,219,0.4)", color: "rgba(147,112,219,0.9)" }}>
        Dashed border = printable area
      </div>
    </div>
  );
});

DesignCanvas.displayName = "DesignCanvas";
