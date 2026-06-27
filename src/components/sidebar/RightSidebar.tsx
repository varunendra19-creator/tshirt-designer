"use client";

import { Button, Tooltip } from "@nextui-org/react";
import {
  MousePointer2, Trash2, Copy, AlignCenter, AlignCenterVertical,
  BringToFront, SendToBack, ChevronUp, ChevronDown, Layers
} from "lucide-react";
import type { ObjectProperties } from "@/types";

interface RightSidebarProps {
  activeObject: any;
  objProps: ObjectProperties | null;
  onUpdateProp: (key: keyof ObjectProperties, value: number) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onCenterH: () => void;
  onCenterV: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
}

function PropInput({
  label, value, onChange, unit = "", min, max, step = 1
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[9px] uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.3)" }}>
        {label}
      </label>
      <div className="flex items-center gap-1">
        <input
          type="number"
          value={value}
          min={min} max={max} step={step}
          onChange={e => onChange(Number(e.target.value))}
          className="w-full rounded-lg px-2 py-1.5 text-xs text-center font-medium"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "0.5px solid rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.85)",
            outline: "none",
          }}
        />
        {unit && <span className="text-[10px] shrink-0" style={{ color: "rgba(255,255,255,0.3)" }}>{unit}</span>}
      </div>
    </div>
  );
}

export function RightSidebar({
  activeObject, objProps,
  onUpdateProp, onDelete, onDuplicate,
  onCenterH, onCenterV,
  onBringToFront, onSendToBack, onBringForward, onSendBackward,
}: RightSidebarProps) {
  const sectionTitle = (t: string) => (
    <p className="text-[10px] font-semibold uppercase tracking-widest mb-2.5 flex items-center gap-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>
      {t}
    </p>
  );

  const iconBtn = (icon: React.ReactNode, onClick: () => void, tooltip: string, danger?: boolean) => (
    <Tooltip content={tooltip} placement="top" className="bg-gray-800 text-white text-xs">
      <button
        onClick={onClick}
        className="flex-1 h-9 rounded-xl flex items-center justify-center transition-all"
        style={{
          background: "rgba(255,255,255,0.05)",
          border: "0.5px solid rgba(255,255,255,0.1)",
          color: danger ? "rgba(239,68,68,0.7)" : "rgba(255,255,255,0.5)",
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.background = danger
            ? "rgba(239,68,68,0.12)"
            : "rgba(255,255,255,0.1)";
          (e.currentTarget as HTMLElement).style.color = danger ? "rgb(239,68,68)" : "rgba(255,255,255,0.9)";
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)";
          (e.currentTarget as HTMLElement).style.color = danger ? "rgba(239,68,68,0.7)" : "rgba(255,255,255,0.5)";
        }}
      >
        {icon}
      </button>
    </Tooltip>
  );

  return (
    <div
      className="flex flex-col h-full overflow-y-auto shrink-0"
      style={{ width: 200, background: "#0d0d14", borderLeft: "0.5px solid rgba(255,255,255,0.08)" }}
    >
      {!activeObject || !objProps ? (
        <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.05)" }}
          >
            <MousePointer2 size={20} style={{ color: "rgba(255,255,255,0.2)" }} />
          </div>
          <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.25)" }}>
            Select an object on the canvas to edit its properties
          </p>
        </div>
      ) : (
        <div className="p-3 flex flex-col gap-4">
          {/* Actions */}
          <div>
            {sectionTitle("Actions")}
            <div className="flex gap-2">
              {iconBtn(<Copy size={14} />, onDuplicate, "Duplicate (Ctrl+D)")}
              {iconBtn(<Trash2 size={14} />, onDelete, "Delete (Del)", true)}
            </div>
          </div>

          <div className="h-px" style={{ background: "rgba(255,255,255,0.06)" }} />

          {/* Position */}
          <div>
            {sectionTitle("Position")}
            <div className="grid grid-cols-2 gap-2">
              <PropInput label="X" value={objProps.left} onChange={v => onUpdateProp("left", v)} />
              <PropInput label="Y" value={objProps.top} onChange={v => onUpdateProp("top", v)} />
            </div>
          </div>

          <div className="h-px" style={{ background: "rgba(255,255,255,0.06)" }} />

          {/* Size */}
          <div>
            {sectionTitle("Size")}
            <div className="grid grid-cols-2 gap-2">
              <PropInput label="W" value={objProps.width} onChange={v => onUpdateProp("width", v)} min={1} />
              <PropInput label="H" value={objProps.height} onChange={v => onUpdateProp("height", v)} min={1} />
            </div>
          </div>

          <div className="h-px" style={{ background: "rgba(255,255,255,0.06)" }} />

          {/* Rotation */}
          <div>
            {sectionTitle("Rotation")}
            <PropInput label="Angle" value={objProps.angle} onChange={v => onUpdateProp("angle", v)} unit="°" min={0} max={360} />
            <div className="mt-2">
              <input
                type="range" min="0" max="360" value={objProps.angle}
                onChange={e => onUpdateProp("angle", Number(e.target.value))}
                className="w-full accent-violet-500 mt-1"
              />
            </div>
          </div>

          <div className="h-px" style={{ background: "rgba(255,255,255,0.06)" }} />

          {/* Opacity */}
          <div>
            {sectionTitle("Opacity")}
            <div className="flex items-center gap-2">
              <input
                type="range" min="0" max="100" value={objProps.opacity}
                onChange={e => onUpdateProp("opacity", Number(e.target.value))}
                className="flex-1 accent-violet-500"
              />
              <span className="text-xs w-9 text-right font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>
                {objProps.opacity}%
              </span>
            </div>
          </div>

          <div className="h-px" style={{ background: "rgba(255,255,255,0.06)" }} />

          {/* Align */}
          <div>
            {sectionTitle("Align")}
            <div className="flex gap-2">
              {iconBtn(<AlignCenter size={14} />, onCenterH, "Center horizontally")}
              {iconBtn(<AlignCenterVertical size={14} />, onCenterV, "Center vertically")}
            </div>
          </div>

          <div className="h-px" style={{ background: "rgba(255,255,255,0.06)" }} />

          {/* Layers */}
          <div>
            {sectionTitle("Layers")}
            <div className="grid grid-cols-2 gap-2">
              {iconBtn(<BringToFront size={14} />, onBringToFront, "Bring to front")}
              {iconBtn(<ChevronUp size={14} />, onBringForward, "Bring forward")}
              {iconBtn(<ChevronDown size={14} />, onSendBackward, "Send backward")}
              {iconBtn(<SendToBack size={14} />, onSendToBack, "Send to back")}
            </div>
          </div>

          {/* Object type indicator */}
          <div className="mt-2 rounded-xl p-2.5" style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.07)" }}>
            <div className="flex items-center gap-2">
              <Layers size={12} style={{ color: "rgba(255,255,255,0.3)" }} />
              <span className="text-[11px] capitalize" style={{ color: "rgba(255,255,255,0.4)" }}>
                {activeObject?.type === "i-text" ? "text" : activeObject?.type || "object"}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
