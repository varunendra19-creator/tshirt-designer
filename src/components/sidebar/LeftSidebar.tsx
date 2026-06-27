"use client";

import { useState, useRef, useCallback } from "react";
import { Button, Tooltip } from "@nextui-org/react";
import { Shirt, Upload, Type, Layout, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, Plus, CloudUpload, Search, Trash2 } from "lucide-react";
import { TSHIRT_STYLES, SHIRT_COLORS, FONTS, getTshirtSVG } from "@/lib/tshirtData";
import { TEMPLATE_DESIGNS, TEMPLATE_CATEGORIES } from "@/lib/templateDesigns";
import type { SidebarTab } from "@/types";

interface LeftSidebarProps {
  selectedStyle: string; selectedColor: string;
  onStyleChange: (s: string) => void; onColorChange: (c: string) => void;
  onAddImage: (f: File) => void; onAddText: (o: any) => void;
  onAddTemplate: (lines: any[]) => void; onClearTemplates: () => void;
}

const TABS = [
  { id: "products" as SidebarTab, icon: Shirt, label: "Product" },
  { id: "upload" as SidebarTab, icon: Upload, label: "Upload" },
  { id: "text" as SidebarTab, icon: Type, label: "Text" },
  { id: "templates" as SidebarTab, icon: Layout, label: "Templates" },
];

function TemplateCard({ tmpl, onAdd }: { tmpl: any; onAdd: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button onClick={onAdd} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      className="relative w-full rounded-xl overflow-hidden transition-all"
      style={{ background: hovered ? "rgba(124,58,237,0.15)" : "rgba(255,255,255,0.04)", border: hovered ? "1px solid rgba(124,58,237,0.5)" : "0.5px solid rgba(255,255,255,0.1)", aspectRatio: "1.6" }}>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 px-2 py-1.5">
        {tmpl.lines.map((line: any, i: number) => (
          <div key={i} style={{ fontFamily: line.font, fontWeight: line.weight, fontStyle: line.style||"normal", color: line.color, fontSize: Math.min(line.size*0.28, 13), lineHeight: 1.1, textAlign: "center", width: "100%", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
            {line.text}
          </div>
        ))}
      </div>
      {hovered && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(124,58,237,0.08)" }}>
          <div className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(124,58,237,0.6)", color: "#fff" }}>+ Add</div>
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 px-1.5 py-0.5" style={{ background: "rgba(0,0,0,0.5)" }}>
        <p className="text-[9px] text-center truncate" style={{ color: "rgba(255,255,255,0.6)" }}>{tmpl.name}</p>
      </div>
    </button>
  );
}

export function LeftSidebar({ selectedStyle, selectedColor, onStyleChange, onColorChange, onAddImage, onAddText, onAddTemplate, onClearTemplates }: LeftSidebarProps) {
  const [activeTab, setActiveTab] = useState<SidebarTab>("products");
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
    setUploadedFiles(prev => [{ name: file.name, url, file }, ...prev]);
    onAddImage(file);
  }, [onAddImage]);

  const filtered = TEMPLATE_DESIGNS.filter(t => {
    const matchCat = activeCategory === "All" || t.category === activeCategory;
    const matchSearch = templateSearch === "" || t.name.toLowerCase().includes(templateSearch.toLowerCase()) || t.category.toLowerCase().includes(templateSearch.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="flex h-full shrink-0" style={{ width: 248, background: "#0d0d14", borderRight: "0.5px solid rgba(255,255,255,0.08)" }}>
      <div className="flex flex-col items-center pt-3 gap-1 shrink-0" style={{ width: 56, borderRight: "0.5px solid rgba(255,255,255,0.06)" }}>
        {TABS.map(tab => {
          const Icon = tab.icon; const isActive = activeTab === tab.id;
          return (
            <Tooltip key={tab.id} content={tab.label} placement="right" className="bg-gray-800 text-white text-xs">
              <button onClick={() => setActiveTab(tab.id)} className="flex flex-col items-center justify-center w-10 h-10 rounded-xl gap-0.5 transition-all"
                style={{ background: isActive?"rgba(124,58,237,0.2)":"transparent", border: isActive?"0.5px solid rgba(124,58,237,0.5)":"0.5px solid transparent", color: isActive?"#a78bfa":"rgba(255,255,255,0.4)" }}>
                <Icon size={17}/><span style={{ fontSize:9 }}>{tab.label}</span>
              </button>
            </Tooltip>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto min-w-0">

        {activeTab === "products" && (
          <div className="p-3 sidebar-tab-content">
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color:"rgba(255,255,255,0.35)" }}>Style</p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {TSHIRT_STYLES.map(style => (
                <button key={style.id} onClick={() => onStyleChange(style.svgPath)} className="rounded-xl p-2 transition-all"
                  style={{ background:selectedStyle===style.svgPath?"rgba(124,58,237,0.2)":"rgba(255,255,255,0.04)", border:selectedStyle===style.svgPath?"1px solid rgba(124,58,237,0.6)":"0.5px solid rgba(255,255,255,0.08)" }}>
                  <div className="w-full aspect-square rounded-lg flex items-center justify-center mb-1.5 overflow-hidden" style={{ background:"rgba(255,255,255,0.06)" }} dangerouslySetInnerHTML={{ __html: getTshirtSVG(style.svgPath,"#d0d0d0") }}/>
                  <p className="text-[10px] text-center font-medium" style={{ color:"rgba(255,255,255,0.6)" }}>{style.name}</p>
                </button>
              ))}
            </div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color:"rgba(255,255,255,0.35)" }}>Color</p>
            <div className="flex flex-wrap gap-2">
              {SHIRT_COLORS.map(color => (
                <Tooltip key={color.value} content={color.name} placement="top" className="bg-gray-800 text-white text-xs">
                  <button onClick={() => onColorChange(color.value)} className="w-7 h-7 rounded-full transition-all"
                    style={{ background:color.value, border:selectedColor===color.value?"2px solid #a78bfa":`1.5px solid ${color.border||"transparent"}`, transform:selectedColor===color.value?"scale(1.2)":"scale(1)", boxShadow:selectedColor===color.value?"0 0 0 2px rgba(124,58,237,0.3)":"none" }}/>
                </Tooltip>
              ))}
            </div>
          </div>
        )}

        {activeTab === "upload" && (
          <div className="p-3 sidebar-tab-content">
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color:"rgba(255,255,255,0.35)" }}>Upload Image</p>
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
            <input ref={fileInputRef} type="file" accept="image/*,.svg" className="hidden" onChange={e => { const f=e.target.files?.[0]; if(f) handleFile(f); e.target.value=""; }}/>
            {uploadedFiles.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color:"rgba(255,255,255,0.35)" }}>Recent uploads</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {uploadedFiles.map((item,i) => (
                    <button key={i} onClick={() => onAddImage(item.file)} className="aspect-square rounded-lg overflow-hidden hover:opacity-80"
                      style={{ border:"0.5px solid rgba(255,255,255,0.1)", background:"rgba(255,255,255,0.04)" }}>
                      <img src={item.url} alt={item.name} className="w-full h-full object-contain p-1"/>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "text" && (
          <div className="p-3 sidebar-tab-content">
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color:"rgba(255,255,255,0.35)" }}>Add Text</p>
            <textarea value={textContent} onChange={e=>setTextContent(e.target.value)} rows={3} placeholder="Enter your text..." className="w-full rounded-xl p-3 text-sm resize-none mb-3"
              style={{ background:"rgba(255,255,255,0.06)", border:"0.5px solid rgba(255,255,255,0.12)", color:"rgba(255,255,255,0.85)", outline:"none" }}/>
            <div className="mb-3">
              <label className="text-[10px] uppercase tracking-widest mb-1.5 block" style={{ color:"rgba(255,255,255,0.35)" }}>Font</label>
              <select value={fontFamily} onChange={e=>setFontFamily(e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm"
                style={{ background:"rgba(255,255,255,0.06)", border:"0.5px solid rgba(255,255,255,0.12)", color:"rgba(255,255,255,0.8)", outline:"none" }}>
                {FONTS.map(f => <option key={f} value={f} style={{ background:"#1a1a2e" }}>{f}</option>)}
              </select>
            </div>
            <div className="mb-3">
              <label className="text-[10px] uppercase tracking-widest mb-1.5 block" style={{ color:"rgba(255,255,255,0.35)" }}>Size: {fontSize}px</label>
              <input type="range" min="10" max="120" value={fontSize} onChange={e=>setFontSize(Number(e.target.value))} className="w-full accent-violet-500"/>
            </div>
            <div className="mb-3">
              <label className="text-[10px] uppercase tracking-widest mb-1.5 block" style={{ color:"rgba(255,255,255,0.35)" }}>Color</label>
              <div className="flex items-center gap-2">
                <input type="color" value={textColor} onChange={e=>setTextColor(e.target.value)} className="w-10 h-8 rounded cursor-pointer" style={{ border:"none" }}/>
                <span className="text-xs font-mono" style={{ color:"rgba(255,255,255,0.5)" }}>{textColor}</span>
              </div>
            </div>
            <div className="mb-4">
              <label className="text-[10px] uppercase tracking-widest mb-1.5 block" style={{ color:"rgba(255,255,255,0.35)" }}>Style</label>
              <div className="flex gap-1.5 flex-wrap">
                {[{icon:Bold,k:"b",a:bold,t:()=>setBold(!bold)},{icon:Italic,k:"i",a:italic,t:()=>setItalic(!italic)},{icon:Underline,k:"u",a:underline,t:()=>setUnderline(!underline)}].map(({icon:Icon,k,a,t})=>(
                  <button key={k} onClick={t} className="w-9 h-9 rounded-lg flex items-center justify-center transition-all"
                    style={{ background:a?"rgba(124,58,237,0.25)":"rgba(255,255,255,0.06)", border:a?"0.5px solid rgba(124,58,237,0.6)":"0.5px solid rgba(255,255,255,0.1)", color:a?"#a78bfa":"rgba(255,255,255,0.5)" }}>
                    <Icon size={14}/>
                  </button>
                ))}
                <div className="w-px h-9" style={{ background:"rgba(255,255,255,0.08)" }}/>
                {[{icon:AlignLeft,a:"left"as const},{icon:AlignCenter,a:"center"as const},{icon:AlignRight,a:"right"as const}].map(({icon:Icon,a})=>(
                  <button key={a} onClick={()=>setTextAlign(a)} className="w-9 h-9 rounded-lg flex items-center justify-center transition-all"
                    style={{ background:textAlign===a?"rgba(124,58,237,0.25)":"rgba(255,255,255,0.06)", border:textAlign===a?"0.5px solid rgba(124,58,237,0.6)":"0.5px solid rgba(255,255,255,0.1)", color:textAlign===a?"#a78bfa":"rgba(255,255,255,0.5)" }}>
                    <Icon size={14}/>
                  </button>
                ))}
              </div>
            </div>
            <Button onPress={() => onAddText({ content:textContent||"Your text", fontFamily, fontSize, fontWeight:bold?"bold":"normal", fontStyle:italic?"italic":"normal", fill:textColor, textAlign, underline })}
              className="w-full font-semibold text-white" style={{ background:"linear-gradient(135deg,#7c3aed,#4f46e5)" }} startContent={<Plus size={15}/>}>
              Add to canvas
            </Button>
          </div>
        )}

        {activeTab === "templates" && (
          <div className="flex flex-col sidebar-tab-content" style={{ height:"100%" }}>
            <div className="p-3 pb-2 shrink-0">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color:"rgba(255,255,255,0.35)" }}>
                  Templates <span style={{ color:"rgba(124,58,237,0.8)" }}>({filtered.length})</span>
                </p>
                <Tooltip content="Clear all templates" placement="left" className="bg-gray-800 text-white text-xs">
                  <button onClick={onClearTemplates} className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
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
              <p className="text-[10px] leading-relaxed" style={{ color:"rgba(167,139,250,0.8)" }}>
                💡 Click to <strong>replace</strong> canvas text. Use 🗑 to clear all.
              </p>
            </div>
            <div className="flex-1 overflow-y-auto px-3 pb-4">
              {filtered.length === 0 ? (
                <div className="text-center py-8"><p className="text-xs" style={{ color:"rgba(255,255,255,0.3)" }}>No templates found</p></div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {filtered.map(tmpl => (
                    <TemplateCard key={tmpl.id} tmpl={tmpl} onAdd={() => onAddTemplate(tmpl.lines)}/>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
