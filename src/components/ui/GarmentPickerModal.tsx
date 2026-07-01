"use client";

import { X } from "lucide-react";
import { TSHIRT_STYLES } from "@/lib/tshirtData";
//import { GarmentThumbnail } from "@/components/ui/GarmentThumbnail";
import { GarmentThumbnail } from "./GarmentThumbnail";

interface GarmentPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedStyle: string;
  onSelectStyle: (style: string) => void;
}

export function GarmentPickerModal({ isOpen, onClose, selectedStyle, onSelectStyle }: GarmentPickerModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl overflow-hidden flex flex-col"
        style={{ maxHeight: "85vh", background: "#f5f5f3", boxShadow: "0 32px 90px rgba(0,0,0,0.5)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 shrink-0" style={{ borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "rgba(0,0,0,0.55)" }}>
            Change Garment
          </p>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
            style={{ background: "rgba(0,0,0,0.06)", color: "rgba(0,0,0,0.6)" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.12)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.06)"; }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid grid-cols-2 gap-4">
            {TSHIRT_STYLES.map(style => {
              const isSelected = selectedStyle === style.svgPath;
              return (
                <button
                  key={style.id}
                  onClick={() => { onSelectStyle(style.svgPath); onClose(); }}
                  className="relative rounded-2xl overflow-hidden flex flex-col items-center justify-center transition-all group"
                  style={{
                    aspectRatio: "1",
                    background: "linear-gradient(160deg, #2a2a32 0%, #18181d 100%)",
                    border: isSelected ? "2px solid #7c3aed" : "2px solid transparent",
                  }}
                >
                  <div className="flex items-center justify-center" style={{ width: "100%", height: "100%" }}>
                    <GarmentThumbnail style={style.svgPath} size={150} />
                  </div>
                  <div
                    className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                    style={{ background: "rgba(0,0,0,0.45)" }}
                  >
                    <span
                      className="px-4 py-2 rounded-full text-xs font-semibold"
                      style={{ background: "#fff", color: "#111" }}
                    >
                      {isSelected ? "Selected" : "Use this style"}
                    </span>
                  </div>
                  <p
                    className="absolute bottom-2 left-0 right-0 text-center text-[11px] font-medium pointer-events-none"
                    style={{ color: "rgba(255,255,255,0.85)", textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}
                  >
                    {style.name}
                  </p>
                  {isSelected && (
                    <div
                      className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                      style={{ background: "#7c3aed", color: "#fff" }}
                    >
                      ✓
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}