"use client";

import { useEffect, useId, useRef, useState } from "react";
import { clsx } from "clsx";

export type Unit = "score" | "percent" | "count" | "points" | "va";
export type Tone = "school" | "benchmark" | "third";

export interface ChartPoint {
  x: string;
  y: number | null;
  note?: string;
}
export interface ChartSeries {
  key: string;
  label: string;
  /** Short name for the direct label at the line's end; the legend carries the full one. */
  short?: string;
  tone: Tone;
  points: ChartPoint[];
}

const TONE: Record<Tone, { color: string; dash?: string; marker: "circle" | "square" | "diamond" }> = {
  school: { color: "var(--series-1)", marker: "circle" },
  benchmark: { color: "var(--series-2)", dash: "6 5", marker: "square" },
  third: { color: "var(--series-3)", dash: "2 4", marker: "diamond" },
};

export function formatValue(v: number | null | undefined, unit: Unit, decimals: number): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  if (unit === "count") return Math.round(v).toLocaleString("en-GB");
  if (unit === "percent") return `${v.toFixed(decimals)}%`;
  if (unit === "va") return `${v > 0 ? "+" : ""}${v.toFixed(decimals)}`;
  return v.toFixed(decimals);
}

function niceTicks(min: number, max: number, count = 4) {
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const span = max - min;
  const step0 = span / count;
  const mag = 10 ** Math.floor(Math.log10(step0));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= step0) ?? step0;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Number(v.toFixed(10)));
  return ticks;
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.round(e!.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

function Marker({ kind, x, y, color, filled = true, size = 4 }: { kind: "circle" | "square" | "diamond"; x: number; y: number; color: string; filled?: boolean; size?: number }) {
  const style = { fill: filled ? color : "var(--card)", stroke: color, strokeWidth: 1.6 };
  if (kind === "square") return <rect x={x - size} y={y - size} width={size * 2} height={size * 2} style={style} />;
  if (kind === "diamond") return <path d={`M${x} ${y - size - 1}L${x + size + 1} ${y}L${x} ${y + size + 1}L${x - size - 1} ${y}Z`} style={style} />;
  return <circle cx={x} cy={y} r={size} style={style} />;
}

export function Legend({ series }: { series: { label: string; tone: Tone }[] }) {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-small text-ink-2">
      {series.map((s) => {
        const t = TONE[s.tone];
        return (
          <li key={s.label} className="inline-flex items-center gap-2">
            <svg width="30" height="12" aria-hidden>
              <line x1="1" x2="29" y1="6" y2="6" strokeWidth="2" strokeDasharray={t.dash} style={{ stroke: t.color }} />
              <Marker kind={t.marker} x={15} y={6} color={t.color} size={3.5} />
            </svg>
            {s.label}
          </li>
        );
      })}
    </ul>
  );
}

/** Data table alternative for any chart. */
export function ChartTable({ xs, series, unit, decimals, caption, xLabel = "Year" }: { xs: string[]; series: ChartSeries[]; unit: Unit; decimals: number; caption: string; xLabel?: string }) {
  return (
    <details className="group/t mt-3">
      <summary className="inline-flex min-h-10 items-center gap-2 text-[0.95rem] font-semibold text-green hover:text-green-deep">
        <span className="underline decoration-green/40 underline-offset-4 group-hover/t:decoration-current">Show the data as a table</span>
      </summary>
      <div className="mt-2 overflow-x-auto rounded-[5px] border border-rule bg-card" role="region" aria-label={caption} tabIndex={0}>
        <table className="w-full min-w-[420px] text-[0.95rem]">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              <th scope="col" className="border-b border-rule-strong px-3 py-2 text-left font-semibold text-ink-2">
                {xLabel}
              </th>
              {series.map((s) => (
                <th key={s.key} scope="col" className="border-b border-rule-strong px-3 py-2 text-right font-semibold text-ink-2">
                  {s.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="num">
            {xs.map((x) => (
              <tr key={x}>
                <th scope="row" className="border-b border-rule px-3 py-2 text-left font-semibold">
                  {x}
                </th>
                {series.map((s) => {
                  const p = s.points.find((pt) => pt.x === x);
                  return (
                    <td key={s.key} className="border-b border-rule px-3 py-2 text-right">
                      {p?.y !== null && p?.y !== undefined ? formatValue(p.y, unit, decimals) : <span className="text-ink-2">{p?.note ?? "Not published"}</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

/** Trend lines with benchmarks. Gaps stay gaps; benchmarks are dashed with their own markers. */
export function LineChart({ xs, series, unit, decimals, label, height = 260, zero = false, table = true }: { xs: string[]; series: ChartSeries[]; unit: Unit; decimals: number; label: string; height?: number; zero?: boolean; table?: boolean }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const id = useId();
  const wide = width >= 560;
  const m = { t: 16, r: wide ? 150 : 14, b: 30, l: 46 };
  const values = series.flatMap((s) => s.points.map((p) => p.y)).filter((v): v is number => v !== null);
  const ticks = niceTicks(zero ? Math.min(0, ...values) : Math.min(...values), Math.max(...values));
  const y0 = ticks[0]!;
  const y1 = ticks.at(-1)!;
  const iw = Math.max(10, width - m.l - m.r);
  const ih = height - m.t - m.b;
  const X = (i: number) => m.l + (xs.length === 1 ? iw / 2 : (i / (xs.length - 1)) * iw);
  const Y = (v: number) => m.t + ih - ((v - y0) / (y1 - y0)) * ih;

  const paths = series.map((s) => {
    const segs: string[] = [];
    let cur = "";
    xs.forEach((x, i) => {
      const p = s.points.find((pt) => pt.x === x);
      if (p?.y === null || p?.y === undefined) {
        if (cur) segs.push(cur);
        cur = "";
      } else cur += `${cur ? "L" : "M"}${X(i).toFixed(1)} ${Y(p.y).toFixed(1)}`;
    });
    if (cur) segs.push(cur);
    return segs;
  });

  // Direct labels at each series' last value, nudged apart.
  const ends = series
    .map((s) => {
      const lastIdx = xs.map((x) => s.points.find((p) => p.x === x)?.y ?? null).findLastIndex((v) => v !== null);
      const v = lastIdx >= 0 ? s.points.find((p) => p.x === xs[lastIdx])!.y! : null;
      return { s, y: v === null ? null : Y(v), v };
    })
    .filter((e) => e.y !== null)
    .sort((a, b) => a.y! - b.y!);
  for (let i = 1; i < ends.length; i++) if (ends[i]!.y! - ends[i - 1]!.y! < 18) ends[i]!.y = ends[i - 1]!.y! + 18;

  const summary = `${label}. ${series.map((s) => `${s.label}: ${s.points.filter((p) => p.y !== null).map((p) => `${p.x} ${formatValue(p.y, unit, decimals)}`).join(", ")}`).join(". ")}.`;

  return (
    <div className="min-w-0">
      <Legend series={series} />
      <div
        ref={ref}
        className="relative mt-3 rounded-[4px] outline-offset-4"
        style={{ height }}
        tabIndex={0}
        role="group"
        aria-label={`${label}. Use the left and right arrow keys to read values.`}
        aria-describedby={`${id}-sum`}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") setActive((a) => Math.min(xs.length - 1, (a ?? -1) + 1));
          else if (e.key === "ArrowLeft") setActive((a) => Math.max(0, (a ?? xs.length) - 1));
          else if (e.key === "Escape") setActive(null);
        }}
        onBlur={() => setActive(null)}
      >
        <p id={`${id}-sum`} className="sr-only">
          {summary}
        </p>
        {width ? (
          <svg width={width} height={height} className="block overflow-visible" aria-hidden>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={m.l} x2={m.l + iw} y1={Y(t)} y2={Y(t)} style={{ stroke: t === 0 && y0 < 0 ? "var(--chart-axis)" : "var(--chart-grid)" }} />
                <text x={m.l - 8} y={Y(t) + 4} textAnchor="end" className="fill-[var(--ink-2)] font-mono text-[12px]">
                  {formatValue(t, unit, unit === "count" ? 0 : Math.min(decimals, 1))}
                </text>
              </g>
            ))}
            {xs.map((x, i) => (xs.length <= 8 || i % Math.ceil(xs.length / 8) === 0 || i === xs.length - 1 ? (
              <text key={x} x={X(i)} y={height - 8} textAnchor="middle" className="fill-[var(--ink-2)] font-mono text-[12px]">
                {x}
              </text>
            ) : null))}
            {active !== null ? <line x1={X(active)} x2={X(active)} y1={m.t} y2={m.t + ih} strokeWidth="1" style={{ stroke: "var(--ink-3)" }} /> : null}
            {series.map((s, si) =>
              paths[si]!.map((d, k) => (
                <path
                  key={`${s.key}-${k}`}
                  d={d}
                  fill="none"
                  strokeWidth={s.tone === "school" ? 2.5 : 2}
                  strokeDasharray={TONE[s.tone].dash}
                  strokeLinejoin="round"
                  pathLength={TONE[s.tone].dash ? undefined : 1}
                  style={{
                    stroke: TONE[s.tone].color,
                    ...(TONE[s.tone].dash ? { animation: "fade var(--d-4) var(--ease-out) both" } : { strokeDasharray: 1, ["--len" as string]: 1, animation: "draw var(--d-4) var(--ease-out) both" }),
                  }}
                />
              )),
            )}
            {series.map((s) =>
              xs.map((x, i) => {
                const p = s.points.find((pt) => pt.x === x);
                if (p?.y === null || p?.y === undefined) return null;
                return <Marker key={`${s.key}-${x}`} kind={TONE[s.tone].marker} x={X(i)} y={Y(p.y)} color={TONE[s.tone].color} filled={active === i || s.tone === "school"} size={active === i ? 5 : 3.8} />;
              }),
            )}
            {wide
              ? ends.map((e) => (
                  <text key={e.s.key} x={m.l + iw + 10} y={e.y! + 4} className="fill-[var(--ink)] text-[13px] font-semibold">
                    {formatValue(e.v, unit, decimals)} <tspan className="fill-[var(--ink-2)] font-normal">{(() => {
                      const t = e.s.short ?? e.s.label;
                      return t.length > 16 ? `${t.slice(0, 15)}…` : t;
                    })()}</tspan>
                  </text>
                ))
              : null}
            {/* Pointer capture */}
            <rect
              x={m.l - 10}
              y={m.t}
              width={iw + 20}
              height={ih}
              fill="transparent"
              onPointerMove={(e) => {
                const r = (e.currentTarget as SVGRectElement).getBoundingClientRect();
                const rel = (e.clientX - r.left - 10) / iw;
                setActive(Math.max(0, Math.min(xs.length - 1, Math.round(rel * (xs.length - 1)))));
              }}
              onPointerLeave={() => setActive(null)}
            />
          </svg>
        ) : null}
        {active !== null && width ? (
          <div
            className="pointer-events-none absolute top-0 z-10 min-w-[11rem] rounded-[5px] border border-rule bg-card px-3 py-2 text-small shadow-lift transition-[left] duration-[var(--d-1)] ease-out"
            style={{ left: Math.min(Math.max(0, X(active) - 88), width - 180) }}
          >
            <p className="font-mono text-[0.8rem] text-ink-2">{xs[active]}</p>
            {series.map((s) => {
              const p = s.points.find((pt) => pt.x === xs[active]);
              return (
                <p key={s.key} className="mt-0.5 flex items-baseline justify-between gap-4">
                  <span className="text-ink-2">{s.label}</span>
                  <span className="font-semibold text-ink num">{p?.y !== null && p?.y !== undefined ? formatValue(p.y, unit, decimals) : (p?.note ?? "—")}</span>
                </p>
              );
            })}
          </div>
        ) : null}
      </div>
      {table ? <ChartTable xs={xs} series={series} unit={unit} decimals={decimals} caption={label} /> : null}
    </div>
  );
}

/** Grouped bars for counts by year (e.g. first preferences and offers). */
export function GroupedBars({ xs, series, label, height = 260, unit = "count" }: { xs: string[]; series: ChartSeries[]; label: string; height?: number; unit?: Unit }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const id = useId();
  const m = { t: 14, r: 8, b: 30, l: 52 };
  const values = series.flatMap((s) => s.points.map((p) => p.y)).filter((v): v is number => v !== null);
  const ticks = niceTicks(0, Math.max(1, ...values));
  const top = ticks.at(-1)!;
  const iw = Math.max(10, width - m.l - m.r);
  const ih = height - m.t - m.b;
  const band = iw / xs.length;
  const gap = Math.min(10, band * 0.2);
  const bw = Math.max(2, (band - gap * 2) / series.length - 1);
  const Y = (v: number) => m.t + ih - (v / top) * ih;
  const styles = [
    { fill: "color-mix(in srgb, var(--series-1) 18%, var(--card))", stroke: "var(--series-1)" },
    { fill: "var(--series-2)", stroke: "var(--copper-ink)" },
    { fill: "var(--series-3)", stroke: "var(--series-3)" },
  ];

  return (
    <div className="min-w-0">
      <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-small text-ink-2">
        {series.map((s, i) => (
          <li key={s.key} className="inline-flex items-center gap-2">
            <span aria-hidden className="inline-block h-3 w-4 rounded-[1px] border-[1.5px]" style={{ background: styles[i]!.fill, borderColor: styles[i]!.stroke }} />
            {s.label}
          </li>
        ))}
      </ul>
      <div
        ref={ref}
        className="relative mt-3"
        style={{ height }}
        tabIndex={0}
        role="group"
        aria-label={`${label}. Use the left and right arrow keys to read values.`}
        aria-describedby={`${id}-sum`}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") setActive((a) => Math.min(xs.length - 1, (a ?? -1) + 1));
          else if (e.key === "ArrowLeft") setActive((a) => Math.max(0, (a ?? xs.length) - 1));
          else if (e.key === "Escape") setActive(null);
        }}
        onBlur={() => setActive(null)}
      >
        <p id={`${id}-sum`} className="sr-only">
          {label}. Values are listed in the table below the chart.
        </p>
        {width ? (
          <svg width={width} height={height} className="block" aria-hidden onPointerLeave={() => setActive(null)}>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={m.l} x2={m.l + iw} y1={Y(t)} y2={Y(t)} style={{ stroke: t === 0 ? "var(--chart-axis)" : "var(--chart-grid)" }} />
                <text x={m.l - 8} y={Y(t) + 4} textAnchor="end" className="fill-[var(--ink-2)] font-mono text-[12px]">
                  {formatValue(t, unit, 0)}
                </text>
              </g>
            ))}
            {xs.map((x, i) => {
              const bx = m.l + i * band + gap;
              return (
                <g key={x} onPointerEnter={() => setActive(i)}>
                  <rect x={m.l + i * band} y={m.t} width={band} height={ih} fill="transparent" />
                  {active === i ? <rect x={m.l + i * band + 1} y={m.t} width={band - 2} height={ih} style={{ fill: "var(--sage)", opacity: 0.6 }} /> : null}
                  {series.map((s, si) => {
                    const v = s.points.find((p) => p.x === x)?.y;
                    if (v === null || v === undefined) return null;
                    const y = Y(v);
                    return (
                      <rect
                        key={s.key}
                        x={bx + si * (bw + 1)}
                        y={y}
                        width={bw}
                        height={Math.max(0, m.t + ih - y)}
                        rx={Math.min(2, bw / 4)}
                        strokeWidth={1.2}
                        style={{ ...styles[si], transformOrigin: `0 ${m.t + ih}px`, animation: `rise var(--d-4) var(--ease-out) ${i * 25}ms both` }}
                      />
                    );
                  })}
                  {xs.length <= 10 || i % 2 === 0 || i === xs.length - 1 ? (
                    <text x={m.l + i * band + band / 2} y={height - 8} textAnchor="middle" className="fill-[var(--ink-2)] font-mono text-[12px]">
                      {x}
                    </text>
                  ) : null}
                </g>
              );
            })}
          </svg>
        ) : null}
        {active !== null && width ? (
          <div className="pointer-events-none absolute top-0 z-10 min-w-[12rem] rounded-[5px] border border-rule bg-card px-3 py-2 text-small shadow-lift" style={{ left: Math.min(Math.max(0, m.l + active * band + band / 2 - 96), width - 196) }}>
            <p className="font-mono text-[0.8rem] text-ink-2">{xs[active]}</p>
            {series.map((s) => {
              const v = s.points.find((p) => p.x === xs[active])?.y;
              return (
                <p key={s.key} className="mt-0.5 flex items-baseline justify-between gap-4">
                  <span className="text-ink-2">{s.label}</span>
                  <span className="font-semibold text-ink num">{formatValue(v, unit, 0)}</span>
                </p>
              );
            })}
          </div>
        ) : null}
      </div>
      <ChartTable xs={xs} series={series} unit={unit} decimals={0} caption={label} xLabel="Entry" />
    </div>
  );
}

/** Inline trend glyph; the text beside it carries the numbers. */
export function Sparkline({ values, width = 120, height = 34, className }: { values: (number | null)[]; width?: number; height?: number; className?: string }) {
  const pts = values.map((v, i) => ({ v, i })).filter((p): p is { v: number; i: number } => p.v !== null);
  if (pts.length < 2) return null;
  const min = Math.min(...pts.map((p) => p.v));
  const max = Math.max(...pts.map((p) => p.v));
  const X = (i: number) => 3 + (i / (values.length - 1)) * (width - 6);
  const Y = (v: number) => height - 4 - ((v - min) / (max - min || 1)) * (height - 8);
  const d = pts.map((p, k) => `${k ? "L" : "M"}${X(p.i).toFixed(1)} ${Y(p.v).toFixed(1)}`).join("");
  const last = pts.at(-1)!;
  return (
    <svg width={width} height={height} aria-hidden className={clsx("overflow-visible", className)}>
      <path d={d} fill="none" strokeWidth="1.8" style={{ stroke: "var(--series-1)" }} />
      <circle cx={X(last.i)} cy={Y(last.v)} r="3" style={{ fill: "var(--series-1)" }} />
    </svg>
  );
}
