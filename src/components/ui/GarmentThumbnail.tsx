"use client";

import { useEffect, useRef, useState } from "react";
import { buildShirtGroup } from "@/lib/buildShirtGeometry";

interface GarmentThumbnailProps {
  style: string;
  size?: number;
}

// Renders a tiny live Three.js shirt as a thumbnail, matching the real
// editor shirt exactly (same geometry, lighting style, white fabric look).
export function GarmentThumbnail({ style, size = 160 }: GarmentThumbnailProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    let renderer: any;
    let raf = 0;

    const init = async () => {
      const THREE = await import("three");
      if (!mounted || !mountRef.current) return;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
      camera.position.set(0, -0.1, 3.7);

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(size, size);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      try { renderer.outputColorSpace = THREE.SRGBColorSpace; } catch {}
      try { renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05; } catch {}
      mountRef.current.appendChild(renderer.domElement);

      scene.add(new THREE.AmbientLight(0xffffff, 0.65));
      const key = new THREE.DirectionalLight(0xfff4e6, 1.6);
      key.position.set(2, 3, 2.6);
      scene.add(key);
      const fill = new THREE.DirectionalLight(0xe6f0ff, 0.6);
      fill.position.set(-2.4, 1, -1.2);
      scene.add(fill);
      const rim = new THREE.DirectionalLight(0xffffff, 0.35);
      rim.position.set(0, 2.2, -3);
      scene.add(rim);

      const { group } = buildShirtGroup(THREE, style);
      group.traverse((c: any) => {
        if (c.isMesh) c.material.color = new THREE.Color(0xf2f2f0);
      });
      scene.add(group);

      // Gentle fixed 3/4 angle for an appealing thumbnail look
      group.rotation.y = -0.35;

      renderer.render(scene, camera);
      setIsReady(true);

      // Subtle slow auto-spin for a "live" feel
      const animate = () => {
        raf = requestAnimationFrame(animate);
        group.rotation.y += 0.0025;
        renderer.render(scene, camera);
      };
      animate();
    };

    init();

    return () => {
      mounted = false;
      cancelAnimationFrame(raf);
      if (renderer) {
        renderer.dispose();
        if (mountRef.current && renderer.domElement?.parentNode === mountRef.current) {
          mountRef.current.removeChild(renderer.domElement);
        }
      }
    };
  }, [style, size]);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div ref={mountRef} style={{ width: size, height: size }} />
      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white/70 animate-spin" />
        </div>
      )}
    </div>
  );
}