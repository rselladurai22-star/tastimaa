"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";
import { clsx } from "clsx";
import type { Column } from "./three/atlas-3d";
import { useWebGL } from "./three/support";

const Atlas3D = dynamic(() => import("./three/atlas-3d"), { ssr: false });

export interface AtlasPoint {
  slug: string;
  name: string;
  lat: number;
  lng: number;
  group: string;
  groupName: string;
  town: string | null;
}

/**
 * The atlas itself: every listed school plotted from its official coordinates.
 * No coastline is drawn — the outline you see is formed by the schools.
 */
export function AtlasMap({
  points,
  groups,
  className,
  legend = true,
  spotlight,
  label,
}: {
  points: AtlasPoint[];
  groups: { slug: string; name: string; n: number }[];
  className?: string;
  legend?: boolean;
  /** Slugs to light up in copper; every other school recedes. */
  spotlight?: string[];
  label?: string;
}) {
  const [focus, setFocus] = useState<string | null>(null);
  const [hover, setHover] = useState<AtlasPoint | null>(null);
  const webgl = useWebGL();

  const geo = useMemo(() => {
    const lats = points.map((p) => p.lat);
    const lngs = points.map((p) => p.lng);
    const minLat = Math.floor(Math.min(...lats) * 2) / 2 - 0.25;
    const maxLat = Math.ceil(Math.max(...lats) * 2) / 2 + 0.25;
    const minLng = Math.floor(Math.min(...lngs) * 2) / 2 - 0.25;
    const maxLng = Math.ceil(Math.max(...lngs) * 2) / 2 + 0.25;
    const k = Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180);
    const W = 560;
    const scale = W / ((maxLng - minLng) * k);
    const H = Math.round((maxLat - minLat) * scale);
    const X = (lng: number) => (lng - minLng) * k * scale;
    const Y = (lat: number) => (maxLat - lat) * scale;
    const centroids = new Map<string, { x: number; y: number; n: number }>();
    for (const p of points) {
      const c = centroids.get(p.group) ?? { x: 0, y: 0, n: 0 };
      centroids.set(p.group, { x: c.x + X(p.lng), y: c.y + Y(p.lat), n: c.n + 1 });
    }
    const meridians: number[] = [];
    for (let l = Math.ceil(minLng); l <= maxLng; l++) meridians.push(l);
    const parallels: number[] = [];
    for (let l = Math.ceil(minLat); l <= maxLat; l++) parallels.push(l);
    return { W, H, X, Y, centroids, meridians, parallels, minLat, maxLat };
  }, [points]);

  const order = useMemo(() => [...points].sort((a, b) => b.lat - a.lat), [points]);
  const lit = spotlight ? new Set(spotlight) : null;
  const drawn = lit ? [...order.filter((p) => !lit.has(p.slug)), ...order.filter((p) => lit.has(p.slug))] : order;
  const labelled = lit ? [] : focus ? [focus] : groups.slice(0, 4).map((g) => g.slug);

  // Callout labels: each tries four positions around its cluster and takes the
  // first that collides with neither the plot edge nor an earlier label.
  const placed = (() => {
    const boxes: { x0: number; x1: number; y0: number; y1: number }[] = [];
    const out: { slug: string; name: string; n: number; cx: number; cy: number; ex: number; tx: number; ty: number; anchor: "start" | "end"; focus: boolean }[] = [];
    for (const slug of labelled) {
      const c = geo.centroids.get(slug);
      const g = groups.find((x) => x.slug === slug);
      if (!c || !g) continue;
      const cx = c.x / c.n;
      const cy = c.y / c.n;
      const w = (g.name.length + String(g.n).length + 1) * 7.6;
      const tries = [
        { dx: 44, dy: -26 },
        { dx: -44, dy: -26 },
        { dx: 44, dy: 34 },
        { dx: -44, dy: 34 },
        { dx: 70, dy: 4 },
        { dx: -70, dy: 4 },
        { dx: 60, dy: -48 },
        { dx: -60, dy: -48 },
        { dx: 60, dy: 56 },
        { dx: -60, dy: 56 },
      ];
      // Score each position: hitting an edge or another label rules it out;
      // otherwise prefer the position covering the fewest schools.
      let pick = tries[0]!;
      let best = Infinity;
      let box = { x0: 0, x1: 0, y0: 0, y1: 0 };
      for (const t of tries) {
        const x0 = t.dx > 0 ? cx + t.dx : cx + t.dx - w;
        const x1 = x0 + w;
        const y1 = cy + t.dy + 4;
        const y0 = y1 - 18;
        const inside = x0 > -36 && x1 < geo.W + 14 && y0 > -12;
        const clear = boxes.every((b) => x1 < b.x0 || x0 > b.x1 || y1 < b.y0 || y0 > b.y1);
        const covered = points.filter((p) => {
          const px = geo.X(p.lng);
          const py = geo.Y(p.lat);
          return px > x0 - 3 && px < x1 + 3 && py > y0 - 3 && py < y1 + 3;
        }).length;
        const score = (inside ? 0 : 1000) + (clear ? 0 : 1000) + covered;
        if (score < best) {
          best = score;
          pick = t;
          box = { x0, x1, y0, y1 };
        }
      }
      boxes.push(box);
      const anchor = pick.dx > 0 ? "start" : "end";
      out.push({ slug, name: g.name, n: g.n, cx, cy, ex: cx + pick.dx * 0.6, tx: cx + pick.dx, ty: cy + pick.dy, anchor, focus: false });
    }
    return out;
  })();

  // The same projection, laid flat on a 3D board: column height is how many
  // listed schools lie within roughly 25 km, so clusters rise as skylines.
  const world = useMemo(() => {
    const s = 10 / geo.W;
    const depth = geo.H * s;
    const wx = (x: number) => x * s - 5;
    const wz = (y: number) => y * s - depth / 2;
    const near = points.map((p) => points.filter((q) => Math.hypot((q.lat - p.lat) * 1.6, q.lng - p.lng) < 0.38).length);
    const cols: Column[] = points.map((p, i) => ({ x: wx(geo.X(p.lng)), z: wz(geo.Y(p.lat)), h: 0.14 + Math.sqrt(near[i]!) * 0.36, group: p.group }));
    const lines: [number, number, number, number][] = [
      ...geo.meridians.map((l): [number, number, number, number] => [wx(geo.X(l)), -depth / 2, wx(geo.X(l)), depth / 2]),
      ...geo.parallels.map((l): [number, number, number, number] => [-5, wz(geo.Y(l)), 5, wz(geo.Y(l))]),
    ];
    return { cols, depth, wx, wz, lines };
  }, [points, geo]);
  const cols3d = lit ? world.cols.map((c, i) => ({ ...c, lit: lit.has(points[i]!.slug) })) : world.cols;
  const labels3d = placed.map((l) => ({
    key: l.slug,
    name: l.name,
    n: l.n,
    x: world.wx(l.cx),
    z: world.wz(l.cy),
    h: Math.max(0, ...world.cols.filter((c) => c.group === l.slug).map((c) => c.h)),
  }));
  const hoverIndex = hover ? points.indexOf(hover) : null;

  return (
    <div className={clsx("grid gap-6", legend && "md:grid-cols-[minmax(0,1fr)_14rem] md:items-start", className)}>
      <div className="relative">
        <svg viewBox={`-40 -16 ${geo.W + 56} ${geo.H + 40}`} className={clsx("block h-auto w-full", webgl && "invisible")} role="img" aria-label={label ?? `Map of ${points.length} grammar schools plotted from their official coordinates. Most are in ${groups.slice(0, 3).map((g) => g.name).join(", ")}.`}>
          {/* Graticule: real meridians and parallels */}
          {geo.meridians.map((l) => (
            <g key={`m${l}`}>
              <line x1={geo.X(l)} x2={geo.X(l)} y1={0} y2={geo.H} strokeWidth="1" style={{ stroke: "var(--chart-grid)" }} />
              <text x={geo.X(l)} y={geo.H + 18} textAnchor="middle" className="fill-[var(--ink-3)] font-mono text-[11px]">
                {Math.abs(l)}°{l < 0 ? "W" : l > 0 ? "E" : ""}
              </text>
            </g>
          ))}
          {geo.parallels.map((l) => (
            <g key={`p${l}`}>
              <line x1={0} x2={geo.W} y1={geo.Y(l)} y2={geo.Y(l)} strokeWidth="1" style={{ stroke: "var(--chart-grid)" }} />
              <text x={-6} y={geo.Y(l) + 4} textAnchor="end" className="fill-[var(--ink-3)] font-mono text-[11px]">
                {l}°N
              </text>
            </g>
          ))}
          {drawn.map((p, i) => {
            const on = lit ? lit.has(p.slug) : focus === p.group;
            const dim = lit ? !on : focus && !on;
            return (
              <circle
                key={p.slug}
                cx={geo.X(p.lng)}
                cy={geo.Y(p.lat)}
                r={on ? 3.6 : 2.7}
                onPointerEnter={() => setHover(p)}
                onPointerLeave={() => setHover(null)}
                style={{
                  fill: on ? "var(--copper)" : "var(--green-bright)",
                  stroke: on ? "var(--copper-ink)" : "var(--green)",
                  strokeWidth: 0.8,
                  opacity: dim ? 0.22 : 0.9,
                  transition: "opacity var(--d-2) var(--ease-out), r var(--d-2) var(--ease-out), fill var(--d-2)",
                  animation: `fade var(--d-4) var(--ease-out) ${Math.round((i / order.length) * 700)}ms both`,
                }}
              />
            );
          })}
          {placed.map((l) => (
            <g key={l.slug} className="anim-fade pointer-events-none">
              <circle cx={l.cx} cy={l.cy} r={l.focus ? 0 : 1.6} style={{ fill: "var(--ink)" }} />
              <polyline points={`${l.cx},${l.cy} ${l.ex},${l.ty - 4} ${l.tx + (l.anchor === "start" ? -3 : 3)},${l.ty - 4}`} fill="none" strokeWidth="1" style={{ stroke: "var(--ink-2)" }} />
              <text x={l.tx} y={l.ty} textAnchor={l.anchor} className="fill-[var(--ink)] text-[14px] font-semibold" style={{ paintOrder: "stroke", stroke: "var(--paper)", strokeWidth: 4 }}>
                {l.name} <tspan className="fill-[var(--ink-2)] font-mono text-[12px] font-normal">{l.n}</tspan>
              </text>
            </g>
          ))}
        </svg>
        {webgl ? (
          <>
            <p className="sr-only">{label ?? `Map of ${points.length} grammar schools plotted from their official coordinates. Most are in ${groups.slice(0, 3).map((g) => g.name).join(", ")}.`}</p>
            <Atlas3D cols={cols3d} width={10} depth={world.depth} lines={world.lines} labels={labels3d} focus={focus} hover={hoverIndex !== null && hoverIndex >= 0 ? hoverIndex : null} onHover={(i) => setHover(i === null ? null : (points[i] ?? null))} />
          </>
        ) : null}
        {hover ? (
          <p className="pointer-events-none absolute top-2 left-2 rounded-[4px] border border-rule bg-card px-2.5 py-1.5 text-small shadow-lift">
            <span className="block font-semibold text-ink">{hover.name}</span>
            <span className="text-ink-2">{[hover.town, hover.groupName].filter(Boolean).join(" · ")}</span>
          </p>
        ) : null}
      </div>
      <div className={legend ? undefined : "hidden"}>
        <p className="label mb-2">Schools by region</p>
        <ul className="grid gap-0.5" onPointerLeave={() => setFocus(null)}>
          {groups.map((g) => (
            <li key={g.slug}>
              <Link
                href={`/grammar-schools/${g.slug}`}
                onPointerEnter={() => setFocus(g.slug)}
                onFocus={() => setFocus(g.slug)}
                onBlur={() => setFocus(null)}
                className={clsx("flex items-baseline justify-between gap-3 rounded-[3px] border-l-2 px-2 py-1 text-[0.95rem] no-underline transition-colors duration-[var(--d-1)]", focus === g.slug ? "border-copper bg-card text-ink" : "border-transparent text-ink-2 hover:text-ink")}
              >
                <span>{g.name}</span>
                <span className="font-mono text-[0.82rem]">{g.n}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
