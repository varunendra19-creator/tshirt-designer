"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useDesignCanvas } from "@/hooks/useDesignCanvas";
import { DesignCanvas } from "@/components/canvas/DesignCanvas";
import { Toolbar } from "@/components/toolbar/Toolbar";
import { LeftSidebar } from "@/components/sidebar/LeftSidebar";
import { RightSidebar } from "@/components/sidebar/RightSidebar";
import { PreviewModal } from "@/components/ui/PreviewModal";
import { TShirt3DViewer } from "@/components/ui/TShirt3DViewer";

export default function Home() {
  const [shirtStyle, setShirtStyle] = useState("classic");
  const [shirtColor, setShirtColor] = useState("#FFFFFF");
  const [customColor, setCustomColor] = useState("#FFFFFF");
  const [viewSide, setViewSide] = useState<"front"|"back">("front");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [viewer3DOpen, setViewer3DOpen] = useState(false);
  const [previewDataUrl, setPreviewDataUrl] = useState("");
  const [shirtRotation, setShirtRotation] = useState(0);
  const [shirtFlipX, setShirtFlipX] = useState(false);
  const [shirtFlipY, setShirtFlipY] = useState(false);
  const [shirtScale, setShirtScale] = useState(1);

  const canvasRef = useDesignCanvas("designCanvas");
  const canvasComponentRef = useRef<any>(null);

  useEffect(() => {
    if (canvasRef.isReady && canvasComponentRef.current) {
      canvasComponentRef.current.loadShirt();
      setTimeout(() => canvasRef.saveHistory(), 500);
    }
  }, [canvasRef.isReady]);

  const getExport = useCallback(() => canvasRef.exportDesign(2), [canvasRef]);
  const handleAddImage = useCallback((f: File) => { canvasComponentRef.current?.addImage(f); }, []);
  const handleAddText = useCallback((o: any) => { canvasComponentRef.current?.addText(o); }, []);
  const handleAddTemplate = useCallback((l: any[]) => { canvasComponentRef.current?.addTemplate(l); }, []);
  const handleClearTemplates = useCallback(() => { canvasComponentRef.current?.clearTemplates(); }, []);
  const handlePreview = useCallback(() => { setPreviewDataUrl(getExport()); setPreviewOpen(true); }, [getExport]);
  const handle3DPreview = useCallback(() => { setPreviewDataUrl(getExport()); setViewer3DOpen(true); }, [getExport]);
  const handleSave = useCallback(() => { const a=document.createElement("a"); a.href=getExport(); a.download=`threadcraft-${Date.now()}.png`; a.click(); }, [getExport]);
  const handleBuy = useCallback(() => { setPreviewDataUrl(getExport()); setPreviewOpen(true); }, [getExport]);
  const handleCheckout = useCallback(() => { setPreviewOpen(false); const a=document.createElement("a"); a.href=previewDataUrl; a.download=`order-${Date.now()}.png`; a.click(); }, [previewDataUrl]);
  const handleShirtReset = useCallback(() => { setShirtRotation(0); setShirtFlipX(false); setShirtFlipY(false); setShirtScale(1); }, []);

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background:"#0d0d14" }}>
      <Toolbar
        zoom={canvasRef.zoom} historyPos={canvasRef.historyPos} historyLength={canvasRef.historyLength}
        onUndo={canvasRef.undo} onRedo={canvasRef.redo}
        onZoomIn={() => canvasRef.setZoom(canvasRef.zoom+0.1)}
        onZoomOut={() => canvasRef.setZoom(canvasRef.zoom-0.1)}
        onZoomFit={() => canvasRef.setZoom(1)}
        onSave={handleSave} onPreview={handlePreview} onBuy={handleBuy}
        on3DPreview={handle3DPreview}
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
          onShirtScale={setShirtScale} onShirtReset={handleShirtReset}
          customColor={customColor} onCustomColor={setCustomColor}
        />
        <div className="flex-1 overflow-hidden">
          <DesignCanvas
            ref={canvasComponentRef} canvasRef={canvasRef.canvas}
            shirtStyle={shirtStyle} shirtColor={shirtColor}
            viewSide={viewSide} onSaveHistory={canvasRef.saveHistory}
            isReady={canvasRef.isReady}
            shirtRotation={shirtRotation} shirtFlipX={shirtFlipX}
            shirtFlipY={shirtFlipY} shirtScale={shirtScale}
          />
        </div>
        <RightSidebar
          activeObject={canvasRef.activeObject} objProps={canvasRef.objProps}
          onUpdateProp={canvasRef.updateProp} onDelete={canvasRef.deleteSelected}
          onDuplicate={canvasRef.duplicateSelected}
          onCenterH={canvasRef.centerHorizontal} onCenterV={canvasRef.centerVertical}
          onBringToFront={canvasRef.bringToFront} onSendToBack={canvasRef.sendToBack}
          onBringForward={canvasRef.bringForward} onSendBackward={canvasRef.sendBackward}
        />
      </div>
      <PreviewModal isOpen={previewOpen} onClose={() => setPreviewOpen(false)}
        designDataUrl={previewDataUrl} shirtColor={shirtColor}
        shirtStyle={shirtStyle} onProceed={handleCheckout}/>
      <TShirt3DViewer isOpen={viewer3DOpen} onClose={() => setViewer3DOpen(false)}
        designDataUrl={previewDataUrl} shirtColor={shirtColor} shirtStyle={shirtStyle}/>
    </div>
  );
}
