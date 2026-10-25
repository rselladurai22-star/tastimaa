"use client";

import { useMemo, useState } from "react";
import { clsx } from "clsx";

/**
 * Three ways admission rules can use where a family lives, on one imaginary
 * neighbourhood. A diagram, never a map: it carries no geographic claim.
 */
type Mode = "defined_area" | "distance_only" | "none";

const MODES: { key: Mode; title: string; short: string; text: string }[] = [
  {
    key: "defined_area",
    title: "A defined catchment area",
    short: "Defined area",
    text: "Children living inside a mapped area get higher priority. Outside the line, children can usually still be offered a place — but only after the higher groups are filled.",
  },
  {
    key: "distance_only",
    title: "Distance, with no fixed line",
    short: "Distance only",
    text: "Applicants in the same criterion are ranked by how far they live from the school, measured by the method in the policy. There is no boundary: how far the offers reach changes every year with who applies.",
  },
  {
    key: "none",
    title: "No residence priority",
    short: "No priority",
    text: "Where you live doesn't change the order. Qualified applicants are ranked by score or by other criteria, so families from further away compete on the same terms.",
  },
];

function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

const W = 520;
const H = 340;
const SCHOOL = { x: 250, y: 168 };

const AREA_POLY: [number, number][] = [
  [150, 92], [190, 66], [262, 60], [316, 74], [362, 92], [398, 130], [398, 168], [384, 210], [356, 236], [330, 258], [292, 282], [230, 290], [190, 270], [150, 248], [118, 214], [116, 168], [122, 128],
];

function inside(x: number, y: number) {
  // Point-in-shape test against a polygon approximation of AREA.
  const poly = [
    [150, 92], [190, 66], [262, 60], [316, 74], [362, 92], [398, 130], [398, 168], [384, 210], [356, 236], [330, 258], [292, 282], [230, 290], [190, 270], [150, 248], [118, 214], [116, 168], [122, 128],
  ];
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]!;
    const [xj, yj] = poly[j]!;
    if (yi! > y !== yj! > y && x < ((xj! - xi!) * (y - yi!)) / (yj! - yi!) + xi!) c = !c;
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
    <g className="iso-drop" style={{ animationDelay: `${delay}ms` }}>
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

type Home = { x: number; y: number; d: number; in: boolean };

/** The neighbourhood in isometric projection: streets, houses and the school. */
function IsoNeighbourhood({ mode, homes, maxD, label }: { mode: Mode; homes: Home[]; maxD: number; label: string }) {
  const order = [...homes].sort((a, b) => a.d - b.d);
  const rank = new Map(order.map((h, i) => [h, i]));
  const corners = [iso(0, 0), iso(W, 0), iso(W, H), iso(0, H)];
  const minX = Math.min(...corners.map((c) => c[0])) - 16;
  const maxX = Math.max(...corners.map((c) => c[0])) + 16;
  const minY = Math.min(...corners.map((c) => c[1])) - 64;
  const maxY = Math.max(...corners.map((c) => c[1])) + 26;
  const roofOf = (h: Home) => {
    if (mode === "defined_area") return h.in ? "var(--green)" : "#aeb4c0";
    if (mode === "distance_only") return `color-mix(in srgb, var(--green) ${Math.round((1 - h.d / maxD) * 100)}%, #c9cdd6)`;
    return "#9aa1ae";
  };
  const things = [...homes.map((h) => ({ h, depth: h.x + h.y })), { h: null, depth: SCHOOL.x + SCHOOL.y }].sort((a, b) => a.depth - b.depth);
  const A = AREA_POLY;
  return (
    <svg viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`} className="block h-auto w-full border-rule bg-[linear-gradient(#eef7fd,#ffffff)] md:border-r" role="img" aria-label={label}>
      <polygon points={pts([0, H, 0], [W, H, 0], [W, H, -16], [0, H, -16])} style={{ fill: "#cfd8c4" }} />
      <polygon points={pts([W, 0, 0], [W, H, 0], [W, H, -16], [W, 0, -16])} style={{ fill: "#b9c4ad" }} />
      <polygon points={pts([0, 0], [W, 0], [W, H], [0, H])} style={{ fill: "#e7efdf" }} />
      {[60, 120, 180, 240, 300].map((y) => (
        <polygon key={`h${y}`} points={pts([0, y - 5], [W, y - 5], [W, y + 5], [0, y + 5])} style={{ fill: "#ffffff", opacity: 0.85 }} />
      ))}
      {[70, 150, 230, 310, 390, 470].map((x) => (
        <polygon key={`v${x}`} points={pts([x - 5, 0], [x + 5, 0], [x + 5, H], [x - 5, H])} style={{ fill: "#ffffff", opacity: 0.85 }} />
      ))}
      <polygon points={pts(...A)} strokeWidth="2" strokeDasharray="7 5" style={{ fill: "color-mix(in srgb, var(--green) 16%, transparent)", stroke: "var(--green)", opacity: mode === "defined_area" ? 1 : 0, transition: "opacity var(--d-3)" }} />
      <g style={{ opacity: mode === "distance_only" ? 1 : 0, transition: "opacity var(--d-3)" }}>
        {[70, 140, 210].map((r) => (
          <polygon key={r} points={pts(...Array.from({ length: 64 }, (_, i): [number, number] => [SCHOOL.x + Math.cos((i / 64) * Math.PI * 2) * r, SCHOOL.y + Math.sin((i / 64) * Math.PI * 2) * r]))} fill="none" strokeWidth="1.5" strokeDasharray="3 5" style={{ stroke: "var(--copper)", opacity: 0.8 - r / 400 }} />
        ))}
      </g>
      {things.map((t, i) =>
        t.h === null ? (
          <g key="school">
            <Building x={SCHOOL.x} y={SCHOOL.y} w={46} d={34} h={30} ridge={14} roof="var(--copper)" wall="#f4f1ec" />
            <line x1={iso(SCHOOL.x + 14, SCHOOL.y, 50)[0]} y1={iso(SCHOOL.x + 14, SCHOOL.y, 50)[1]} x2={iso(SCHOOL.x + 14, SCHOOL.y, 80)[0]} y2={iso(SCHOOL.x + 14, SCHOOL.y, 80)[1]} strokeWidth="1.5" style={{ stroke: "#3c4550" }} />
            <polygon points={pts([SCHOOL.x + 14, SCHOOL.y, 80], [SCHOOL.x + 14, SCHOOL.y + 16, 75], [SCHOOL.x + 14, SCHOOL.y, 70])} style={{ fill: "var(--copper)" }} />
            <text x={iso(SCHOOL.x, SCHOOL.y, 96)[0]} y={iso(SCHOOL.x, SCHOOL.y, 96)[1]} textAnchor="middle" className="fill-[#0a0c10] text-[13px] font-bold" style={{ paintOrder: "stroke", stroke: "#fff", strokeWidth: 4 }}>
              School
            </text>
          </g>
        ) : (
          <g key={i}>
            <Building x={t.h.x} y={t.h.y} w={18} d={16} h={12} ridge={8} roof={roofOf(t.h)} wall="#ffffff" delay={i * 14} />
            {mode === "distance_only" && rank.get(t.h)! < 5 ? (
              <text x={iso(t.h.x, t.h.y, 34)[0]} y={iso(t.h.x, t.h.y, 34)[1]} textAnchor="middle" className="fill-[#0a0c10] font-mono text-[11px] font-semibold" style={{ paintOrder: "stroke", stroke: "#fff", strokeWidth: 3 }}>
                {rank.get(t.h)! + 1}
              </text>
            ) : null}
          </g>
        ),
      )}
    </svg>
  );
}

export function CatchmentModes({ highlight, highlightLabel, initial }: { highlight?: Mode | null; highlightLabel?: string; initial?: Mode }) {
  const [mode, setMode] = useState<Mode>(initial ?? highlight ?? "defined_area");
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
    return out.sort((a, b) => a.d - b.d);
  }, []);
  const maxD = Math.max(...homes.map((h) => h.d));
  const current = MODES.find((m) => m.key === mode)!;

  return (
    <div className="overflow-hidden rounded-[12px] bg-card shadow-[0_1px_1px_rgb(44_11_142/0.05),0_6px_12px_-4px_rgb(44_11_142/0.08),0_20px_40px_-16px_rgb(44_11_142/0.16)]">
      <div role="tablist" aria-label="Ways a school can use where you live" className="flex flex-wrap gap-1 border-b border-rule bg-paper p-1.5">
        {MODES.map((m) => (
          <button
            key={m.key}
            type="button"
            role="tab"
            id={`cm-tab-${m.key}`}
            aria-selected={mode === m.key}
            aria-controls="cm-panel"
            onClick={() => setMode(m.key)}
            className={clsx(
              "relative inline-flex min-h-10 items-center gap-2 rounded-[4px] px-3 text-[0.95rem] font-semibold transition-colors duration-[var(--d-1)]",
              mode === m.key ? "bg-card text-ink shadow-[inset_0_0_0_1px_var(--rule-strong)]" : "text-ink-2 hover:text-ink",
            )}
          >
            {m.short}
            {highlight === m.key ? <span className="rounded-[3px] bg-copper-wash px-1.5 py-0.5 text-[0.75rem] font-semibold text-copper-ink">{highlightLabel ?? "This school"}</span> : null}
          </button>
        ))}
      </div>
      <div id="cm-panel" role="tabpanel" aria-labelledby={`cm-tab-${mode}`} className="grid gap-0 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <IsoNeighbourhood mode={mode} homes={homes} maxD={maxD} label={`Diagram: ${current.title}. ${current.text}`} />
        <div className="flex flex-col justify-between gap-4 p-5">
          <div key={mode} className="anim-rise">
            <p className="font-display text-[1.35rem] leading-snug text-ink [font-variation-settings:'opsz'_30]">{current.title}</p>
            <p className="mt-2 text-[1.02rem] leading-relaxed text-ink-2">{current.text}</p>
          </div>
          <ul className="grid gap-2 text-small text-ink-2" aria-label="Legend">
            {mode === "defined_area" ? (
              <>
                <li className="flex items-center gap-2">
                  <span aria-hidden className="h-3 w-4 rounded-[2px] bg-green" />
                  Inside the area: higher priority
                </li>
                <li className="flex items-center gap-2">
                  <span aria-hidden className="h-3 w-4 rounded-[2px] bg-[#aeb4c0]" />
                  Outside: considered after
                </li>
              </>
            ) : mode === "distance_only" ? (
              <li>Bluer roofs are nearer; numbers show the first few in distance order. The rings are guides for your eye, not boundaries.</li>
            ) : (
              <li>Every home is treated the same — location doesn&apos;t affect the order.</li>
            )}
            <li className="border-t border-dashed border-rule pt-2">An imaginary neighbourhood, not a map of any school.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
