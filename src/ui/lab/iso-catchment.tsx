"use client";

import { useMemo, useState } from "react";
import { clsx } from "clsx";

/**
 * Approach B — 2.5D. The catchment diagram's imaginary neighbourhood, drawn in
 * isometric projection as plain SVG: crisp text, no WebGL, animates with CSS.
 */
type Mode = "defined_area" | "distance_only" | "none";
const MODES: { key: Mode; short: string; title: string }[] = [
  { key: "defined_area", short: "Defined area", title: "Homes inside the mapped area get higher priority" },
  { key: "distance_only", short: "Distance only", title: "Nearer homes rank first; there is no fixed line" },
  { key: "none", short: "No priority", title: "Where you live doesn't change the order" },
];

const W = 520;
const H = 340;
const SCHOOL = { x: 250, y: 168 };
const AREA: [number, number][] = [
  [150, 92], [190, 66], [262, 60], [316, 74], [362, 92], [398, 130], [398, 168], [384, 210], [356, 236], [330, 258], [292, 282], [230, 290], [190, 270], [150, 248], [118, 214], [116, 168], [122, 128],
];

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

const K = 0.62;
const C30 = Math.cos(Math.PI / 6);
/** World (x, y on the ground, z up) to screen. */
const iso = (x: number, y: number, z = 0): [number, number] => [(x - y) * C30 * K, (x + y) * 0.5 * K - z * K];
const pts = (...p: [number, number, number?][]) => p.map(([x, y, z]) => iso(x, y, z).map((n) => n.toFixed(1)).join(",")).join(" ");

function Building({ x, y, w, d, h, roof, wall, ridge = 10, delay = 0 }: { x: number; y: number; w: number; d: number; h: number; roof: string; wall: string; ridge?: number; delay?: number }) {
  const x0 = x - w / 2;
  const x1 = x + w / 2;
  const y0 = y - d / 2;
  const y1 = y + d / 2;
  const ym = y;
  const t = `fill var(--d-3) var(--ease-out) ${delay}ms`;
  return (
    <g className="lab-drop" style={{ animationDelay: `${delay}ms` }}>
      {/* Contact shadow, cast down-right from a light above-left */}
      <polygon points={pts([x0 + 4, y0 + 6], [x1 + 10, y0 + 6], [x1 + 10, y1 + 10], [x0 + 4, y1 + 10])} style={{ fill: "#0a0c10", opacity: 0.12 }} />
      {/* Back roof slope */}
      <polygon points={pts([x0, y0, h], [x1, y0, h], [x1, ym, h + ridge], [x0, ym, h + ridge])} style={{ fill: `color-mix(in srgb, ${roof} 70%, #000)`, transition: t }} />
      {/* Front-left wall (y = y1) */}
      <polygon points={pts([x0, y1, 0], [x1, y1, 0], [x1, y1, h], [x0, y1, h])} style={{ fill: wall, transition: t }} />
      {/* Front-right wall with gable (x = x1) */}
      <polygon points={pts([x1, y1, 0], [x1, y0, 0], [x1, y0, h], [x1, ym, h + ridge], [x1, y1, h])} style={{ fill: `color-mix(in srgb, ${wall} 78%, #0a0c10)`, transition: t }} />
      {/* Window on the front wall */}
      <polygon points={pts([x0 + w * 0.3, y1, h * 0.35], [x0 + w * 0.55, y1, h * 0.35], [x0 + w * 0.55, y1, h * 0.75], [x0 + w * 0.3, y1, h * 0.75])} style={{ fill: "#c5eafc", opacity: 0.9 }} />
      {/* Front roof slope */}
      <polygon points={pts([x0, ym, h + ridge], [x1, ym, h + ridge], [x1, y1 + 2, h - 1], [x0 - 2, y1 + 2, h - 1])} style={{ fill: roof, transition: t }} />
    </g>
  );
}

export function IsoCatchment() {
  const [mode, setMode] = useState<Mode>("defined_area");
  const homes = useMemo(() => {
    const r = rng(42);
    const out: { x: number; y: number; d: number; in: boolean }[] = [];
    while (out.length < 40) {
      const x = 30 + r() * (W - 60);
      const y = 30 + r() * (H - 60);
      const d = Math.hypot(x - SCHOOL.x, y - SCHOOL.y);
      if (d < 44 || out.some((o) => Math.hypot(o.x - x, o.y - y) < 30)) continue;
      out.push({ x, y, d, in: inside(x, y) });
    }
    return out;
  }, []);
  const maxD = Math.max(...homes.map((h) => h.d));
  const order = [...homes].sort((a, b) => a.d - b.d);
  const rank = new Map(order.map((h, i) => [h, i]));

  const corners = [iso(0, 0), iso(W, 0), iso(W, H), iso(0, H)];
  const minX = Math.min(...corners.map((c) => c[0])) - 16;
  const maxX = Math.max(...corners.map((c) => c[0])) + 16;
  const minY = Math.min(...corners.map((c) => c[1])) - 60;
  const maxY = Math.max(...corners.map((c) => c[1])) + 30;

  const roofOf = (h: (typeof homes)[number]) => {
    if (mode === "defined_area") return h.in ? "var(--green)" : "#aeb4c0";
    if (mode === "distance_only") return `color-mix(in srgb, var(--green) ${Math.round((1 - h.d / maxD) * 100)}%, #c9cdd6)`;
    return "#9aa1ae";
  };
  const things = [
    ...homes.map((h) => ({ kind: "home" as const, h, depth: h.x + h.y })),
    { kind: "school" as const, h: null, depth: SCHOOL.x + SCHOOL.y },
  ].sort((a, b) => a.depth - b.depth);
  const current = MODES.find((m) => m.key === mode)!;

  return (
    <div className="overflow-hidden rounded-[8px] border border-rule bg-[linear-gradient(#eef7fd,#ffffff)]">
      <div role="tablist" aria-label="Ways a school can use where you live" className="flex flex-wrap gap-1 border-b border-rule bg-paper/70 p-1.5">
        {MODES.map((m) => (
          <button key={m.key} type="button" role="tab" aria-selected={mode === m.key} onClick={() => setMode(m.key)} className={clsx("min-h-10 rounded-[4px] px-3 text-[0.95rem] font-semibold transition-colors", mode === m.key ? "bg-green text-white" : "text-ink-2 hover:text-ink")}>
            {m.short}
          </button>
        ))}
      </div>
      <svg viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`} className="block h-auto w-full" role="img" aria-label={`Isometric diagram of an imaginary neighbourhood. ${current.title}.`}>
        {/* Ground slab with thickness */}
        <polygon points={pts([0, H, 0], [W, H, 0], [W, H, -16], [0, H, -16])} style={{ fill: "#cfd8c4" }} />
        <polygon points={pts([W, 0, 0], [W, H, 0], [W, H, -16], [W, 0, -16])} style={{ fill: "#b9c4ad" }} />
        <polygon points={pts([0, 0], [W, 0], [W, H], [0, H])} style={{ fill: "#e7efdf" }} />
        {/* Streets */}
        {[60, 120, 180, 240, 300].map((y) => (
          <polygon key={`h${y}`} points={pts([0, y - 5], [W, y - 5], [W, y + 5], [0, y + 5])} style={{ fill: "#ffffff", opacity: 0.85 }} />
        ))}
        {[70, 150, 230, 310, 390, 470].map((x) => (
          <polygon key={`v${x}`} points={pts([x - 5, 0], [x + 5, 0], [x + 5, H], [x - 5, H])} style={{ fill: "#ffffff", opacity: 0.85 }} />
        ))}
        {/* Mode overlays painted on the ground */}
        <polygon points={pts(...AREA)} strokeWidth="2" strokeDasharray="7 5" style={{ fill: "color-mix(in srgb, var(--green) 16%, transparent)", stroke: "var(--green)", opacity: mode === "defined_area" ? 1 : 0, transition: "opacity var(--d-3)" }} />
        <g style={{ opacity: mode === "distance_only" ? 1 : 0, transition: "opacity var(--d-3)" }}>
          {[70, 140, 210].map((r) => (
            <polygon key={r} points={pts(...Array.from({ length: 64 }, (_, i): [number, number] => [SCHOOL.x + Math.cos((i / 64) * Math.PI * 2) * r, SCHOOL.y + Math.sin((i / 64) * Math.PI * 2) * r]))} fill="none" strokeWidth="1.5" strokeDasharray="3 5" style={{ stroke: "var(--copper)", opacity: 0.8 - r / 400 }} />
          ))}
        </g>
        {things.map((t, i) =>
          t.kind === "school" ? (
            <g key="school">
              <Building x={SCHOOL.x} y={SCHOOL.y} w={46} d={34} h={30} ridge={14} roof="var(--copper)" wall="#f4f1ec" />
              <line x1={iso(SCHOOL.x + 14, SCHOOL.y, 50)[0]} y1={iso(SCHOOL.x + 14, SCHOOL.y, 50)[1]} x2={iso(SCHOOL.x + 14, SCHOOL.y, 80)[0]} y2={iso(SCHOOL.x + 14, SCHOOL.y, 80)[1]} strokeWidth="1.5" style={{ stroke: "#3c4550" }} />
              <polygon points={pts([SCHOOL.x + 14, SCHOOL.y, 80], [SCHOOL.x + 14, SCHOOL.y + 16, 75], [SCHOOL.x + 14, SCHOOL.y, 70])} style={{ fill: "var(--copper)" }} />
              <text x={iso(SCHOOL.x, SCHOOL.y, 96)[0]} y={iso(SCHOOL.x, SCHOOL.y, 96)[1]} textAnchor="middle" className="fill-[var(--ink)] text-[13px] font-bold" style={{ paintOrder: "stroke", stroke: "#fff", strokeWidth: 4 }}>
                School
              </text>
            </g>
          ) : (
            <g key={i}>
              <Building x={t.h!.x} y={t.h!.y} w={18} d={16} h={12} ridge={8} roof={roofOf(t.h!)} wall="#ffffff" delay={i * 14} />
              {mode === "distance_only" && rank.get(t.h!)! < 5 ? (
                <text x={iso(t.h!.x, t.h!.y, 34)[0]} y={iso(t.h!.x, t.h!.y, 34)[1]} textAnchor="middle" className="fill-[var(--ink)] font-mono text-[11px] font-semibold" style={{ paintOrder: "stroke", stroke: "#fff", strokeWidth: 3 }}>
                  {rank.get(t.h!)! + 1}
                </text>
              ) : null}
            </g>
          ),
        )}
      </svg>
      <p className="border-t border-rule bg-paper/70 px-4 py-3 text-small text-ink-2">
        <span className="font-semibold text-ink">{current.title}.</span> An imaginary neighbourhood, not a map of any school.
      </p>
    </div>
  );
}
