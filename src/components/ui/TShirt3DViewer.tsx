"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { RotateCcw, RotateCw, ZoomIn, ZoomOut, Play, Pause } from "lucide-react";

interface Props {
  isOpen: boolean; onClose: () => void;
  designDataUrl: string; shirtColor: string; shirtStyle: string;
}

const VIEWS = [
  { id:"front",      label:"Front",       angle:0   },
  { id:"frontleft",  label:"¾ Left",      angle:40  },
  { id:"left",       label:"Left Side",   angle:90  },
  { id:"back",       label:"Back",        angle:180 },
  { id:"right",      label:"Right Side",  angle:270 },
  { id:"frontright", label:"¾ Right",     angle:320 },
];

function hex2rgb(hex:string){const c=hex.replace("#","");return{r:parseInt(c.substr(0,2),16),g:parseInt(c.substr(2,2),16),b:parseInt(c.substr(4,2),16)};}
function mix(hex:string,amt:number){const{r,g,b}=hex2rgb(hex);const cl=amt>0?Math.min:Math.max;const a=Math.abs(amt);return`rgb(${cl(255,r+a)},${cl(255,g+a)},${cl(255,b+a)})`;}
function isLight(hex:string){const{r,g,b}=hex2rgb(hex);return(0.299*r+0.587*g+0.114*b)>145;}

export function TShirt3DViewer({isOpen,onClose,designDataUrl,shirtColor,shirtStyle}:Props){
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const [zoom,setZoom]=useState(1);
  const [isAuto,setIsAuto]=useState(false);
  const [activeView,setActiveView]=useState("front");
  const [isDragging,setIsDragging]=useState(false);
  const dragX=useRef(0); const dragAngle=useRef(0);
  const autoRef=useRef(false); const targetA=useRef(0); const currentA=useRef(0);
  const zoomRef=useRef(1); const designImg=useRef<HTMLImageElement|null>(null);

  useEffect(()=>{zoomRef.current=zoom;},[zoom]);
  useEffect(()=>{
    if(!designDataUrl)return;
    const img=new Image();img.crossOrigin="anonymous";
    img.onload=()=>{designImg.current=img;};img.src=designDataUrl;
  },[designDataUrl]);

  const draw=useCallback((ctx:CanvasRenderingContext2D,deg:number,z:number)=>{
    const W=ctx.canvas.width,H=ctx.canvas.height;
    ctx.clearRect(0,0,W,H);
    const cx=W/2,cy=H/2+20;
    const norm=((deg%360)+360)%360;
    const rad=(norm*Math.PI)/180;
    const cosA=Math.cos(rad),sinA=Math.sin(rad);
    const isFront=norm<=90||norm>=270;
    const wf=Math.abs(cosA);
    const BW=200*z,BH=265*z;
    const bw=BW*Math.max(wf,0.05);
    const bh=BH;
    const light=isLight(shirtColor);
    const sd=Math.abs(sinA)*(light?45:32);
    const cLit=mix(shirtColor,light?12:26);
    const cMid=shirtColor;
    const cDk=mix(shirtColor,-(light?22:16));
    const cSide=mix(shirtColor,-sd);
    const cBk=mix(shirtColor,-(light?30:20));
    const cVDk=mix(shirtColor,-(light?42:28));
    const stk=light?"rgba(0,0,0,0.18)":"rgba(255,255,255,0.12)";
    const seam=light?"rgba(0,0,0,0.10)":"rgba(255,255,255,0.09)";
    const hi=light?"rgba(255,255,255,0.40)":"rgba(255,255,255,0.12)";
    const x0=-bw/2,x1=bw/2,y0=-bh/2,y1=bh/2;
    const slvW=bw*0.40*Math.max(wf,0.05);

    ctx.save();ctx.translate(cx,cy);

    // Drop shadow
    ctx.save();ctx.shadowColor="rgba(0,0,0,0.5)";ctx.shadowBlur=44;ctx.shadowOffsetY=22;
    ctx.fillStyle="rgba(0,0,0,0.01)";ctx.fillRect(x0-slvW,y0-bh*0.02,bw+slvW*2,bh+bh*0.02);ctx.restore();

    // LEFT SLEEVE - angled downward like a real shirt
    {
      const gL=ctx.createLinearGradient(x0-slvW,0,x0,0);
      gL.addColorStop(0,cVDk);gL.addColorStop(1,cSide);
      ctx.fillStyle=gL;ctx.strokeStyle=stk;ctx.lineWidth=1;
      ctx.beginPath();
      ctx.moveTo(x0,y0+bh*0.03);            // top shoulder attach
      ctx.lineTo(x0-slvW*0.85,y0-bh*0.02); // sleeve outer top
      ctx.lineTo(x0-slvW,y0+bh*0.25);       // sleeve outer bottom
      ctx.lineTo(x0,y0+bh*0.28);            // sleeve inner bottom (armhole)
      ctx.closePath();ctx.fill();ctx.stroke();
      // Sleeve hem
      ctx.strokeStyle=seam;ctx.lineWidth=0.8;
      ctx.beginPath();
      ctx.moveTo(x0-slvW*0.88,y0-bh*0.01);
      ctx.lineTo(x0-slvW,y0+bh*0.24);ctx.stroke();
    }

    // RIGHT SLEEVE
    {
      const gR=ctx.createLinearGradient(x1,0,x1+slvW,0);
      gR.addColorStop(0,cSide);gR.addColorStop(1,cVDk);
      ctx.fillStyle=gR;ctx.strokeStyle=stk;ctx.lineWidth=1;
      ctx.beginPath();
      ctx.moveTo(x1,y0+bh*0.03);
      ctx.lineTo(x1+slvW*0.85,y0-bh*0.02);
      ctx.lineTo(x1+slvW,y0+bh*0.25);
      ctx.lineTo(x1,y0+bh*0.28);
      ctx.closePath();ctx.fill();ctx.stroke();
      ctx.strokeStyle=seam;ctx.lineWidth=0.8;
      ctx.beginPath();
      ctx.moveTo(x1+slvW*0.88,y0-bh*0.01);
      ctx.lineTo(x1+slvW,y0+bh*0.24);ctx.stroke();
    }

    // BODY
    {
      const gB=ctx.createLinearGradient(x0,y0*0.6,x1,y1*0.8);
      if(isFront){
        gB.addColorStop(0,cLit);gB.addColorStop(0.3,cMid);
        gB.addColorStop(0.72,cSide);gB.addColorStop(1,cDk);
      }else{
        gB.addColorStop(0,cBk);gB.addColorStop(0.5,mix(shirtColor,-(light?24:16)));gB.addColorStop(1,cVDk);
      }
      ctx.fillStyle=gB;ctx.strokeStyle=stk;ctx.lineWidth=1.5;
      ctx.beginPath();
      ctx.moveTo(x0,y0);                     // top-left
      ctx.lineTo(x0+bw*0.21,y0);            // collar left
      // collar
      if(shirtStyle==="vneck"){
        ctx.lineTo(0,y0+bh*0.15);ctx.lineTo(x1-bw*0.21,y0);
      }else{
        ctx.quadraticCurveTo(x0+bw*0.3,y0+bh*0.09,0,y0+bh*0.10);
        ctx.quadraticCurveTo(x1-bw*0.3,y0+bh*0.09,x1-bw*0.21,y0);
      }
      ctx.lineTo(x1,y0);                    // top-right
      ctx.lineTo(x1,y1);                    // bottom-right
      ctx.lineTo(x0,y1);                    // bottom-left
      ctx.closePath();ctx.fill();ctx.stroke();
    }

    // COLLAR DETAIL
    ctx.strokeStyle=seam;ctx.lineWidth=1.8;
    if(shirtStyle==="vneck"){
      ctx.beginPath();ctx.moveTo(x0+bw*0.21,y0+bh*0.003);
      ctx.lineTo(0,y0+bh*0.145);ctx.lineTo(x1-bw*0.21,y0+bh*0.003);ctx.stroke();
    }else if(shirtStyle==="polo"){
      ctx.beginPath();ctx.moveTo(-bw*0.13,y0);ctx.lineTo(-bw*0.13,y0+bh*0.16);
      ctx.quadraticCurveTo(0,y0+bh*0.20,bw*0.13,y0+bh*0.16);ctx.lineTo(bw*0.13,y0);ctx.stroke();
      ctx.beginPath();ctx.moveTo(0,y0+bh*0.17);ctx.lineTo(0,y0+bh*0.32);ctx.stroke();
      ctx.fillStyle=seam;
      [0.19,0.25,0.31].forEach(fy=>{ctx.beginPath();ctx.arc(0,y0+bh*fy,2.2*z,0,Math.PI*2);ctx.fill();});
    }else if(shirtStyle==="hoodie"){
      ctx.strokeStyle=stk;ctx.lineWidth=1.5;
      ctx.beginPath();ctx.moveTo(x0+bw*0.04,y0);
      ctx.bezierCurveTo(x0+bw*0.1,y0-bh*0.26,x1-bw*0.1,y0-bh*0.26,x1-bw*0.04,y0);ctx.stroke();
      ctx.strokeStyle=seam;ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(-bw*0.07,y0-bh*0.22);ctx.lineTo(-bw*0.09,y0+bh*0.22);ctx.stroke();
      ctx.beginPath();ctx.moveTo(bw*0.07,y0-bh*0.22);ctx.lineTo(bw*0.09,y0+bh*0.22);ctx.stroke();
      const pkW=bw*0.58,pkH=bh*0.18;
      ctx.beginPath();ctx.roundRect(-pkW/2,y0+bh*0.55,pkW,pkH,4*z);ctx.stroke();
      ctx.beginPath();ctx.moveTo(0,y0+bh*0.55);ctx.lineTo(0,y0+bh*0.55+pkH);ctx.stroke();
    }else{
      // crew rib
      ctx.beginPath();
      ctx.moveTo(x0+bw*0.21,y0);
      ctx.quadraticCurveTo(x0+bw*0.29,y0+bh*0.085,0,y0+bh*0.09);
      ctx.quadraticCurveTo(x1-bw*0.29,y0+bh*0.085,x1-bw*0.21,y0);ctx.stroke();
    }

    // SEAMS
    ctx.strokeStyle=seam;ctx.lineWidth=0.7;
    ctx.beginPath();ctx.moveTo(x0,y0);ctx.lineTo(x0,y0+bh*0.28);ctx.stroke();
    ctx.beginPath();ctx.moveTo(x1,y0);ctx.lineTo(x1,y0+bh*0.28);ctx.stroke();
    ctx.beginPath();ctx.moveTo(x0,y0+bh*0.28);ctx.lineTo(x0,y1);ctx.stroke();
    ctx.beginPath();ctx.moveTo(x1,y0+bh*0.28);ctx.lineTo(x1,y1);ctx.stroke();
    ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(x0,y1-3*z);ctx.lineTo(x1,y1-3*z);ctx.stroke();
    ctx.lineWidth=0.7;ctx.beginPath();ctx.moveTo(x0,y1);ctx.lineTo(x1,y1);ctx.stroke();
    if(isFront&&wf>0.6){ctx.globalAlpha=wf*0.15;ctx.beginPath();ctx.moveTo(0,y0+bh*0.11);ctx.lineTo(0,y1);ctx.stroke();ctx.globalAlpha=1;}

    // HIGHLIGHT
    if(isFront){
      const hg=ctx.createLinearGradient(x0,y0,x0+bw*0.25,bh*0.2);
      hg.addColorStop(0,hi);hg.addColorStop(1,"rgba(255,255,255,0)");
      ctx.fillStyle=hg;ctx.beginPath();
      ctx.moveTo(x0,y0);ctx.lineTo(x0+bw*0.20,y0);ctx.lineTo(x0+bw*0.13,y1);ctx.lineTo(x0,y1);
      ctx.closePath();ctx.fill();
    }

    // DESIGN PRINT
    if(designImg.current&&isFront&&wf>0.08){
      const dW=bw*0.70,dH=bh*0.50;
      const dX=-dW/2,dY=y0+bh*0.19;
      ctx.save();
      ctx.globalAlpha=Math.min(1,(wf-0.08)*1.3);
      ctx.beginPath();ctx.rect(x0+1,y0+1,bw-2,bh-2);ctx.clip();
      ctx.drawImage(designImg.current,dX,dY,dW,dH);
      ctx.restore();
    }

    // BACK LABEL
    if(!isFront&&wf>0.15){
      ctx.globalAlpha=Math.min(1,(wf-0.15)*2);
      const lc=mix(shirtColor,-(light?60:0));
      ctx.strokeStyle=lc;ctx.fillStyle=lc;ctx.lineWidth=0.9;
      const tw=bw*0.17,th=bh*0.055;
      ctx.beginPath();ctx.roundRect(-tw/2,y0+bh*0.07,tw,th,2);ctx.stroke();
      ctx.font=`bold ${8*z}px sans-serif`;ctx.textAlign="center";
      ctx.fillText("SIZE M",0,y0+bh*0.07+th*0.74);
      ctx.globalAlpha=1;
    }

    ctx.restore();

    // FLOOR SHADOW
    const sw=bw*Math.max(wf,0.25)*0.95;
    const sg=ctx.createRadialGradient(cx,cy+bh/2+14,0,cx,cy+bh/2+14,sw*0.75);
    sg.addColorStop(0,"rgba(0,0,0,0.36)");sg.addColorStop(1,"rgba(0,0,0,0)");
    ctx.fillStyle=sg;ctx.beginPath();ctx.ellipse(cx,cy+bh/2+16,sw*0.62,14*z,0,0,Math.PI*2);ctx.fill();
  },[shirtColor,shirtStyle]);

  useEffect(()=>{
    if(!isOpen)return;
    let raf:number;
    const tick=()=>{
      const canvas=canvasRef.current;
      if(canvas){const ctx=canvas.getContext("2d");if(ctx){
        if(autoRef.current)targetA.current+=0.5;
        currentA.current+=(targetA.current-currentA.current)*0.1;
        draw(ctx,currentA.current,zoomRef.current);
      }}
      raf=requestAnimationFrame(tick);
    };
    raf=requestAnimationFrame(tick);return()=>cancelAnimationFrame(raf);
  },[isOpen,draw]);

  const goTo=(v:typeof VIEWS[0])=>{setActiveView(v.id);autoRef.current=false;setIsAuto(false);targetA.current=v.angle;};
  const onMD=(e:React.MouseEvent)=>{setIsDragging(true);dragX.current=e.clientX;dragAngle.current=targetA.current;autoRef.current=false;setIsAuto(false);};
  const onMM=(e:React.MouseEvent)=>{if(!isDragging)return;targetA.current=dragAngle.current+(e.clientX-dragX.current)*0.65;};
  const onTS=(e:React.TouchEvent)=>{dragX.current=e.touches[0].clientX;dragAngle.current=targetA.current;autoRef.current=false;setIsAuto(false);};
  const onTM=(e:React.TouchEvent)=>{targetA.current=dragAngle.current+(e.touches[0].clientX-dragX.current)*0.65;};
  const toggleAuto=()=>{const n=!isAuto;autoRef.current=n;setIsAuto(n);};
  if(!isOpen)return null;

  const IB=({icon,onClick}:{icon:React.ReactNode;onClick:()=>void})=>(
    <button onClick={onClick} className="w-9 h-9 rounded-xl flex items-center justify-center"
      style={{background:"rgba(255,255,255,0.08)",border:"0.5px solid rgba(255,255,255,0.13)",color:"rgba(255,255,255,0.75)"}}>
      {icon}
    </button>
  );

  return(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{background:"rgba(0,0,0,0.93)",backdropFilter:"blur(16px)"}}>
      <div className="w-full max-w-4xl rounded-3xl overflow-hidden flex flex-col"
        style={{background:"#0c0c18",border:"0.5px solid rgba(255,255,255,0.1)",boxShadow:"0 40px 120px rgba(0,0,0,0.8)",maxHeight:"94vh"}}>
        <div className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{borderBottom:"0.5px solid rgba(255,255,255,0.07)"}}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-bold text-sm"
              style={{background:"linear-gradient(135deg,#7c3aed,#4f46e5)"}}>3D</div>
            <div>
              <h3 className="text-white font-semibold text-[15px]">360° 3D Preview</h3>
              <p className="text-[11px]" style={{color:"rgba(255,255,255,0.38)"}}>Drag to spin · Pick a view · Auto-rotate</p>
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl flex items-center justify-center font-semibold text-[16px]"
            style={{background:"rgba(255,255,255,0.07)",color:"rgba(255,255,255,0.55)",border:"0.5px solid rgba(255,255,255,0.1)"}}>✕</button>
        </div>
        <div className="flex flex-1 overflow-hidden" style={{minHeight:0}}>
          <div className="flex-1 relative" style={{background:"radial-gradient(ellipse at 50% 45%,#1c1240 0%,#0a0a18 55%,#050510 100%)",minHeight:440}}>
            <div className="absolute inset-0 pointer-events-none"
              style={{background:"radial-gradient(ellipse at 50% 40%,rgba(110,60,240,0.18) 0%,transparent 60%)"}}/>
            <canvas ref={canvasRef} width={600} height={480}
              style={{display:"block",cursor:isDragging?"grabbing":"grab",width:"100%",height:"480px"}}
              onMouseDown={onMD} onMouseMove={onMM}
              onMouseUp={()=>setIsDragging(false)} onMouseLeave={()=>setIsDragging(false)}
              onTouchStart={onTS} onTouchMove={onTM} onTouchEnd={()=>setIsDragging(false)}/>
            {!isDragging&&!isAuto&&(
              <div className="absolute top-4 left-1/2 -translate-x-1/2 select-none pointer-events-none"
                style={{background:"rgba(0,0,0,0.55)",backdropFilter:"blur(8px)",border:"0.5px solid rgba(255,255,255,0.1)",borderRadius:20,padding:"5px 16px",color:"rgba(255,255,255,0.42)",fontSize:11}}>
                ← drag to spin →
              </div>
            )}
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2.5 rounded-2xl"
              style={{background:"rgba(5,5,18,0.75)",backdropFilter:"blur(12px)",border:"0.5px solid rgba(255,255,255,0.1)"}}>
              <IB icon={<RotateCcw size={15}/>} onClick={()=>{targetA.current-=45;}}/>
              <button onClick={toggleAuto} className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-semibold"
                style={isAuto?{background:"rgba(124,58,237,0.55)",border:"0.5px solid rgba(147,90,255,0.8)",color:"#ede9fe"}:{background:"rgba(255,255,255,0.09)",border:"0.5px solid rgba(255,255,255,0.15)",color:"rgba(255,255,255,0.8)"}}>
                {isAuto?<><Pause size={13}/>&nbsp;Stop</>:<><Play size={13}/>&nbsp;Auto Rotate</>}
              </button>
              <IB icon={<RotateCw size={15}/>} onClick={()=>{targetA.current+=45;}}/>
              <div className="w-px h-5 mx-0.5" style={{background:"rgba(255,255,255,0.1)"}}/>
              <IB icon={<ZoomOut size={15}/>} onClick={()=>setZoom(z=>Math.max(0.5,+(z-0.15).toFixed(2)))}/>
              <span className="text-[11px] font-mono w-9 text-center" style={{color:"rgba(255,255,255,0.4)"}}>{Math.round(zoom*100)}%</span>
              <IB icon={<ZoomIn size={15}/>} onClick={()=>setZoom(z=>Math.min(2,+(z+0.15).toFixed(2)))}/>
            </div>
          </div>
          <div className="w-44 shrink-0 flex flex-col p-4 gap-1.5 overflow-y-auto"
            style={{borderLeft:"0.5px solid rgba(255,255,255,0.07)"}}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{color:"rgba(255,255,255,0.22)"}}>Views</p>
            {VIEWS.map(v=>(
              <button key={v.id} onClick={()=>goTo(v)} className="w-full py-2 px-3 rounded-xl text-[12px] font-medium text-left transition-all"
                style={{background:activeView===v.id?"rgba(124,58,237,0.32)":"rgba(255,255,255,0.04)",border:activeView===v.id?"1px solid rgba(124,58,237,0.7)":"0.5px solid rgba(255,255,255,0.08)",color:activeView===v.id?"#ddd6fe":"rgba(255,255,255,0.48)"}}>
                {v.label}
              </button>
            ))}
            <div className="mt-auto pt-4" style={{borderTop:"0.5px solid rgba(255,255,255,0.07)"}}>
              <p className="text-[9px] uppercase tracking-widest mb-2" style={{color:"rgba(255,255,255,0.2)"}}>Shirt</p>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-full shrink-0"
                  style={{background:shirtColor,border:"1.5px solid rgba(255,255,255,0.25)",boxShadow:"0 2px 8px rgba(0,0,0,0.5)"}}/>
                <div>
                  <p className="text-[10px] font-mono" style={{color:"rgba(255,255,255,0.38)"}}>{shirtColor}</p>
                  <p className="text-[11px] capitalize font-medium" style={{color:"rgba(255,255,255,0.55)"}}>{shirtStyle}</p>
                </div>
              </div>
              <div className="rounded-xl p-2.5 mt-2" style={{background:"rgba(124,58,237,0.1)",border:"0.5px solid rgba(124,58,237,0.25)"}}>
                <p className="text-[10px] leading-relaxed" style={{color:"rgba(167,139,250,0.85)"}}>💡 Hit Auto Rotate for a full 360° spin</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
