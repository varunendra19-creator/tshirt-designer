"use client";

import { useState, useRef, useCallback } from "react";
import { Button, Input, Select, SelectItem, Slider, Tooltip } from "@nextui-org/react";
import {
  Shirt, Upload, Type, Layout, Upload as UploadIcon,
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
  Plus, CloudUpload
} from "lucide-react";
import { TSHIRT_STYLES, SHIRT_COLORS, FONTS, getTshirtSVG } from "@/lib/tshirtData";
import type { SidebarTab } from "@/types";

interface LeftSidebarProps {
  selectedStyle: string;
  selectedColor: string;
  onStyleChange: (style: string) => void;
  onColorChange: (color: string) => void;
  onAddImage: (file: File) => void;
  onAddText: (opts: any) => void;
}

const TABS = [
  { id: "products" as SidebarTab, icon: Shirt, label: "Product" },
  { id: "upload" as SidebarTab, icon: Upload, label: "Upload" },
  { id: "text" as SidebarTab, icon: Type, label: "Text" },
  { id: "templates" as SidebarTab, icon: Layout, label: "Templates" },
];

const TEMPLATE_TEXTS = [
  { label: "EST. 2024", font: "Impact", size: 40, color: "#ffffff", weight: "bold" },
  { label: "ORIGINAL\nDESIGN", font: "Arial", size: 32, color: "#ffcc00", weight: "bold" },
  { label: "Custom\nPrinted", font: "Georgia", size: 28, color: "#ff6b6b", weight: "normal" },
  { label: "HANDMADE\nWITH ♥", font: "Trebuchet MS", size: 26, color: "#98d8c8", weight: "bold" },
  { label: "LIMITED\nEDITION", font: "Verdana", size: 24, color: "#c3b1e1", weight: "bold" },
  { label: "MADE TO\nORDER", font: "Courier New", size: 24, color: "#fad7a0", weight: "normal" },
];

export function LeftSidebar({
  selectedStyle, selectedColor, onStyleChange, onColorChange,
  onAddImage, onAddText,
}: LeftSidebarProps) {
  const [activeTab, setActiveTab] = useState<SidebarTab>("products");
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; url: string; file: File }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Text options
  const [textContent, setTextContent] = useState("Your text here");
  const [fontFamily, setFontFamily] = useState("Inter");
  const [fontSize, setFontSize] = useState(36);
  const [textColor, setTextColor] = useState("#ffffff");
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);
  const [underline, setUnderline] = useState(false);
  const [textAlign, setTextAlign] = useState<"left" | "center" | "right">("center");

  const handleFile = useCallback((file: File) => {
    if (!file.type.match(/image\/(png|jpg|jpeg|svg|webp)/i)) return;
    const url = URL.createObjectURL(file);
    setUploadedFiles(prev => [{ name: file.name, url, file }, ...prev]);
    onAddImage(file);
  }, [onAddImage]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleAddText = () => {
    onAddText({
      content: textContent || "Your text",
      fontFamily,
      fontSize,
      fontWeight: bold ? "bold" : "normal",
      fontStyle: italic ? "italic" : "normal",
      fill: textColor,
      textAlign,
      underline,
    });
  };

  return (
    <div
      className="flex h-full shrink-0"
      style={{ width: 240, background: "#0d0d14", borderRight: "0.5px solid rgba(255,255,255,0.08)" }}
    >
      {/* Tab icons */}
      <div
        className="flex flex-col items-center pt-3 gap-1 shrink-0"
        style={{ width: 56, borderRight: "0.5px solid rgba(255,255,255,0.06)" }}
      >
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <Tooltip key={tab.id} content={tab.label} placement="right" className="bg-gray-800 text-white text-xs">
              <button
                onClick={() => setActiveTab(tab.id)}
                className="flex flex-col items-center justify-center w-10 h-10 rounded-xl gap-0.5 transition-all"
                style={{
                  background: isActive ? "rgba(124,58,237,0.2)" : "transparent",
                  border: isActive ? "0.5px solid rgba(124,58,237,0.5)" : "0.5px solid transparent",
                  color: isActive ? "#a78bfa" : "rgba(255,255,255,0.4)",
                }}
              >
                <Icon size={17} />
                <span style={{ fontSize: 9 }}>{tab.label}</span>
              </button>
            </Tooltip>
          );
        })}
      </div>

      {/* Panel content */}
      <div className="flex-1 overflow-y-auto">
        {/* Products */}
        {activeTab === "products" && (
          <div className="p-3 sidebar-tab-content">
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "rgba(255,255,255,0.35)" }}>
              Style
            </p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {TSHIRT_STYLES.map(style => (
                <button
                  key={style.id}
                  onClick={() => onStyleChange(style.svgPath)}
                  className="rounded-xl p-2 transition-all text-left"
                  style={{
                    background: selectedStyle === style.svgPath
                      ? "rgba(124,58,237,0.2)"
                      : "rgba(255,255,255,0.04)",
                    border: selectedStyle === style.svgPath
                      ? "1px solid rgba(124,58,237,0.6)"
                      : "0.5px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div
                    className="w-full aspect-square rounded-lg flex items-center justify-center mb-1.5 overflow-hidden"
                    style={{ background: "rgba(255,255,255,0.06)" }}
                    dangerouslySetInnerHTML={{ __html: getTshirtSVG(style.svgPath, "#d0d0d0") }}
                  />
                  <p className="text-[10px] text-center font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>
                    {style.name}
                  </p>
                </button>
              ))}
            </div>

            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "rgba(255,255,255,0.35)" }}>
              Color
            </p>
            <div className="flex flex-wrap gap-2">
              {SHIRT_COLORS.map(color => (
                <Tooltip key={color.value} content={color.name} placement="top" className="bg-gray-800 text-white text-xs">
                  <button
                    onClick={() => onColorChange(color.value)}
                    className="w-7 h-7 rounded-full transition-all"
                    style={{
                      background: color.value,
                      border: selectedColor === color.value
                        ? "2px solid #a78bfa"
                        : `1.5px solid ${color.border || "transparent"}`,
                      transform: selectedColor === color.value ? "scale(1.2)" : "scale(1)",
                      boxShadow: selectedColor === color.value ? "0 0 0 2px rgba(124,58,237,0.3)" : "none",
                    }}
                  />
                </Tooltip>
              ))}
            </div>
          </div>
        )}

        {/* Upload */}
        {activeTab === "upload" && (
          <div className="p-3 sidebar-tab-content">
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "rgba(255,255,255,0.35)" }}>
              Upload Image
            </p>
            <div
              className={`rounded-xl p-5 text-center cursor-pointer transition-all ${isDragOver ? "drop-active" : ""}`}
              style={{
                border: `1.5px dashed ${isDragOver ? "rgba(124,58,237,0.9)" : "rgba(124,58,237,0.35)"}`,
                background: isDragOver ? "rgba(124,58,237,0.1)" : "rgba(124,58,237,0.05)",
              }}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
            >
              <CloudUpload size={28} className="mx-auto mb-2" style={{ color: "rgba(124,58,237,0.7)" }} />
              <p className="text-xs mb-1" style={{ color: "rgba(255,255,255,0.6)" }}>
                Drop image here or <span style={{ color: "#a78bfa" }}>browse</span>
              </p>
              <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>
                PNG, JPG, SVG, WEBP
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.svg"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
            />

            {uploadedFiles.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.35)" }}>
                  Recent uploads
                </p>
                <div className="grid grid-cols-3 gap-1.5">
                  {uploadedFiles.map((item, i) => (
                    <button
                      key={i}
                      onClick={() => onAddImage(item.file)}
                      className="aspect-square rounded-lg overflow-hidden transition-all hover:opacity-80"
                      style={{ border: "0.5px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)" }}
                      title={`Add ${item.name}`}
                    >
                      <img src={item.url} alt={item.name} className="w-full h-full object-contain p-1" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Text */}
        {activeTab === "text" && (
          <div className="p-3 sidebar-tab-content">
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "rgba(255,255,255,0.35)" }}>
              Add Text
            </p>

            <textarea
              value={textContent}
              onChange={e => setTextContent(e.target.value)}
              rows={3}
              className="w-full rounded-xl p-3 text-sm resize-none mb-3"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "0.5px solid rgba(255,255,255,0.12)",
                color: "rgba(255,255,255,0.85)",
                outline: "none",
              }}
              placeholder="Enter your text..."
            />

            <div className="mb-3">
              <label className="text-[10px] uppercase tracking-widest mb-1.5 block" style={{ color: "rgba(255,255,255,0.35)" }}>Font</label>
              <select
                value={fontFamily}
                onChange={e => setFontFamily(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "0.5px solid rgba(255,255,255,0.12)",
                  color: "rgba(255,255,255,0.8)",
                  outline: "none",
                }}
              >
                {FONTS.map(f => <option key={f} value={f} style={{ background: "#1a1a2e" }}>{f}</option>)}
              </select>
            </div>

            <div className="mb-3">
              <label className="text-[10px] uppercase tracking-widest mb-1.5 block" style={{ color: "rgba(255,255,255,0.35)" }}>
                Size: {fontSize}px
              </label>
              <input
                type="range" min="10" max="120" value={fontSize}
                onChange={e => setFontSize(Number(e.target.value))}
                className="w-full accent-violet-500"
              />
            </div>

            <div className="mb-3">
              <label className="text-[10px] uppercase tracking-widest mb-1.5 block" style={{ color: "rgba(255,255,255,0.35)" }}>Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color" value={textColor}
                  onChange={e => setTextColor(e.target.value)}
                  className="w-10 h-8 rounded cursor-pointer border-0"
                  style={{ background: "transparent" }}
                />
                <span className="text-xs font-mono" style={{ color: "rgba(255,255,255,0.5)" }}>{textColor}</span>
              </div>
            </div>

            {/* Style buttons */}
            <div className="mb-3">
              <label className="text-[10px] uppercase tracking-widest mb-1.5 block" style={{ color: "rgba(255,255,255,0.35)" }}>Style</label>
              <div className="flex gap-1.5">
                {[
                  { icon: Bold, key: "bold", active: bold, toggle: () => setBold(!bold) },
                  { icon: Italic, key: "italic", active: italic, toggle: () => setItalic(!italic) },
                  { icon: Underline, key: "underline", active: underline, toggle: () => setUnderline(!underline) },
                ].map(({ icon: Icon, key, active, toggle }) => (
                  <button
                    key={key} onClick={toggle}
                    className="w-9 h-9 rounded-lg flex items-center justify-center transition-all"
                    style={{
                      background: active ? "rgba(124,58,237,0.25)" : "rgba(255,255,255,0.06)",
                      border: active ? "0.5px solid rgba(124,58,237,0.6)" : "0.5px solid rgba(255,255,255,0.1)",
                      color: active ? "#a78bfa" : "rgba(255,255,255,0.5)",
                    }}
                  >
                    <Icon size={14} />
                  </button>
                ))}
                <div className="w-px h-9 mx-0.5" style={{ background: "rgba(255,255,255,0.08)" }} />
                {[
                  { icon: AlignLeft, align: "left" as const },
                  { icon: AlignCenter, align: "center" as const },
                  { icon: AlignRight, align: "right" as const },
                ].map(({ icon: Icon, align }) => (
                  <button
                    key={align} onClick={() => setTextAlign(align)}
                    className="w-9 h-9 rounded-lg flex items-center justify-center transition-all"
                    style={{
                      background: textAlign === align ? "rgba(124,58,237,0.25)" : "rgba(255,255,255,0.06)",
                      border: textAlign === align ? "0.5px solid rgba(124,58,237,0.6)" : "0.5px solid rgba(255,255,255,0.1)",
                      color: textAlign === align ? "#a78bfa" : "rgba(255,255,255,0.5)",
                    }}
                  >
                    <Icon size={14} />
                  </button>
                ))}
              </div>
            </div>

            <Button
              onPress={handleAddText}
              className="w-full font-semibold text-white"
              style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}
              startContent={<Plus size={15} />}
            >
              Add to canvas
            </Button>
          </div>
        )}

        {/* Templates */}
        {activeTab === "templates" && (
          <div className="p-3 sidebar-tab-content">
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "rgba(255,255,255,0.35)" }}>
              Quick Text Templates
            </p>
            <div className="flex flex-col gap-2">
              {TEMPLATE_TEXTS.map((tmpl, i) => (
                <button
                  key={i}
                  onClick={() => onAddText({
                    content: tmpl.label,
                    fontFamily: tmpl.font,
                    fontSize: tmpl.size,
                    fontWeight: tmpl.weight,
                    fontStyle: "normal",
                    fill: tmpl.color,
                    textAlign: "center",
                    underline: false,
                  })}
                  className="w-full rounded-xl p-3 text-left transition-all hover:opacity-80"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "0.5px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <p
                    className="text-sm leading-tight"
                    style={{
                      fontFamily: tmpl.font,
                      fontWeight: tmpl.weight,
                      color: tmpl.color,
                    }}
                  >
                    {tmpl.label.replace("\\n", " ")}
                  </p>
                  <p className="text-[10px] mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>
                    {tmpl.font} · {tmpl.size}px
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
