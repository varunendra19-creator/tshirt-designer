"use client";

import React, { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import { getModelPath } from "../../lib/garmentModels";

interface Live3DCanvasProps {
  shirtColor: string;
  shirtStyle: string;
  viewSide: "front" | "back";
  onSelectObject: (obj: any) => void;
  onSaveHistory: () => void;
}

const TEX_SIZE = 1024; // Higher resolution for sharp text on 3D plane

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
  const syncToTextureRef = useRef<(() => void) | null>(null);
  const historyStackRef = useRef<string[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const isRestoringRef = useRef<boolean>(false);
  const rafRef = useRef<number>(0);
  const threeRef = useRef<any>(null);
  const isAutoRef = useRef(false);

  const [isReady, setIsReady] = useState(false);
  const [isAuto, setIsAuto] = useState(false);
  const [isFrontFacing, setIsFrontFacing] = useState(true);

  // ── Load the real GLB shirt model from public/models/t_shirt.glb ──
  const loadShirt = useCallback(async (THREE: any, style: string, color: string) => {
    const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js" as any);
    const loader = new GLTFLoader();
    const modelPath = getModelPath(style);

    return new Promise<any>((resolve) => {
      loader.load(
        modelPath,
        (gltf: any) => {
          const model = gltf.scene;

          // Center and scale the model to fit the scene
          const box = new THREE.Box3().setFromObject(model);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);
          const targetSize = 2.2;
          const scale = targetSize / maxDim;

          model.scale.setScalar(scale);
          model.position.sub(center.multiplyScalar(scale));

          // Replace material entirely so color picker works even on baked-texture GLBs
          model.traverse((child: any) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
              // Replace with fresh MeshStandardMaterial — ignores any baked texture
              // so shirt color always updates correctly from the color picker
              child.material = new THREE.MeshStandardMaterial({
                color: new THREE.Color(color),
                roughness: 0.82,
                metalness: 0.02,
              });
              if (!bodyMeshRef.current) {
                bodyMeshRef.current = child;
              }
            }
          });

          resolve(model);
        },
        undefined,
        (err: any) => {
          console.error("GLB load failed, falling back to procedural geometry:", err);
          import("../../lib/buildShirtGeometry").then(({ buildShirtGroup }) => {
            const { group, bodyMesh } = buildShirtGroup(THREE, "classic");
            bodyMeshRef.current = bodyMesh;
            group.traverse((c: any) => {
              if (c.isMesh) { c.material.color = new THREE.Color(color); }
            });
            resolve(group);
          });
        }
      );
    });
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

    const targetEl = fabricOverlayElRef.current || document.createElement("canvas");

    const fc = new fabric.Canvas(targetEl, {
      width: TEX_SIZE,
      height: TEX_SIZE,
      backgroundColor: "transparent",
      preserveObjectStacking: true,
    });
    fabricCanvasRef.current = fc;

    // Wait for Fabric to initialize its internal canvases
    await new Promise(r => setTimeout(r, 100));

    // Use lowerCanvasEl DIRECTLY as the Three.js texture source.
    // No intermediate offscreen canvas — eliminates all copy/scale bugs.
    const lowerCanvas = fc.lowerCanvasEl;
    console.log("[ThreadCraft] Fabric lowerCanvasEl:", lowerCanvas?.width, "x", lowerCanvas?.height);

    (window as any).__fabricCanvas = fc;

    const tex = new THREE.CanvasTexture(lowerCanvas);
    tex.flipY = false;
    try { tex.colorSpace = THREE.SRGBColorSpace; } catch {}
    tex.anisotropy = 8;
    canvasTextureRef.current = tex;

    // syncToTexture: just mark the texture dirty — Three.js reads lowerCanvas each frame
    const syncToTexture = () => {
      if (canvasTextureRef.current) {
        canvasTextureRef.current.needsUpdate = true;
      }
    };
    syncToTextureRef.current = syncToTexture;
    (window as any).__fabricSyncFn = syncToTexture;

    fc.on("selection:created", (e: any) => { isAutoRef.current = false; setIsAuto(false); onSelectObject(e.selected?.[0]); });
    fc.on("selection:updated", (e: any) => { isAutoRef.current = false; setIsAuto(false); onSelectObject(e.selected?.[0]); });
    fc.on("selection:cleared", () => onSelectObject(null));
    fc.on("object:added", () => { fc.renderAll(); syncToTexture(); });
    fc.on("object:modified", () => { fc.renderAll(); syncToTexture(); onSaveHistory(); pushHistory(); });
    fc.on("object:moving", () => { isAutoRef.current = false; setIsAuto(false); syncToTexture(); });
    fc.on("object:scaling", () => { isAutoRef.current = false; setIsAuto(false); syncToTexture(); });
    fc.on("object:rotating", () => { isAutoRef.current = false; setIsAuto(false); syncToTexture(); });
    fc.on("after:render", syncToTexture);
    fc.on("mouse:down", () => { isAutoRef.current = false; setIsAuto(false); });

    return tex;
  }, [onSelectObject, onSaveHistory, pushHistory]);

  const updateTexture = useCallback(() => {
    const fc = fabricCanvasRef.current;
    if (fc) fc.renderAll();
    if (canvasTextureRef.current) {
      canvasTextureRef.current.needsUpdate = true;
    }
    if (rendererRef.current && sceneRef.current && cameraRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }
  }, []);

  // ── Attach the live texture as a decal on the shirt front ──
  const attachDecal = useCallback(async (THREE: any, group: any, tex: any) => {
    if (!bodyMeshRef.current) {
      console.error("[ThreadCraft] attachDecal: bodyMeshRef is null — plane not created!");
      return;
    }
    console.log("[ThreadCraft] attachDecal: creating plane mesh...");

    // Compute print area from actual mesh bounding box
    const box = new THREE.Box3().setFromObject(bodyMeshRef.current);
    const center = box.getCenter(new THREE.Vector3());
    const size3 = box.getSize(new THREE.Vector3());

    // Place a flat plane ON the shirt front face, parented to the group
    // so it rotates with the shirt automatically — no DecalGeometry needed
    // Model is normalized to 2.2 units tall — hardcode generous plane size
    const printW = 1.4;  // ~64% of 2.2 unit wide shirt
    const printH = 1.2;  // covers most of torso height
    const chestY = center.y - 0.1;
    const frontZ = box.max.z + 0.05;

    const planeGeo = new THREE.PlaneGeometry(printW, printH, 8, 8);
    const planeMat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      polygonOffset: false,
    });
    // Improve texture sharpness
    if (tex) {
      tex.anisotropy = 8;
      tex.needsUpdate = true;
    }
    const planeMesh = new THREE.Mesh(planeGeo, planeMat);
    planeMesh.name = "decal";
    planeMesh.position.set(center.x, chestY, frontZ);
    group.add(planeMesh);
    console.log("[ThreadCraft] Plane added at", center.x, chestY, frontZ, "size:", printW.toFixed(3), "x", printH.toFixed(3));
    console.log("[ThreadCraft] Texture source:", tex?.image?.width, "x", tex?.image?.height);
    (window as any).__decalMesh = planeMesh;
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

      const group = await loadShirt(THREE, shirtStyle, shirtColor);
      scene.add(group);
      groupRef.current = group;
      // Debug exposure
      (window as any).__threeGroup = group;
      (window as any).__threeScene = scene;
      (window as any).__threeRenderer = renderer;
      (window as any).__threeCamera = camera;

      // Model is always normalized to 2.2 units tall in loadShirt.
      // Fixed camera distance gives consistent framing for ALL models.
      const fov = camera.fov * (Math.PI / 180);
      const dist = (2.2 / 2) / Math.tan(fov / 2) * 1.55;
      camera.position.set(0, 0, dist);
      controls.target.set(0, 0, 0);
      controls.update();

      // Apply initial color
      group.traverse((c: any) => { if (c.isMesh && c.name !== "decal") { c.material.color = new THREE.Color(shirtColor); } });

      // Set ready FIRST so the overlay canvas div renders in DOM
      setIsReady(true);

      // Now wait for React to render the overlay canvas element
      await new Promise<void>(resolve => {
        if (fabricOverlayElRef.current) { resolve(); return; }
        const check = setInterval(() => {
          if (fabricOverlayElRef.current) { clearInterval(check); resolve(); }
        }, 50);
        setTimeout(() => { clearInterval(check); resolve(); }, 3000);
      });

      const tex = await initDrawSurface(THREE);
      await attachDecal(THREE, group, tex);

      // Reset and seed history with the empty-canvas baseline so undo can return to a blank state
      historyStackRef.current = [];
      historyIndexRef.current = -1;
      pushHistory();

      const animate = () => {
        rafRef.current = requestAnimationFrame(animate);
        if (isAutoRef.current && groupRef.current) groupRef.current.rotation.y += 0.006;
        // Sync fabric canvas to texture every frame
        if ((window as any).__fabricSyncFn) (window as any).__fabricSyncFn();
        if (canvasTextureRef.current) canvasTextureRef.current.needsUpdate = true;
        // Check if shirt is roughly facing front (rotation within ±60°)
        if (groupRef.current) {
          const rot = ((groupRef.current.rotation.y % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
          const facing = rot < Math.PI * 0.35 || rot > Math.PI * 1.65;
          setIsFrontFacing(facing);
        }
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
        fc.add(img); fc.setActiveObject(img); fc.renderAll(); updateTexture();
        setTimeout(() => updateTexture(), 50);
        onSaveHistory(); pushHistory();
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
      left: TEX_SIZE/2, top: TEX_SIZE/2, width: TEX_SIZE * 0.8, originX: "center", originY: "center",
      fontFamily: options.fontFamily, fontSize: options.fontSize * 5, fontWeight: options.fontWeight,
      fontStyle: options.fontStyle, fill: options.fill, textAlign: options.textAlign, underline: options.underline,
    });
    fc.add(text); fc.setActiveObject(text); fc.renderAll(); updateTexture();
    setTimeout(() => updateTexture(), 50);
    onSaveHistory(); pushHistory();
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
        fontFamily: line.font, fontSize: line.size * 5, fontWeight: line.weight,
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

  // Handle drop directly onto the 3D shirt canvas
  const handleCanvasDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData("text/plain");
    if (!raw) return;

    const fc = fabricCanvasRef.current;
    if (!fc) return;

    const canvasEl = mountRef.current;
    if (!canvasEl) return;
    const rect = canvasEl.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const dropX = ((e.clientX - rect.left) / rect.width) * TEX_SIZE * dpr;
    const dropY = ((e.clientY - rect.top) / rect.height) * TEX_SIZE * dpr;

    const sync = () => {
      fc.renderAll();
      if (syncToTextureRef.current) syncToTextureRef.current();
      // Also trigger after a frame to ensure GPU flush
      setTimeout(() => {
        fc.renderAll();
        if (syncToTextureRef.current) syncToTextureRef.current();
      }, 50);
    };

    try {
      const data = JSON.parse(raw);
      const { fabric } = await import("fabric");

      if (data.type === "text") {
        const text = new fabric.Textbox(data.content || "Text", {
          left: dropX,
          top: dropY,
          originX: "center",
          originY: "center",
          width: TEX_SIZE * 0.6 * (window.devicePixelRatio || 1),
          fontFamily: data.fontFamily || "Arial",
          fontSize: (data.fontSize || 80) * (window.devicePixelRatio || 1),
          fontWeight: data.fontWeight || "normal",
          fontStyle: data.fontStyle || "normal",
          fill: data.fill || "#ffffff",
          textAlign: data.textAlign || "center",
          underline: data.underline || false,
        });
        fc.add(text);
        fc.setActiveObject(text);
        sync();
        onSaveHistory();
        pushHistory();
      } else if (data.type === "image" && data.url) {
        fabric.Image.fromURL(data.url, (img: any) => {
          const maxSize = TEX_SIZE * 0.5;
          const scale = Math.min(maxSize / (img.width || 1), maxSize / (img.height || 1));
          img.set({ left: dropX, top: dropY, scaleX: scale, scaleY: scale, originX: "center", originY: "center" });
          fc.add(img);
          fc.setActiveObject(img);
          sync();
          onSaveHistory();
          pushHistory();
        });
      }
    } catch (err) {
      console.error("Drop error:", err);
    }
  }, [fabricCanvasRef, onSaveHistory, pushHistory]);

  return (
    <div
      className="relative w-full h-full"
      style={{ background: "#0a0a12" }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleCanvasDrop}
    >
      <div ref={mountRef} style={{ width: "100%", height: "100%" }} />

      {/* Hidden Fabric canvas — texture source only, never visible */}
      <div style={{ position: "absolute", top: -9999, left: -9999, pointerEvents: "none" }}>
        <canvas
          ref={(el) => { if (el && fabricOverlayElRef.current !== el) fabricOverlayElRef.current = el; }}
          width={TEX_SIZE}
          height={TEX_SIZE}
        />
      </div>

      {/* Drop hint — only shows when dragging over */}
      {isReady && isFrontFacing && (
        <div
          className="absolute inset-0 pointer-events-none flex items-center justify-center"
          style={{ opacity: 0 }}
          id="drop-hint"
        >
          <div style={{
            background: "rgba(124,58,237,0.2)", border: "2px dashed rgba(124,58,237,0.6)",
            borderRadius: 12, padding: "12px 24px", color: "#c4b5fd", fontSize: 14, fontWeight: 500,
          }}>
            Drop here to add to shirt
          </div>
        </div>
      )}

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