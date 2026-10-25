"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { Color } from "three";
import { token } from "./support";

const FINE = "(pointer: fine)";
function subscribeFine(cb: () => void) {
  const m = window.matchMedia(FINE);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
}
/** Orbit controls only with a mouse: on touch screens a drag must still scroll the page. */
export function useFinePointer() {
  return useSyncExternalStore(subscribeFine, () => window.matchMedia(FINE).matches, () => false);
}

/** Read design tokens (as THREE colours) from the element the canvas lives in. */
export function useTokens<K extends string>(names: readonly K[]): Record<K, Color> {
  const el = useThree((s) => s.gl.domElement);
  const key = names.join(",");
  return useMemo(() => {
    const out = {} as Record<K, Color>;
    for (const n of key.split(",") as K[]) out[n] = new Color(token(el, `--${n}`));
    return out;
  }, [el, key]);
}

/**
 * A lit, shadowed WebGL stage that fades in over the flat figure beneath it.
 * Rendering pauses while the figure is off screen.
 */
export function Stage({ children, camera, label, className, overlay }: { children: ReactNode; camera: { position: [number, number, number]; fov?: number }; label?: string; className?: string; overlay?: ReactNode }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(!!e?.isIntersecting), { rootMargin: "120px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={wrap} aria-hidden={label ? undefined : true} role={label ? "img" : undefined} aria-label={label} className={className} style={{ opacity: ready ? 1 : 0, transition: "opacity 600ms var(--ease-out)" }}>
      <Canvas
        shadows="percentage"
        flat
        dpr={[1, 2]}
        frameloop={visible ? "always" : "never"}
        camera={{ fov: camera.fov ?? 32, position: camera.position, near: 0.1, far: 200 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        onCreated={({ camera: c }) => {
          c.lookAt(0, 0, 0);
          setReady(true);
        }}
      >
        <hemisphereLight args={["#ffffff", "#c7d2e6", 1.15]} />
        <directionalLight
          castShadow
          position={[5, 11, 6]}
          intensity={1.7}
          shadow-mapSize={[2048, 2048]}
          shadow-bias={-0.0004}
          shadow-camera-left={-9}
          shadow-camera-right={9}
          shadow-camera-top={9}
          shadow-camera-bottom={-9}
        />
        <directionalLight position={[-6, 4, -5]} intensity={0.45} color="#c9d4ff" />
        {children}
      </Canvas>
      {overlay}
    </div>
  );
}
