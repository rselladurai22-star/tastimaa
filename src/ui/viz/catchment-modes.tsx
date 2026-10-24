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
// A hand-drawn, irregular area — catchments follow roads and parishes, not circles.
const AREA = "M150 92 C190 58 262 56 316 74 C362 90 404 118 398 168 C392 214 356 236 330 258 C292 288 230 292 190 270 C150 248 112 218 116 168 C118 130 124 112 150 92Z";

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

export function CatchmentModes({ highlight, highlightLabel, initial }: { highlight?: Mode | null; highlightLabel?: string; initial?: Mode }) {
  const [mode, setMode] = useState<Mode>(initial ?? highlight ?? "defined_area");
  const homes = useMemo(() => {
    const r = rng(42);
    const out: { x: number; y: number; d: number; in: boolean }[] = [];
    while (out.length < 46) {
      const x = 28 + r() * (W - 56);
      const y = 28 + r() * (H - 56);
      const d = Math.hypot(x - SCHOOL.x, y - SCHOOL.y);
      if (d < 26 || out.some((o) => Math.hypot(o.x - x, o.y - y) < 26)) continue;
      out.push({ x, y, d, in: inside(x, y) });
    }
    return out.sort((a, b) => a.d - b.d);
  }, []);
  const maxD = Math.max(...homes.map((h) => h.d));
  const current = MODES.find((m) => m.key === mode)!;

  return (
    <div className="playground overflow-hidden">
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
      <div id="cm-panel" role="tabpanel" aria-labelledby={`cm-tab-${mode}`} className="grid gap-0 md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full border-rule bg-card md:border-r" role="img" aria-label={`Diagram: ${current.title}. ${current.text}`}>
          {/* Faint street grid: an imaginary place */}
          {[60, 120, 180, 240, 300].map((y) => (
            <line key={`h${y}`} x1="0" x2={W} y1={y} y2={y} style={{ stroke: "var(--chart-grid)" }} />
          ))}
          {[70, 150, 230, 310, 390, 470].map((x) => (
            <line key={`v${x}`} y1="0" y2={H} x1={x} x2={x} style={{ stroke: "var(--chart-grid)" }} />
          ))}
          {/* Mode overlays */}
          <path d={AREA} strokeWidth="2" strokeDasharray="7 5" className="transition-opacity duration-[var(--d-3)]" style={{ fill: "var(--green-wash)", stroke: "var(--green)", opacity: mode === "defined_area" ? 1 : 0 }} />
          <g className="transition-opacity duration-[var(--d-3)]" style={{ opacity: mode === "distance_only" ? 1 : 0 }}>
            {[60, 120, 180, 240].map((r) => (
              <circle key={r} cx={SCHOOL.x} cy={SCHOOL.y} r={r} fill="none" strokeOpacity={0.55 - r / 600} strokeDasharray="2 5" style={{ stroke: "var(--copper)" }} />
            ))}
          </g>
          {homes.map((h, i) => {
            const t = h.d / maxD;
            const style =
              mode === "defined_area"
                ? h.in
                  ? { fill: "var(--green-bright)", stroke: "var(--green)" }
                  : { fill: "var(--card)", stroke: "var(--control)" }
                : mode === "distance_only"
                  ? { fill: `color-mix(in srgb, var(--green-bright) ${Math.round((1 - t) * 100)}%, var(--card))`, stroke: "var(--green)" }
                  : { fill: "var(--sage-deep)", stroke: "var(--control)" };
            return (
              <g key={i} style={{ transform: `translate(${h.x}px, ${h.y}px)` }}>
                <path d="M-7 1 L0 -6 L7 1 V7 H-7Z" strokeWidth="1.4" style={{ ...style, transition: `fill var(--d-3) var(--ease-out) ${i * 8}ms, stroke var(--d-3)` }} />
                {mode === "distance_only" && i < 5 ? (
                  <text y="-10" textAnchor="middle" className="fill-[var(--ink)] font-mono text-[11px] font-medium">
                    {i + 1}
                  </text>
                ) : null}
              </g>
            );
          })}
          {/* The school */}
          <g style={{ transform: `translate(${SCHOOL.x}px, ${SCHOOL.y}px)` }}>
            <rect x="-11" y="-11" width="22" height="22" strokeWidth="1.5" rx="2" style={{ fill: "var(--copper)", stroke: "var(--copper-ink)" }} />
            <text y="30" textAnchor="middle" className="fill-[var(--ink)] text-[13px] font-semibold">
              School
            </text>
          </g>
        </svg>
        <div className="flex flex-col justify-between gap-4 p-5">
          <div key={mode} className="anim-rise">
            <p className="font-display text-[1.35rem] leading-snug text-ink [font-variation-settings:'opsz'_30]">{current.title}</p>
            <p className="mt-2 text-[1.02rem] leading-relaxed text-ink-2">{current.text}</p>
          </div>
          <ul className="grid gap-2 text-small text-ink-2" aria-label="Legend">
            {mode === "defined_area" ? (
              <>
                <li className="flex items-center gap-2">
                  <svg width="16" height="14" viewBox="-8 -7 16 14" aria-hidden>
                    <path d="M-7 1 L0 -6 L7 1 V7 H-7Z" style={{ fill: "var(--green-bright)", stroke: "var(--green)" }} />
                  </svg>
                  Inside the area: higher priority
                </li>
                <li className="flex items-center gap-2">
                  <svg width="16" height="14" viewBox="-8 -7 16 14" aria-hidden>
                    <path d="M-7 1 L0 -6 L7 1 V7 H-7Z" style={{ fill: "var(--card)", stroke: "var(--control)" }} />
                  </svg>
                  Outside: considered after
                </li>
              </>
            ) : mode === "distance_only" ? (
              <li>Darker homes are nearer; numbers show the first few in distance order. The rings are guides for your eye, not boundaries.</li>
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
