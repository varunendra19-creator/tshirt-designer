"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, X, RotateCcw } from "lucide-react";

interface Props {
  isOpen: boolean; onClose: () => void;
  designDataUrl: string; shirtColor: string; shirtStyle: string;
}

const VIEWS = [
  { id:"front",  label:"Front",      angle:0     },
  { id:"tql",    label:"¾ Left",     angle:0.6   },
  { id:"left",   label:"Left Side",  angle:1.57  },
  { id:"back",   label:"Back",       angle:3.14  },
  { id:"right",  label:"Right Side", angle:-1.57 },
  { id:"tqr",    label:"¾ Right",    angle:-0.6  },
];

export function TShirt3DViewer({isOpen,onClose,designDataUrl,shirtColor,shirtStyle}:Props){
  const mountRef=useRef<HTMLDivElement>(null);
  const modelRef=useRef<any>(null);
  const cameraRef=useRef<any>(null);
  const controlsRef=useRef<any>(null);
  const rendererRef=useRef<any>(null);
  const rafRef=useRef<number>(0);
  const isAutoRef=useRef(false);
  const [viewIdx,setViewIdx]=useState(0);
  const [isAuto,setIsAuto]=useState(false);
  const [isLoading,setIsLoading]=useState(true);

  const applyMaterials=(THREE:any,model:any,color:string,dataUrl:string)=>{
    const r=parseInt(color.slice(1,3),16)/255;
    const g=parseInt(color.slice(3,5),16)/255;
    const b=parseInt(color.slice(5,7),16)/255;
    const shirtColor3=new THREE.Color(r,g,b);
    model.traverse((child:any)=>{
      if(child.isMesh&&child.material){
        const mats=Array.isArray(child.material)?child.material:[child.material];
        mats.forEach((mat:any)=>{
          mat.color=shirtColor3.clone();
          mat.needsUpdate=true;
        });
      }
    });
    if(dataUrl){
      const tl=new THREE.TextureLoader();
      tl.load(dataUrl,(tex:any)=>{
        tex.flipY=false;
        try{tex.colorSpace=THREE.SRGBColorSpace;}catch{}
        model.traverse((child:any)=>{
          if(child.isMesh&&child.material){
            const nm=child.name?.toLowerCase()||"";
            if(!nm.includes("collar")&&!nm.includes("button")&&!nm.includes("zipper")){
              const mats=Array.isArray(child.material)?child.material:[child.material];
              mats.forEach((mat:any)=>{mat.map=tex;mat.needsUpdate=true;});
            }
          }
        });
      });
    }
  };

  useEffect(()=>{
    if(!isOpen||!mountRef.current)return;
    let mounted=true;
    const init=async()=>{
      try{
        const THREE=await import("three");
        const {OrbitControls}=await import("three/examples/jsm/controls/OrbitControls.js" as any);
        const {GLTFLoader}=await import("three/examples/jsm/loaders/GLTFLoader.js" as any);
        if(!mounted||!mountRef.current)return;
        const W=mountRef.current.clientWidth||640;
        const H=mountRef.current.clientHeight||480;

        const scene=new THREE.Scene();
        const camera=new THREE.PerspectiveCamera(28,W/H,0.1,100);
        camera.position.set(0,0.05,2.6);
        cameraRef.current=camera;

        const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
        renderer.setSize(W,H);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
        renderer.shadowMap.enabled=true;
        try{renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;}catch{}
        try{renderer.outputColorSpace=THREE.SRGBColorSpace;}catch{}
        mountRef.current.appendChild(renderer.domElement);
        rendererRef.current=renderer;

        // Lights
        scene.add(new THREE.AmbientLight(0xffffff,0.9));
        const d1=new THREE.DirectionalLight(0xffffff,1.6);d1.position.set(2,3,3);scene.add(d1);
        const d2=new THREE.DirectionalLight(0xffffff,0.5);d2.position.set(-2,1,-2);scene.add(d2);
        const d3=new THREE.DirectionalLight(0xffffff,0.3);d3.position.set(0,-2,1);scene.add(d3);

        const controls=new OrbitControls(camera,renderer.domElement);
        controls.enableDamping=true;controls.dampingFactor=0.08;
        controls.enablePan=false;controls.minDistance=1.4;controls.maxDistance=5;
        controls.maxPolarAngle=Math.PI*0.78;controls.minPolarAngle=Math.PI*0.22;
        controlsRef.current=controls;

        const loader=new GLTFLoader();
        const urls=[
          "https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/t-shirt/model.gltf",
          "https://cdn.jsdelivr.net/gh/kt946/ai-threejs-products-app-yt-jsm@main/public/shirt_baked.glb",
          "https://raw.githubusercontent.com/nicktarnold/3d-shirt/main/shirt_baked.glb",
        ];

        let done=false;
        for(const url of urls){
          if(done)break;
          try{
            await new Promise<void>((res,rej)=>{
              loader.load(url,(gltf:any)=>{
                if(!mounted)return;
                const model=gltf.scene;
                const box=new THREE.Box3().setFromObject(model);
                const center=box.getCenter(new THREE.Vector3());
                const size=box.getSize(new THREE.Vector3());
                model.position.sub(center);
                const maxS=Math.max(size.x,size.y,size.z);
                const targetSize=1.8;
                model.scale.setScalar(targetSize/maxS);
                applyMaterials(THREE,model,shirtColor,designDataUrl);
                scene.add(model);
                modelRef.current=model;
                done=true;
                setIsLoading(false);
                res();
              },undefined,rej);
            });
          }catch{continue;}
        }

        if(!done&&mounted){
          // Procedural fallback
          const r=parseInt(shirtColor.slice(1,3),16)/255;
          const g=parseInt(shirtColor.slice(3,5),16)/255;
          const b=parseInt(shirtColor.slice(5,7),16)/255;
          const mat=new THREE.MeshPhongMaterial({color:new THREE.Color(r,g,b),side:THREE.DoubleSide,shininess:20});
          const grp=new THREE.Group();
          grp.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(1.1,1.4,0.14),mat)));
          const slv=new THREE.Mesh(new THREE.BoxGeometry(0.52,0.20,0.12),mat);
          const slv2=slv.clone();
          slv.position.set(-0.82,0.60,0);slv.rotation.z=0.32;
          slv2.position.set(0.82,0.60,0);slv2.rotation.z=-0.32;
          grp.add(slv);grp.add(slv2);
          scene.add(grp);modelRef.current=grp;
          setIsLoading(false);
        }

        const animate=()=>{
          rafRef.current=requestAnimationFrame(animate);
          if(isAutoRef.current&&modelRef.current)modelRef.current.rotation.y+=0.008;
          controls.update();
          renderer.render(scene,camera);
        };
        animate();

        const onResize=()=>{
          if(!mountRef.current)return;
          const w=mountRef.current.clientWidth,h=mountRef.current.clientHeight;
          camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);
        };
        window.addEventListener("resize",onResize);
        return()=>window.removeEventListener("resize",onResize);
      }catch(e){setIsLoading(false);}
    };
    init();
    return()=>{
      mounted=false;cancelAnimationFrame(rafRef.current);
      if(rendererRef.current){
        rendererRef.current.dispose();
        if(mountRef.current&&rendererRef.current.domElement.parentNode===mountRef.current)
          mountRef.current.removeChild(rendererRef.current.domElement);
      }
      modelRef.current=null;cameraRef.current=null;controlsRef.current=null;rendererRef.current=null;
    };
  },[isOpen]);

  useEffect(()=>{
    if(!modelRef.current)return;
    import("three").then(THREE=>{applyMaterials(THREE,modelRef.current,shirtColor,designDataUrl);});
  },[shirtColor,designDataUrl]);

  const goTo=useCallback((i:number)=>{
    setViewIdx(i);isAutoRef.current=false;setIsAuto(false);
    if(!modelRef.current)return;
    const target=VIEWS[i].angle;
    const start=modelRef.current.rotation.y;
    let t=0;
    const anim=()=>{
      t+=0.05;
      if(t>=1){modelRef.current.rotation.y=target;return;}
      modelRef.current.rotation.y=start+(target-start)*(1-Math.pow(1-t,3));
      requestAnimationFrame(anim);
    };
    anim();
  },[]);

  const resetView=()=>{
    if(cameraRef.current)cameraRef.current.position.set(0,0.05,2.6);
    if(controlsRef.current)controlsRef.current.reset();
    goTo(0);
  };

  if(!isOpen)return null;

  return(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3"
      style={{background:"rgba(0,0,0,0.92)",backdropFilter:"blur(16px)"}}>
      <div className="w-full flex flex-col rounded-3xl overflow-hidden"
        style={{maxWidth:860,maxHeight:"94vh",background:"linear-gradient(160deg,#110d24 0%,#0c0c1a 60%,#070710 100%)",border:"1px solid rgba(255,255,255,0.09)",boxShadow:"0 32px 100px rgba(0,0,0,0.85)"}}>

        <div className="flex items-center gap-3 px-5 py-4 shrink-0" style={{borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
          <div className="w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-[13px] text-white shrink-0"
            style={{background:"linear-gradient(135deg,#7c3aed,#4f46e5)"}}>3D</div>
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold text-[14px]">360° 3D Shirt Preview</h3>
            <p className="text-[11px]" style={{color:"rgba(255,255,255,0.35)"}}>Drag to orbit · Scroll to zoom · Pick a view</p>
          </div>
          <div className="px-3 py-1 rounded-full text-[12px] font-medium shrink-0"
            style={{background:"rgba(124,58,237,0.2)",border:"0.5px solid rgba(124,58,237,0.4)",color:"#c4b5fd"}}>
            {VIEWS[viewIdx].label}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{background:"rgba(255,255,255,0.07)",color:"rgba(255,255,255,0.5)",border:"0.5px solid rgba(255,255,255,0.1)"}}>
            <X size={15}/>
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden" style={{minHeight:0}}>
          <div className="flex-1 relative overflow-hidden"
            style={{background:"radial-gradient(ellipse at 50% 42%,#1e1045 0%,#0c0c1a 55%,#060612 100%)",minHeight:420}}>
            <div className="absolute inset-0 pointer-events-none"
              style={{background:"radial-gradient(ellipse at 50% 42%,rgba(120,60,240,0.18) 0%,transparent 58%)"}}/>
            <div ref={mountRef} style={{width:"100%",height:"100%",minHeight:420}}/>
            {isLoading&&(
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10">
                <div className="w-10 h-10 rounded-full border-2 border-violet-500 border-t-transparent animate-spin"/>
                <p className="text-sm" style={{color:"rgba(255,255,255,0.5)"}}>Loading 3D model…</p>
              </div>
            )}
            {!isLoading&&(
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none select-none px-3 py-1.5 rounded-full text-[11px]"
                style={{background:"rgba(0,0,0,0.5)",backdropFilter:"blur(8px)",border:"0.5px solid rgba(255,255,255,0.08)",color:"rgba(255,255,255,0.38)"}}>
                🖱 Drag to orbit · Scroll to zoom
              </div>
            )}
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3 py-2 rounded-2xl"
              style={{background:"rgba(6,6,18,0.82)",backdropFilter:"blur(12px)",border:"1px solid rgba(255,255,255,0.09)"}}>
              <button onClick={()=>goTo((viewIdx+VIEWS.length-1)%VIEWS.length)} className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{background:"rgba(255,255,255,0.07)",border:"0.5px solid rgba(255,255,255,0.1)",color:"rgba(255,255,255,0.65)"}}>
                <ChevronLeft size={15}/>
              </button>
              <button onClick={()=>{const n=!isAuto;isAutoRef.current=n;setIsAuto(n);}}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold"
                style={isAuto?{background:"rgba(124,58,237,0.5)",border:"1px solid rgba(147,90,255,0.7)",color:"#ede9fe"}:{background:"rgba(255,255,255,0.08)",border:"0.5px solid rgba(255,255,255,0.12)",color:"rgba(255,255,255,0.75)"}}>
                {isAuto?<><Pause size={12}/>&nbsp;Stop</>:<><Play size={12}/>&nbsp;Auto Rotate</>}
              </button>
              <button onClick={()=>goTo((viewIdx+1)%VIEWS.length)} className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{background:"rgba(255,255,255,0.07)",border:"0.5px solid rgba(255,255,255,0.1)",color:"rgba(255,255,255,0.65)"}}>
                <ChevronRight size={15}/>
              </button>
              <div style={{width:1,height:20,background:"rgba(255,255,255,0.1)"}}/>
              <button onClick={()=>{if(cameraRef.current)cameraRef.current.position.z=Math.max(1.4,cameraRef.current.position.z-0.3);}}
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{background:"rgba(255,255,255,0.07)",border:"0.5px solid rgba(255,255,255,0.1)",color:"rgba(255,255,255,0.65)"}}>
                <ZoomIn size={14}/>
              </button>
              <button onClick={()=>{if(cameraRef.current)cameraRef.current.position.z=Math.min(5,cameraRef.current.position.z+0.3);}}
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{background:"rgba(255,255,255,0.07)",border:"0.5px solid rgba(255,255,255,0.1)",color:"rgba(255,255,255,0.65)"}}>
                <ZoomOut size={14}/>
              </button>
              <button onClick={resetView} className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{background:"rgba(255,255,255,0.07)",border:"0.5px solid rgba(255,255,255,0.1)",color:"rgba(255,255,255,0.65)"}}>
                <RotateCcw size={13}/>
              </button>
            </div>
          </div>

          <div className="w-40 shrink-0 flex flex-col p-3 gap-1.5" style={{borderLeft:"1px solid rgba(255,255,255,0.06)"}}>
            <p className="text-[9px] font-bold uppercase tracking-widest px-1 mb-1" style={{color:"rgba(255,255,255,0.22)"}}>Views</p>
            {VIEWS.map((v,i)=>(
              <button key={v.id} onClick={()=>goTo(i)} className="w-full py-2 px-2.5 rounded-xl text-[12px] font-medium text-left transition-all"
                style={{background:viewIdx===i?"rgba(124,58,237,0.28)":"rgba(255,255,255,0.04)",border:viewIdx===i?"1px solid rgba(124,58,237,0.65)":"0.5px solid rgba(255,255,255,0.07)",color:viewIdx===i?"#ddd6fe":"rgba(255,255,255,0.45)"}}>
                {v.label}
              </button>
            ))}
            <div className="mt-auto pt-3 flex flex-col gap-2" style={{borderTop:"1px solid rgba(255,255,255,0.06)"}}>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full shrink-0"
                  style={{background:shirtColor,border:"1.5px solid rgba(255,255,255,0.2)",boxShadow:"0 2px 6px rgba(0,0,0,0.5)"}}/>
                <div className="min-w-0">
                  <p className="text-[9px] font-mono truncate" style={{color:"rgba(255,255,255,0.35)"}}>{shirtColor}</p>
                  <p className="text-[10px] capitalize font-medium" style={{color:"rgba(255,255,255,0.5)"}}>{shirtStyle}</p>
                </div>
              </div>
              <div className="rounded-xl p-2.5" style={{background:"rgba(124,58,237,0.1)",border:"0.5px solid rgba(124,58,237,0.25)"}}>
                <p className="text-[10px] leading-relaxed" style={{color:"rgba(167,139,250,0.85)"}}>💡 Drag freely to orbit the real 3D shirt</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 py-3 shrink-0" style={{borderTop:"1px solid rgba(255,255,255,0.06)"}}>
          {VIEWS.map((_,i)=>(
            <button key={i} onClick={()=>goTo(i)} className="rounded-full transition-all"
              style={{width:viewIdx===i?20:7,height:7,background:viewIdx===i?"#7c3aed":"rgba(255,255,255,0.18)"}}/>
          ))}
        </div>
      </div>
    </div>
  );
}
