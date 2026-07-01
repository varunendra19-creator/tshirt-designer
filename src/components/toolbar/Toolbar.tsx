"use client";

import { Button, Tooltip } from "@nextui-org/react";
import { Undo2, Redo2, Download, ShoppingCart, Shirt, Eye, RotateCw } from "lucide-react";

interface ToolbarProps {
  zoom: number; historyPos: number; historyLength: number;
  onUndo: () => void; onRedo: () => void;
  onZoomIn: () => void; onZoomOut: () => void; onZoomFit: () => void;
  onSave: () => void; onPreview: () => void; onBuy: () => void;
  on3DPreview: () => void;
  viewSide: "front" | "back"; onToggleView: () => void;
}

export function Toolbar({ historyPos, historyLength, onUndo, onRedo, onSave, onPreview, onBuy, on3DPreview, viewSide, onToggleView }: ToolbarProps) {
  return (
    <div className="flex items-center gap-1 px-4 h-14 shrink-0 z-50"
      style={{ background:"#0d0d14", borderBottom:"0.5px solid rgba(255,255,255,0.08)" }}>
      <div className="flex items-center gap-2 mr-4">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background:"linear-gradient(135deg,#7c3aed,#4f46e5)" }}>
          <Shirt size={16} color="white"/>
        </div>
        <span className="font-semibold text-white text-[15px] tracking-tight">ThreadCraft</span>
      </div>
      <div className="w-px h-6 mx-2" style={{ background:"rgba(255,255,255,0.1)" }}/>
      <Tooltip content="Undo" placement="bottom" className="bg-gray-900 text-white text-xs">
        <Button isIconOnly size="sm" variant="light" isDisabled={historyPos<=0} onPress={onUndo} className="text-gray-400 hover:text-white"><Undo2 size={16}/></Button>
      </Tooltip>
      <Tooltip content="Redo" placement="bottom" className="bg-gray-900 text-white text-xs">
        <Button isIconOnly size="sm" variant="light" isDisabled={historyPos>=historyLength-1} onPress={onRedo} className="text-gray-400 hover:text-white"><Redo2 size={16}/></Button>
      </Tooltip>
      <div className="w-px h-6 mx-2" style={{ background:"rgba(255,255,255,0.1)" }}/>
      <Button size="sm" variant="flat" onPress={onToggleView}
        className="text-xs font-medium"
        style={{ background:"rgba(255,255,255,0.07)", color:"rgba(255,255,255,0.8)", border:"0.5px solid rgba(255,255,255,0.1)" }}>
        {viewSide==="front" ? "Front view" : "Back view"}
      </Button>
      <Tooltip content="Auto-rotate the shirt" placement="bottom" className="bg-gray-900 text-white text-xs">
        <Button size="sm" variant="flat" onPress={on3DPreview} startContent={<RotateCw size={14}/>}
          className="text-xs font-medium ml-1"
          style={{ background:"rgba(124,58,237,0.15)", color:"#c4b5fd", border:"0.5px solid rgba(124,58,237,0.4)" }}>
          Auto Rotate
        </Button>
      </Tooltip>
      <div className="flex-1"/>
      <Tooltip content="Preview design" placement="bottom" className="bg-gray-900 text-white text-xs">
        <Button size="sm" variant="flat" onPress={onPreview} startContent={<Eye size={14}/>}
          className="text-sm mr-1"
          style={{ background:"rgba(255,255,255,0.07)", color:"rgba(255,255,255,0.8)", border:"0.5px solid rgba(255,255,255,0.1)" }}>
          Preview
        </Button>
      </Tooltip>
      <Tooltip content="Export PNG" placement="bottom" className="bg-gray-900 text-white text-xs">
        <Button size="sm" variant="flat" onPress={onSave} startContent={<Download size={14}/>}
          className="text-sm mr-2"
          style={{ background:"rgba(255,255,255,0.07)", color:"rgba(255,255,255,0.8)", border:"0.5px solid rgba(255,255,255,0.1)" }}>
          Export
        </Button>
      </Tooltip>
      <Button size="sm" onPress={onBuy} startContent={<ShoppingCart size={14}/>}
        className="font-semibold text-sm text-white px-5"
        style={{ background:"linear-gradient(135deg,#7c3aed,#4f46e5)" }}>
        Buy Now
      </Button>
    </div>
  );
}