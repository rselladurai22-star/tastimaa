"use client";

import { AccumulativeShadows, Environment, Lightformer, RandomizedLight, RoundedBox } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useMemo } from "react";
import { ExtrudeGeometry, Shape } from "three";

/**
 * Approach D source scene: the imaginary catchment neighbourhood built from
 * primitives and rendered once, offline, into a still image (/lab/render).
 */
const W = 520;
const H = 340;
const S = 1 / 50;
const SCHOOL = { x: 250, y: 168 };
const AREA: [number, number][] = [
  [150, 92], [190, 66], [262, 60], [316, 74], [362, 92], [398, 130], [398, 168], [384, 210], [356, 236], [330, 258], [292, 282], [230, 290], [190, 270], [150, 248], [118, 214], [116, 168], [122, 128],
];
const wx = (x: number) => (x - W / 2) * S;
const wz = (y: number) => (y - H / 2) * S;

function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}
function inside(x: number, y: number) {
  let c = false;
  for (let i = 0, j = AREA.length - 1; i < AREA.length; j = i++) {
    const [xi, yi] = AREA[i]!;
    const [xj, yj] = AREA[j]!;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

function gable(w: number, d: number, h: number) {
  const s = new Shape();
  s.moveTo(-d / 2 - 0.03, 0);
  s.lineTo(0, h);
  s.lineTo(d / 2 + 0.03, 0);
  s.closePath();
  const g = new ExtrudeGeometry(s, { depth: w + 0.06, bevelEnabled: false });
  g.translate(0, 0, -(w + 0.06) / 2);
  g.rotateY(Math.PI / 2);
  return g;
}

function House({ x, y, w = 0.36, d = 0.32, h = 0.26, roof, scale = 1 }: { x: number; y: number; w?: number; d?: number; h?: number; roof: string; scale?: number }) {
  const geo = useMemo(() => gable(w, d, h * 0.7), [w, d, h]);
  return (
    <group position={[wx(x), 0, wz(y)]} scale={scale}>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color="#fbfaf7" roughness={0.85} />
      </mesh>
      <mesh geometry={geo} position={[0, h, 0]} castShadow>
        <meshStandardMaterial color={roof} roughness={0.55} />
      </mesh>
      <mesh position={[w * 0.12, h * 0.55, d / 2 + 0.002]}>
        <planeGeometry args={[w * 0.28, h * 0.32]} />
        <meshStandardMaterial color="#9fd6f5" roughness={0.2} metalness={0.1} />
      </mesh>
    </group>
  );
}

function Tree({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <group position={[wx(x), 0, wz(y)]} scale={s}>
      <mesh position={[0, 0.08, 0]} castShadow>
        <cylinderGeometry args={[0.025, 0.035, 0.16, 8]} />
        <meshStandardMaterial color="#8a6a4f" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.3, 0]} castShadow>
        <icosahedronGeometry args={[0.17, 1]} />
        <meshStandardMaterial color="#5fae74" roughness={0.8} flatShading />
      </mesh>
    </group>
  );
}

function Scene() {
  const homes = useMemo(() => {
    const r = rng(42);
    const out: { x: number; y: number; in: boolean }[] = [];
    while (out.length < 40) {
      const x = 30 + r() * (W - 60);
      const y = 30 + r() * (H - 60);
      if (Math.hypot(x - SCHOOL.x, y - SCHOOL.y) < 44 || out.some((o) => Math.hypot(o.x - x, o.y - y) < 30)) continue;
      out.push({ x, y, in: inside(x, y) });
    }
    return out;
  }, []);
  const trees = useMemo(() => {
    const r = rng(7);
    return Array.from({ length: 26 }, () => ({ x: 14 + r() * (W - 28), y: 14 + r() * (H - 28), s: 0.6 + r() * 0.6 })).filter((t) => homes.every((h) => Math.hypot(h.x - t.x, h.y - t.y) > 22) && Math.hypot(t.x - SCHOOL.x, t.y - SCHOOL.y) > 50);
  }, [homes]);
  const area = useMemo(() => {
    const s = new Shape();
    AREA.forEach(([x, y], i) => (i ? s.lineTo(wx(x), -wz(y)) : s.moveTo(wx(x), -wz(y))));
    s.closePath();
    return s;
  }, []);

  return (
    <>
      <RoundedBox args={[W * S + 0.3, 0.3, H * S + 0.3]} radius={0.08} smoothness={4} position={[0, -0.15, 0]} receiveShadow>
        <meshStandardMaterial color="#cfe6bd" roughness={1} />
      </RoundedBox>
      {[60, 120, 180, 240, 300].map((y) => (
        <mesh key={`h${y}`} position={[0, 0.003, wz(y)]} rotation-x={-Math.PI / 2} receiveShadow>
          <planeGeometry args={[W * S, 0.18]} />
          <meshStandardMaterial color="#ffffff" roughness={1} />
        </mesh>
      ))}
      {[70, 150, 230, 310, 390, 470].map((x) => (
        <mesh key={`v${x}`} position={[wx(x), 0.004, 0]} rotation-x={-Math.PI / 2} receiveShadow>
          <planeGeometry args={[0.18, H * S]} />
          <meshStandardMaterial color="#ffffff" roughness={1} />
        </mesh>
      ))}
      <mesh position={[0, 0.008, 0]} rotation-x={-Math.PI / 2}>
        <shapeGeometry args={[area]} />
        <meshStandardMaterial color="#4242fa" transparent opacity={0.22} roughness={1} />
      </mesh>
      {homes.map((h, i) => (
        <House key={i} x={h.x} y={h.y} roof={h.in ? "#4242fa" : "#b4bac6"} />
      ))}
      <House x={SCHOOL.x} y={SCHOOL.y} w={0.95} d={0.68} h={0.55} roof="#e60067" />
      <mesh position={[wx(SCHOOL.x) + 0.3, 1.0, wz(SCHOOL.y)]} castShadow>
        <cylinderGeometry args={[0.012, 0.012, 0.9, 8]} />
        <meshStandardMaterial color="#3c4550" />
      </mesh>
      <mesh position={[wx(SCHOOL.x) + 0.42, 1.36, wz(SCHOOL.y)]} castShadow>
        <boxGeometry args={[0.24, 0.14, 0.01]} />
        <meshStandardMaterial color="#e60067" />
      </mesh>
      {trees.map((t, i) => (
        <Tree key={i} {...t} />
      ))}
      <AccumulativeShadows temporal frames={80} alphaTest={0.8} scale={12} position={[0, 0.001, 0]} color="#2c3a2a" opacity={0.4}>
        <RandomizedLight amount={8} radius={5} ambient={0.3} intensity={1.1} position={[-5, 9, 4]} bias={0.001} />
      </AccumulativeShadows>
    </>
  );
}

export default function NeighbourhoodRender() {
  return (
    <Canvas shadows dpr={2} camera={{ position: [9.2, 8.6, 10.2], fov: 26 }} gl={{ antialias: true, preserveDrawingBuffer: true }} onCreated={({ camera }) => camera.lookAt(0, -0.2, 0)}>
      <color attach="background" args={["#eef7fd"]} />
      <hemisphereLight args={["#ffffff", "#c7d2e6", 0.6]} />
      <directionalLight position={[-5, 9, 4]} intensity={1.6} castShadow shadow-mapSize={[4096, 4096]} shadow-camera-left={-7} shadow-camera-right={7} shadow-camera-top={7} shadow-camera-bottom={-7} shadow-bias={-0.0003} />
      <Environment resolution={256}>
        <Lightformer intensity={1.2} position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[12, 12, 1]} />
        <Lightformer intensity={1} color="#c5eafc" position={[-6, 2, 3]} scale={[6, 3, 1]} />
        <Lightformer intensity={0.6} color="#ffe2ee" position={[6, 2, -3]} scale={[6, 3, 1]} />
      </Environment>
      <Scene />
    </Canvas>
  );
}
