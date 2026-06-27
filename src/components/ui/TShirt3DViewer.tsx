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
  { id: "front",          label: "Front",           angle: 0   },
  { id: "left-shoulder",  label: "Left Shoulder",   angle: 45  },
  { id: "right-shoulder", label: "Right Shoulder",  angle: -45 },
  { id: "back",           label: "Back",            angle: 180 },
  { id: "left-side",      label: "Left Side",       angle: 90  },
  { id: "right-side",     label: "Right Side",      angle: -90 },
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
    if (designDataUrl) {
      const img = new Image();
      img.onload = () => { designImg.current = img; };
      img.src = designDataUrl;
    }
  }, [designDataUrl]);

  const drawShirt = useCallback((ctx: CanvasRenderingContext2D, angle: number, z: number) => {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;
    ctx.clearRect(0, 0, W, H);
    const cx = W/2, cy = H/2;
    const scale = z * 0.85;
    const norm = ((angle%360)+360)%360;
    const cosA = Math.cos((norm*Math.PI)/180);
    const isBackFacing = norm>90 && norm<270;
    const isSideFacing = (norm>55 && norm<125) || (norm>235 && norm<305);
    const widthFactor = Math.abs(cosA);
    const shirtW = 240*scale*Math.max(widthFactor, 0.12);
    const shirtH = 300*scale;
    const light = isLight(shirtColor);
    const shading = isBackFacing
      ? (light?"rgba(0,0,0,0.22)":"rgba(0,0,0,0.42)")
      : isSideFacing
        ? (light?"rgba(0,0,0,0.12)":"rgba(0,0,0,0.28)")
        : "rgba(0,0,0,0)";
    const stroke = light ? "#c0c0c0" : "rgba(255,255,255,0.15)";
    const seam = light ? "rgba(0,0,0,0.13)" : "rgba(255,255,255,0.13)";
    const highlight = light ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.13)";

    ctx.save();
    ctx.translate(cx, cy);

    // Body shadow
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = 36;
    ctx.shadowOffsetY = 22;
    ctx.fillStyle = shirtColor;
    ctx.beginPath();
    ctx.moveTo(-shirtW*0.5+shirtW*0.04, -shirtH*0.46);
    ctx.lineTo( shirtW*0.5-shirtW*0.04, -shirtH*0.46);
    ctx.lineTo( shirtW*0.5,             -shirtH*0.31);
    ctx.lineTo( shirtW*0.5-shirtW*0.09,  -shirtH*0.17);
    ctx.lineTo( shirtW*0.5-shirtW*0.09,   shirtH*0.5);
    ctx.lineTo(-shirtW*0.5+shirtW*0.09,   shirtH*0.5);
    ctx.lineTo(-shirtW*0.5+shirtW*0.09,  -shirtH*0.17);
    ctx.lineTo(-shirtW*0.5,             -shirtH*0.31);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Body outline
    ctx.strokeStyle = stroke; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-shirtW*0.5+shirtW*0.04, -shirtH*0.46);
    ctx.lineTo( shirtW*0.5-shirtW*0.04, -shirtH*0.46);
    ctx.lineTo( shirtW*0.5,             -shirtH*0.31);
    ctx.lineTo( shirtW*0.5-shirtW*0.09,  -shirtH*0.17);
    ctx.lineTo( shirtW*0.5-shirtW*0.09,   shirtH*0.5);
    ctx.lineTo(-shirtW*0.5+shirtW*0.09,   shirtH*0.5);
    ctx.lineTo(-shirtW*0.5+shirtW*0.09,  -shirtH*0.17);
    ctx.lineTo(-shirtW*0.5,             -shirtH*0.31);
    ctx.closePath();
    ctx.stroke();

    // Collar
    ctx.strokeStyle = seam; ctx.lineWidth = 2;
    if (shirtStyle==="vneck") {
      ctx.beginPath();
      ctx.moveTo(-shirtW*0.18, -shirtH*0.46);
      ctx.lineTo(0, -shirtH*0.3);
      ctx.lineTo(shirtW*0.18, -shirtH*0.46);
      ctx.stroke();
    } else if (shirtStyle==="polo") {
      ctx.beginPath();
      ctx.moveTo(-shirtW*0.12, -shirtH*0.46);
      ctx.lineTo(-shirtW*0.12, -shirtH*0.3);
      ctx.quadraticCurveTo(0, -shirtH*0.26, shirtW*0.12, -shirtH*0.3);
      ctx.lineTo(shirtW*0.12, -shirtH*0.46);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(-shirtW*0.18, -shirtH*0.46);
      ctx.quadraticCurveTo(0, -shirtH*0.36, shirtW*0.18, -shirtH*0.46);
      ctx.stroke();
    }

    // Seams
    ctx.lineWidth = 0.8;
    // Armhole
    ctx.beginPath();
    ctx.moveTo(-shirtW*0.5+shirtW*0.09, -shirtH*0.17);
    ctx.quadraticCurveTo(-shirtW*0.16, -shirtH*0.14, 0, -shirtH*0.13);
    ctx.quadraticCurveTo(shirtW*0.16, -shirtH*0.14, shirtW*0.5-shirtW*0.09, -shirtH*0.17);
    ctx.stroke();
    // Side seams
    ctx.beginPath(); ctx.moveTo(-shirtW*0.5+shirtW*0.09,-shirtH*0.17); ctx.lineTo(-shirtW*0.5+shirtW*0.09,shirtH*0.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(shirtW*0.5-shirtW*0.09,-shirtH*0.17); ctx.lineTo(shirtW*0.5-shirtW*0.09,shirtH*0.5); ctx.stroke();
    // Bottom hem
    ctx.beginPath(); ctx.moveTo(-shirtW*0.5+shirtW*0.09,shirtH*0.46); ctx.lineTo(shirtW*0.5-shirtW*0.09,shirtH*0.46); ctx.stroke();
    // Center crease (front only)
    if (!isBackFacing && widthFactor > 0.5) {
      ctx.globalAlpha = widthFactor*0.3;
      ctx.beginPath(); ctx.moveTo(0,-shirtH*0.13); ctx.lineTo(0,shirtH*0.5); ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Highlight shimmer
    const grad = ctx.createLinearGradient(-shirtW*0.5, 0, shirtW*0.1, 0);
    grad.addColorStop(0, highlight);
    grad.addColorStop(0.4, "rgba(255,255,255,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(-shirtW*0.5+shirtW*0.04,-shirtH*0.46);
    ctx.lineTo(-shirtW*0.08,-shirtH*0.46);
    ctx.lineTo(-shirtW*0.14,shirtH*0.5);
    ctx.lineTo(-shirtW*0.5+shirtW*0.09,shirtH*0.5);
    ctx.closePath();
    ctx.fill();

    // Shading overlay
    if (shading!=="rgba(0,0,0,0)") {
      ctx.fillStyle = shading;
      ctx.beginPath();
      ctx.moveTo(-shirtW*0.5+shirtW*0.04,-shirtH*0.46);
      ctx.lineTo(shirtW*0.5-shirtW*0.04,-shirtH*0.46);
      ctx.lineTo(shirtW*0.5,-shirtH*0.31);
      ctx.lineTo(shirtW*0.5-shirtW*0.09,-shirtH*0.17);
      ctx.lineTo(shirtW*0.5-shirtW*0.09,shirtH*0.5);
      ctx.lineTo(-shirtW*0.5+shirtW*0.09,shirtH*0.5);
      ctx.lineTo(-shirtW*0.5+shirtW*0.09,-shirtH*0.17);
      ctx.lineTo(-shirtW*0.5,-shirtH*0.31);
      ctx.closePath();
      ctx.fill();
    }

    // Design print on front
    if (designImg.current && !isBackFacing && widthFactor>0.18) {
      const printW = shirtW*0.56;
      const printH = shirtH*0.5;
      const printX = -printW/2;
      const printY = -shirtH*0.12;
      ctx.globalAlpha = Math.min(1, (widthFactor-0.18)*1.4);
      ctx.drawImage(designImg.current, printX, printY, printW, printH);
      ctx.globalAlpha = 1;
    }

    // Back label
    if (isBackFacing && widthFactor>0.25) {
      ctx.globalAlpha = Math.min(1,(widthFactor-0.25)*2);
      ctx.fillStyle = seam;
      ctx.font = `bold ${11*scale}px Arial`;
      ctx.textAlign = "center";
      ctx.fillText("BACK", 0, -shirtH*0.05);
      // Neck tag
      ctx.strokeStyle=seam; ctx.lineWidth=1;
      const tw=30*scale, th=14*scale;
      ctx.strokeRect(-tw/2, -shirtH*0.44, tw, th);
      ctx.fillText("M", 0, -shirtH*0.44+th*0.75);
      ctx.globalAlpha = 1;
    }

    ctx.restore();

    // Floor shadow ellipse
    const shadowGrad = ctx.createRadialGradient(cx, cy+shirtH*0.52, 0, cx, cy+shirtH*0.52, shirtW*0.6);
    shadowGrad.addColorStop(0, "rgba(0,0,0,0.28)");
    shadowGrad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = shadowGrad;
    ctx.beginPath();
    ctx.ellipse(cx, cy+shirtH*0.54, shirtW*0.52, 18*scale, 0, 0, Math.PI*2);
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
      if (autoRotateRef.current) {
        angleRef.current += 0.45;
      }
      // Smooth lerp
      const diff = angleRef.current - renderAngle.current;
      renderAngle.current += diff * 0.1;
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

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartX.current = e.clientX;
    dragStartAngle.current = angleRef.current;
    autoRotateRef.current = false;
    setIsAutoRotating(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const delta = (e.clientX - dragStartX.current) * 0.55;
    angleRef.current = dragStartAngle.current - delta;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    dragStartX.current = e.touches[0].clientX;
    dragStartAngle.current = angleRef.current;
    autoRotateRef.current = false;
    setIsAutoRotating(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const delta = (e.touches[0].clientX - dragStartX.current) * 0.55;
    angleRef.current = dragStartAngle.current - delta;
  };

  const toggleAutoRotate = () => {
    const next = !isAutoRotating;
    autoRotateRef.current = next;
    setIsAutoRotating(next);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background:"rgba(0,0,0,0.88)", backdropFilter:"blur(10px)" }}>
      <div className="relative w-full max-w-3xl mx-4 rounded-2xl overflow-hidden"
        style={{ background:"#0d0d14", border:"0.5px solid rgba(255,255,255,0.1)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom:"0.5px solid rgba(255,255,255,0.08)" }}>
          <div>
            <h3 className="text-white font-semibold text-base">3D Preview</h3>
            <p className="text-xs mt-0.5" style={{ color:"rgba(255,255,255,0.4)" }}>
              Drag to rotate · Use view buttons or auto-rotate
            </p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-lg transition-all"
            style={{ background:"rgba(255,255,255,0.07)", color:"rgba(255,255,255,0.6)" }}>
            ✕
          </button>
        </div>

        <div className="flex">
          {/* 3D Canvas */}
          <div className="flex-1 relative"
            style={{ background:"linear-gradient(135deg,#0f0f1a 0%,#1a1030 50%,#0f0f1a 100%)" }}>
            <div className="absolute inset-0 pointer-events-none"
              style={{ background:"radial-gradient(ellipse at 50% 40%,rgba(124,58,237,0.1) 0%,transparent 70%)" }}/>

            <canvas
              ref={canvasRef}
              width={480} height={420}
              style={{ display:"block", cursor:isDragging?"grabbing":"grab", width:"100%", height:"420px" }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={() => setIsDragging(false)}
              onMouseLeave={() => setIsDragging(false)}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={() => setIsDragging(false)}
            />

            {/* Bottom controls */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
              <button onClick={() => { angleRef.current -= 30; }}
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background:"rgba(0,0,0,0.55)", border:"0.5px solid rgba(255,255,255,0.15)", color:"rgba(255,255,255,0.7)" }}>
                <RotateCcw size={14}/>
              </button>

              <button onClick={toggleAutoRotate}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                style={{ background:isAutoRotating?"rgba(124,58,237,0.45)":"rgba(0,0,0,0.55)", border:isAutoRotating?"0.5px solid rgba(124,58,237,0.7)":"0.5px solid rgba(255,255,255,0.15)", color:"rgba(255,255,255,0.85)" }}>
                {isAutoRotating ? <><Pause size={12}/> Stop</> : <><Play size={12}/> Auto Rotate</>}
              </button>

              <button onClick={() => { angleRef.current += 30; }}
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background:"rgba(0,0,0,0.55)", border:"0.5px solid rgba(255,255,255,0.15)", color:"rgba(255,255,255,0.7)" }}>
                <RotateCw size={14}/>
              </button>

              <div className="w-px h-6 mx-1" style={{ background:"rgba(255,255,255,0.1)" }}/>

              <button onClick={() => setZoom(z => Math.max(0.5, z-0.15))}
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background:"rgba(0,0,0,0.55)", border:"0.5px solid rgba(255,255,255,0.15)", color:"rgba(255,255,255,0.7)" }}>
                <ZoomOut size={14}/>
              </button>
              <span className="text-[10px] font-medium min-w-[32px] text-center"
                style={{ color:"rgba(255,255,255,0.5)" }}>{Math.round(zoom*100)}%</span>
              <button onClick={() => setZoom(z => Math.min(1.8, z+0.15))}
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background:"rgba(0,0,0,0.55)", border:"0.5px solid rgba(255,255,255,0.15)", color:"rgba(255,255,255,0.7)" }}>
                <ZoomIn size={14}/>
              </button>
            </div>

            {!isDragging && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 text-[10px] px-2 py-1 rounded-full pointer-events-none"
                style={{ background:"rgba(0,0,0,0.4)", color:"rgba(255,255,255,0.3)", border:"0.5px solid rgba(255,255,255,0.08)" }}>
                ← drag to rotate →
              </div>
            )}
          </div>

          {/* View selector */}
          <div className="w-40 shrink-0 flex flex-col gap-1.5 p-3"
            style={{ borderLeft:"0.5px solid rgba(255,255,255,0.08)" }}>
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-1"
              style={{ color:"rgba(255,255,255,0.3)" }}>Views</p>

            {VIEWS.map(v => (
              <button key={v.id} onClick={() => goToView(v)}
                className="w-full py-2 px-3 rounded-xl text-xs font-medium text-left transition-all"
                style={{
                  background: activeView===v.id ? "rgba(124,58,237,0.25)" : "rgba(255,255,255,0.04)",
                  border: activeView===v.id ? "0.5px solid rgba(124,58,237,0.55)" : "0.5px solid rgba(255,255,255,0.08)",
                  color: activeView===v.id ? "#c4b5fd" : "rgba(255,255,255,0.5)",
                }}>
                {v.label}
              </button>
            ))}

            <div className="mt-auto pt-3" style={{ borderTop:"0.5px solid rgba(255,255,255,0.08)" }}>
              <p className="text-[10px] mb-1.5" style={{ color:"rgba(255,255,255,0.3)" }}>Shirt color</p>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full shrink-0"
                  style={{ background:shirtColor, border:"1px solid rgba(255,255,255,0.2)" }}/>
                <span className="text-[10px] font-mono" style={{ color:"rgba(255,255,255,0.4)" }}>{shirtColor}</span>
              </div>
              <p className="text-[10px] mt-2 mb-1" style={{ color:"rgba(255,255,255,0.3)" }}>Style</p>
              <p className="text-[11px] capitalize font-medium" style={{ color:"rgba(255,255,255,0.6)" }}>{shirtStyle}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
