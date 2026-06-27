"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { ObjectProperties } from "@/types";

export function useDesignCanvas(canvasId: string) {
  const fabricRef = useRef<any>(null);
  const [activeObject, setActiveObject] = useState<any>(null);
  const [objProps, setObjProps] = useState<ObjectProperties | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [historyPos, setHistoryPos] = useState(-1);
  const [zoom, setZoomState] = useState(1);
  const [isReady, setIsReady] = useState(false);
  const skipHistory = useRef(false);

  const getCanvas = () => fabricRef.current;

  // Read properties of selected object
  const readProps = useCallback((obj: any) => {
    if (!obj) { setObjProps(null); setActiveObject(null); return; }
    setActiveObject(obj);
    setObjProps({
      left: Math.round(obj.left ?? 0),
      top: Math.round(obj.top ?? 0),
      width: Math.round(obj.getScaledWidth?.() ?? obj.width ?? 0),
      height: Math.round(obj.getScaledHeight?.() ?? obj.height ?? 0),
      angle: Math.round(obj.angle ?? 0),
      opacity: Math.round((obj.opacity ?? 1) * 100),
      scaleX: obj.scaleX ?? 1,
      scaleY: obj.scaleY ?? 1,
    });
  }, []);

  const saveHistory = useCallback(() => {
    const canvas = getCanvas();
    if (!canvas || skipHistory.current) return;
    const state = JSON.stringify(canvas.toJSON(["name", "id", "selectable", "evented"]));
    setHistory(prev => {
      const newHistory = prev.slice(0, historyPos + 1);
      newHistory.push(state);
      return newHistory;
    });
    setHistoryPos(prev => prev + 1);
  }, [historyPos]);

  // Initialize Fabric.js
  useEffect(() => {
    let mounted = true;
    import("fabric").then(({ fabric }) => {
      if (!mounted) return;
      const canvas = new fabric.Canvas(canvasId, {
        preserveObjectStacking: true,
        backgroundColor: "#1a1a2e",
        selection: true,
        allowTouchScrolling: false,
      });

      fabricRef.current = canvas;

      canvas.on("selection:created", (e: any) => readProps(e.selected?.[0]));
      canvas.on("selection:updated", (e: any) => readProps(e.selected?.[0]));
      canvas.on("selection:cleared", () => { setActiveObject(null); setObjProps(null); });
      canvas.on("object:modified", () => { readProps(canvas.getActiveObject()); saveHistory(); });
      canvas.on("object:moving", () => readProps(canvas.getActiveObject()));
      canvas.on("object:scaling", () => readProps(canvas.getActiveObject()));
      canvas.on("object:rotating", () => readProps(canvas.getActiveObject()));

      setIsReady(true);

      // Keyboard shortcuts
      const handleKey = (e: KeyboardEvent) => {
        if (["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement)?.tagName)) return;
        if (e.key === "Delete" || e.key === "Backspace") {
          const obj = canvas.getActiveObject();
          if (obj && !["tshirt", "printable"].includes(obj.name)) {
            canvas.remove(obj);
            canvas.renderAll();
            setActiveObject(null);
            setObjProps(null);
            saveHistory();
          }
        }
        if ((e.ctrlKey || e.metaKey) && e.key === "z") { e.preventDefault(); }
        if ((e.ctrlKey || e.metaKey) && e.key === "d") {
          e.preventDefault();
          const obj = canvas.getActiveObject();
          if (obj) {
            obj.clone((cloned: any) => {
              cloned.set({ left: (obj.left ?? 0) + 20, top: (obj.top ?? 0) + 20 });
              canvas.add(cloned);
              canvas.setActiveObject(cloned);
              canvas.renderAll();
            });
          }
        }
      };
      window.addEventListener("keydown", handleKey);

      return () => {
        window.removeEventListener("keydown", handleKey);
      };
    });

    return () => { mounted = false; };
  }, [canvasId]);

  const undo = useCallback(() => {
    if (historyPos <= 0) return;
    const canvas = getCanvas();
    if (!canvas) return;
    const newPos = historyPos - 1;
    skipHistory.current = true;
    canvas.loadFromJSON(history[newPos], () => {
      canvas.renderAll();
      setHistoryPos(newPos);
      setActiveObject(null);
      setObjProps(null);
      skipHistory.current = false;
    });
  }, [history, historyPos]);

  const redo = useCallback(() => {
    if (historyPos >= history.length - 1) return;
    const canvas = getCanvas();
    if (!canvas) return;
    const newPos = historyPos + 1;
    skipHistory.current = true;
    canvas.loadFromJSON(history[newPos], () => {
      canvas.renderAll();
      setHistoryPos(newPos);
      setActiveObject(null);
      setObjProps(null);
      skipHistory.current = false;
    });
  }, [history, historyPos]);

  const setZoom = useCallback((z: number) => {
    const canvas = getCanvas();
    if (!canvas) return;
    const newZoom = Math.max(0.25, Math.min(3, z));
    canvas.setZoom(newZoom);
    setZoomState(newZoom);
  }, []);

  const deleteSelected = useCallback(() => {
    const canvas = getCanvas();
    if (!canvas) return;
    const obj = canvas.getActiveObject();
    if (obj && !["tshirt", "printable"].includes(obj.name)) {
      canvas.remove(obj);
      canvas.renderAll();
      setActiveObject(null);
      setObjProps(null);
      saveHistory();
    }
  }, [saveHistory]);

  const duplicateSelected = useCallback(() => {
    const canvas = getCanvas();
    if (!canvas) return;
    const obj = canvas.getActiveObject();
    if (!obj) return;
    obj.clone((cloned: any) => {
      cloned.set({ left: (obj.left ?? 0) + 24, top: (obj.top ?? 0) + 24 });
      canvas.add(cloned);
      canvas.setActiveObject(cloned);
      canvas.renderAll();
      saveHistory();
    });
  }, [saveHistory]);

  const updateProp = useCallback((key: keyof ObjectProperties, value: number) => {
    const canvas = getCanvas();
    if (!canvas) return;
    const obj = canvas.getActiveObject();
    if (!obj) return;

    if (key === "width") {
      obj.set("scaleX", value / (obj.width ?? 1));
    } else if (key === "height") {
      obj.set("scaleY", value / (obj.height ?? 1));
    } else if (key === "opacity") {
      obj.set("opacity", value / 100);
    } else {
      obj.set(key as any, value);
    }
    obj.setCoords?.();
    canvas.renderAll();
    readProps(obj);
  }, [readProps]);

  const centerHorizontal = useCallback(() => {
    const canvas = getCanvas();
    if (!canvas) return;
    const obj = canvas.getActiveObject();
    if (!obj) return;
    const printable = canvas.getObjects().find((o: any) => o.name === "printable");
    if (printable) {
      obj.set("left", printable.left);
    } else {
      canvas.centerObjectH(obj);
    }
    obj.setCoords?.();
    canvas.renderAll();
    readProps(obj);
  }, [readProps]);

  const centerVertical = useCallback(() => {
    const canvas = getCanvas();
    if (!canvas) return;
    const obj = canvas.getActiveObject();
    if (!obj) return;
    const printable = canvas.getObjects().find((o: any) => o.name === "printable");
    if (printable) {
      obj.set("top", printable.top);
    } else {
      canvas.centerObjectV(obj);
    }
    obj.setCoords?.();
    canvas.renderAll();
    readProps(obj);
  }, [readProps]);

  const bringForward = useCallback(() => { const c = getCanvas(); c?.bringForward(c.getActiveObject()); c?.renderAll(); }, []);
  const sendBackward = useCallback(() => { const c = getCanvas(); c?.sendBackwards(c.getActiveObject()); c?.renderAll(); }, []);
  const bringToFront = useCallback(() => { const c = getCanvas(); c?.bringToFront(c.getActiveObject()); c?.renderAll(); }, []);
  const sendToBack = useCallback(() => {
    const canvas = getCanvas();
    if (!canvas) return;
    canvas.sendToBack(canvas.getActiveObject());
    // Keep shirt at bottom
    const shirt = canvas.getObjects().find((o: any) => o.name === "tshirt");
    if (shirt) canvas.sendToBack(shirt);
    canvas.renderAll();
  }, []);

  const exportDesign = useCallback((multiplier = 2): string => {
    const canvas = getCanvas();
    if (!canvas) return "";
    canvas.discardActiveObject();
    canvas.renderAll();
    return canvas.toDataURL({ format: "png", multiplier });
  }, []);

  const getAllObjects = useCallback(() => {
    const canvas = getCanvas();
    if (!canvas) return [];
    return canvas.getObjects().filter((o: any) => !["tshirt", "printable"].includes(o.name));
  }, []);

  return {
    canvas: fabricRef,
    isReady,
    activeObject,
    objProps,
    zoom,
    historyPos,
    historyLength: history.length,
    saveHistory,
    undo,
    redo,
    setZoom,
    deleteSelected,
    duplicateSelected,
    updateProp,
    centerHorizontal,
    centerVertical,
    bringForward,
    sendBackward,
    bringToFront,
    sendToBack,
    exportDesign,
    getAllObjects,
  };
}
