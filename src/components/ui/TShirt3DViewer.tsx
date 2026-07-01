"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, X, RotateCcw } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  designDataUrl: string;
  shirtColor: string;
  shirtStyle: string;
}

const VIEWS = [
  { id: "front", label: "Front",      angle: 0     },
  { id: "tql",   label: "¾ Left",     angle: 0.55  },
  { id: "left",  label: "Left Side",  angle: 1.45  },
  { id: "back",  label: "Back",       angle: 3.14  },
  { id: "right", label: "Right Side", angle: -1.45 },
  { id: "tqr",   label: "¾ Right",    angle: -0.55 },
];

export function TShirt3DViewer({ isOpen, onClose, designDataUrl, shirtColor, shirtStyle }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const rendererRef = useRef<any>(null);
  const modelRef = useRef<any>(null);
  const bodyMeshRef = useRef<any>(null);
  const decalMeshRef = useRef<any>(null);
  const controlsRef = useRef<any>(null);
  const rafRef = useRef<number>(0);
  const isAutoRef = useRef(false);
  const threeRef = useRef<any>(null);

  const [viewIdx, setViewIdx] = useState(0);
  const [isAuto, setIsAuto] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // ───────────────────────────────────────────────────────────
  // Build the t-shirt as a single flat-front "billboard plane"
  // shaped like a t-shirt silhouette (ExtrudeGeometry from a 2D
  // shape, same outline as the 2D editor), extruded with depth
  // and rounded bevel edges. This is simple, always connects
  // correctly (sleeves are part of the SAME continuous outline,
  // not separate floating meshes), and reliably looks like a shirt
  // from every angle.
  // ───────────────────────────────────────────────────────────
  const buildShirt = useCallback((THREE: any, style: string) => {
    const group = new THREE.Group();

    const mat = new THREE.MeshStandardMaterial({
      roughness: 0.85,
      metalness: 0.02,
      side: THREE.DoubleSide,
    });

    // 2D t-shirt silhouette in a local coordinate system, traced as ONE
    // continuous outline (body + both sleeves + collar) so nothing floats apart.
    const shape = new THREE.Shape();
    const isVNeck = style === "vneck";

    // Coordinates roughly match a real shirt silhouette, centered at origin.
    // Units are arbitrary "shirt space" — scaled down at the end.
    shape.moveTo(-22, 96);              // left shoulder top
    shape.lineTo(-10, 96);              // toward collar
    if (isVNeck) {
      shape.lineTo(0, 70);              // V dip
      shape.lineTo(10, 96);
    } else {
      shape.quadraticCurveTo(0, 82, 10, 96); // crew curve
    }
    shape.lineTo(22, 96);               // right shoulder top
    shape.lineTo(58, 60);               // right sleeve outer-top
    shape.lineTo(46, 46);               // right sleeve outer-bottom (armpit notch)
    shape.lineTo(34, 70);               // back toward body under arm
    shape.lineTo(34, -96);              // down right side seam
    shape.lineTo(-34, -96);             // bottom hem
    shape.lineTo(-34, 70);              // up left side seam
    shape.lineTo(-46, 46);              // left sleeve outer-bottom
    shape.lineTo(-58, 60);              // left sleeve outer-top
    shape.closePath();

    const extrudeSettings = {
      depth: 14,
      bevelEnabled: true,
      bevelThickness: 2.2,
      bevelSize: 1.8,
      bevelSegments: 6,
      curveSegments: 28,
    };

    const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geo.center();
    geo.computeVertexNormals();

    // Generate clean planar UVs (front-facing projection) so the design
    // texture maps predictably onto the front face without distortion.
    geo.computeBoundingBox();
    const bb = geo.boundingBox;
    const uvAttr = geo.attributes.uv;
    const posAttr = geo.attributes.position;
    const w = bb.max.x - bb.min.x;
    const h = bb.max.y - bb.min.y;
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i), y = posAttr.getY(i);
      uvAttr.setXY(i, (x - bb.min.x) / w, (y - bb.min.y) / h);
    }
    uvAttr.needsUpdate = true;

    // Scale to scene units
    geo.scale(0.011, 0.011, 0.011);

    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = "body";
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    bodyMeshRef.current = mesh;

    // Collar ring detail sitting slightly in front of the neck opening
    if (!isVNeck) {
      const collarGeo = new THREE.TorusGeometry(0.135, 0.012, 8, 32, Math.PI * 1.5);
      const collarMesh = new THREE.Mesh(collarGeo, mat.clone());
      collarMesh.name = "collar";
      collarMesh.position.set(0, 1.04, 0.09);
      collarMesh.rotation.z = Math.PI * 1.25;
      collarMesh.rotation.x = 0.15;
      collarMesh.castShadow = true;
      group.add(collarMesh);
    }

    return group;
  }, []);

  const applyMaterials = useCallback(async (THREE: any, group: any, color: string, dataUrl: string) => {
    const r = parseInt(color.slice(1,3),16)/255;
    const g = parseInt(color.slice(3,5),16)/255;
    const b = parseInt(color.slice(5,7),16)/255;
    const colorObj = new THREE.Color(r, g, b);

    group.traverse((child: any) => {
      if (child.isMesh && child.material && child.name !== "decal") {
        child.material.color = colorObj.clone();
        child.material.needsUpdate = true;
      }
    });

    // Remove any previous decal
    if (decalMeshRef.current) {
      group.remove(decalMeshRef.current);
      decalMeshRef.current.geometry.dispose();
      decalMeshRef.current.material.dispose();
      decalMeshRef.current = null;
    }

    if (dataUrl && bodyMeshRef.current) {
      const { DecalGeometry } = await import("three/examples/jsm/geometries/DecalGeometry.js" as any);
      const loader = new THREE.TextureLoader();
      loader.load(dataUrl, (tex: any) => {
        tex.wrapS = THREE.ClampToEdgeWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
        try { tex.colorSpace = THREE.SRGBColorSpace; } catch {}
        tex.anisotropy = 8;
        tex.needsUpdate = true;

        // Project the decal straight onto the front face of the shirt body.
        // Position: slightly in front of mesh surface at chest height.
        // Orientation: facing +Z (toward camera/front).
        // Size: width, height, depth of the projection box.
        const position = new THREE.Vector3(0, 0.05, 0.13);
        const orientation = new THREE.Euler(0, 0, 0);
        const size = new THREE.Vector3(0.62, 0.62, 0.5);

        const decalGeo = new DecalGeometry(bodyMeshRef.current, position, orientation, size);
        const decalMat = new THREE.MeshStandardMaterial({
          map: tex,
          transparent: true,
          depthTest: true,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -4,
          roughness: 0.85,
          metalness: 0.0,
        });
        const decalMesh = new THREE.Mesh(decalGeo, decalMat);
        decalMesh.name = "decal";
        group.add(decalMesh);
        decalMeshRef.current = decalMesh;
      });
    }
  }, []);

  useEffect(() => {
    if (!isOpen || !mountRef.current) return;
    let mounted = true;

    const init = async () => {
      const THREE = await import("three");
      const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js" as any);
      threeRef.current = THREE;

      if (!mounted || !mountRef.current) return;
      const W = mountRef.current.clientWidth || 640;
      const H = mountRef.current.clientHeight || 480;

      const scene = new THREE.Scene();
      sceneRef.current = scene;

      const camera = new THREE.PerspectiveCamera(28, W / H, 0.1, 100);
      camera.position.set(0, 0.0, 3.0);
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
      key.shadow.bias = -0.0015;
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
        uniforms: {
          topColor: { value: new THREE.Color(0x1e1545) },
          bottomColor: { value: new THREE.Color(0x07060f) },
        },
        vertexShader: `varying vec3 vWorldPos; void main(){ vec4 wp = modelMatrix * vec4(position,1.0); vWorldPos = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`,
        fragmentShader: `varying vec3 vWorldPos; uniform vec3 topColor; uniform vec3 bottomColor;
          void main(){ float h = normalize(vWorldPos).y * 0.5 + 0.5; gl_FragColor = vec4(mix(bottomColor, topColor, h), 1.0); }`,
      });
      scene.add(new THREE.Mesh(bgGeo, bgMat));

      const floorGeo = new THREE.PlaneGeometry(14, 14);
      const floorMat = new THREE.ShadowMaterial({ opacity: 0.35 });
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

      const model = buildShirt(THREE, shirtStyle);
      applyMaterials(THREE, model, shirtColor, designDataUrl);
      scene.add(model);
      modelRef.current = model;
      setIsLoading(false);

      const animate = () => {
        rafRef.current = requestAnimationFrame(animate);
        if (isAutoRef.current && modelRef.current) {
          modelRef.current.rotation.y += 0.008;
        }
        controls.update();
        renderer.render(scene, camera);
      };
      animate();

      const onResize = () => {
        if (!mountRef.current) return;
        const w = mountRef.current.clientWidth, h = mountRef.current.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };
      window.addEventListener("resize", onResize);
      return () => window.removeEventListener("resize", onResize);
    };

    init();

    return () => {
      mounted = false;
      cancelAnimationFrame(rafRef.current);
      if (rendererRef.current) {
        rendererRef.current.dispose();
        if (mountRef.current && rendererRef.current.domElement.parentNode === mountRef.current) {
          mountRef.current.removeChild(rendererRef.current.domElement);
        }
      }
      modelRef.current = null;
      bodyMeshRef.current = null;
      decalMeshRef.current = null;
      cameraRef.current = null;
      controlsRef.current = null;
      rendererRef.current = null;
      sceneRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, shirtStyle]);

  useEffect(() => {
    if (!modelRef.current || !threeRef.current) return;
    applyMaterials(threeRef.current, modelRef.current, shirtColor, designDataUrl);
  }, [shirtColor, designDataUrl, applyMaterials]);

  const goTo = useCallback((i: number) => {
    setViewIdx(i);
    isAutoRef.current = false;
    setIsAuto(false);
    if (!modelRef.current) return;
    const target = VIEWS[i].angle;
    const start = modelRef.current.rotation.y;
    let t = 0;
    const anim = () => {
      t += 0.06;
      if (t >= 1) { modelRef.current.rotation.y = target; return; }
      modelRef.current.rotation.y = start + (target - start) * (1 - Math.pow(1 - t, 3));
      requestAnimationFrame(anim);
    };
    anim();
  }, []);

  const resetView = () => {
    if (cameraRef.current) cameraRef.current.position.set(0, 0.0, 3.0);
    if (controlsRef.current) controlsRef.current.reset();
    goTo(0);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3"
      style={{ background: "rgba(0,0,0,0.92)", backdropFilter: "blur(16px)" }}>
      <div className="w-full flex flex-col rounded-3xl overflow-hidden"
        style={{ maxWidth: 860, maxHeight: "94vh", background: "linear-gradient(160deg,#110d24 0%,#0c0c1a 60%,#070710 100%)", border: "1px solid rgba(255,255,255,0.09)", boxShadow: "0 32px 100px rgba(0,0,0,0.85)" }}>

        <div className="flex items-center gap-3 px-5 py-4 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-[13px] text-white shrink-0"
            style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)" }}>3D</div>
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold text-[14px]">360° 3D Shirt Preview</h3>
            <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>
              Drag to orbit · Scroll to zoom · Pick a view
            </p>
          </div>
          <div className="px-3 py-1 rounded-full text-[12px] font-medium shrink-0"
            style={{ background: "rgba(124,58,237,0.2)", border: "0.5px solid rgba(124,58,237,0.4)", color: "#c4b5fd" }}>
            {VIEWS[viewIdx].label}
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.5)", border: "0.5px solid rgba(255,255,255,0.1)" }}>
            <X size={15} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden" style={{ minHeight: 0 }}>
          <div className="flex-1 relative overflow-hidden"
            style={{ background: "#0a0a14", minHeight: 420 }}>
            <div ref={mountRef} style={{ width: "100%", height: "100%", minHeight: 420 }} />

            {isLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10">
                <div className="w-10 h-10 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>Building shirt model…</p>
              </div>
            )}

            {!isLoading && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none select-none px-3 py-1.5 rounded-full text-[11px]"
                style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)", border: "0.5px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.38)" }}>
                🖱 Drag to orbit · Scroll to zoom
              </div>
            )}

            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3 py-2 rounded-2xl"
              style={{ background: "rgba(6,6,18,0.82)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.09)" }}>
              <button onClick={() => goTo((viewIdx + VIEWS.length - 1) % VIEWS.length)} className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.07)", border: "0.5px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.65)" }}>
                <ChevronLeft size={15} />
              </button>
              <button onClick={() => { const n = !isAuto; isAutoRef.current = n; setIsAuto(n); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold"
                style={isAuto
                  ? { background: "rgba(124,58,237,0.5)", border: "1px solid rgba(147,90,255,0.7)", color: "#ede9fe" }
                  : { background: "rgba(255,255,255,0.08)", border: "0.5px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.75)" }}>
                {isAuto ? <><Pause size={12} />&nbsp;Stop</> : <><Play size={12} />&nbsp;Auto Rotate</>}
              </button>
              <button onClick={() => goTo((viewIdx + 1) % VIEWS.length)} className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.07)", border: "0.5px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.65)" }}>
                <ChevronRight size={15} />
              </button>
              <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.1)" }} />
              <button onClick={() => { if (cameraRef.current) cameraRef.current.position.z = Math.max(1.6, cameraRef.current.position.z - 0.3); }}
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.07)", border: "0.5px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.65)" }}>
                <ZoomIn size={14} />
              </button>
              <button onClick={() => { if (cameraRef.current) cameraRef.current.position.z = Math.min(5.5, cameraRef.current.position.z + 0.3); }}
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.07)", border: "0.5px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.65)" }}>
                <ZoomOut size={14} />
              </button>
              <button onClick={resetView} className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.07)", border: "0.5px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.65)" }}>
                <RotateCcw size={13} />
              </button>
            </div>
          </div>

          <div className="w-40 shrink-0 flex flex-col p-3 gap-1.5"
            style={{ borderLeft: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-[9px] font-bold uppercase tracking-widest px-1 mb-1"
              style={{ color: "rgba(255,255,255,0.22)" }}>Views</p>
            {VIEWS.map((v, i) => (
              <button key={v.id} onClick={() => goTo(i)}
                className="w-full py-2 px-2.5 rounded-xl text-[12px] font-medium text-left transition-all"
                style={{
                  background: viewIdx === i ? "rgba(124,58,237,0.28)" : "rgba(255,255,255,0.04)",
                  border: viewIdx === i ? "1px solid rgba(124,58,237,0.65)" : "0.5px solid rgba(255,255,255,0.07)",
                  color: viewIdx === i ? "#ddd6fe" : "rgba(255,255,255,0.45)",
                }}>
                {v.label}
              </button>
            ))}

            <div className="mt-auto pt-3 flex flex-col gap-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full shrink-0"
                  style={{ background: shirtColor, border: "1.5px solid rgba(255,255,255,0.2)", boxShadow: "0 2px 6px rgba(0,0,0,0.5)" }} />
                <div className="min-w-0">
                  <p className="text-[9px] font-mono truncate" style={{ color: "rgba(255,255,255,0.35)" }}>{shirtColor}</p>
                  <p className="text-[10px] capitalize font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>{shirtStyle}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 py-3 shrink-0"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          {VIEWS.map((_, i) => (
            <button key={i} onClick={() => goTo(i)}
              className="rounded-full transition-all"
              style={{ width: viewIdx === i ? 20 : 7, height: 7, background: viewIdx === i ? "#7c3aed" : "rgba(255,255,255,0.18)" }} />
          ))}
        </div>
      </div>
    </div>
  );
}