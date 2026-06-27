"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useDesignCanvas } from "@/hooks/useDesignCanvas";
import { DesignCanvas } from "@/components/canvas/DesignCanvas";
import { Toolbar } from "@/components/toolbar/Toolbar";
import { LeftSidebar } from "@/components/sidebar/LeftSidebar";
import { RightSidebar } from "@/components/sidebar/RightSidebar";
import { PreviewModal } from "@/components/ui/PreviewModal";

export default function Home() {
  const [shirtStyle, setShirtStyle] = useState("classic");
  const [shirtColor, setShirtColor] = useState("#FFFFFF");
  const [viewSide, setViewSide] = useState<"front" | "back">("front");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDataUrl, setPreviewDataUrl] = useState("");
  const canvasRef = useDesignCanvas("designCanvas");
  const canvasComponentRef = useRef<any>(null);

  useEffect(() => {
    if (canvasRef.isReady && canvasComponentRef.current) {
      canvasComponentRef.current.loadShirt();
      setTimeout(() => canvasRef.saveHistory(), 500);
    }
  }, [canvasRef.isReady]);

  const handleAddImage = useCallback((file: File) => { canvasComponentRef.current?.addImage(file); }, []);
  const handleAddText = useCallback((opts: any) => { canvasComponentRef.current?.addText(opts); }, []);
  const handleAddTemplate = useCallback((lines: any[]) => { canvasComponentRef.current?.addTemplate(lines); }, []);
  const handleClearTemplates = useCallback(() => { canvasComponentRef.current?.clearTemplates(); }, []);
  const handlePreview = useCallback(() => { setPreviewDataUrl(canvasRef.exportDesign(2)); setPreviewOpen(true); }, [canvasRef]);
  const handleSave = useCallback(() => { const a=document.createElement("a"); a.href=canvasRef.exportDesign(2); a.download=`threadcraft-${Date.now()}.png`; a.click(); }, [canvasRef]);
  const handleBuy = useCallback(() => { setPreviewDataUrl(canvasRef.exportDesign(2)); setPreviewOpen(true); }, [canvasRef]);
  const handleCheckout = useCallback(() => { setPreviewOpen(false); const a=document.createElement("a"); a.href=previewDataUrl; a.download=`order-${Date.now()}.png`; a.click(); }, [previewDataUrl]);

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: "#0d0d14" }}>
      <Toolbar zoom={canvasRef.zoom} historyPos={canvasRef.historyPos} historyLength={canvasRef.historyLength}
        onUndo={canvasRef.undo} onRedo={canvasRef.redo}
        onZoomIn={() => canvasRef.setZoom(canvasRef.zoom+0.1)} onZoomOut={() => canvasRef.setZoom(canvasRef.zoom-0.1)} onZoomFit={() => canvasRef.setZoom(1)}
        onSave={handleSave} onPreview={handlePreview} onBuy={handleBuy}
        viewSide={viewSide} onToggleView={() => setViewSide(v => v==="front"?"back":"front")}/>
      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar selectedStyle={shirtStyle} selectedColor={shirtColor}
          onStyleChange={setShirtStyle} onColorChange={setShirtColor}
          onAddImage={handleAddImage} onAddText={handleAddText}
          onAddTemplate={handleAddTemplate} onClearTemplates={handleClearTemplates}/>
        <div className="flex-1 overflow-hidden">
          <DesignCanvas ref={canvasComponentRef} canvasRef={canvasRef.canvas}
            shirtStyle={shirtStyle} shirtColor={shirtColor} viewSide={viewSide}
            onSaveHistory={canvasRef.saveHistory} isReady={canvasRef.isReady}/>
        </div>
        <RightSidebar activeObject={canvasRef.activeObject} objProps={canvasRef.objProps}
          onUpdateProp={canvasRef.updateProp} onDelete={canvasRef.deleteSelected} onDuplicate={canvasRef.duplicateSelected}
          onCenterH={canvasRef.centerHorizontal} onCenterV={canvasRef.centerVertical}
          onBringToFront={canvasRef.bringToFront} onSendToBack={canvasRef.sendToBack}
          onBringForward={canvasRef.bringForward} onSendBackward={canvasRef.sendBackward}/>
      </div>
      <PreviewModal isOpen={previewOpen} onClose={() => setPreviewOpen(false)}
        designDataUrl={previewDataUrl} shirtColor={shirtColor} shirtStyle={shirtStyle} onProceed={handleCheckout}/>
    </div>
  );
}
