"use client";

import { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import { buildShirtGroup } from "@/lib/buildShirtGeometry";

interface Live3DCanvasProps {
  shirtColor: string;
  shirtStyle: string;
  viewSide: "front" | "back";
  onSelectObject: (obj: any) => void;
  onSaveHistory: () => void;
}

const TEX_SIZE = 1024;

export const Live3DCanvas = forwardRef<any, Live3DCanvasProps>(({
  shirtColor, shirtStyle, viewSide, onSelectObject, onSaveHistory,
}, ref) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const fabricOverlayElRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const rendererRef = useRef<any>(null);
  const controlsRef = useRef<any>(null);
  const bodyMeshRef = useRef<any>(null);
  const groupRef = useRef<any>(null);
  const canvasTextureRef = useRef<any>(null);
  const fabricCanvasRef = useRef<any>(null);
  const historyStackRef = useRef<string[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const isRestoringRef = useRef<boolean>(false);
  const rafRef = useRef<number>(0);
  const threeRef = useRef<any>(null);
  const isAutoRef = useRef(false);

  const [isReady, setIsReady] = useState(false);
  const [isAuto, setIsAuto] = useState(false);

  // ── Build the shirt geometry (same reliable single-outline extrude as before) ──
  const buildShirt = useCallback((THREE: any, style: string) => {
    const { group, bodyMesh } = buildShirtGroup(THREE, style);
    bodyMeshRef.current = bodyMesh;
    return group;
  }, []);

  // ── Attach Fabric.js to the VISIBLE overlay canvas so users can directly
  // drag/resize/rotate their design — this becomes the live texture source too.
  // ── Public API: pause auto-rotate (called whenever the user starts editing) ──
  const pauseAutoRotate = useCallback(() => {
    isAutoRef.current = false;
    setIsAuto(false);
  }, []);

  // ── History stack: stores JSON snapshots of the fabric canvas for undo/redo ──
  const pushHistory = useCallback(() => {
    const fc = fabricCanvasRef.current;
    if (!fc || isRestoringRef.current) return;
    const json = JSON.stringify(fc.toJSON(["name"]));
    // Trim any "future" states if we'd previously undone and are now making a new change
    historyStackRef.current = historyStackRef.current.slice(0, historyIndexRef.current + 1);
    historyStackRef.current.push(json);
    historyIndexRef.current = historyStackRef.current.length - 1;
  }, []);

  const restoreFromHistory = useCallback((index: number) => {
    const fc = fabricCanvasRef.current;
    if (!fc) return;
    const snapshot = historyStackRef.current[index];
    if (snapshot === undefined) return;
    isRestoringRef.current = true;
    fc.loadFromJSON(snapshot, () => {
      fc.renderAll();
      updateTexture();
      isRestoringRef.current = false;
      onSelectObject(fc.getActiveObject() ?? null);
    });
  }, [onSelectObject]);

  const undo = useCallback(() => {
    pauseAutoRotate();
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current -= 1;
    restoreFromHistory(historyIndexRef.current);
  }, [restoreFromHistory, pauseAutoRotate]);

  const redo = useCallback(() => {
    pauseAutoRotate();
    if (historyIndexRef.current >= historyStackRef.current.length - 1) return;
    historyIndexRef.current += 1;
    restoreFromHistory(historyIndexRef.current);
  }, [restoreFromHistory, pauseAutoRotate]);

  const initDrawSurface = useCallback(async (THREE: any) => {
    const { fabric } = await import("fabric");
    if (!fabricOverlayElRef.current) return null;

    // Internal resolution stays high (TEX_SIZE) regardless of on-screen CSS size,
    // fabric scales pointer coordinates automatically based on canvas element size.
    const fc = new fabric.Canvas(fabricOverlayElRef.current, {
      width: TEX_SIZE,
      height: TEX_SIZE,
      backgroundColor: "transparent",
      preserveObjectStacking: true,
    });
    fabricCanvasRef.current = fc;

    fc.on("selection:created", (e: any) => { isAutoRef.current = false; setIsAuto(false); onSelectObject(e.selected?.[0]); });
    fc.on("selection:updated", (e: any) => { isAutoRef.current = false; setIsAuto(false); onSelectObject(e.selected?.[0]); });
    fc.on("selection:cleared", () => onSelectObject(null));
    fc.on("object:modified", () => { updateTexture(); onSaveHistory(); pushHistory(); });
    fc.on("object:moving", () => { isAutoRef.current = false; setIsAuto(false); updateTexture(); });
    fc.on("object:scaling", () => { isAutoRef.current = false; setIsAuto(false); updateTexture(); });
    fc.on("object:rotating", () => { isAutoRef.current = false; setIsAuto(false); updateTexture(); });
    fc.on("mouse:down", () => { isAutoRef.current = false; setIsAuto(false); });

    const tex = new THREE.CanvasTexture(fc.getElement());
    tex.flipY = true;
    try { tex.colorSpace = THREE.SRGBColorSpace; } catch {}
    canvasTextureRef.current = tex;

    return tex;
  }, [onSelectObject, onSaveHistory, pushHistory]);

  const updateTexture = useCallback(() => {
    if (canvasTextureRef.current) canvasTextureRef.current.needsUpdate = true;
  }, []);

  // ── Attach the live texture as a decal on the shirt front ──
  const attachDecal = useCallback(async (THREE: any, group: any, tex: any) => {
    const { DecalGeometry } = await import("three/examples/jsm/geometries/DecalGeometry.js" as any);
    if (!bodyMeshRef.current) return;

    const position = new THREE.Vector3(0, 0.05, 0.13);
    const orientation = new THREE.Euler(0, 0, 0);
    const size = new THREE.Vector3(0.62, 0.62, 0.5);
    const decalGeo = new DecalGeometry(bodyMeshRef.current, position, orientation, size);
    const decalMat = new THREE.MeshStandardMaterial({
      map: tex, transparent: true, depthTest: true, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -4, roughness: 0.85, metalness: 0.0,
    });
    const decalMesh = new THREE.Mesh(decalGeo, decalMat);
    decalMesh.name = "decal";
    group.add(decalMesh);
  }, []);

  // ── Init Three.js scene ──
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const THREE = await import("three");
      const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js" as any);
      threeRef.current = THREE;
      if (!mounted || !mountRef.current) return;

      const W = mountRef.current.clientWidth || 640;
      const H = mountRef.current.clientHeight || 560;

      const scene = new THREE.Scene();
      sceneRef.current = scene;

      const camera = new THREE.PerspectiveCamera(28, W / H, 0.1, 100);
      camera.position.set(0, -0.15, 3.6);
      cameraRef.current = camera;

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(W, H);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      try { renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05; } catch {}
      try { renderer.outputColorSpace = THREE.SRGBColorSpace; } catch {}
      mountRef.current.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      scene.add(new THREE.AmbientLight(0xffffff, 0.55));
      const key = new THREE.DirectionalLight(0xfff4e6, 1.8);
      key.position.set(2.0, 3.2, 2.6);
      key.castShadow = true;
      key.shadow.mapSize.set(1024, 1024);
      scene.add(key);
      const fillL = new THREE.DirectionalLight(0xe6f0ff, 0.7);
      fillL.position.set(-2.6, 1.2, -1.2);
      scene.add(fillL);
      const rimL = new THREE.DirectionalLight(0xffffff, 0.4);
      rimL.position.set(0, 2.4, -3.2);
      scene.add(rimL);

      const bgGeo = new THREE.SphereGeometry(20, 24, 24);
      const bgMat = new THREE.ShaderMaterial({
        side: THREE.BackSide,
        uniforms: { topColor: { value: new THREE.Color(0x1a1a26) }, bottomColor: { value: new THREE.Color(0x0a0a12) } },
        vertexShader: `varying vec3 vWorldPos; void main(){ vec4 wp = modelMatrix * vec4(position,1.0); vWorldPos = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`,
        fragmentShader: `varying vec3 vWorldPos; uniform vec3 topColor; uniform vec3 bottomColor; void main(){ float h = normalize(vWorldPos).y * 0.5 + 0.5; gl_FragColor = vec4(mix(bottomColor, topColor, h), 1.0); }`,
      });
      scene.add(new THREE.Mesh(bgGeo, bgMat));

      const floorGeo = new THREE.PlaneGeometry(14, 14);
      const floorMat = new THREE.ShadowMaterial({ opacity: 0.3 });
      const floor = new THREE.Mesh(floorGeo, floorMat);
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = -1.15;
      floor.receiveShadow = true;
      scene.add(floor);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.enablePan = false;
      controls.minDistance = 1.6;
      controls.maxDistance = 5.5;
      controls.maxPolarAngle = Math.PI * 0.72;
      controls.minPolarAngle = Math.PI * 0.28;
      controlsRef.current = controls;

      const group = buildShirt(THREE, shirtStyle);
      scene.add(group);
      groupRef.current = group;

      const tex = await initDrawSurface(THREE);
      await attachDecal(THREE, group, tex);

      // Apply initial color
      group.traverse((c: any) => { if (c.isMesh && c.name !== "decal") { c.material.color = new THREE.Color(shirtColor); } });

      // Reset and seed history with the empty-canvas baseline so undo can return to a blank state
      historyStackRef.current = [];
      historyIndexRef.current = -1;
      pushHistory();

      setIsReady(true);

      const animate = () => {
        rafRef.current = requestAnimationFrame(animate);
        if (isAutoRef.current && groupRef.current) groupRef.current.rotation.y += 0.006;
        if (canvasTextureRef.current) canvasTextureRef.current.needsUpdate = true;
        controls.update();
        renderer.render(scene, camera);
      };
      animate();

      const onResize = () => {
        if (!mountRef.current) return;
        const w = mountRef.current.clientWidth, h = mountRef.current.clientHeight;
        camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h);
      };
      window.addEventListener("resize", onResize);
      return () => window.removeEventListener("resize", onResize);
    };

    init();

    return () => {
      mounted = false;
      cancelAnimationFrame(rafRef.current);
      if (fabricCanvasRef.current) { fabricCanvasRef.current.dispose(); fabricCanvasRef.current = null; }
      if (rendererRef.current) {
        rendererRef.current.dispose();
        if (mountRef.current && rendererRef.current.domElement.parentNode === mountRef.current) {
          mountRef.current.removeChild(rendererRef.current.domElement);
        }
      }
      groupRef.current = null; bodyMeshRef.current = null; cameraRef.current = null;
      controlsRef.current = null; rendererRef.current = null; sceneRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shirtStyle]);

  // Update shirt color live
  useEffect(() => {
    if (!groupRef.current || !threeRef.current) return;
    const THREE = threeRef.current;
    groupRef.current.traverse((c: any) => { if (c.isMesh && c.name !== "decal") { c.material.color = new THREE.Color(shirtColor); c.material.needsUpdate = true; } });
  }, [shirtColor]);

  // Flip view side — also stop auto-rotate so the loop doesn't immediately overwrite this rotation
  useEffect(() => {
    if (!groupRef.current) return;
    isAutoRef.current = false;
    setIsAuto(false);
    groupRef.current.rotation.y = viewSide === "back" ? Math.PI : 0;
  }, [viewSide]);

  // ── Public API exposed to parent ──
  const addImage = useCallback(async (file: File) => {
    pauseAutoRotate();
    const fc = fabricCanvasRef.current;
    if (!fc) return;
    const { fabric } = await import("fabric");
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      fabric.Image.fromURL(dataUrl, (img: any) => {
        const maxSize = TEX_SIZE * 0.55;
        const scale = Math.min(maxSize / (img.width ?? 1), maxSize / (img.height ?? 1));
        img.set({ left: TEX_SIZE/2, top: TEX_SIZE/2, scaleX: scale, scaleY: scale, originX: "center", originY: "center" });
        fc.add(img); fc.setActiveObject(img); fc.renderAll(); updateTexture(); onSaveHistory(); pushHistory();
      });
    };
    reader.readAsDataURL(file);
  }, [updateTexture, onSaveHistory, pauseAutoRotate, pushHistory]);

  const addText = useCallback(async (options: any) => {
    pauseAutoRotate();
    const fc = fabricCanvasRef.current;
    if (!fc) return;
    const { fabric } = await import("fabric");
    const content = options.content.replace(/\\n/g, "\n").replace(/\r\n/g, "\n");
    const text = new fabric.Textbox(content, {
      left: TEX_SIZE/2, top: TEX_SIZE/2, width: TEX_SIZE * 0.6, originX: "center", originY: "center",
      fontFamily: options.fontFamily, fontSize: options.fontSize * 1.1, fontWeight: options.fontWeight,
      fontStyle: options.fontStyle, fill: options.fill, textAlign: options.textAlign, underline: options.underline,
    });
    fc.add(text); fc.setActiveObject(text); fc.renderAll(); updateTexture(); onSaveHistory(); pushHistory();
  }, [updateTexture, onSaveHistory, pushHistory]);

  const addTemplate = useCallback(async (lines: any[]) => {
    pauseAutoRotate();
    const fc = fabricCanvasRef.current;
    if (!fc) return;
    const { fabric } = await import("fabric");
    fc.getObjects().filter((o: any) => o.name === "template").forEach((o: any) => fc.remove(o));
    const maxW = TEX_SIZE * 0.6;
    const textObjs: any[] = [];
    for (const line of lines) {
      const tb = new fabric.Textbox(line.text, {
        width: maxW, originX: "center", originY: "top",
        fontFamily: line.font, fontSize: line.size * 1.1, fontWeight: line.weight,
        fontStyle: line.style || "normal", fill: line.color, textAlign: "center", name: "template",
      });
      textObjs.push(tb);
    }
    const gap = 20;
    const heights = textObjs.map(t => t.getScaledHeight());
    const totalH = heights.reduce((a,b)=>a+b,0) + gap*(textObjs.length-1);
    let currentY = TEX_SIZE/2 - totalH/2;
    textObjs.forEach((tb, i) => {
      tb.set({ left: TEX_SIZE/2, top: currentY }); fc.add(tb); currentY += heights[i] + gap;
    });
    if (textObjs.length>0) fc.setActiveObject(textObjs[0]);
    fc.renderAll(); updateTexture(); onSaveHistory(); pushHistory();
  }, [updateTexture, onSaveHistory, pauseAutoRotate, pushHistory]);

  const clearTemplates = useCallback(() => {
    const fc = fabricCanvasRef.current;
    if (!fc) return;
    fc.getObjects().filter((o: any) => o.name === "template").forEach((o: any) => fc.remove(o));
    fc.renderAll(); updateTexture();
  }, [updateTexture]);

  const deleteSelected = useCallback(() => {
    pauseAutoRotate();
    const fc = fabricCanvasRef.current;
    if (!fc) return;
    const obj = fc.getActiveObject();
    if (obj) { fc.remove(obj); fc.renderAll(); updateTexture(); onSaveHistory(); pushHistory(); onSelectObject(null); }
  }, [updateTexture, onSaveHistory, onSelectObject, pauseAutoRotate, pushHistory]);

  const duplicateSelected = useCallback(() => {
    pauseAutoRotate();
    const fc = fabricCanvasRef.current;
    if (!fc) return;
    const obj = fc.getActiveObject();
    if (!obj) return;
    obj.clone((cloned: any) => {
      cloned.set({ left: (obj.left ?? 0) + 30, top: (obj.top ?? 0) + 30 });
      fc.add(cloned); fc.setActiveObject(cloned); fc.renderAll(); updateTexture(); onSaveHistory(); pushHistory();
    });
  }, [updateTexture, onSaveHistory, pauseAutoRotate, pushHistory]);

  const exportDesign = useCallback(() => {
    if (rendererRef.current && sceneRef.current && cameraRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
      return rendererRef.current.domElement.toDataURL("image/png");
    }
    return "";
  }, []);

  const toggleAutoRotate = useCallback(() => {
    const n = !isAuto; isAutoRef.current = n; setIsAuto(n);
  }, [isAuto]);

  useImperativeHandle(ref, () => ({
    addImage, addText, addTemplate, clearTemplates, deleteSelected, duplicateSelected,
    exportDesign, toggleAutoRotate, pauseAutoRotate, undo, redo, pushHistory,
    getActiveObject: () => fabricCanvasRef.current?.getActiveObject(),
    getFabricCanvas: () => fabricCanvasRef.current,
    updateTexture,
  }));

  return (
    <div className="relative w-full h-full flex items-center justify-center" style={{ background: "#0a0a12" }}>
      <div ref={mountRef} style={{ width: "100%", height: "100%" }} />

      {/* Visible Fabric.js overlay — positioned over the chest print area so users can
          directly drag/resize/rotate their design elements while seeing the 3D shirt behind it. */}
      <div
        className="absolute pointer-events-auto"
        style={{
          width: "28%",
          aspectRatio: "1 / 1",
          top: "34%",
          left: "50%",
          transform: "translateX(-50%)",
          border: "1.5px dashed rgba(147,112,219,0.45)",
          borderRadius: 8,
          overflow: "visible",
        }}
      >
        <canvas
          ref={(el) => {
            if (el && fabricOverlayElRef.current !== el) {
              fabricOverlayElRef.current = el;
            }
          }}
          style={{ width: "100%", height: "100%", display: isReady ? "block" : "none" }}
        />
      </div>

      {!isReady && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>Loading 3D shirt…</p>
        </div>
      )}
    </div>
  );
});

Live3DCanvas.displayName = "Live3DCanvas";