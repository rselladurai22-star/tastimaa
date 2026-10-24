"use client";

import { useId, useMemo, useRef, useState } from "react";

export interface TrendSeries {
  key: string;
  label: string;
  /** CSS variable name for the series colour, e.g. "--series-1". */
  color: string;
  points: { x: string; y: number | null; note?: string }[];
}

/**
 * Line chart for year-on-year official figures. One y-axis only; 2px lines,
 * ringed markers, hairline grid, crosshair + tooltip on hover/focus, and a
 * data table so nothing depends on colour or pointer input.
 */
export function TrendChart({
  title,
  series,
  xs,
  unit = "score",
  decimals = 1,
  yMin,
  yMax,
  height = 240,
  caption,
}: {
  title: string;
  series: TrendSeries[];
  xs: string[];
  unit?: "score" | "percent" | "count" | "points" | "va";
  decimals?: number;
  yMin?: number;
  yMax?: number;
  height?: number;
  caption?: string;
}) {
  const id = useId();
  const format = (v: number) => {
    const f = unit === "count" ? Math.round(v).toLocaleString("en-GB") : v.toFixed(decimals);
    if (unit === "percent") return `${f}%`;
    if (unit === "va" && v > 0) return `+${f}`;
    return f;
  };
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const width = 640;
  const pad = { top: 16, right: 24, bottom: 28, left: 44 };

  const { min, max, ticks } = useMemo(() => {
    const vals = series.flatMap((s) => s.points.map((p) => p.y)).filter((v): v is number => v !== null);
    let lo = yMin ?? Math.min(...vals);
    let hi = yMax ?? Math.max(...vals);
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) return { min: 0, max: 1, ticks: [0, 1] };
    if (lo === hi) {
      lo -= 1;
      hi += 1;
    }
    const span = hi - lo;
    const raw = span / 4;
    const mag = 10 ** Math.floor(Math.log10(raw));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
    const start = yMin ?? Math.floor(lo / step) * step;
    const end = yMax ?? Math.ceil(hi / step) * step;
    const t: number[] = [];
    for (let v = start; v <= end + step / 1000; v += step) t.push(Number(v.toFixed(6)));
    return { min: start, max: end, ticks: t };
  }, [series, yMin, yMax]);

  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const x = (i: number) => pad.left + (xs.length <= 1 ? innerW / 2 : (i / (xs.length - 1)) * innerW);
  const y = (v: number) => pad.top + innerH - ((v - min) / (max - min || 1)) * innerH;

  function paths(s: TrendSeries) {
    const segs: string[] = [];
    let cur = "";
    xs.forEach((xv, i) => {
      const p = s.points.find((pt) => pt.x === xv);
      if (p && p.y !== null) cur += `${cur ? "L" : "M"}${x(i).toFixed(1)},${y(p.y).toFixed(1)}`;
      else if (cur) {
        segs.push(cur);
        cur = "";
      }
    });
    if (cur) segs.push(cur);
    return segs;
  }

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = ((e.clientX - rect.left) / rect.width) * width;
    let best = 0;
    let bestD = Infinity;
    xs.forEach((_, i) => {
      const d = Math.abs(x(i) - px);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    setHover(best);
  }

  const hx = hover !== null ? xs[hover] : null;

  return (
    <figure className="rounded-xl border border-line bg-[var(--chart-surface)] p-4">
      <figcaption className="mb-2">
        <span className="block text-sm font-semibold text-ink">{title}</span>
        {caption ? <span className="block text-xs text-ink-3">{caption}</span> : null}
      </figcaption>
      {series.length > 1 ? (
        <ul className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2" aria-label="Legend">
          {series.map((s) => (
            <li key={s.key} className="flex items-center gap-1.5">
              <svg width="18" height="8" aria-hidden>
                <line x1="1" y1="4" x2="17" y2="4" stroke={`var(${s.color})`} strokeWidth="2" strokeLinecap="round" />
                <circle cx="9" cy="4" r="3" fill={`var(${s.color})`} />
              </svg>
              {s.label}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className="h-auto w-full touch-none select-none"
          role="img"
          aria-labelledby={`${id}-desc`}
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") setHover((h) => Math.min(xs.length - 1, (h ?? -1) + 1));
            if (e.key === "ArrowLeft") setHover((h) => Math.max(0, (h ?? xs.length) - 1));
            if (e.key === "Escape") setHover(null);
          }}
          onBlur={() => setHover(null)}
        >
          <desc id={`${id}-desc`}>
            {title}. {series.map((s) => `${s.label}: ${s.points.map((p) => `${p.x} ${p.y === null ? "not published" : format(p.y)}`).join(", ")}`).join(". ")}
          </desc>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} stroke="var(--grid)" strokeWidth="1" />
              <text x={pad.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-[var(--ink-3)] text-[11px] tabular">
                {format(t)}
              </text>
            </g>
          ))}
          <line x1={pad.left} x2={width - pad.right} y1={pad.top + innerH} y2={pad.top + innerH} stroke="var(--axis)" strokeWidth="1" />
          {xs.map((xv, i) => (
            <text key={xv} x={x(i)} y={height - 8} textAnchor="middle" className="fill-[var(--ink-3)] text-[11px] tabular">
              {xv}
            </text>
          ))}
          {hover !== null ? <line x1={x(hover)} x2={x(hover)} y1={pad.top} y2={pad.top + innerH} stroke="var(--axis)" strokeWidth="1" /> : null}
          {series.map((s) => (
            <g key={s.key}>
              {paths(s).map((d, i) => (
                <path key={i} d={d} fill="none" stroke={`var(${s.color})`} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
              ))}
              {xs.map((xv, i) => {
                const p = s.points.find((pt) => pt.x === xv);
                if (!p || p.y === null) return null;
                return <circle key={xv} cx={x(i)} cy={y(p.y)} r={hover === i ? 5.5 : 4} fill={`var(${s.color})`} stroke="var(--chart-surface)" strokeWidth="2" />;
              })}
            </g>
          ))}
          <rect x={pad.left} y={pad.top} width={innerW} height={innerH} fill="transparent" />
        </svg>
        {hx !== null && hover !== null ? (
          <div
            role="status"
            className="pointer-events-none absolute top-2 z-10 min-w-40 rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-[var(--shadow-md)]"
            style={{ left: `${(x(hover) / width) * 100}%`, transform: x(hover) > width * 0.6 ? "translateX(calc(-100% - 12px))" : "translateX(12px)" }}
          >
            <p className="mb-1 font-semibold text-ink">{hx}</p>
            <ul className="grid gap-0.5">
              {series.map((s) => {
                const p = s.points.find((pt) => pt.x === hx);
                return (
                  <li key={s.key} className="flex items-center justify-between gap-3 text-ink-2">
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block size-2 rounded-full" style={{ background: `var(${s.color})` }} aria-hidden />
                      {s.label}
                    </span>
                    <span className="font-semibold text-ink tabular">{p && p.y !== null ? format(p.y) : "Not published"}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </div>
      <details className="mt-3 text-xs">
        <summary className="cursor-pointer font-medium text-ink-2 hover:text-ink">Show the data as a table</summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left">
            <caption className="sr-only">{title}</caption>
            <thead>
              <tr className="border-b border-line text-ink-3">
                <th scope="col" className="py-1.5 pr-4 font-medium">
                  Year
                </th>
                {series.map((s) => (
                  <th key={s.key} scope="col" className="py-1.5 pr-4 font-medium">
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {xs.map((xv) => (
                <tr key={xv} className="border-b border-line/60">
                  <th scope="row" className="py-1.5 pr-4 font-medium text-ink-2">
                    {xv}
                  </th>
                  {series.map((s) => {
                    const p = s.points.find((pt) => pt.x === xv);
                    return (
                      <td key={s.key} className="py-1.5 pr-4 text-ink tabular">
                        {p && p.y !== null ? format(p.y) : <span className="text-ink-3">{p?.note ?? "Not published"}</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
