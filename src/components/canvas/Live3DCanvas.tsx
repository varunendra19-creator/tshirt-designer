"use client";

import React, { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import { RotateCcw } from "lucide-react";
import { getModelPath } from "../../lib/garmentModels";

interface Live3DCanvasProps {
  shirtColor: string;
  shirtStyle: string;
  viewSide: "front" | "back";
  onSelectObject: (obj: any) => void;
  onSaveHistory: () => void;
}

const TEX_SIZE = 1024; // Higher resolution for sharp text on 3D plane

// Every printable area on the garment. Each gets its own Fabric canvas, its own
// CanvasTexture and its own decal projected along its own axis, so a design placed on
// one area is completely independent of the others.
//   axis/dir  — the outward surface normal, i.e. which way the projector faces
//   yaw       — projector rotation about Y, so its +Z lines up with that normal
//   camera    — where to park the camera to look at this area straight on
export const PLACEMENTS = [
  { id: "front", label: "Front",        axis: "z" as const, dir:  1, yaw: 0 },
  { id: "back",  label: "Back",         axis: "z" as const, dir: -1, yaw: Math.PI },
  { id: "left",  label: "Left sleeve",  axis: "x" as const, dir: -1, yaw: -Math.PI / 2 },
  { id: "right", label: "Right sleeve", axis: "x" as const, dir:  1, yaw:  Math.PI / 2 },
];
export type PlacementId = (typeof PLACEMENTS)[number]["id"];

// Sleeves sit out past the torso on X. Rather than hard-code mesh names (they differ
// per GLB), split meshes by how far their centre is from the garment's mid-line.
function meshesForPlacement(THREE: any, group: any, spec: typeof PLACEMENTS[number]) {
  const whole = new THREE.Box3().setFromObject(group);
  const mid = whole.getCenter(new THREE.Vector3());
  const halfW = (whole.max.x - whole.min.x) / 2;
  const sleeveCut = halfW * 0.42;

  const torso: any[] = [];
  const sleeve: any[] = [];
  group.traverse((child: any) => {
    if (!child.isMesh || isDecalPart(child)) return;
    if (!child.geometry?.attributes?.position || !child.geometry?.attributes?.normal) return;
    const c = new THREE.Box3().setFromObject(child).getCenter(new THREE.Vector3());
    const offset = c.x - mid.x;
    if (spec.axis === "x") {
      // only the sleeve on the requested side
      if (Math.sign(offset) === spec.dir && Math.abs(offset) > sleeveCut) sleeve.push(child);
    } else if (Math.abs(offset) <= sleeveCut) {
      torso.push(child);
    }
  });
  return spec.axis === "x" ? sleeve : torso;
}

// Where a placement's print sits, how big it is, and which way it faces — all derived
// from the meshes that belong to it, so every GLB in the set behaves the same.
function placementFrame(THREE: any, group: any, spec: typeof PLACEMENTS[number], meshes: any[]) {
  const box = new THREE.Box3();
  for (const m of meshes) box.union(new THREE.Box3().setFromObject(m));
  if (box.isEmpty()) return null;

  const c = box.getCenter(new THREE.Vector3());
  const s = box.getSize(new THREE.Vector3());
  const outward = new THREE.Vector3(
    spec.axis === "x" ? spec.dir : 0,
    0,
    spec.axis === "z" ? spec.dir : 0
  );

  let printW: number, printH: number, depth: number, pos: any;
  if (spec.axis === "z") {
    // Chest / back panel: wide print, sat above the vertical centre
    printW = s.x * 0.62;
    printH = printW * 0.75;
    depth = s.z * 2;
    pos = new THREE.Vector3(c.x, c.y + s.y * 0.18, c.z);
  } else {
    // Sleeve: seen side-on, so the print's width runs along world Z and its height
    // along world Y. Kept small — there is very little flat area to print on.
    printW = s.z * 0.5;
    printH = s.y * 0.4;
    depth = s.x * 2;
    pos = new THREE.Vector3(c.x, c.y + s.y * 0.05, c.z);
  }

  return { pos, outward, printW, printH, depth, euler: new THREE.Euler(0, spec.yaw, 0) };
}

// The garment body, not whichever mesh the GLB happened to list first — that could be
// a collar or a sleeve, which would put the print in the wrong place and make the
// decal projection miss the torso entirely.
// A box projector has no notion of "front": it happily paints the back panels and the
// undersides of the sleeves too, where the artwork shows through mirrored. Keep only
// triangles whose surface actually turns towards the projector (+Z world).
// DecalGeometry emits world-space normals, so a plain z test is enough.
function cullBackFacingTriangles(THREE: any, geo: any, outward: any, minDot = 0.15) {
  const pos = geo.attributes?.position;
  const nor = geo.attributes?.normal;
  if (!pos || !nor) return geo;
  const uv = geo.attributes?.uv;
  const P: number[] = [], N: number[] = [], U: number[] = [];

  for (let i = 0; i < pos.count; i += 3) {
    const nx = (nor.getX(i) + nor.getX(i + 1) + nor.getX(i + 2)) / 3;
    const ny = (nor.getY(i) + nor.getY(i + 1) + nor.getY(i + 2)) / 3;
    const nz = (nor.getZ(i) + nor.getZ(i + 1) + nor.getZ(i + 2)) / 3;
    // Face the placement's own outward direction, not always +Z — the back panel and
    // each sleeve print outward along a different axis.
    if (nx * outward.x + ny * outward.y + nz * outward.z < minDot) continue;
    for (let k = 0; k < 3; k++) {
      P.push(pos.getX(i + k), pos.getY(i + k), pos.getZ(i + k));
      N.push(nor.getX(i + k), nor.getY(i + k), nor.getZ(i + k));
      if (uv) U.push(uv.getX(i + k), uv.getY(i + k));
    }
  }

  if (P.length === 0) return null;
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
  out.setAttribute("normal", new THREE.Float32BufferAttribute(N, 3));
  if (U.length) out.setAttribute("uv", new THREE.Float32BufferAttribute(U, 2));
  return out;
}

// The decal is a Group of per-mesh pieces, so a bare `name !== "decal"` test misses
// its children. Walk up instead: anything under the decal must never be recoloured by
// the garment colour, or the artwork gets the shirt's tint multiplied into it.
function isDecalPart(obj: any) {
  for (let o = obj; o; o = o.parent) if (o.name === "decal") return true;
  return false;
}

function pickLargestMesh(root: any) {
  let best: any = null;
  let bestVolume = -1;
  root.traverse((child: any) => {
    if (!child.isMesh || !child.geometry?.attributes?.position) return;
    if (!child.geometry.boundingBox) child.geometry.computeBoundingBox();
    const bb = child.geometry.boundingBox;
    if (!bb) return;
    const volume = (bb.max.x - bb.min.x) * (bb.max.y - bb.min.y) * (bb.max.z - bb.min.z);
    if (volume > bestVolume) { bestVolume = volume; best = child; }
  });
  return best;
}

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
  const overlayResizeObsRef = useRef<any>(null);
  const decalMeshRef = useRef<any>(null);
  const decalAnchorRef = useRef<{ obj: any; hw: number; hh: number } | null>(null);
  const overlayBoxRef = useRef<HTMLDivElement | null>(null);
  const isFrontFacingRef = useRef(true);
  const isPointerDownRef = useRef(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cleanupGestureRef = useRef<(() => void) | null>(null);
  const faceFrontRef = useRef<(() => void) | null>(null);
  const stepViewAnimRef = useRef<(() => void) | null>(null);
  const editHintRef = useRef<HTMLButtonElement | null>(null);
  const fitOverlayRef = useRef<(() => void) | null>(null);
  const lastOverlayRectRef = useRef({ x: 0, y: 0, w: 0, h: 0 });

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
              // Apply color tint while keeping original texture
              if (child.material) {
                const mats = Array.isArray(child.material) ? child.material : [child.material];
                mats.forEach((mat: any) => {
                  mat.color = new THREE.Color(color);
                  mat.needsUpdate = true;
                });
              }
              if (!bodyMeshRef.current) bodyMeshRef.current = child;
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
      // No marquee selection: a drag starting on blank print area must fall through
      // to OrbitControls and turn the shirt, not rubber-band a selection box.
      selection: false,
    });
    fabricCanvasRef.current = fc;

    // Wait for Fabric to initialize its internal canvases
    await new Promise(r => setTimeout(r, 100));

    // Use lowerCanvasEl DIRECTLY as the Three.js texture source.
    // No intermediate offscreen canvas — eliminates all copy/scale bugs.
    const lowerCanvas = (fc as any).lowerCanvasEl;
    console.log("[ThreadCraft] Fabric lowerCanvasEl:", lowerCanvas?.width, "x", lowerCanvas?.height);

    // This canvas is the texture SOURCE, not a display layer. Hiding it visually
    // leaves its bitmap untouched, so the texture still samples it — the design is
    // then only ever seen painted on the garment, where it rotates and shades with
    // the mesh. Leaving it visible drew a second, flat, screen-aligned copy on top,
    // which is what made the artwork look like a separate sticker floating over the
    // shirt instead of printed on it. The upper canvas (selection handles) stays
    // visible so the design is still directly editable.
    lowerCanvas.style.visibility = "hidden";

    (window as any).__fabricCanvas = fc;

    const tex = new THREE.CanvasTexture(lowerCanvas);
    tex.flipY = true;
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

    // Shrink the overlay's CSS box down from texture resolution (1024) to the size of
    // the print-area div, so the editable layer lines up with the decal on the shirt
    // instead of being drawn over the whole viewport as a second copy of the design.
    //
    // Fabric inserts its own .canvas-container wrapper around our canvas, and that
    // wrapper is already sized 1024px — so we must measure the wrapper's PARENT (the
    // styled print-area div). Measuring wrapperEl itself reads back Fabric's own 1024
    // and the resize silently no-ops.
    // Match the overlay's CSS box to the print area. The box is explicitly sized in px
    // by syncOverlayToDecal (below), so reading back both dimensions is safe — its size
    // no longer depends on its content. The box tracks the decal's 4:3 projection while
    // the Fabric coordinate space stays square, which is exactly the squash the square
    // texture undergoes on the plane.
    //
    // Do NOT use fc.setDimensions({...}, { cssOnly: true }) here. That helper re-runs
    // _initRetinaScaling, which re-assigns the canvas width/height ATTRIBUTES — and
    // assigning those wipes the bitmap. With cssOnly it then skips the re-render, so
    // the artwork silently vanishes. Orbiting resizes this box every frame, so that
    // path erased the design continuously. Setting the styles directly touches no
    // backing store; calcOffset keeps Fabric's pointer mapping aligned with the box.
    const fitOverlayToPrintArea = () => {
      const box = (fc as any).wrapperEl?.parentElement;
      if (!box) return;
      const rect = box.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const wPx = `${rect.width}px`;
      const hPx = `${rect.height}px`;
      for (const el of [(fc as any).lowerCanvasEl, (fc as any).upperCanvasEl, (fc as any).wrapperEl]) {
        if (!el) continue;
        el.style.width = wPx;
        el.style.height = hPx;
      }
      fc.calcOffset();
    };
    fitOverlayRef.current = fitOverlayToPrintArea;
    fitOverlayToPrintArea();

    // The print area is sized in % of the viewport, so re-fit whenever it changes
    const printBox = (fc as any).wrapperEl?.parentElement;
    if (printBox && typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(fitOverlayToPrintArea);
      ro.observe(printBox);
      overlayResizeObsRef.current = ro;
    }

    fc.on("selection:created", (e: any) => { isAutoRef.current = false; setIsAuto(false); onSelectObject(e.selected?.[0]); });
    fc.on("selection:updated", (e: any) => { isAutoRef.current = false; setIsAuto(false); onSelectObject(e.selected?.[0]); });
    fc.on("selection:cleared", () => onSelectObject(null));
    fc.on("object:added", () => { fc.renderAll(); syncToTexture(); });
    fc.on("object:modified", () => { fc.renderAll(); syncToTexture(); onSaveHistory(); pushHistory(); });
    // Report the object on every transform tick as well as on selection, so the
    // properties panel's X/Y/W/H/angle track the drag live instead of showing the
    // values from whenever the object was last selected.
    fc.on("object:moving", () => { isAutoRef.current = false; setIsAuto(false); syncToTexture(); onSelectObject(fc.getActiveObject()); });
    fc.on("object:scaling", () => { isAutoRef.current = false; setIsAuto(false); syncToTexture(); onSelectObject(fc.getActiveObject()); });
    fc.on("object:rotating", () => { isAutoRef.current = false; setIsAuto(false); syncToTexture(); onSelectObject(fc.getActiveObject()); });
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

  // ── Project ONE placement's texture onto the garment ──
  // Returns the decal group plus an invisible anchor carrying the flat print rectangle
  // that syncOverlayToDecal projects to position the editing overlay.
  const buildDecalFor = useCallback(async (THREE: any, group: any, spec: any, tex: any) => {
    // Matrices must be current, or setFromObject reports stale local bounds instead of
    // on-screen world bounds (nothing has rendered at this point).
    group.updateWorldMatrix(true, true);

    const meshes = meshesForPlacement(THREE, group, spec);
    if (!meshes.length) {
      console.warn(`[ThreadCraft] ${spec.id}: no meshes matched, skipping placement`);
      return null;
    }
    const frame = placementFrame(THREE, group, spec, meshes);
    if (!frame) return null;

    const { pos, outward, printW, printH, depth, euler } = frame;
    // Local units are multiplied by the group's normalising scale (~3x) on the way to
    // world space — divide it out or the print area balloons past the whole garment.
    const groupScale = group.getWorldScale(new THREE.Vector3()).x || 1;

    if (tex) { tex.anisotropy = 8; tex.needsUpdate = true; }

    // The projector box must be centred ON the garment and deep enough to swallow the
    // whole panel. Sat just outside the surface with shallow depth it clips everything
    // but the frontmost sliver, and the decal then samples a narrow strip of texture.
    const projectorSize = new THREE.Vector3(printW, printH, depth);
    const projectorBox = new THREE.Box3().setFromCenterAndSize(pos, projectorSize);

    const decalMat = new THREE.MeshStandardMaterial({
      map: tex, transparent: true, roughness: 0.85, metalness: 0.02,
      depthTest: true, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
    });

    let decalMesh: any = null;
    try {
      const { DecalGeometry } = await import("three/examples/jsm/geometries/DecalGeometry.js" as any);
      const container = new THREE.Group();
      const groupInverse = new THREE.Matrix4().copy(group.matrixWorld).invert();

      for (const child of meshes) {
        if (!new THREE.Box3().setFromObject(child).intersectsBox(projectorBox)) continue;
        const geo = new DecalGeometry(child, pos, euler, projectorSize);
        if (!geo.attributes?.position?.count) { geo.dispose?.(); continue; }
        // Drop the far side of the panel, where the print would show through mirrored.
        const facing = cullBackFacingTriangles(THREE, geo, outward);
        geo.dispose?.();
        if (!facing) continue;
        // DecalGeometry emits WORLD-space vertices. Bake the group's inverse transform
        // in so the decal can be parented to the group and still follow it when it turns.
        facing.applyMatrix4(groupInverse);
        const piece = new THREE.Mesh(facing, decalMat);
        // MUST be named "decal": the shirt-colour effect tints every mesh that isn't,
        // which would multiply the garment colour into the artwork.
        piece.name = "decal";
        container.add(piece);
      }
      if (container.children.length > 0) decalMesh = container;
    } catch (err) {
      console.warn("[ThreadCraft] DecalGeometry unavailable, falling back to plane:", err);
    }

    // Fallback flat plane for meshes the projector can't handle. Still depth-tested so
    // it cannot float over the garment.
    if (!decalMesh) {
      decalMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(printW / groupScale, printH / groupScale, 8, 8),
        new THREE.MeshBasicMaterial({
          map: tex, transparent: true, depthTest: true, depthWrite: false,
          polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
        })
      );
      decalMesh.position.copy(group.worldToLocal(pos.clone().add(outward.clone().multiplyScalar(depth * 0.01))));
      decalMesh.rotation.y = spec.yaw;
      console.log(`[ThreadCraft] ${spec.id}: using fallback plane decal`);
    }

    decalMesh.name = "decal";
    group.add(decalMesh);

    const anchor = new THREE.Object3D();
    anchor.name = "decal-anchor";
    anchor.position.copy(group.worldToLocal(pos.clone()));
    anchor.rotation.y = spec.yaw;   // so its local +Z is this placement's outward normal
    group.add(anchor);

    console.log(`[ThreadCraft] ${spec.id}: decal on ${decalMesh.children?.length ?? 1} mesh(es), print ${printW.toFixed(2)}x${printH.toFixed(2)}`);

    return {
      decal: decalMesh,
      anchor,
      hw: printW / groupScale / 2,
      hh: printH / groupScale / 2,
    };
  }, []);

  // Builds the FRONT placement only. Back and sleeves additionally need one Fabric
  // canvas + CanvasTexture each; buildDecalFor is already generic over the PLACEMENTS
  // table, so the 3D half of multi-placement is done — see CLAUDE.md "Multi-placement".
  const attachDecal = useCallback(async (THREE: any, group: any, tex: any) => {
    // Dev-mode remounts can run this more than once against the scene. Drop any decal
    // or anchor from a previous pass, or stale anchors accumulate and the render loop
    // measures "is the print facing the camera?" against the wrong one.
    for (const stale of group.children.filter((c: any) => c.name === "decal" || c.name === "decal-anchor")) {
      stale.traverse?.((m: any) => m.geometry?.dispose?.());
      group.remove(stale);
    }

    const spec = PLACEMENTS.find(p => p.id === "front")!;
    const built = await buildDecalFor(THREE, group, spec, tex);
    if (!built) return;

    decalMeshRef.current = built.decal;
    decalAnchorRef.current = { obj: built.anchor, hw: built.hw, hh: built.hh };
    (window as any).__decalMesh = built.decal;
  }, [buildDecalFor]);

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

      // Attach to the CONTAINER, not the WebGL canvas. The editing overlay is a sibling
      // of the renderer canvas, so pointer events on it never reach the renderer — but
      // they do bubble to the container. Listening there lets a drag that started over
      // the print area still orbit the shirt, which is what makes dragging reliable
      // instead of depending on the pointer having hovered the right pixel first.
      const controls = new OrbitControls(camera, containerRef.current ?? renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.enablePan = false;
      controls.minDistance = 1.6;
      controls.maxDistance = 5.5;
      controls.maxPolarAngle = Math.PI * 0.72;
      controls.minPolarAngle = Math.PI * 0.28;
      controlsRef.current = controls;
      (window as any).__threeControls = controls;   // debug handle, like __threeScene etc.

      // Decide "move a design" vs "turn the shirt" on the way DOWN, before either
      // library reacts. Ordering makes anything later unreliable: OrbitControls binds
      // `pointerdown` on the container while Fabric binds `mousedown` on the overlay,
      // and pointerdown fires first — so OrbitControls would claim the gesture (and
      // capture the pointer) before Fabric ever saw the press. That is what made
      // dragging a design work only sometimes. A capture-phase listener runs ahead of
      // both, so one hit test at the press point settles it every time.
      const decideGesture = (e: PointerEvent) => {
        // Controls floating over the canvas ("Face front to edit") are UI, not garment:
        // without this the press starts an orbit and the button never registers.
        const el = e.target as HTMLElement | null;
        if (el?.closest?.("button, input, select, textarea, a, [role='button']")) {
          controls.enabled = false;
          return;
        }
        const fabric = fabricCanvasRef.current;
        if (!fabric || !isFrontFacingRef.current) { controls.enabled = true; return; }
        const r = (fabric as any).wrapperEl?.getBoundingClientRect();
        if (!r?.width || !r?.height) { controls.enabled = true; return; }
        const x = ((e.clientX - r.left) / r.width) * TEX_SIZE;
        const y = ((e.clientY - r.top) / r.height) * TEX_SIZE;
        const onDesign = fabric.getObjects().some(
          (o: any) => o.visible !== false && o.containsPoint({ x, y })
        );
        controls.enabled = !onDesign;
      };
      // Swing the camera back to dead-front. Editing is only possible while the print
      // faces you, so without a way back a single drag leaves the design unreachable —
      // which reads as "editing randomly stopped working".
      let viewAnim: { from: any; to: any; t0: number; dur: number } | null = null;
      faceFrontRef.current = () => {
        if (groupRef.current) groupRef.current.rotation.y = 0;
        isAutoRef.current = false;
        setIsAuto(false);
        const dist = camera.position.length() || 5.5;
        viewAnim = {
          from: camera.position.clone(),
          to: new THREE.Vector3(0, 0, dist),
          t0: performance.now(),
          dur: 420,
        };
      };
      stepViewAnimRef.current = () => {
        if (!viewAnim) return;
        const k = Math.min(1, (performance.now() - viewAnim.t0) / viewAnim.dur);
        const eased = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        camera.position.lerpVectors(viewAnim.from, viewAnim.to, eased);
        controls.target.set(0, 0, 0);
        if (k >= 1) viewAnim = null;
      };

      const releaseGesture = () => { controls.enabled = true; };
      const gestureEl = containerRef.current;
      gestureEl?.addEventListener("pointerdown", decideGesture, true); // capture phase
      window.addEventListener("pointerup", releaseGesture);
      cleanupGestureRef.current = () => {
        gestureEl?.removeEventListener("pointerdown", decideGesture, true);
        window.removeEventListener("pointerup", releaseGesture);
      };

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

      // Apply initial color tint
      group.traverse((c: any) => { if (c.isMesh && !isDecalPart(c)) { c.material.color = new THREE.Color(shirtColor); } });

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

      // Park the editable overlay exactly on top of the decal's projected footprint.
      // Without this the overlay sits at a hand-tuned CSS position that does not match
      // where the plane actually lands on screen, so the design appears TWICE — once
      // painted on the shirt and once in the offset overlay. Deriving the box from the
      // projection keeps the two in register through orbit, zoom and resize.
      const syncOverlayToDecal = () => {
        const anchor = decalAnchorRef.current;
        const boxEl = overlayBoxRef.current;
        if (!anchor || !boxEl) return;

        const w = mountRef.current?.clientWidth ?? 0;
        const h = mountRef.current?.clientHeight ?? 0;
        if (!w || !h) return;

        // Show the editing overlay only while the print is turned towards the viewer.
        // Driven imperatively here rather than through React state: this runs every
        // frame from the render loop, and the same code already owns the box's
        // position, so keeping visibility in one place avoids the two disagreeing.
        // Always read the live camera ref rather than the closure's, so a remount that
        // replaces the camera cannot leave this loop measuring against a stale one.
        const cam = cameraRef.current ?? camera;
        const normal = new THREE.Vector3(0, 0, 1)
          .applyQuaternion(anchor.obj.getWorldQuaternion(new THREE.Quaternion()));
        const toCamera = cam.position.clone()
          .sub(anchor.obj.getWorldPosition(new THREE.Vector3()))
          .normalize();
        // ~35° cone. The overlay is a flat rectangle while the decal wraps the curved
        // chest, so the two only agree near head-on. Fading out early means that once
        // you start turning the shirt you see just the printed artwork, rather than a
        // rectangle sliding off the garment.
        const facing = normal.dot(toCamera) > 0.82;
        isFrontFacingRef.current = facing;
        boxEl.style.opacity = facing ? "1" : "0";
        // The overlay owns the pointer whenever it is facing you; whether a given drag
        // moves a design or turns the shirt is settled by Fabric's hit test on
        // mousedown (see the "mouse:down" handler), not by what the cursor is over.
        boxEl.style.pointerEvents = facing ? "auto" : "none";

        // Surface the way back. Turned away from the print with a design on it, the
        // editor is simply unreachable and nothing on screen says so.
        const hint = editHintRef.current;
        if (hint) {
          const hasDesign = (fabricCanvasRef.current?.getObjects().length ?? 0) > 0;
          hint.style.display = !facing && hasDesign ? "flex" : "none";
        }

        const { hw, hh } = anchor;
        const v = new THREE.Vector3();
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const [cx, cy] of [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]]) {
          v.set(cx, cy, 0);
          anchor.obj.localToWorld(v);
          v.project(cam);
          const sx = (v.x * 0.5 + 0.5) * w;
          const sy = (-v.y * 0.5 + 0.5) * h;
          if (sx < minX) minX = sx;
          if (sx > maxX) maxX = sx;
          if (sy < minY) minY = sy;
          if (sy > maxY) maxY = sy;
        }

        const next = { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
        const prev = lastOverlayRectRef.current;
        // Only touch the DOM when it actually moved — this runs every frame
        if (Math.abs(next.x - prev.x) < 0.5 && Math.abs(next.y - prev.y) < 0.5 &&
            Math.abs(next.w - prev.w) < 0.5 && Math.abs(next.h - prev.h) < 0.5) return;
        lastOverlayRectRef.current = next;

        boxEl.style.left = `${next.x}px`;
        boxEl.style.top = `${next.y}px`;
        boxEl.style.width = `${next.w}px`;
        boxEl.style.height = `${next.h}px`;
        boxEl.style.transform = "none";
        boxEl.style.aspectRatio = "auto";
        fitOverlayRef.current?.();
      };

      const animate = () => {
        rafRef.current = requestAnimationFrame(animate);
        if (isAutoRef.current && groupRef.current) groupRef.current.rotation.y += 0.006;
        // Sync fabric canvas to texture every frame
        if ((window as any).__fabricSyncFn) (window as any).__fabricSyncFn();
        if (canvasTextureRef.current) canvasTextureRef.current.needsUpdate = true;
        stepViewAnimRef.current?.();
        controls.update();
        renderer.render(scene, camera);
        syncOverlayToDecal();
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
      if (cleanupGestureRef.current) { cleanupGestureRef.current(); cleanupGestureRef.current = null; }
      if (overlayResizeObsRef.current) { overlayResizeObsRef.current.disconnect(); overlayResizeObsRef.current = null; }
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
    groupRef.current.traverse((c: any) => {
      if (c.isMesh && !isDecalPart(c)) {
        c.material.color = new THREE.Color(shirtColor);
        c.material.needsUpdate = true;
      }
    });
  }, [shirtColor]);

  // A mouseup outside the canvas still has to end the drag, or the overlay would stay
  // latched to whatever it was hovering when the pointer went down.
  useEffect(() => {
    const endDrag = () => { isPointerDownRef.current = false; };
    window.addEventListener("mouseup", endDrag);
    return () => window.removeEventListener("mouseup", endDrag);
  }, []);

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
      fontFamily: options.fontFamily, fontSize: options.fontSize * 2, fontWeight: options.fontWeight,
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
        fontFamily: line.font, fontSize: line.size * 2, fontWeight: line.weight,
        fontStyle: line.style || "normal", fill: line.color, textAlign: "center", name: "template",
      });
      textObjs.push(tb);
    }
    // Scale the whole block to FILL the print area. Templates are authored at wildly
    // different font sizes (20pt to 72pt), so laying them out at their natural size
    // makes half the library land as unreadably small text in the middle of the chest.
    // The scale is allowed to go above 1 so small templates grow, not just shrink.
    const gap = 20;
    const naturalHeights = textObjs.map(t => t.getScaledHeight());
    const blockW = Math.max(...textObjs.map(t => t.getScaledWidth()), 1);
    const blockH = naturalHeights.reduce((a, b) => a + b, 0) + gap * (textObjs.length - 1);
    const fit = Math.min((TEX_SIZE * 0.86) / blockW, (TEX_SIZE * 0.55) / blockH);

    const heights = naturalHeights.map(h => h * fit);
    const totalH = heights.reduce((a, b) => a + b, 0) + gap * fit * (textObjs.length - 1);
    let currentY = TEX_SIZE / 2 - totalH / 2;
    textObjs.forEach((tb, i) => {
      tb.set({
        left: TEX_SIZE / 2,
        top: currentY,
        scaleX: (tb.scaleX ?? 1) * fit,
        scaleY: (tb.scaleY ?? 1) * fit,
      });
      tb.setCoords();
      fc.add(tb);
      currentY += heights[i] + gap * fit;
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

  // Restyle whatever is selected. The left sidebar's font/colour/bold controls used to
  // only bake their values into the NEXT drag payload, so changing them appeared to do
  // nothing to text already on the shirt.
  const styleActiveObject = useCallback((patch: Record<string, any>) => {
    pauseAutoRotate();
    const fc = fabricCanvasRef.current;
    const obj = fc?.getActiveObject();
    if (!fc || !obj) return false;
    // Applies to the live selection only; leave images alone for text-only properties
    const textOnly = ["fontFamily", "fontWeight", "fontStyle", "underline", "textAlign"];
    const isText = typeof obj.text === "string";
    for (const [key, value] of Object.entries(patch)) {
      if (!isText && textOnly.includes(key)) continue;
      obj.set(key, value);
    }
    obj.setCoords?.();
    fc.renderAll();
    updateTexture();
    onSelectObject(obj);   // refresh the properties panel
    onSaveHistory();
    pushHistory();
    return true;
  }, [updateTexture, onSelectObject, onSaveHistory, pauseAutoRotate, pushHistory]);

  useImperativeHandle(ref, () => ({
    addImage, addText, addTemplate, clearTemplates, deleteSelected, duplicateSelected,
    exportDesign, toggleAutoRotate, pauseAutoRotate, undo, redo, pushHistory,
    styleActiveObject,
    faceFront: () => faceFrontRef.current?.(),
    // Uniform scale around the object's own centre, so resizing never drifts it
    // across the shirt the way editing W and H separately does.
    scaleActiveObject: (percent: number) => {
      pauseAutoRotate();
      const fc = fabricCanvasRef.current;
      const obj = fc?.getActiveObject();
      if (!fc || !obj) return;
      const base = obj.__baseScale ?? (obj.__baseScale = { x: obj.scaleX ?? 1, y: obj.scaleY ?? 1 });
      const k = Math.max(0.1, percent / 100);
      obj.set({ scaleX: base.x * k, scaleY: base.y * k });
      obj.setCoords();
      fc.renderAll();
      updateTexture();
      onSelectObject(obj);
      pushHistory();
    },
    getActiveObject: () => fabricCanvasRef.current?.getActiveObject(),
    getFabricCanvas: () => fabricCanvasRef.current,
    updateTexture,
  }));

  // Handle drop directly onto the 3D shirt canvas
  const handleCanvasDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    // Stop auto-rotate when user drops design
    isAutoRef.current = false;
    setIsAuto(false);
    if (controlsRef.current) {
      controlsRef.current.enabled = false;
      setTimeout(() => { if (controlsRef.current) controlsRef.current.enabled = true; }, 300);
    }
    const raw = e.dataTransfer.getData("text/plain");
    if (!raw) return;

    const fc = fabricCanvasRef.current;
    if (!fc) return;

    // Use the fabric overlay element for coordinate mapping
    const overlayEl = fabricOverlayElRef.current?.parentElement || mountRef.current;
    if (!overlayEl) return;
    const rect = overlayEl.getBoundingClientRect();
    const dropX = ((e.clientX - rect.left) / rect.width) * TEX_SIZE;
    const dropY = ((e.clientY - rect.top) / rect.height) * TEX_SIZE;

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
          width: TEX_SIZE * 0.6,
          fontFamily: data.fontFamily || "Arial",
          // Same x2 texture-space scaling addText/addTemplate use — dividing here
          // instead made dragged text land 4x smaller than the identical preset
          // added by clicking a template.
          fontSize: data.fontSize ? data.fontSize * 2 : 80,
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

  // Clicking bare garment commits whatever is being edited and clears the selection —
  // the design then simply reads as part of the shirt again.
  //
  // Clicks that land ON the overlay are Fabric's to handle and must be left alone:
  // this used to run discardActiveObject() for every click anywhere, which fired
  // immediately after Fabric entered text editing on a double-click and exited it
  // again, so double-click-to-edit never appeared to work.
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    const fc = fabricCanvasRef.current;
    if (!fc) return;
    const wrapper = (fc as any).wrapperEl;
    if (wrapper && e.target instanceof Node && wrapper.contains(e.target)) return;

    if (fc.getActiveObject()) {
      fc.discardActiveObject();   // also exits editing, committing the text
      fc.renderAll();
      if (syncToTextureRef.current) syncToTextureRef.current();
      pushHistory();
    }
    onSelectObject(null);
  }, [fabricCanvasRef, onSelectObject, pushHistory]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full"
      style={{ background: "#0a0a12" }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleCanvasDrop}
      onClick={handleCanvasClick}
      onMouseDown={() => { isPointerDownRef.current = true; }}
      onMouseUp={() => { isPointerDownRef.current = false; }}
    >
      <div ref={mountRef} style={{ width: "100%", height: "100%" }} />

      {/* Shown only when a design exists but is turned away from the viewer */}
      <button
        ref={editHintRef}
        onClick={(e) => { e.stopPropagation(); faceFrontRef.current?.(); }}
        style={{
          position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)",
          display: "none", alignItems: "center", gap: 8, zIndex: 20,
          padding: "10px 18px", borderRadius: 999,
          background: "linear-gradient(135deg,#7c3aed,#4f46e5)", color: "#fff",
          fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer",
          boxShadow: "0 8px 24px rgba(124,58,237,0.45)",
        }}
      >
        <RotateCcw size={14} /> Face front to edit
      </button>

      {/* Fabric canvas overlay — transparent background, visible selection handles */}
      {isReady && (
        <div
          ref={overlayBoxRef}
          style={{
            // These are only the pre-projection fallback — syncOverlayToDecal
            // overwrites left/top/width/height every frame from the decal plane.
            position: "absolute",
            top: "28%",
            left: "50%",
            transform: "translateX(-50%)",
            width: "45%",
            aspectRatio: "1",
            // Kept constant so React never overwrites the value that
            // syncOverlayToDecal drives imperatively from the render loop.
            pointerEvents: "none",
            opacity: isFrontFacing ? 1 : 0,
            transition: "opacity 0.2s",
            zIndex: 10,
          }}
        >
          <canvas
            ref={(el) => { if (el && fabricOverlayElRef.current !== el) fabricOverlayElRef.current = el; }}
            style={{ width: "100%", height: "100%", display: "block", background: "transparent" }}
          />
          {/* Dashed border hint */}
          {isFrontFacing && (
            <div style={{
              position: "absolute", inset: 0,
              border: "1px dashed rgba(147,112,219,0.2)",
              borderRadius: 4, pointerEvents: "none",
            }} />
          )}
        </div>
      )}
      {/* Pre-init hidden canvas */}
      {!isReady && (
        <div style={{ position: "absolute", top: -9999, left: -9999, pointerEvents: "none" }}>
          <canvas
            ref={(el) => { if (el && fabricOverlayElRef.current !== el) fabricOverlayElRef.current = el; }}
            width={TEX_SIZE}
            height={TEX_SIZE}
          />
        </div>
      )}

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