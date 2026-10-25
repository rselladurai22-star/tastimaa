"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { clsx } from "clsx";

export interface KNode {
  id: string;
  label: string;
  href: string;
  kind: "guide" | "exam" | "tool";
  x: number;
  y: number;
  note: string;
}

const KIND = {
  guide: { name: "Admissions guide", fill: "#c9c9ff", stroke: "#8f8fff" },
  exam: { name: "11+ exams", fill: "#ffc2da", stroke: "#ff4d8f" },
  tool: { name: "Research tool", fill: "#ffe9a3", stroke: "#ffd23f" },
} as const;

// A fixed, seeded star field so the sky is the same on every render.
const STARS = (() => {
  let seed = 7;
  const r = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  return Array.from({ length: 140 }, () => ({ x: r() * 760, y: r() * 400, s: r() * 1.1 + 0.3, d: r() * 4 }));
})();

function Shape({ kind, x, y, r, active }: { kind: KNode["kind"]; x: number; y: number; r: number; active: boolean }) {
  const s = { fill: active ? "#ffffff" : KIND[kind].fill, stroke: KIND[kind].stroke, strokeWidth: 1.6, filter: "url(#km-glow)", transition: "fill var(--d-2) var(--ease-out)" };
  if (kind === "exam") return <path d={`M${x} ${y - r - 2}L${x + r + 2} ${y}L${x} ${y + r + 2}L${x - r - 2} ${y}Z`} style={s} />;
  if (kind === "tool") return <rect x={x - r} y={y - r} width={r * 2} height={r * 2} rx={2} style={s} />;
  return <circle cx={x} cy={y} r={r} style={s} />;
}

/** Network of guides, exam pages and tools, joined by the links between them. */
export function KnowledgeMap({ nodes, edges }: { nodes: KNode[]; edges: [string, string][] }) {
  const [active, setActive] = useState<string | null>(null);
  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const neighbours = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const [a, b] of edges) {
      m.set(a, (m.get(a) ?? new Set()).add(b));
      m.set(b, (m.get(b) ?? new Set()).add(a));
    }
    return m;
  }, [edges]);
  const near = active ? neighbours.get(active) : null;
  const current = active ? byId.get(active) : null;

  return (
    <div>
      <div className="playground hidden overflow-hidden md:block">
        <svg viewBox="0 0 760 400" className="block h-auto w-full" role="group" aria-label="Map of guides, exam pages and tools, connected where they link to each other">
          {/* A night sky: topics are stars, links are the constellation lines between them */}
          <defs>
            <radialGradient id="km-sky" cx="40%" cy="30%" r="80%">
              <stop offset="0" stopColor="#1b1f4a" />
              <stop offset="0.55" stopColor="#0f1226" />
              <stop offset="1" stopColor="#07080f" />
            </radialGradient>
            <radialGradient id="km-nebula" cx="70%" cy="65%" r="40%">
              <stop offset="0" stopColor="#e60067" stopOpacity="0.18" />
              <stop offset="1" stopColor="#e60067" stopOpacity="0" />
            </radialGradient>
            <filter id="km-glow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="3.5" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <rect width="760" height="400" fill="url(#km-sky)" />
          <rect width="760" height="400" fill="url(#km-nebula)" />
          {STARS.map((st, i) => (
            <circle key={i} cx={st.x} cy={st.y} r={st.s} className="km-twinkle" style={{ fill: "#fff", animationDelay: `${st.d}s` }} />
          ))}
          {edges.map(([a, b]) => {
            const A = byId.get(a);
            const B = byId.get(b);
            if (!A || !B) return null;
            const lit = active && (a === active || b === active);
            const mx = (A.x + B.x) / 2;
            const my = (A.y + B.y) / 2 - 18;
            return (
              <path
                key={`${a}-${b}`}
                d={`M${A.x} ${A.y} Q${mx} ${my} ${B.x} ${B.y}`}
                fill="none"
                strokeWidth={lit ? 2 : 1}
                strokeDasharray={lit ? "6 6" : undefined}
                className={lit ? "km-flow" : undefined}
                style={{ stroke: lit ? "#ffd23f" : "#8f9bd6", opacity: active && !lit ? 0.15 : lit ? 1 : 0.45, filter: lit ? "drop-shadow(0 0 4px #ffd23f)" : undefined, transition: "stroke var(--d-2), opacity var(--d-2), stroke-width var(--d-2)" }}
              />
            );
          })}
          {nodes.map((n) => {
            const on = active === n.id;
            const dim = active && !on && !near?.has(n.id);
            return (
              <a key={n.id} href={n.href} onPointerEnter={() => setActive(n.id)} onPointerLeave={() => setActive(null)} onFocus={() => setActive(n.id)} onBlur={() => setActive(null)} className="outline-none [&:focus-visible>text]:underline" aria-label={`${n.label} — ${n.note}`}>
                <g style={{ opacity: dim ? 0.35 : 1, transition: "opacity var(--d-2) var(--ease-out)" }}>
                  <Shape kind={n.kind} x={n.x} y={n.y} r={on ? 10 : 8} active={on} />
                  <text x={n.x} y={n.y + 27} textAnchor="middle" className={clsx("text-[13.5px]", on ? "fill-[#ffffff] font-semibold" : "fill-[#d9def0]")} style={{ paintOrder: "stroke", stroke: "#0b0d1c", strokeWidth: 5 }}>
                    {n.label}
                  </text>
                </g>
              </a>
            );
          })}
        </svg>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule bg-paper px-4 py-3">
          <ul className="flex flex-wrap gap-x-5 gap-y-1 text-small text-ink-2">
            {(Object.keys(KIND) as KNode["kind"][]).map((k) => (
              <li key={k} className="inline-flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 20 20" aria-hidden>
                  <Shape kind={k} x={10} y={10} r={6} active={false} />
                </svg>
                {KIND[k].name}
              </li>
            ))}
          </ul>
          <p className="min-h-6 text-small text-ink-2" aria-live="polite">
            {current ? (
              <>
                <strong className="text-ink">{current.label}:</strong> {current.note}
              </>
            ) : (
              "Point at a topic to trace its connections."
            )}
          </p>
        </div>
      </div>
      {/* Small screens: the same relationships as a list */}
      <ul className="grid gap-3 md:hidden">
        {nodes.map((n) => (
          <li key={n.id} className="border-b border-rule pb-3">
            <Link href={n.href} className="font-semibold text-ink underline decoration-green/40 underline-offset-4">
              {n.label}
            </Link>
            <p className="text-small text-ink-2">{n.note}</p>
            {neighbours.get(n.id)?.size ? (
              <p className="mt-1 text-small text-ink-2">
                Connects to: {[...neighbours.get(n.id)!].map((id) => byId.get(id)?.label).filter(Boolean).join(" · ")}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
