"use client";

import { useState, useRef, useCallback } from "react";
import { Button, Tooltip } from "@nextui-org/react";
import {
  Shirt, Upload, Type, Layout, Bold, Italic, Underline,
  AlignLeft, AlignCenter, AlignRight, Plus, CloudUpload,
  Search, Trash2, FlipHorizontal, FlipVertical, RotateCcw,
  RotateCw, ZoomIn, ZoomOut, RefreshCw
} from "lucide-react";
import { TSHIRT_STYLES, SHIRT_COLORS, FONTS, getTshirtSVG } from "@/lib/tshirtData";
import { TEMPLATE_DESIGNS, TEMPLATE_CATEGORIES } from "@/lib/templateDesigns";
import { GarmentPickerModal } from "@/components/ui/GarmentPickerModal";
import { GarmentThumbnail } from "@/components/ui/GarmentThumbnail";
import type { SidebarTab } from "@/types";

interface LeftSidebarProps {
  selectedStyle: string; selectedColor: string;
  onStyleChange: (s: string) => void; onColorChange: (c: string) => void;
  onAddImage: (f: File) => void; onAddText: (o: any) => void;
  onAddTemplate: (lines: any[]) => void; onClearTemplates: () => void;
  // Shirt transform
  shirtRotation: number; shirtFlipX: boolean; shirtFlipY: boolean; shirtScale: number;
  onShirtRotation: (v: number) => void;
  onShirtFlipX: () => void; onShirtFlipY: () => void;
  onShirtScale: (v: number) => void; onShirtReset: () => void;
  // Custom color
  customColor: string; onCustomColor: (c: string) => void;
  // Applies a style patch to the currently selected design object; returns whether
  // anything was selected to apply it to.
  onStyleText: (patch: Record<string, any>) => boolean;
  hasSelection: boolean;
}

const TABS = [
  { id: "products" as SidebarTab, icon: Shirt, label: "Product" },
  { id: "upload" as SidebarTab, icon: Upload, label: "Upload" },
  { id: "text" as SidebarTab, icon: Type, label: "Text" },
  { id: "templates" as SidebarTab, icon: Layout, label: "Templates" },
];

function TemplateCard({ tmpl, onAdd }: { tmpl: any; onAdd: () => void; key?: any }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button onClick={onAdd} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      className="relative w-full rounded-xl overflow-hidden transition-all"
      style={{ background:hovered?"rgba(124,58,237,0.15)":"rgba(255,255,255,0.04)", border:hovered?"1px solid rgba(124,58,237,0.5)":"0.5px solid rgba(255,255,255,0.1)", aspectRatio:"1.6" }}>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 px-2 py-1.5">
        {tmpl.lines.map((line: any, i: number) => (
          <div key={i} style={{ fontFamily:line.font, fontWeight:line.weight, fontStyle:line.style||"normal", color:line.color, fontSize:Math.min(line.size*0.28,13), lineHeight:1.1, textAlign:"center", width:"100%", overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis" }}>
            {line.text}
          </div>
        ))}
      </div>
      {hovered && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ background:"rgba(124,58,237,0.08)" }}>
          <div className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background:"rgba(124,58,237,0.6)", color:"#fff" }}>+ Add</div>
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 px-1.5 py-0.5" style={{ background:"rgba(0,0,0,0.5)" }}>
        <p className="text-[9px] text-center truncate" style={{ color:"rgba(255,255,255,0.6)" }}>{tmpl.name}</p>
      </div>
    </button>
  );
}

function SectionLabel({ label }: { label: string }) {
  return <p className="text-[10px] font-semibold uppercase tracking-widest mb-2 mt-3" style={{ color:"rgba(255,255,255,0.3)" }}>{label}</p>;
}

function IconBtn({ icon: Icon, onClick, title, active }: { icon: any; onClick: () => void; title: string; active?: boolean }) {
  return (
    <Tooltip content={title} placement="top" className="bg-gray-800 text-white text-xs">
      <button onClick={onClick} className="flex-1 h-8 rounded-lg flex items-center justify-center transition-all"
        style={{ background:active?"rgba(124,58,237,0.3)":"rgba(255,255,255,0.06)", border:active?"0.5px solid rgba(124,58,237,0.6)":"0.5px solid rgba(255,255,255,0.1)", color:active?"#a78bfa":"rgba(255,255,255,0.6)" }}>
        <Icon size={14}/>
      </button>
    </Tooltip>
  );
}

export function LeftSidebar({
  selectedStyle, selectedColor, onStyleChange, onColorChange,
  onAddImage, onAddText, onAddTemplate, onClearTemplates,
  shirtRotation, shirtFlipX, shirtFlipY, shirtScale,
  onShirtRotation, onShirtFlipX, onShirtFlipY, onShirtScale, onShirtReset,
  customColor, onCustomColor, onStyleText, hasSelection,
}: LeftSidebarProps) {
  const [activeTab, setActiveTab] = useState<SidebarTab>("products");
  const [garmentModalOpen, setGarmentModalOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; url: string; file: File }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [textContent, setTextContent] = useState("Your text here");
  const [fontFamily, setFontFamily] = useState("Arial");
  const [fontSize, setFontSize] = useState(36);
  const [textColor, setTextColor] = useState("#ffffff");
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);
  const [underline, setUnderline] = useState(false);
  const [textAlign, setTextAlign] = useState<"left"|"center"|"right">("center");
  const [templateSearch, setTemplateSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  const handleFile = useCallback((file: File) => {
    if (!file.type.match(/image\/(png|jpg|jpeg|svg|webp)/i)) return;
    const url = URL.createObjectURL(file);
    setUploadedFiles(prev => [{ name:file.name, url, file }, ...prev]);
    onAddImage(file);
  }, [onAddImage]);

  const filtered = TEMPLATE_DESIGNS.filter(t => {
    const matchCat = activeCategory==="All" || t.category===activeCategory;
    const matchSearch = templateSearch==="" || t.name.toLowerCase().includes(templateSearch.toLowerCase()) || t.category.toLowerCase().includes(templateSearch.toLowerCase());
    return matchCat && matchSearch;
  });

  const sliderStyle = { WebkitAppearance:"none", appearance:"none", width:"100%", height:"4px", borderRadius:"2px", background:`linear-gradient(to right, #7c3aed ${(shirtRotation/360)*100}%, rgba(255,255,255,0.1) 0%)`, outline:"none" };

  return (
    <div className="flex h-full shrink-0" style={{ width:248, background:"#0d0d14", borderRight:"0.5px solid rgba(255,255,255,0.08)" }}>
      {/* Tab icons */}
      <div className="flex flex-col items-center pt-3 gap-1 shrink-0" style={{ width:56, borderRight:"0.5px solid rgba(255,255,255,0.06)" }}>
        {TABS.map(tab => {
          const Icon = tab.icon; const isActive = activeTab===tab.id;
          return (
            <Tooltip key={tab.id} content={tab.label} placement="right" className="bg-gray-800 text-white text-xs">
              <button onClick={() => setActiveTab(tab.id)} className="flex flex-col items-center justify-center w-10 h-10 rounded-xl gap-0.5 transition-all"
                style={{ background:isActive?"rgba(124,58,237,0.2)":"transparent", border:isActive?"0.5px solid rgba(124,58,237,0.5)":"0.5px solid transparent", color:isActive?"#a78bfa":"rgba(255,255,255,0.4)" }}>
                <Icon size={17}/><span style={{ fontSize:9 }}>{tab.label}</span>
              </button>
            </Tooltip>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto min-w-0">

        {/* ── PRODUCTS ── */}
        {activeTab === "products" && (
          <div className="p-3 sidebar-tab-content">

            <SectionLabel label="Garment"/>
            <button
              onClick={() => setGarmentModalOpen(true)}
              className="w-full rounded-xl p-3 mb-1 flex items-center gap-3 transition-all"
              style={{ background: "rgba(255,255,255,0.05)", border: "0.5px solid rgba(255,255,255,0.1)" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.09)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"; }}
            >
              <div
                className="w-12 h-12 rounded-lg overflow-hidden shrink-0 flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.06)" }}
              >
                <div style={{ transform: "scale(0.4)", transformOrigin: "center", width: 120, height: 120 }}>
                  <GarmentThumbnail style={selectedStyle} size={120} />
                </div>
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-[12px] font-semibold truncate" style={{ color: "rgba(255,255,255,0.85)" }}>
                  {TSHIRT_STYLES.find(s => s.svgPath === selectedStyle)?.name || "Classic Crew"}
                </p>
                <p className="text-[10px]" style={{ color: "rgba(124,58,237,0.9)" }}>Change garment →</p>
              </div>
            </button>

            {/* ── COLOR ── */}
            <SectionLabel label="Shirt Color"/>
            <div className="flex flex-wrap gap-2 mb-2">
              {SHIRT_COLORS.map(color => (
                <Tooltip key={color.value} content={color.name} placement="top" className="bg-gray-800 text-white text-xs">
                  <button onClick={() => { onColorChange(color.value); onCustomColor(color.value); }}
                    className="w-7 h-7 rounded-full transition-all"
                    style={{ background:color.value, border:selectedColor===color.value?"2.5px solid #a78bfa":`1.5px solid ${color.border||"transparent"}`, transform:selectedColor===color.value?"scale(1.2)":"scale(1)", boxShadow:selectedColor===color.value?"0 0 0 2px rgba(124,58,237,0.3)":"none" }}/>
                </Tooltip>
              ))}
            </div>

            {/* Custom color picker */}
            <div className="flex items-center gap-2 p-2 rounded-xl mb-1" style={{ background:"rgba(255,255,255,0.04)", border:"0.5px solid rgba(255,255,255,0.08)" }}>
              <input type="color" value={customColor} onChange={e => { onCustomColor(e.target.value); onColorChange(e.target.value); }}
                className="w-9 h-9 rounded-lg cursor-pointer shrink-0" style={{ border:"none", padding:2, background:"transparent" }}/>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-widest" style={{ color:"rgba(255,255,255,0.35)" }}>Custom Color</p>
                <p className="text-xs font-mono" style={{ color:"rgba(255,255,255,0.7)" }}>{customColor}</p>
              </div>
              <div className="w-6 h-6 rounded-full shrink-0" style={{ background:customColor, border:"1px solid rgba(255,255,255,0.2)" }}/>
            </div>

            {/* ── TRANSFORM ── */}
            <div className="mt-4 p-3 rounded-xl" style={{ background:"rgba(255,255,255,0.03)", border:"0.5px solid rgba(255,255,255,0.07)" }}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color:"rgba(255,255,255,0.3)" }}>Shirt Transform</p>
                <Tooltip content="Reset all transforms" placement="top" className="bg-gray-800 text-white text-xs">
                  <button onClick={onShirtReset} className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] transition-all"
                    style={{ background:"rgba(239,68,68,0.1)", border:"0.5px solid rgba(239,68,68,0.3)", color:"rgba(239,68,68,0.8)" }}>
                    <RefreshCw size={10}/> Reset
                  </button>
                </Tooltip>
              </div>

              {/* Rotation */}
              <p className="text-[10px] mb-1.5" style={{ color:"rgba(255,255,255,0.3)" }}>Rotation: {shirtRotation}°</p>
              <input type="range" min="0" max="360" value={shirtRotation}
                onChange={e => onShirtRotation(Number(e.target.value))}
                className="w-full mb-2 accent-violet-500" style={{ height:"4px" }}/>
              <div className="flex gap-2 mb-3">
                <IconBtn icon={RotateCcw} onClick={() => onShirtRotation(Math.max(0, shirtRotation-15))} title="Rotate -15°"/>
                <IconBtn icon={RotateCw} onClick={() => onShirtRotation((shirtRotation+15)%360)} title="Rotate +15°"/>
                <button onClick={() => onShirtRotation(0)} className="flex-1 h-8 rounded-lg text-[10px] transition-all"
                  style={{ background:"rgba(255,255,255,0.06)", border:"0.5px solid rgba(255,255,255,0.1)", color:"rgba(255,255,255,0.5)" }}>
                  0°
                </button>
                <button onClick={() => onShirtRotation(90)} className="flex-1 h-8 rounded-lg text-[10px] transition-all"
                  style={{ background:"rgba(255,255,255,0.06)", border:"0.5px solid rgba(255,255,255,0.1)", color:"rgba(255,255,255,0.5)" }}>
                  90°
                </button>
                <button onClick={() => onShirtRotation(180)} className="flex-1 h-8 rounded-lg text-[10px] transition-all"
                  style={{ background:"rgba(255,255,255,0.06)", border:"0.5px solid rgba(255,255,255,0.1)", color:"rgba(255,255,255,0.5)" }}>
                  180°
                </button>
              </div>

              {/* Flip */}
              <p className="text-[10px] mb-1.5" style={{ color:"rgba(255,255,255,0.3)" }}>Flip</p>
              <div className="flex gap-2 mb-3">
                <IconBtn icon={FlipHorizontal} onClick={onShirtFlipX} title="Flip horizontal" active={shirtFlipX}/>
                <IconBtn icon={FlipVertical} onClick={onShirtFlipY} title="Flip vertical" active={shirtFlipY}/>
              </div>

              {/* Scale */}
              <p className="text-[10px] mb-1.5" style={{ color:"rgba(255,255,255,0.3)" }}>Size: {Math.round(shirtScale*100)}%</p>
              <input type="range" min="50" max="150" value={Math.round(shirtScale*100)}
                onChange={e => onShirtScale(Number(e.target.value)/100)}
                className="w-full mb-2 accent-violet-500" style={{ height:"4px" }}/>
              <div className="flex gap-2">
                <IconBtn icon={ZoomOut} onClick={() => onShirtScale(Math.max(0.5, shirtScale-0.1))} title="Shrink shirt"/>
                <IconBtn icon={ZoomIn} onClick={() => onShirtScale(Math.min(1.5, shirtScale+0.1))} title="Enlarge shirt"/>
                <button onClick={() => onShirtScale(1)} className="flex-1 h-8 rounded-lg text-[10px] transition-all"
                  style={{ background:"rgba(255,255,255,0.06)", border:"0.5px solid rgba(255,255,255,0.1)", color:"rgba(255,255,255,0.5)" }}>
                  100%
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── UPLOAD ── */}
        {activeTab === "upload" && (
          <div className="p-3 sidebar-tab-content">
            <SectionLabel label="Upload Image"/>
            <div className={`rounded-xl p-5 text-center cursor-pointer transition-all ${isDragOver?"drop-active":""}`}
              style={{ border:`1.5px dashed ${isDragOver?"rgba(124,58,237,0.9)":"rgba(124,58,237,0.35)"}`, background:isDragOver?"rgba(124,58,237,0.1)":"rgba(124,58,237,0.05)" }}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={e => { e.preventDefault(); setIsDragOver(false); const f=e.dataTransfer.files[0]; if(f) handleFile(f); }}>
              <CloudUpload size={28} className="mx-auto mb-2" style={{ color:"rgba(124,58,237,0.7)" }}/>
              <p className="text-xs mb-1" style={{ color:"rgba(255,255,255,0.6)" }}>Drop image or <span style={{ color:"#a78bfa" }}>browse</span></p>
              <p className="text-[10px]" style={{ color:"rgba(255,255,255,0.3)" }}>PNG, JPG, SVG, WEBP</p>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*,.svg" className="hidden"
              onChange={e => { const f=e.target.files?.[0]; if(f) handleFile(f); e.target.value=""; }}/>
            {uploadedFiles.length > 0 && (
              <div className="mt-4">
                <SectionLabel label="Recent uploads"/>
                <div className="grid grid-cols-3 gap-1.5">
                  {uploadedFiles.map((item,i) => (
                    <div
                      key={i}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", JSON.stringify({
                          type: "image",
                          url: item.url,
                          name: item.name,
                        }));
                      }}
                      onClick={() => onAddImage(item.file)}
                      className="aspect-square rounded-lg overflow-hidden cursor-grab active:cursor-grabbing"
                      style={{ border:"0.5px solid rgba(255,255,255,0.1)", background:"rgba(255,255,255,0.04)" }}
                      title="Drag onto shirt or click to add"
                    >
                      <img src={item.url} alt={item.name} className="w-full h-full object-contain p-1"/>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TEXT ── */}
        {activeTab === "text" && (
          <div className="p-3 sidebar-tab-content">
            <SectionLabel label="Drag Text onto Shirt"/>
            <p className="text-[11px] mb-3" style={{ color:"rgba(255,255,255,0.35)" }}>
              Drag any text block directly onto the print area
            </p>

            {/* Draggable text chips */}
            {[
              { label: "Add Heading", fontSize: 64, fontWeight: "bold", sample: "HEADING" },
              { label: "Add Subheading", fontSize: 40, fontWeight: "600", sample: "Subheading" },
              { label: "Add Body Text", fontSize: 28, fontWeight: "normal", sample: "Body text here" },
              { label: "Add Small Text", fontSize: 20, fontWeight: "normal", sample: "Small text" },
            ].map((item) => (
              <div
                key={item.label}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/plain", JSON.stringify({
                    type: "text",
                    content: item.sample,
                    fontFamily,
                    fontSize: item.fontSize,
                    fontWeight: item.fontWeight,
                    fontStyle: italic ? "italic" : "normal",
                    fill: textColor,
                    textAlign,
                    underline,
                  }));
                }}
                className="rounded-xl p-3 mb-2 cursor-grab active:cursor-grabbing flex items-center gap-3 transition-all"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "0.5px solid rgba(255,255,255,0.1)",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(124,58,237,0.15)"; (e.currentTarget as HTMLElement).style.border = "0.5px solid rgba(124,58,237,0.4)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"; (e.currentTarget as HTMLElement).style.border = "0.5px solid rgba(255,255,255,0.1)"; }}
              >
                <span style={{ fontSize: Math.min(item.fontSize * 0.3, 22), fontWeight: item.fontWeight, color: "rgba(255,255,255,0.8)", lineHeight: 1 }}>A</span>
                <div>
                  <p className="text-[12px] font-medium" style={{ color: "rgba(255,255,255,0.8)" }}>{item.label}</p>
                  <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>Drag onto shirt</p>
                </div>
                <span className="ml-auto text-[16px]" style={{ color: "rgba(255,255,255,0.2)" }}>⠿</span>
              </div>
            ))}

            {/* Style controls */}
            <div className="mt-3 pt-3" style={{ borderTop: "0.5px solid rgba(255,255,255,0.08)" }}>
              <SectionLabel label="Text Style"/>
              <p className="text-[10px] mb-2.5" style={{ color: hasSelection ? "rgba(167,139,250,0.85)" : "rgba(255,255,255,0.3)" }}>
                {hasSelection
                  ? "Editing the selected design"
                  : "Select a design on the shirt to restyle it, or set defaults for the next one"}
              </p>
              <div className="mb-3">
                <label className="text-[10px] uppercase tracking-widest mb-1.5 block" style={{ color:"rgba(255,255,255,0.35)" }}>Font</label>
                <select value={fontFamily} onChange={e=>{ setFontFamily(e.target.value); onStyleText({ fontFamily: e.target.value }); }} className="w-full rounded-lg px-3 py-2 text-sm"
                  style={{ background:"rgba(255,255,255,0.06)", border:"0.5px solid rgba(255,255,255,0.12)", color:"rgba(255,255,255,0.8)", outline:"none" }}>
                  {FONTS.map(f => <option key={f} value={f} style={{ background:"#1a1a2e" }}>{f}</option>)}
                </select>
              </div>
              <div className="mb-3">
                <label className="text-[10px] uppercase tracking-widest mb-1.5 block" style={{ color:"rgba(255,255,255,0.35)" }}>Color</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={textColor} onChange={e=>{ setTextColor(e.target.value); onStyleText({ fill: e.target.value }); }} className="w-10 h-8 rounded cursor-pointer" style={{ border:"none" }}/>
                  <span className="text-xs font-mono" style={{ color:"rgba(255,255,255,0.5)" }}>{textColor}</span>
                </div>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {[
                  {icon:Bold,      k:"b", a:bold,      t:()=>{ const v=!bold;      setBold(v);      onStyleText({ fontWeight: v ? "bold" : "normal" }); }},
                  {icon:Italic,    k:"i", a:italic,    t:()=>{ const v=!italic;    setItalic(v);    onStyleText({ fontStyle: v ? "italic" : "normal" }); }},
                  {icon:Underline, k:"u", a:underline, t:()=>{ const v=!underline; setUnderline(v); onStyleText({ underline: v }); }},
                ].map(({icon:Icon,k,a,t})=>(
                  <button key={k} onClick={t} className="w-9 h-9 rounded-lg flex items-center justify-center transition-all"
                    style={{ background:a?"rgba(124,58,237,0.25)":"rgba(255,255,255,0.06)", border:a?"0.5px solid rgba(124,58,237,0.6)":"0.5px solid rgba(255,255,255,0.1)", color:a?"#a78bfa":"rgba(255,255,255,0.5)" }}>
                    <Icon size={14}/>
                  </button>
                ))}
                {[
                  {icon:AlignLeft,   k:"l", v:"left"   as const},
                  {icon:AlignCenter, k:"c", v:"center" as const},
                  {icon:AlignRight,  k:"r", v:"right"  as const},
                ].map(({icon:Icon,k,v})=>{
                  const a = textAlign===v;
                  return (
                    <button key={k} onClick={()=>{ setTextAlign(v); onStyleText({ textAlign: v }); }} className="w-9 h-9 rounded-lg flex items-center justify-center transition-all"
                      style={{ background:a?"rgba(124,58,237,0.25)":"rgba(255,255,255,0.06)", border:a?"0.5px solid rgba(124,58,237,0.6)":"0.5px solid rgba(255,255,255,0.1)", color:a?"#a78bfa":"rgba(255,255,255,0.5)" }}>
                      <Icon size={14}/>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── TEMPLATES ── */}
        {activeTab === "templates" && (
          <div className="flex flex-col sidebar-tab-content" style={{ height:"100%" }}>
            <div className="p-3 pb-2 shrink-0">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color:"rgba(255,255,255,0.35)" }}>
                  Templates <span style={{ color:"rgba(124,58,237,0.8)" }}>({filtered.length})</span>
                </p>
                <Tooltip content="Clear all templates" placement="left" className="bg-gray-800 text-white text-xs">
                  <button onClick={onClearTemplates} className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background:"rgba(239,68,68,0.1)", border:"0.5px solid rgba(239,68,68,0.3)", color:"rgba(239,68,68,0.7)" }}
                    onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background="rgba(239,68,68,0.2)";}}
                    onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background="rgba(239,68,68,0.1)";}}>
                    <Trash2 size={12}/>
                  </button>
                </Tooltip>
              </div>
              <div className="relative mb-2">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color:"rgba(255,255,255,0.3)" }}/>
                <input value={templateSearch} onChange={e=>setTemplateSearch(e.target.value)} placeholder="Search templates..."
                  className="w-full rounded-lg pl-7 pr-3 py-1.5 text-xs"
                  style={{ background:"rgba(255,255,255,0.06)", border:"0.5px solid rgba(255,255,255,0.12)", color:"rgba(255,255,255,0.8)", outline:"none" }}/>
              </div>
              <div className="flex gap-1 overflow-x-auto pb-1" style={{ scrollbarWidth:"none" }}>
                {TEMPLATE_CATEGORIES.map(cat => (
                  <button key={cat} onClick={()=>setActiveCategory(cat)}
                    className="shrink-0 px-2.5 py-1 rounded-full text-[10px] font-medium transition-all"
                    style={{ background:activeCategory===cat?"rgba(124,58,237,0.3)":"rgba(255,255,255,0.05)", border:activeCategory===cat?"0.5px solid rgba(124,58,237,0.6)":"0.5px solid rgba(255,255,255,0.1)", color:activeCategory===cat?"#c4b5fd":"rgba(255,255,255,0.45)" }}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <div className="mx-3 mb-2 px-2.5 py-2 rounded-lg shrink-0" style={{ background:"rgba(124,58,237,0.08)", border:"0.5px solid rgba(124,58,237,0.2)" }}>
              <p className="text-[10px] leading-relaxed" style={{ color:"rgba(167,139,250,0.8)" }}>💡 Click to <strong>replace</strong> canvas text. 🗑 to clear all.</p>
            </div>
            <div className="flex-1 overflow-y-auto px-3 pb-4">
              {filtered.length===0 ? (
                <div className="text-center py-8"><p className="text-xs" style={{ color:"rgba(255,255,255,0.3)" }}>No templates found</p></div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {filtered.map(tmpl => <TemplateCard key={tmpl.id} tmpl={tmpl} onAdd={() => onAddTemplate(tmpl.lines)}/>)}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <GarmentPickerModal
        isOpen={garmentModalOpen}
        onClose={() => setGarmentModalOpen(false)}
        selectedStyle={selectedStyle}
        onSelectStyle={onStyleChange}
      />
    </div>
  );
}