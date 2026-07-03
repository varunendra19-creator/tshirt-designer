"use client";

import { useEffect, useRef, useState } from "react";
import { getModelPath } from "../../lib/garmentModels";

interface GarmentThumbnailProps {
  style: string;
  size?: number;
}

// Cache rendered PNGs so each model is only rendered once ever
const thumbnailCache: Record<string, string> = {};

export function GarmentThumbnail({ style, size = 160 }: GarmentThumbnailProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [imgSrc, setImgSrc] = useState<string>(thumbnailCache[style] || "");
  const [isLoading, setIsLoading] = useState(!thumbnailCache[style]);
  const [hasError, setHasError] = useState(false);
  const renderingRef = useRef(false);

  useEffect(() => {
    // Already cached — use immediately
    if (thumbnailCache[style]) {
      setImgSrc(thumbnailCache[style]);
      setIsLoading(false);
      return;
    }

    // Already rendering this style
    if (renderingRef.current) return;
    renderingRef.current = true;

    let cancelled = false;

    const renderToImage = async () => {
      try {
        const THREE = await import("three");
        const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js" as any);
        if (cancelled) return;

        // Offscreen canvas — never attached to DOM, so doesn't steal contexts
        const offscreen = document.createElement("canvas");
        offscreen.width = size * 2;  // 2x for sharpness
        offscreen.height = size * 2;

        const renderer = new THREE.WebGLRenderer({
          canvas: offscreen,
          antialias: true,
          alpha: false,  // solid background, not transparent
          preserveDrawingBuffer: true,
          powerPreference: "low-power",
        });
        renderer.setClearColor(0x1a1a22, 1);  // dark background matches modal
        renderer.setPixelRatio(1);
        try { renderer.outputColorSpace = THREE.SRGBColorSpace; } catch {}
        try { renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05; } catch {}

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);

        scene.add(new THREE.AmbientLight(0xffffff, 0.7));
        const key = new THREE.DirectionalLight(0xfff4e6, 1.8);
        key.position.set(2, 3, 2.6);
        scene.add(key);
        const fill = new THREE.DirectionalLight(0xe6f0ff, 0.55);
        fill.position.set(-2.4, 1, -1.2);
        scene.add(fill);

        const loader = new GLTFLoader();
        const modelPath = getModelPath(style);

        await new Promise<void>((resolve, reject) => {
          loader.load(
            modelPath,
            (gltf: any) => {
              if (cancelled) { resolve(); return; }
              const model = gltf.scene;

              // Normalize ALL models to same world size regardless of GLB coordinate scale
              // polo2 and design are 700+ units, others are 0.6 units — normalize to 1 unit
              const box = new THREE.Box3().setFromObject(model);
              const center = box.getCenter(new THREE.Vector3());
              const size3 = box.getSize(new THREE.Vector3());
              const maxDim = Math.max(size3.x, size3.y, size3.z);
              const normalizedScale = 1.8 / maxDim;
              model.scale.setScalar(normalizedScale);
              // Re-center after scaling
              const scaledCenter = center.clone().multiplyScalar(normalizedScale);
              model.position.set(-scaledCenter.x, -scaledCenter.y, -scaledCenter.z);

              // Fixed camera distance — consistent for all normalized models
              const fov = camera.fov * (Math.PI / 180);
              const dist = (1.8 / 2) / Math.tan(fov / 2) * 1.5;
              camera.position.set(0, 0, dist);
              camera.lookAt(0, 0, 0);

              // Replace material with clean white
              model.traverse((child: any) => {
                if (child.isMesh) {
                  child.material = new THREE.MeshStandardMaterial({
                    color: new THREE.Color(0xf0f0ee),
                    roughness: 0.82,
                    metalness: 0.02,
                  });
                }
              });

              scene.add(model);

              // Log model bounds to debug blank renders
              const debugBox = new THREE.Box3().setFromObject(model);
              const debugSize = debugBox.getSize(new THREE.Vector3());
              console.log(`[Thumbnail] ${style}: size=${JSON.stringify({x: debugSize.x.toFixed(2), y: debugSize.y.toFixed(2), z: debugSize.z.toFixed(2)})}, dist=${dist.toFixed(2)}`);

              setTimeout(() => {
                if (cancelled) { resolve(); return; }
                renderer.render(scene, camera);
                setTimeout(() => {
                  if (cancelled) { resolve(); return; }
                  renderer.render(scene, camera);
                  const dataUrl = offscreen.toDataURL("image/png");
                  renderer.dispose();
                  renderer.forceContextLoss();
                  thumbnailCache[style] = dataUrl;
                  resolve();
                }, 100);
              }, 50);
            },
            undefined,
            (err: any) => reject(err)
          );
        });

        if (!cancelled && thumbnailCache[style]) {
          setImgSrc(thumbnailCache[style]);
          setIsLoading(false);
        }
      } catch {
        if (!cancelled) { setHasError(true); setIsLoading(false); }
      }
    };

    renderToImage();
    return () => { cancelled = true; };
  }, [style, size]);

  return (
    <div
      ref={containerRef}
      style={{ width: size, height: size, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      {imgSrc && (
        <img
          src={imgSrc}
          alt={style}
          style={{ width: size, height: size, objectFit: "contain", display: "block" }}
        />
      )}
      {isLoading && !imgSrc && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white/60 animate-spin" />
        </div>
      )}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>—</span>
        </div>
      )}
    </div>
  );
}