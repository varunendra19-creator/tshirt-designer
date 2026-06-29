"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { RotateCcw, RotateCw, ZoomIn, ZoomOut, Play, Pause } from "lucide-react";

interface TShirt3DViewerProps {
  isOpen: boolean;
  onClose: () => void;
  designDataUrl: string;
  shirtColor: string;
  shirtStyle: string;
}

const VIEWS = [
  { id:"front",          label:"Front",          angle:0   },
  { id:"left-shoulder",  label:"Left Shoulder",  angle:45  },
  { id:"right-shoulder", label:"Right Shoulder", angle:-45 },
  { id:"back",           label:"Back",           angle:180 },
  { id:"left-side",      label:"Left Side",      angle:90  },
  { id:"right-side",     label:"Right Side",     angle:-90 },
];

function isLight(hex: string) {
  const c = hex.replace("#","");
  const r=parseInt(c.substr(0,2),16), g=parseInt(c.substr(2,2),16), b=parseInt(c.substr(4,2),16);
  return (0.299*r+0.587*g+0.114*b) > 140;
}

export function TShirt3DViewer({ isOpen, onClose, designDataUrl, shirtColor, shirtStyle }: TShirt3DViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const [zoom, setZoom] = useState(1);
  const [isAutoRotating, setIsAutoRotating] = useState(false);
  const [activeView, setActiveView] = useState("front");
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);
  const dragStartAngle = useRef(0);
  const autoRotateRef = useRef(false);
  const angleRef = useRef(0);
  const renderAngle = useRef(0);
  const designImg = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!designDataUrl) return;
    const img = new Image();
    img.onload = () => { designImg.current = img; };
    img.src = designDataUrl;
  }, [designDataUrl]);

  const drawShirt = useCallback((ctx: CanvasRenderingContext2D, angle: number, z: number) => {
    const W = ctx.canvas.width, H = ctx.canvas.height;
    ctx.clearRect(0,0,W,H);
    const cx=W/2, cy=H/2;
    const scale = z*0.85;
    const norm = ((angle%360)+360)%360;
    const cosA = Math.cos((norm*Math.PI)/180);
    const isBackFacing = norm>90 && norm<270;
    const isSideFacing = (norm>55&&norm<125)||(norm>235&&norm<305);
    const wf = Math.abs(cosA);
    const sW = 240*scale*Math.max(wf,0.12);
    const sH = 300*scale;
    const light = isLight(shirtColor);
    const shading = isBackFacing
      ? (light?"rgba(0,0,0,0.22)":"rgba(0,0,0,0.45)")
      : isSideFacing
        ? (light?"rgba(0,0,0,0.12)":"rgba(0,0,0,0.28)")
        : "rgba(0,0,0,0)";
    const stroke = light?"#c0c0c0":"rgba(255,255,255,0.15)";
    const seam = light?"rgba(0,0,0,0.13)":"rgba(255,255,255,0.13)";
    const hi = light?"rgba(255,255,255,0.45)":"rgba(255,255,255,0.12)";

    ctx.save();
    ctx.translate(cx,cy);

    // Drop shadow
    ctx.save();
    ctx.shadowColor="rgba(0,0,0,0.4)";
    ctx.shadowBlur=40;
    ctx.shadowOffsetY=24;
    ctx.fillStyle=shirtColor;
    const body = () => {
      ctx.beginPath();
      ctx.moveTo(-sW*0.46,-sH*0.46);
      ctx.lineTo( sW*0.46,-sH*0.46);
      ctx.lineTo( sW*0.5, -sH*0.3);
      ctx.lineTo( sW*0.41,-sH*0.17);
      ctx.lineTo( sW*0.41, sH*0.5);
      ctx.lineTo(-sW*0.41, sH*0.5);
      ctx.lineTo(-sW*0.41,-sH*0.17);
      ctx.lineTo(-sW*0.5, -sH*0.3);
      ctx.closePath();
    };
    body(); ctx.fill();
    ctx.restore();

    // Outline
    ctx.strokeStyle=stroke; ctx.lineWidth=1.5;
    body(); ctx.stroke();

    // Fill again cleanly
    ctx.fillStyle=shirtColor;
    body(); ctx.fill();
    ctx.strokeStyle=stroke; ctx.lineWidth=1.5;
    body(); ctx.stroke();

    // Collar
    ctx.strokeStyle=seam; ctx.lineWidth=2;
    if (shirtStyle==="vneck") {
      ctx.beginPath();
      ctx.moveTo(-sW*0.18,-sH*0.46);
      ctx.lineTo(0,-sH*0.28);
      ctx.lineTo(sW*0.18,-sH*0.46);
      ctx.stroke();
    } else if (shirtStyle==="polo") {
      ctx.beginPath();
      ctx.moveTo(-sW*0.11,-sH*0.46);
      ctx.lineTo(-sW*0.11,-sH*0.3);
      ctx.quadraticCurveTo(0,-sH*0.25,sW*0.11,-sH*0.3);
      ctx.lineTo(sW*0.11,-sH*0.46);
      ctx.stroke();
      // buttons
      ctx.fillStyle=seam;
      [-0.36,-0.3,-0.24].forEach(y => {
        ctx.beginPath(); ctx.arc(0,sH*y,2*scale,0,Math.PI*2); ctx.fill();
      });
    } else if (shirtStyle==="hoodie") {
      // Hood
      ctx.beginPath();
      ctx.moveTo(-sW*0.46,-sH*0.46);
      ctx.quadraticCurveTo(-sW*0.3,-sH*0.65,0,-sH*0.68);
      ctx.quadraticCurveTo(sW*0.3,-sH*0.65,sW*0.46,-sH*0.46);
      ctx.stroke();
      // Drawstrings
      ctx.strokeStyle=seam; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(-sW*0.08,-sH*0.65); ctx.lineTo(-sW*0.1,-sH*0.2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(sW*0.08,-sH*0.65); ctx.lineTo(sW*0.1,-sH*0.2); ctx.stroke();
      // Pocket
      ctx.beginPath();
      ctx.roundRect(-sW*0.28,sH*0.1,sW*0.56,sH*0.22,6*scale);
      ctx.stroke();
    } else {
      // Classic crew neck
      ctx.beginPath();
      ctx.moveTo(-sW*0.18,-sH*0.46);
      ctx.quadraticCurveTo(0,-sH*0.36,sW*0.18,-sH*0.46);
      ctx.stroke();
    }

    // Seams
    ctx.strokeStyle=seam; ctx.lineWidth=0.8;
    // Armhole
    ctx.beginPath();
    ctx.moveTo(-sW*0.41,-sH*0.17);
    ctx.quadraticCurveTo(-sW*0.15,-sH*0.13,0,-sH*0.12);
    ctx.quadraticCurveTo(sW*0.15,-sH*0.13,sW*0.41,-sH*0.17);
    ctx.stroke();
    // Side seams
    ctx.beginPath(); ctx.moveTo(-sW*0.41,-sH*0.17); ctx.lineTo(-sW*0.41,sH*0.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sW*0.41,-sH*0.17); ctx.lineTo(sW*0.41,sH*0.5); ctx.stroke();
    // Bottom hem
    ctx.beginPath(); ctx.moveTo(-sW*0.41,sH*0.46); ctx.lineTo(sW*0.41,sH*0.46); ctx.stroke();
    // Center crease front
    if (!isBackFacing && wf>0.5) {
      ctx.globalAlpha=wf*0.25;
      ctx.beginPath(); ctx.moveTo(0,-sH*0.12); ctx.lineTo(0,sH*0.5); ctx.stroke();
      ctx.globalAlpha=1;
    }

    // Highlight
    const grad=ctx.createLinearGradient(-sW*0.5,0,sW*0.1,0);
    grad.addColorStop(0,hi); grad.addColorStop(0.5,"rgba(255,255,255,0)");
    ctx.fillStyle=grad;
    ctx.beginPath();
    ctx.moveTo(-sW*0.46,-sH*0.46);
    ctx.lineTo(-sW*0.1,-sH*0.46);
    ctx.lineTo(-sW*0.16,sH*0.5);
    ctx.lineTo(-sW*0.41,sH*0.5);
    ctx.closePath();
    ctx.fill();

    // Shading
    if (shading!=="rgba(0,0,0,0)") {
      ctx.fillStyle=shading; body(); ctx.fill();
    }

    // Design on front
    if (designImg.current && !isBackFacing && wf>0.15) {
      const pW=sW*0.58, pH=sH*0.5;
      ctx.globalAlpha=Math.min(1,(wf-0.15)*1.3);
      ctx.drawImage(designImg.current,-pW/2,-sH*0.1,pW,pH);
      ctx.globalAlpha=1;
    }

    // Back details
    if (isBackFacing && wf>0.2) {
      ctx.globalAlpha=Math.min(1,(wf-0.2)*2);
      ctx.fillStyle=seam;
      ctx.font=`bold ${10*scale}px Arial`;
      ctx.textAlign="center";
      ctx.fillText("BACK",-0,-sH*0.05);
      // Neck tag
      ctx.strokeStyle=seam; ctx.lineWidth=0.8;
      ctx.strokeRect(-15*scale,-sH*0.42,30*scale,14*scale);
      ctx.globalAlpha=1;
    }

    ctx.restore();

    // Floor shadow
    const sg=ctx.createRadialGradient(cx,cy+sH*0.54,0,cx,cy+sH*0.54,sW*0.55);
    sg.addColorStop(0,"rgba(0,0,0,0.3)"); sg.addColorStop(1,"rgba(0,0,0,0)");
    ctx.fillStyle=sg;
    ctx.beginPath();
    ctx.ellipse(cx,cy+sH*0.56,sW*0.5,16*scale,0,0,Math.PI*2);
    ctx.fill();
  }, [shirtColor, shirtStyle]);

  useEffect(() => {
    if (!isOpen) return;
    let raf: number;
    const loop = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      if (autoRotateRef.current) angleRef.current += 0.5;
      renderAngle.current += (angleRef.current - renderAngle.current) * 0.1;
      drawShirt(ctx, renderAngle.current, zoom);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [isOpen, zoom, drawShirt]);

  const goToView = (v: typeof VIEWS[0]) => {
    setActiveView(v.id);
    autoRotateRef.current = false;
    setIsAutoRotating(false);
    angleRef.current = v.angle;
  };

  const onMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartX.current = e.clientX;
    dragStartAngle.current = angleRef.current;
    autoRotateRef.current = false;
    setIsAutoRotating(false);
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    angleRef.current = dragStartAngle.current - (e.clientX - dragStartX.current) * 0.55;
  };
  const onTouchStart = (e: React.TouchEvent) => {
    dragStartX.current = e.touches[0].clientX;
    dragStartAngle.current = angleRef.current;
    autoRotateRef.current = false;
    setIsAutoRotating(false);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    angleRef.current = dragStartAngle.current - (e.touches[0].clientX - dragStartX.current) * 0.55;
  };

  const toggleAuto = () => {
    const n = !isAutoRotating;
    autoRotateRef.current = n;
    setIsAutoRotating(n);
  };

  if (!isOpen) return null;

  const btnBase = { background:"rgba(0,0,0,0.55)", border:"0.5px solid rgba(255,255,255,0.15)", color:"rgba(255,255,255,0.75)" };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background:"rgba(0,0,0,0.9)", backdropFilter:"blur(12px)" }}>
      <div className="relative w-full max-w-3xl mx-4 rounded-2xl overflow-hidden"
        style={{ background:"#0d0d14", border:"0.5px solid rgba(255,255,255,0.1)", boxShadow:"0 32px 80px rgba(0,0,0,0.6)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom:"0.5px solid rgba(255,255,255,0.08)" }}>
          <div>
            <h3 className="text-white font-semibold text-base">360° 3D Preview</h3>
            <p className="text-xs mt-0.5" style={{ color:"rgba(255,255,255,0.35)" }}>
              Drag to spin · Click any view · Auto-rotate available
            </p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center font-bold transition-all"
            style={{ background:"rgba(255,255,255,0.07)", color:"rgba(255,255,255,0.5)", fontSize:16 }}>
            ✕
          </button>
        </div>

        <div className="flex">
          {/* Canvas area */}
          <div className="flex-1 relative overflow-hidden"
            style={{ background:"radial-gradient(ellipse at 50% 35%,#1a1035 0%,#0a0a14 70%)" }}>
            {/* Purple ambient glow */}
            <div className="absolute inset-0 pointer-events-none"
              style={{ background:"radial-gradient(ellipse at 50% 38%,rgba(124,58,237,0.12) 0%,transparent 65%)" }}/>

            <canvas ref={canvasRef} width={500} height={440}
              style={{ display:"block", cursor:isDragging?"grabbing":"grab", width:"100%", height:440 }}
              onMouseDown={onMouseDown} onMouseMove={onMouseMove}
              onMouseUp={() => setIsDragging(false)} onMouseLeave={() => setIsDragging(false)}
              onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={() => setIsDragging(false)}
            />

            {/* Drag hint */}
            {!isDragging && !isAutoRotating && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 text-[10px] px-3 py-1 rounded-full pointer-events-none select-none"
                style={{ background:"rgba(0,0,0,0.45)", color:"rgba(255,255,255,0.3)", border:"0.5px solid rgba(255,255,255,0.07)" }}>
                ← drag to rotate →
              </div>
            )}

            {/* Controls */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
              <button onClick={() => { angleRef.current -= 30; }} className="w-8 h-8 rounded-xl flex items-center justify-center" style={btnBase}>
                <RotateCcw size={14}/>
              </button>

              <button onClick={toggleAuto}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                style={isAutoRotating
                  ? { background:"rgba(124,58,237,0.4)", border:"0.5px solid rgba(124,58,237,0.7)", color:"#c4b5fd" }
                  : btnBase}>
                {isAutoRotating ? <><Pause size={12}/> Stop</> : <><Play size={12}/> Auto Rotate</>}
              </button>

              <button onClick={() => { angleRef.current += 30; }} className="w-8 h-8 rounded-xl flex items-center justify-center" style={btnBase}>
                <RotateCw size={14}/>
              </button>

              <div className="w-px h-5 mx-0.5" style={{ background:"rgba(255,255,255,0.1)" }}/>

              <button onClick={() => setZoom(z => Math.max(0.5,z-0.15))} className="w-8 h-8 rounded-xl flex items-center justify-center" style={btnBase}>
                <ZoomOut size={14}/>
              </button>
              <span className="text-[10px] font-mono w-8 text-center" style={{ color:"rgba(255,255,255,0.4)" }}>
                {Math.round(zoom*100)}%
              </span>
              <button onClick={() => setZoom(z => Math.min(1.8,z+0.15))} className="w-8 h-8 rounded-xl flex items-center justify-center" style={btnBase}>
                <ZoomIn size={14}/>
              </button>
            </div>
          </div>

          {/* View panel */}
          <div className="w-40 shrink-0 p-3 flex flex-col gap-1.5"
            style={{ borderLeft:"0.5px solid rgba(255,255,255,0.07)" }}>
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-1"
              style={{ color:"rgba(255,255,255,0.28)" }}>Views</p>

            {VIEWS.map(v => (
              <button key={v.id} onClick={() => goToView(v)}
                className="w-full py-2 px-3 rounded-xl text-xs font-medium text-left transition-all"
                style={{
                  background: activeView===v.id ? "rgba(124,58,237,0.28)" : "rgba(255,255,255,0.04)",
                  border: activeView===v.id ? "0.5px solid rgba(124,58,237,0.6)" : "0.5px solid rgba(255,255,255,0.07)",
                  color: activeView===v.id ? "#c4b5fd" : "rgba(255,255,255,0.45)",
                }}>
                {v.label}
              </button>
            ))}

            {/* Shirt info */}
            <div className="mt-auto pt-3" style={{ borderTop:"0.5px solid rgba(255,255,255,0.07)" }}>
              <p className="text-[9px] uppercase tracking-widest mb-1.5" style={{ color:"rgba(255,255,255,0.25)" }}>Color</p>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-5 rounded-full shrink-0"
                  style={{ background:shirtColor, border:"1px solid rgba(255,255,255,0.2)" }}/>
                <span className="text-[9px] font-mono" style={{ color:"rgba(255,255,255,0.35)" }}>{shirtColor}</span>
              </div>
              <p className="text-[9px] uppercase tracking-widest mb-1" style={{ color:"rgba(255,255,255,0.25)" }}>Style</p>
              <p className="text-[11px] capitalize font-medium" style={{ color:"rgba(255,255,255,0.5)" }}>{shirtStyle}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
