"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { RotateCcw, RotateCw, ZoomIn, ZoomOut, Play, Pause } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  designDataUrl: string;
  shirtColor: string;
  shirtStyle: string;
}

const VIEWS = [
  { id:"front",       label:"Front",        angle:0   },
  { id:"front-left",  label:"Front Left",   angle:30  },
  { id:"left",        label:"Left Side",    angle:90  },
  { id:"back",        label:"Back",         angle:180 },
  { id:"right",       label:"Right Side",   angle:270 },
  { id:"front-right", label:"Front Right",  angle:330 },
];

function hex2rgb(hex: string) {
  const c=hex.replace("#","");
  return { r:parseInt(c.substr(0,2),16), g:parseInt(c.substr(2,2),16), b:parseInt(c.substr(4,2),16) };
}
function lighten(hex: string, amt: number) {
  const {r,g,b}=hex2rgb(hex);
  return `rgb(${Math.min(255,r+amt)},${Math.min(255,g+amt)},${Math.min(255,b+amt)})`;
}
function darken(hex: string, amt: number) {
  const {r,g,b}=hex2rgb(hex);
  return `rgb(${Math.max(0,r-amt)},${Math.max(0,g-amt)},${Math.max(0,b-amt)})`;
}
function isLight(hex: string) {
  const {r,g,b}=hex2rgb(hex);
  return (0.299*r+0.587*g+0.114*b)>145;
}

export function TShirt3DViewer({ isOpen, onClose, designDataUrl, shirtColor, shirtStyle }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1);
  const [isAuto, setIsAuto] = useState(false);
  const [activeView, setActiveView] = useState("front");
  const [isDragging, setIsDragging] = useState(false);
  const dragX = useRef(0);
  const dragAngle = useRef(0);
  const autoRef = useRef(false);
  const targetAngle = useRef(0);
  const currentAngle = useRef(0);
  const designImg = useRef<HTMLImageElement | null>(null);
  const zoomRef = useRef(1);

  useEffect(() => { zoomRef.current = zoom; }, [zoom]);

  useEffect(() => {
    if (!designDataUrl) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => { designImg.current = img; };
    img.src = designDataUrl;
  }, [designDataUrl]);

  const draw = useCallback((ctx: CanvasRenderingContext2D, angleDeg: number, z: number) => {
    const W=ctx.canvas.width, H=ctx.canvas.height;
    ctx.clearRect(0,0,W,H);
    const cx=W/2, cy=H/2+10;
    const S=z;
    const norm=((angleDeg%360)+360)%360;
    const rad=(norm*Math.PI)/180;
    const cosA=Math.cos(rad);
    const sinA=Math.sin(rad);
    const showFront=norm<=90||norm>=270;
    const wFactor=Math.abs(cosA);
    const bodyW=190*S*Math.max(wFactor,0.04);
    const bodyH=240*S;
    const slvW=60*S*Math.max(wFactor,0.04);
    const slvH=68*S;
    const light=isLight(shirtColor);
    const lit=lighten(shirtColor,light?8:22);
    const mid=shirtColor;
    const dark=darken(shirtColor,light?18:14);
    const vdark=darken(shirtColor,light?32:22);
    const sideDark=Math.abs(sinA)*(light?40:30);
    const sideColor=darken(shirtColor,sideDark);
    const stroke=light?"rgba(0,0,0,0.18)":"rgba(255,255,255,0.12)";
    const seam=light?"rgba(0,0,0,0.12)":"rgba(255,255,255,0.10)";

    ctx.save();
    ctx.translate(cx,cy);

    // Drop shadow
    ctx.save();
    ctx.shadowColor="rgba(0,0,0,0.5)"; ctx.shadowBlur=42; ctx.shadowOffsetY=20;
    ctx.fillStyle="rgba(0,0,0,0.01)";
    ctx.fillRect(-bodyW/2-slvW,-bodyH/2-slvH*0.2,bodyW+slvW*2,bodyH+slvH*0.2);
    ctx.restore();

    // Left sleeve
    const slvGradL=ctx.createLinearGradient(-(bodyW/2+slvW),0,-bodyW/2,0);
    slvGradL.addColorStop(0,vdark); slvGradL.addColorStop(1,sideColor);
    ctx.fillStyle=slvGradL; ctx.strokeStyle=stroke; ctx.lineWidth=1;
    ctx.beginPath();
    ctx.moveTo(-bodyW/2,-bodyH/2+bodyH*0.05);
    ctx.lineTo(-(bodyW/2+slvW),-bodyH/2);
    ctx.lineTo(-(bodyW/2+slvW)-slvW*0.05,-bodyH/2+slvH);
    ctx.lineTo(-bodyW/2,-bodyH/2+slvH*0.72);
    ctx.closePath(); ctx.fill(); ctx.stroke();

    // Right sleeve
    const slvGradR=ctx.createLinearGradient(bodyW/2,0,bodyW/2+slvW,0);
    slvGradR.addColorStop(0,sideColor); slvGradR.addColorStop(1,vdark);
    ctx.fillStyle=slvGradR;
    ctx.beginPath();
    ctx.moveTo(bodyW/2,-bodyH/2+bodyH*0.05);
    ctx.lineTo(bodyW/2+slvW,-bodyH/2);
    ctx.lineTo(bodyW/2+slvW+slvW*0.05,-bodyH/2+slvH);
    ctx.lineTo(bodyW/2,-bodyH/2+slvH*0.72);
    ctx.closePath(); ctx.fill(); ctx.stroke();

    // Body
    const bodyGrad=ctx.createLinearGradient(-bodyW/2,-bodyH/2,bodyW/2,bodyH/2);
    if (showFront) {
      bodyGrad.addColorStop(0,lit); bodyGrad.addColorStop(0.3,mid);
      bodyGrad.addColorStop(0.7,sideColor); bodyGrad.addColorStop(1,dark);
    } else {
      bodyGrad.addColorStop(0,darken(shirtColor,light?26:18));
      bodyGrad.addColorStop(0.5,darken(shirtColor,light?18:12));
      bodyGrad.addColorStop(1,darken(shirtColor,light?34:26));
    }
    ctx.fillStyle=bodyGrad; ctx.strokeStyle=stroke; ctx.lineWidth=1.5;
    ctx.beginPath();
    ctx.moveTo(-bodyW/2,-bodyH/2+bodyH*0.06);
    ctx.lineTo(bodyW/2,-bodyH/2+bodyH*0.06);
    ctx.lineTo(bodyW/2,bodyH/2);
    ctx.lineTo(-bodyW/2,bodyH/2);
    ctx.closePath(); ctx.fill(); ctx.stroke();

    // Collar
    ctx.strokeStyle=seam; ctx.lineWidth=1.8;
    if (shirtStyle==="vneck") {
      ctx.beginPath();
      ctx.moveTo(-bodyW*0.2,-bodyH/2+bodyH*0.06);
      ctx.lineTo(0,-bodyH/2+bodyH*0.2);
      ctx.lineTo(bodyW*0.2,-bodyH/2+bodyH*0.06);
      ctx.stroke();
    } else if (shirtStyle==="polo") {
      ctx.beginPath();
      ctx.moveTo(-bodyW*0.12,-bodyH/2+bodyH*0.06);
      ctx.lineTo(-bodyW*0.12,-bodyH/2+bodyH*0.17);
      ctx.quadraticCurveTo(0,-bodyH/2+bodyH*0.21,bodyW*0.12,-bodyH/2+bodyH*0.17);
      ctx.lineTo(bodyW*0.12,-bodyH/2+bodyH*0.06);
      ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0,-bodyH/2+bodyH*0.18); ctx.lineTo(0,-bodyH/2+bodyH*0.32); ctx.stroke();
    } else if (shirtStyle==="hoodie") {
      const hW=bodyW*0.88;
      ctx.strokeStyle=stroke; ctx.lineWidth=1.5;
      ctx.beginPath();
      ctx.moveTo(-bodyW/2,-bodyH/2+bodyH*0.06);
      ctx.quadraticCurveTo(-hW/2,-bodyH/2-bodyH*0.22,0,-bodyH/2-bodyH*0.25);
      ctx.quadraticCurveTo(hW/2,-bodyH/2-bodyH*0.22,bodyW/2,-bodyH/2+bodyH*0.06);
      ctx.stroke();
      ctx.strokeStyle=seam; ctx.lineWidth=1;
      const pkW=bodyW*0.62,pkH=bodyH*0.18;
      ctx.beginPath(); ctx.roundRect(-pkW/2,bodyH*0.08,pkW,pkH,5*S); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0,bodyH*0.08); ctx.lineTo(0,bodyH*0.08+pkH); ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(0,-bodyH/2+bodyH*0.12,bodyW*0.18,Math.PI*1.1,Math.PI*1.9);
      ctx.stroke();
    }

    // Seams
    ctx.strokeStyle=seam; ctx.lineWidth=0.7;
    ctx.beginPath(); ctx.moveTo(-bodyW/2,-bodyH/2+bodyH*0.06); ctx.lineTo(-bodyW/2,-bodyH/2+bodyH*0.22); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bodyW/2,-bodyH/2+bodyH*0.06); ctx.lineTo(bodyW/2,-bodyH/2+bodyH*0.22); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-bodyW/2,bodyH/2-bodyH*0.04); ctx.lineTo(bodyW/2,bodyH/2-bodyH*0.04); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-bodyW/2,-bodyH/2+bodyH*0.22); ctx.lineTo(-bodyW/2,bodyH/2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bodyW/2,-bodyH/2+bodyH*0.22); ctx.lineTo(bodyW/2,bodyH/2); ctx.stroke();

    // Highlight
    if (showFront) {
      const hiG=ctx.createLinearGradient(-bodyW/2,-bodyH/2,-bodyW*0.05,bodyH*0.3);
      hiG.addColorStop(0,light?"rgba(255,255,255,0.38)":"rgba(255,255,255,0.14)");
      hiG.addColorStop(1,"rgba(255,255,255,0)");
      ctx.fillStyle=hiG;
      ctx.beginPath();
      ctx.moveTo(-bodyW/2,-bodyH/2+bodyH*0.06);
      ctx.lineTo(-bodyW*0.08,-bodyH/2+bodyH*0.06);
      ctx.lineTo(-bodyW*0.15,bodyH*0.3);
      ctx.lineTo(-bodyW/2,bodyH*0.3);
      ctx.closePath(); ctx.fill();
    }

    // Design print
    if (designImg.current && showFront && wFactor>0.08) {
      const dW=bodyW*0.74, dH=bodyH*0.52;
      const dX=-dW/2, dY=-bodyH*0.04;
      ctx.save();
      ctx.globalAlpha=Math.min(1,(wFactor-0.08)*1.25);
      ctx.beginPath();
      ctx.rect(-bodyW/2,-bodyH/2+bodyH*0.06,bodyW,bodyH);
      ctx.clip();
      ctx.drawImage(designImg.current,dX,dY,dW,dH);
      ctx.restore();
    }

    // Back label
    if (!showFront && wFactor>0.15) {
      ctx.globalAlpha=Math.min(1,(wFactor-0.15)*1.8);
      const lbl=darken(shirtColor,light?55:0);
      ctx.strokeStyle=lbl; ctx.fillStyle=lbl; ctx.lineWidth=0.8;
      const tw=bodyW*0.18,th=bodyH*0.06;
      ctx.strokeRect(-tw/2,-bodyH/2+bodyH*0.1,tw,th);
      ctx.font=`bold ${9*S}px Arial`; ctx.textAlign="center";
      ctx.fillText("M",0,-bodyH/2+bodyH*0.1+th*0.72);
      ctx.globalAlpha=1;
    }

    ctx.restore();

    // Floor shadow
    const fsg=ctx.createRadialGradient(cx,cy+bodyH/2+8,0,cx,cy+bodyH/2+8,bodyW*0.8);
    fsg.addColorStop(0,"rgba(0,0,0,0.32)"); fsg.addColorStop(1,"rgba(0,0,0,0)");
    ctx.fillStyle=fsg;
    ctx.beginPath();
    ctx.ellipse(cx,cy+bodyH/2+10,bodyW*0.65,14*S,0,0,Math.PI*2);
    ctx.fill();
  }, [shirtColor, shirtStyle]);

  useEffect(() => {
    if (!isOpen) return;
    let raf: number;
    const tick = () => {
      const canvas=canvasRef.current;
      if (!canvas) { raf=requestAnimationFrame(tick); return; }
      const ctx=canvas.getContext("2d");
      if (!ctx) { raf=requestAnimationFrame(tick); return; }
      if (autoRef.current) targetAngle.current+=0.5;
      currentAngle.current+=(targetAngle.current-currentAngle.current)*0.09;
      draw(ctx,currentAngle.current,zoomRef.current);
      raf=requestAnimationFrame(tick);
    };
    raf=requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isOpen, draw]);

  const goToView=(v: typeof VIEWS[0])=>{ setActiveView(v.id); autoRef.current=false; setIsAuto(false); targetAngle.current=v.angle; };
  const onMD=(e: React.MouseEvent)=>{ setIsDragging(true); dragX.current=e.clientX; dragAngle.current=targetAngle.current; autoRef.current=false; setIsAuto(false); };
  const onMM=(e: React.MouseEvent)=>{ if(!isDragging)return; targetAngle.current=dragAngle.current+(e.clientX-dragX.current)*0.6; };
  const onTS=(e: React.TouchEvent)=>{ dragX.current=e.touches[0].clientX; dragAngle.current=targetAngle.current; autoRef.current=false; setIsAuto(false); };
  const onTM=(e: React.TouchEvent)=>{ targetAngle.current=dragAngle.current+(e.touches[0].clientX-dragX.current)*0.6; };
  const toggleAuto=()=>{ const n=!isAuto; autoRef.current=n; setIsAuto(n); };

  if (!isOpen) return null;

  const iBtn=(children: React.ReactNode, fn: ()=>void)=>(
    <button onClick={fn} className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
      style={{ background:"rgba(255,255,255,0.07)", border:"0.5px solid rgba(255,255,255,0.12)", color:"rgba(255,255,255,0.7)" }}
      onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.14)";}}
      onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.07)";}}>
      {children}
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background:"rgba(0,0,0,0.92)", backdropFilter:"blur(14px)" }}>
      <div className="w-full max-w-4xl rounded-3xl overflow-hidden flex flex-col"
        style={{ background:"#0c0c18", border:"0.5px solid rgba(255,255,255,0.1)", boxShadow:"0 40px 100px rgba(0,0,0,0.7)", maxHeight:"92vh" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom:"0.5px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background:"linear-gradient(135deg,#7c3aed,#4f46e5)" }}>
              <span className="text-white text-sm font-bold">3D</span>
            </div>
            <div>
              <h3 className="text-white font-semibold text-[15px]">360° 3D Preview</h3>
              <p className="text-[11px]" style={{ color:"rgba(255,255,255,0.35)" }}>
                Drag to spin · Click a view to jump · Auto-rotate
              </p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold"
            style={{ background:"rgba(255,255,255,0.07)", color:"rgba(255,255,255,0.5)", border:"0.5px solid rgba(255,255,255,0.1)" }}>
            ✕
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden" style={{ minHeight:0 }}>
          {/* Canvas */}
          <div className="flex-1 relative"
            style={{ background:"radial-gradient(ellipse at 50% 40%,#18103a 0%,#0a0a16 60%,#060610 100%)", minHeight:420 }}>
            <div className="absolute inset-0 pointer-events-none"
              style={{ background:"radial-gradient(ellipse at 50% 38%,rgba(100,60,220,0.18) 0%,transparent 55%)" }}/>

            <canvas ref={canvasRef} width={580} height={460}
              style={{ display:"block", cursor:isDragging?"grabbing":"grab", width:"100%", height:"460px" }}
              onMouseDown={onMD} onMouseMove={onMM}
              onMouseUp={()=>setIsDragging(false)} onMouseLeave={()=>setIsDragging(false)}
              onTouchStart={onTS} onTouchMove={onTM} onTouchEnd={()=>setIsDragging(false)}
            />

            {!isDragging && !isAuto && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none select-none"
                style={{ background:"rgba(0,0,0,0.5)", backdropFilter:"blur(6px)", border:"0.5px solid rgba(255,255,255,0.1)", borderRadius:20, padding:"4px 14px", color:"rgba(255,255,255,0.4)", fontSize:11 }}>
                ← drag to rotate →
              </div>
            )}

            {/* Controls */}
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2.5 rounded-2xl"
              style={{ background:"rgba(0,0,0,0.65)", backdropFilter:"blur(10px)", border:"0.5px solid rgba(255,255,255,0.1)" }}>
              {iBtn(<RotateCcw size={15}/>,()=>{ targetAngle.current-=45; })}
              <button onClick={toggleAuto}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all"
                style={isAuto
                  ? { background:"rgba(124,58,237,0.5)", border:"0.5px solid rgba(124,58,237,0.8)", color:"#e9d5ff" }
                  : { background:"rgba(255,255,255,0.08)", border:"0.5px solid rgba(255,255,255,0.15)", color:"rgba(255,255,255,0.75)" }}>
                {isAuto?<><Pause size={13}/> Stop</>:<><Play size={13}/> Auto Rotate</>}
              </button>
              {iBtn(<RotateCw size={15}/>,()=>{ targetAngle.current+=45; })}
              <div className="w-px h-5 mx-1" style={{ background:"rgba(255,255,255,0.12)" }}/>
              {iBtn(<ZoomOut size={15}/>,()=>setZoom(z=>Math.max(0.5,+(z-0.15).toFixed(2))))}
              <span className="text-[11px] font-mono w-9 text-center" style={{ color:"rgba(255,255,255,0.45)" }}>
                {Math.round(zoom*100)}%
              </span>
              {iBtn(<ZoomIn size={15}/>,()=>setZoom(z=>Math.min(2,+(z+0.15).toFixed(2))))}
            </div>
          </div>

          {/* Side panel */}
          <div className="w-44 shrink-0 flex flex-col p-4 gap-1.5 overflow-y-auto"
            style={{ borderLeft:"0.5px solid rgba(255,255,255,0.07)" }}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1"
              style={{ color:"rgba(255,255,255,0.25)" }}>Views</p>
            {VIEWS.map(v=>(
              <button key={v.id} onClick={()=>goToView(v)}
                className="w-full py-2 px-3 rounded-xl text-[12px] font-medium text-left transition-all"
                style={{
                  background:activeView===v.id?"rgba(124,58,237,0.3)":"rgba(255,255,255,0.04)",
                  border:activeView===v.id?"1px solid rgba(124,58,237,0.65)":"0.5px solid rgba(255,255,255,0.08)",
                  color:activeView===v.id?"#ddd6fe":"rgba(255,255,255,0.45)",
                }}
                onMouseEnter={e=>{ if(activeView!==v.id)(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.08)"; }}
                onMouseLeave={e=>{ if(activeView!==v.id)(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.04)"; }}>
                {v.label}
              </button>
            ))}
            <div className="mt-auto pt-4" style={{ borderTop:"0.5px solid rgba(255,255,255,0.07)" }}>
              <p className="text-[9px] uppercase tracking-widest mb-2" style={{ color:"rgba(255,255,255,0.22)" }}>Shirt</p>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-full shrink-0"
                  style={{ background:shirtColor, border:"1.5px solid rgba(255,255,255,0.2)", boxShadow:"0 2px 8px rgba(0,0,0,0.4)" }}/>
                <div>
                  <p className="text-[10px] font-mono" style={{ color:"rgba(255,255,255,0.4)" }}>{shirtColor}</p>
                  <p className="text-[11px] capitalize font-medium" style={{ color:"rgba(255,255,255,0.55)" }}>{shirtStyle}</p>
                </div>
              </div>
              <p className="text-[10px] leading-relaxed" style={{ color:"rgba(255,255,255,0.28)" }}>
                Use Auto Rotate for a smooth 360° view of your design.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
