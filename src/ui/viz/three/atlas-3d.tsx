"use client";

import { Html, OrbitControls, RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import { BufferGeometry, Float32BufferAttribute, Group, InstancedMesh, Object3D } from "three";
import { Stage, useFinePointer, useTokens } from "./stage";
import { useReducedMotion } from "./support";

export interface Column {
  x: number;
  z: number;
  h: number;
  group: string;
  lit?: boolean;
}

const TOKENS = ["green", "green-deep", "copper", "sky", "rule", "rule-strong", "chart-grid", "paper"] as const;
const R = 0.075;

function Columns({ cols, focus, hover, onHover }: { cols: Column[]; focus: string | null; hover: number | null; onHover: (i: number | null) => void }) {
  const mesh = useRef<InstancedMesh>(null);
  const t = useTokens(TOKENS);
  const still = useReducedMotion();
  const dummy = useMemo(() => new Object3D(), []);
  const grow = useRef(still ? 1 : 0);
  const maxH = Math.max(...cols.map((c) => c.h));
  const anyLit = cols.some((c) => c.lit);

  const colours = useMemo(() => {
    const low = t.sky.clone().lerp(t.green, 0.35);
    return cols.map((c, i) => {
      if (i === hover) return t.copper.clone();
      if (anyLit) return c.lit ? t.copper.clone() : t["rule-strong"].clone();
      const k = c.h / maxH;
      const col = k < 0.5 ? low.clone().lerp(t.green, k * 2) : t.green.clone().lerp(t["green-deep"], (k - 0.5) * 2);
      if (focus && c.group !== focus) col.lerp(t.rule, 0.8);
      return col;
    });
  }, [cols, focus, hover, t, maxH, anyLit]);

  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    colours.forEach((c, i) => m.setColorAt(i, c));
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [colours]);

  const place = (g: number) => {
    const m = mesh.current;
    if (!m) return;
    cols.forEach((c, i) => {
      // Stagger from north to south so the atlas "rises" down the country.
      const d = Math.min(1, Math.max(0, g * 1.6 - (c.z + 4) / 14));
      const e = 1 - Math.pow(1 - d, 3);
      const h = Math.max(0.001, c.h * e);
      const lift = i === hover ? 1.15 : 1;
      dummy.position.set(c.x, (h * lift) / 2 + 0.125, c.z);
      dummy.scale.set(c.lit || i === hover ? 1.35 : 1, h * lift, c.lit || i === hover ? 1.35 : 1);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  };

  useLayoutEffect(() => place(grow.current));
  useFrame((_, dt) => {
    if (grow.current >= 1) return;
    grow.current = Math.min(1, grow.current + dt / 1.6);
    place(grow.current);
  });

  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, cols.length]}
      castShadow
      receiveShadow
      onPointerMove={(e) => {
        e.stopPropagation();
        onHover(e.instanceId ?? null);
      }}
      onPointerOut={() => onHover(null)}
    >
      <cylinderGeometry args={[R, R, 1, 18]} />
      <meshStandardMaterial roughness={0.38} metalness={0.08} />
    </instancedMesh>
  );
}

function Graticule({ lines }: { lines: [number, number, number, number][] }) {
  const t = useTokens(["chart-grid"] as const);
  const geo = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(lines.flatMap(([x1, z1, x2, z2]) => [x1, 0.131, z1, x2, 0.131, z2]), 3));
    return g;
  }, [lines]);
  return (
    <lineSegments geometry={geo}>
      <lineBasicMaterial color={t["chart-grid"]} />
    </lineSegments>
  );
}

function Sway({ children }: { children: React.ReactNode }) {
  const g = useRef<Group>(null);
  const still = useReducedMotion();
  useFrame(({ clock }) => {
    if (!g.current || still) return;
    g.current.rotation.y = Math.sin(clock.elapsedTime * 0.18) * 0.16;
  });
  return <group ref={g}>{children}</group>;
}

export default function Atlas3D({
  cols,
  width,
  depth,
  lines,
  labels,
  focus,
  hover,
  onHover,
}: {
  cols: Column[];
  width: number;
  depth: number;
  lines: [number, number, number, number][];
  labels: { key: string; x: number; z: number; h: number; name: string; n: number }[];
  focus: string | null;
  hover: number | null;
  onHover: (i: number | null) => void;
}) {
  const fine = useFinePointer();
  return (
    <Stage camera={{ position: [0, 10.5, 9.6], fov: 34 }} className="absolute inset-0">
      <Sway>
        <RoundedBox args={[width + 0.8, 0.25, depth + 0.8]} radius={0.12} smoothness={4} receiveShadow>
          <meshStandardMaterial color="#f7f9fd" roughness={0.9} />
        </RoundedBox>
        <Graticule lines={lines} />
        <Columns cols={cols} focus={focus} hover={hover} onHover={onHover} />
        {labels.map((l) => (
          <Html key={l.key} position={[l.x, l.h + 0.45, l.z]} center zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
            <span className="block rounded-full border border-rule bg-paper/95 px-2.5 py-0.5 text-[12.5px] font-semibold whitespace-nowrap text-ink shadow-[0_6px_18px_-8px_rgb(10_12_16/0.45)]">
              {l.name} <span className="font-mono font-normal text-ink-2">{l.n}</span>
            </span>
          </Html>
        ))}
      </Sway>
      {fine ? <OrbitControls enableZoom={false} enablePan={false} enableDamping minPolarAngle={0.25} maxPolarAngle={1.2} minAzimuthAngle={-0.9} maxAzimuthAngle={0.9} /> : null}
    </Stage>
  );
}
