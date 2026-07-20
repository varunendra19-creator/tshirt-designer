"use client";

import { useState, useRef, useCallback } from "react";
import { Live3DCanvas } from "@/components/canvas/Live3DCanvas";
import { Toolbar } from "@/components/toolbar/Toolbar";
import { LeftSidebar } from "@/components/sidebar/LeftSidebar";
import { RightSidebar } from "@/components/sidebar/RightSidebar";
import { PreviewModal } from "@/components/ui/PreviewModal";

export default function Home() {
  const [shirtStyle, setShirtStyle] = useState("classic");
  const [shirtColor, setShirtColor] = useState("#FFFFFF");
  const [customColor, setCustomColor] = useState("#FFFFFF");
  const [viewSide, setViewSide] = useState<"front"|"back">("front");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDataUrl, setPreviewDataUrl] = useState("");

  // Shirt transform — kept for compatibility with LeftSidebar props, but the
  // live 3D canvas is orbited via mouse drag instead of these sliders now.
  const [shirtRotation, setShirtRotation] = useState(0);
  const [shirtFlipX, setShirtFlipX] = useState(false);
  const [shirtFlipY, setShirtFlipY] = useState(false);
  const [shirtScale, setShirtScale] = useState(1);

  const [activeObject, setActiveObject] = useState<any>(null);
  const [historyLength, setHistoryLength] = useState(0);
  const [historyPos, setHistoryPos] = useState(-1);

  const canvasRef = useRef<any>(null);

  // Bumped alongside the object so a re-render still happens while dragging: Fabric
  // mutates the SAME object in place, so setActiveObject alone is a no-op to React
  // (Object.is passes) and the properties panel would keep showing stale numbers.
  const [, bumpProps] = useState(0);
  const handleSelectObject = useCallback((obj: any) => {
    setActiveObject(obj);
    bumpProps(n => n + 1);
  }, []);

  const handleSaveHistory = useCallback(() => {
    setHistoryLength(h => h + 1);
    setHistoryPos(p => p + 1);
  }, []);

  // Left-sidebar font/colour/style controls, applied to the live selection
  const handleStyleText = useCallback((patch: Record<string, any>) => {
    return canvasRef.current?.styleActiveObject(patch) ?? false;
  }, []);

  const handleScale = useCallback((percent: number) => {
    canvasRef.current?.scaleActiveObject(percent);
  }, []);

  const handleAddImage = useCallback((file: File) => { canvasRef.current?.addImage(file); }, []);
  const handleAddText = useCallback((opts: any) => { canvasRef.current?.addText(opts); }, []);
  const handleAddTemplate = useCallback((lines: any[]) => { canvasRef.current?.addTemplate(lines); }, []);
  const handleClearTemplates = useCallback(() => { canvasRef.current?.clearTemplates(); }, []);
  const handleDelete = useCallback(() => { canvasRef.current?.deleteSelected(); }, []);
  const handleDuplicate = useCallback(() => { canvasRef.current?.duplicateSelected(); }, []);

  const getExport = useCallback(() => canvasRef.current?.exportDesign() || "", []);

  const handlePreview = useCallback(() => { setPreviewDataUrl(getExport()); setPreviewOpen(true); }, [getExport]);
  const handleBuy = useCallback(() => { setPreviewDataUrl(getExport()); setPreviewOpen(true); }, [getExport]);
  const handleSave = useCallback(() => {
    const url = getExport();
    const a = document.createElement("a");
    a.href = url; a.download = `threadcraft-${Date.now()}.png`; a.click();
  }, [getExport]);
  const handleCheckout = useCallback(() => {
    setPreviewOpen(false);
    const a = document.createElement("a");
    a.href = previewDataUrl; a.download = `order-${Date.now()}.png`; a.click();
  }, [previewDataUrl]);

  const handleToggleAutoRotate = useCallback(() => { canvasRef.current?.toggleAutoRotate(); }, []);

  // Property panel handlers — operate on the active Fabric object on the overlay canvas
  const updateProp = useCallback((key: string, value: number) => {
    canvasRef.current?.pauseAutoRotate();
    const obj = canvasRef.current?.getActiveObject();
    const fc = canvasRef.current?.getFabricCanvas();
    if (!obj || !fc) return;
    if (key === "width") obj.set("scaleX", value / (obj.width ?? 1));
    else if (key === "height") obj.set("scaleY", value / (obj.height ?? 1));
    else if (key === "opacity") obj.set("opacity", value / 100);
    else obj.set(key as any, value);
    obj.setCoords?.();
    fc.renderAll();
    canvasRef.current?.updateTexture();
    canvasRef.current?.pushHistory();
  }, []);

  const centerH = useCallback(() => {
    canvasRef.current?.pauseAutoRotate();
    const obj = canvasRef.current?.getActiveObject();
    const fc = canvasRef.current?.getFabricCanvas();
    if (!obj || !fc) return;
    fc.centerObjectH(obj); obj.setCoords?.(); fc.renderAll();
    canvasRef.current?.updateTexture();
    handleSaveHistory();
    canvasRef.current?.pushHistory();
  }, [handleSaveHistory]);
  const centerV = useCallback(() => {
    canvasRef.current?.pauseAutoRotate();
    const obj = canvasRef.current?.getActiveObject();
    const fc = canvasRef.current?.getFabricCanvas();
    if (!obj || !fc) return;
    fc.centerObjectV(obj); obj.setCoords?.(); fc.renderAll();
    canvasRef.current?.updateTexture();
    handleSaveHistory();
    canvasRef.current?.pushHistory();
  }, [handleSaveHistory]);
  const bringToFront = useCallback(() => {
    canvasRef.current?.pauseAutoRotate();
    const obj = canvasRef.current?.getActiveObject();
    const fc = canvasRef.current?.getFabricCanvas();
    if (!obj || !fc) return;
    fc.bringToFront(obj); fc.renderAll();
    canvasRef.current?.updateTexture();
    handleSaveHistory();
    canvasRef.current?.pushHistory();
  }, [handleSaveHistory]);
  const sendToBack = useCallback(() => {
    canvasRef.current?.pauseAutoRotate();
    const obj = canvasRef.current?.getActiveObject();
    const fc = canvasRef.current?.getFabricCanvas();
    if (!obj || !fc) return;
    fc.sendToBack(obj); fc.renderAll();
    canvasRef.current?.updateTexture();
    handleSaveHistory();
    canvasRef.current?.pushHistory();
  }, [handleSaveHistory]);
  const bringForward = useCallback(() => {
    canvasRef.current?.pauseAutoRotate();
    const obj = canvasRef.current?.getActiveObject();
    const fc = canvasRef.current?.getFabricCanvas();
    if (!obj || !fc) return;
    fc.bringForward(obj); fc.renderAll();
    canvasRef.current?.updateTexture();
    handleSaveHistory();
    canvasRef.current?.pushHistory();
  }, [handleSaveHistory]);
  const sendBackward = useCallback(() => {
    canvasRef.current?.pauseAutoRotate();
    const obj = canvasRef.current?.getActiveObject();
    const fc = canvasRef.current?.getFabricCanvas();
    if (!obj || !fc) return;
    fc.sendBackwards(obj); fc.renderAll();
    canvasRef.current?.updateTexture();
    handleSaveHistory();
    canvasRef.current?.pushHistory();
  }, [handleSaveHistory]);

  const objProps = activeObject ? {
    left: Math.round(activeObject.left ?? 0),
    top: Math.round(activeObject.top ?? 0),
    width: Math.round(activeObject.getScaledWidth?.() ?? 0),
    height: Math.round(activeObject.getScaledHeight?.() ?? 0),
    angle: Math.round(activeObject.angle ?? 0),
    opacity: Math.round((activeObject.opacity ?? 1) * 100),
    scaleX: activeObject.scaleX ?? 1,
    scaleY: activeObject.scaleY ?? 1,
  } : null;

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: "#0d0d14" }}>
      <Toolbar
        zoom={1} historyPos={historyPos} historyLength={historyLength}
        onUndo={() => canvasRef.current?.undo()} onRedo={() => canvasRef.current?.redo()}
        onZoomIn={() => {}} onZoomOut={() => {}} onZoomFit={() => {}}
        onSave={handleSave} onPreview={handlePreview} onBuy={handleBuy}
        on3DPreview={handleToggleAutoRotate}
        viewSide={viewSide} onToggleView={() => setViewSide(v => v==="front"?"back":"front")}
      />
      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar
          selectedStyle={shirtStyle} selectedColor={shirtColor}
          onStyleChange={setShirtStyle} onColorChange={setShirtColor}
          onAddImage={handleAddImage} onAddText={handleAddText}
          onAddTemplate={handleAddTemplate} onClearTemplates={handleClearTemplates}
          shirtRotation={shirtRotation} shirtFlipX={shirtFlipX}
          shirtFlipY={shirtFlipY} shirtScale={shirtScale}
          onShirtRotation={setShirtRotation}
          onShirtFlipX={() => setShirtFlipX(v => !v)}
          onShirtFlipY={() => setShirtFlipY(v => !v)}
          onShirtScale={setShirtScale}
          onShirtReset={() => { setShirtRotation(0); setShirtFlipX(false); setShirtFlipY(false); setShirtScale(1); }}
          customColor={customColor} onCustomColor={setCustomColor}
          onStyleText={handleStyleText}
          hasSelection={!!activeObject}
        />
        <div className="flex-1 overflow-hidden">
          <Live3DCanvas
            ref={canvasRef}
            shirtColor={shirtColor}
            shirtStyle={shirtStyle}
            viewSide={viewSide}
            onSelectObject={handleSelectObject}
            onSaveHistory={handleSaveHistory}
          />
        </div>
        <RightSidebar
          activeObject={activeObject} objProps={objProps}
          onUpdateProp={updateProp} onScale={handleScale}
          onDelete={handleDelete} onDuplicate={handleDuplicate}
          onCenterH={centerH} onCenterV={centerV}
          onBringToFront={bringToFront} onSendToBack={sendToBack}
          onBringForward={bringForward} onSendBackward={sendBackward}
        />
      </div>
      <PreviewModal
        isOpen={previewOpen} onClose={() => setPreviewOpen(false)}
        designDataUrl={previewDataUrl} shirtColor={shirtColor}
        shirtStyle={shirtStyle} onProceed={handleCheckout}
      />
    </div>
  );
}