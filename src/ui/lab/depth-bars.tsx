"use client";

import { useId, useState } from "react";
import { clsx } from "clsx";
import { formatNumber } from "@/lib/format";

/**
 * Approach A — depth without 3D. The same grouped bars, given a light source:
 * layered soft shadows, a top-lit gradient, rounded data ends and a rise-in.
 * Every value still reads against a flat, zero-based axis.
 */
export function DepthBars({ xs, series, label }: { xs: string[]; series: { key: string; label: string; values: (number | null)[] }[]; label: string }) {
  const id = useId().replace(/:/g, "");
  const [active, setActive] = useState<number | null>(null);
  const W = 500;
  const H = 270;
  const m = { t: 18, r: 4, b: 30, l: 50 };
  const iw = W - m.l - m.r;
  const ih = H - m.t - m.b;
  const max = Math.max(1, ...series.flatMap((s) => s.values.filter((v): v is number => v !== null)));
  const step = Math.pow(10, Math.floor(Math.log10(max))) / 2;
  const top = Math.ceil(max / step) * step;
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step).filter((_, i, a) => a.length <= 7 || i % 2 === 0);
  const band = iw / xs.length;
  const bw = Math.min(30, (band * 0.62) / series.length);
  const Y = (v: number) => m.t + ih - (v / top) * ih;
  const tones = [
    { a: "var(--green)", b: "var(--green-deep)" },
    { a: "var(--copper)", b: "var(--copper-ink)" },
  ];

  return (
    <figure className="m-0">
      <ul className="mb-3 flex flex-wrap gap-x-5 gap-y-1.5 text-small text-ink-2">
        {series.map((s, i) => (
          <li key={s.key} className="inline-flex items-center gap-2">
            <span aria-hidden className="inline-block size-3 rounded-[3px] shadow-[0_1px_2px_rgb(10_12_16/0.25)]" style={{ background: `linear-gradient(${tones[i]!.a}, ${tones[i]!.b})` }} />
            {s.label}
          </li>
        ))}
      </ul>
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full overflow-visible" role="img" aria-label={label}>
        <defs>
          {tones.map((t, i) => (
            <linearGradient key={i} id={`${id}g${i}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" style={{ stopColor: t.a }} />
              <stop offset="1" style={{ stopColor: t.b }} />
            </linearGradient>
          ))}
          {/* Three stacked shadows from one light source above-left, after Comeau's shadow palette */}
          <filter id={`${id}s`} x="-30%" y="-10%" width="160%" height="130%">
            <feDropShadow dx="0.5" dy="1" stdDeviation="0.6" floodColor="#0a0c10" floodOpacity="0.18" />
            <feDropShadow dx="1.5" dy="3" stdDeviation="2" floodColor="#0a0c10" floodOpacity="0.14" />
            <feDropShadow dx="4" dy="8" stdDeviation="6" floodColor="#2c0b8e" floodOpacity="0.12" />
          </filter>
          <linearGradient id={`${id}sheen`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#fff" stopOpacity="0.28" />
            <stop offset="0.45" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={m.l} x2={W - m.r} y1={Y(t)} y2={Y(t)} strokeDasharray={t === 0 ? undefined : "2 4"} style={{ stroke: t === 0 ? "var(--chart-axis)" : "var(--chart-grid)" }} />
            <text x={m.l - 10} y={Y(t) + 4} textAnchor="end" className="fill-[var(--ink-3)] font-mono text-[10.5px]">
              {formatNumber(t)}
            </text>
          </g>
        ))}
        {xs.map((x, xi) => {
          const cx = m.l + band * xi + band / 2;
          const groupW = bw * series.length + 4 * (series.length - 1);
          const on = active === xi;
          return (
            <g key={x} onPointerEnter={() => setActive(xi)} onPointerLeave={() => setActive(null)} style={{ transform: on ? "translateY(-3px)" : undefined, transition: "transform var(--d-2) var(--ease-out)" }}>
              <rect x={cx - band / 2} y={m.t} width={band} height={ih} fill="transparent" />
              {series.map((s, si) => {
                const v = s.values[xi];
                if (v === null || v === undefined) return null;
                const x0 = cx - groupW / 2 + si * (bw + 4);
                const y0 = Y(v);
                const h = Y(0) - y0;
                const r = Math.min(5, bw / 2, h);
                const d = `M${x0},${Y(0)} V${y0 + r} Q${x0},${y0} ${x0 + r},${y0} H${x0 + bw - r} Q${x0 + bw},${y0} ${x0 + bw},${y0 + r} V${Y(0)} Z`;
                return (
                  <g key={s.key} className="lab-rise" style={{ animationDelay: `${xi * 70 + si * 40}ms`, transformOrigin: `0 ${Y(0)}px` }}>
                    <path d={d} fill={`url(#${id}g${si})`} filter={`url(#${id}s)`} />
                    <path d={d} fill={`url(#${id}sheen)`} />
                  </g>
                );
              })}
              <text x={cx} y={H - 12} textAnchor="middle" className={clsx("font-mono text-[10.5px]", on ? "fill-[var(--ink)]" : "fill-[var(--ink-2)]")}>
                {x}
              </text>
              {on ? (
                <g className="pointer-events-none">
                  <rect x={cx - 66} y={m.t - 14} width={132} height={series.length * 17 + 10} rx="6" filter={`url(#${id}s)`} style={{ fill: "var(--card)" }} />
                  {series.map((s, si) => (
                    <text key={s.key} x={cx - 56} y={m.t + 2 + si * 17} className="fill-[var(--ink)] text-[12px]">
                      {s.label.split(" ")[0]}: <tspan className="font-mono font-semibold">{s.values[xi] === null ? "—" : formatNumber(s.values[xi]!)}</tspan>
                    </text>
                  ))}
                </g>
              ) : null}
            </g>
          );
        })}
      </svg>
    </figure>
  );
}
