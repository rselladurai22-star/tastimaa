"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { clsx } from "clsx";
import coast from "@/content/geo/british-isles.json";

export interface AtlasPoint {
  slug: string;
  name: string;
  lat: number;
  lng: number;
  group: string;
  groupName: string;
  town: string | null;
}

/* Isometric projection. The ground is an equirectangular plane scaled for
   latitude; it is then turned 45° and tilted so north points up and right. */
const S = 62;
const KX = Math.cos((54.5 * Math.PI) / 180);
const C30 = Math.cos(Math.PI / 6);
const ground = (lat: number, lng: number) => [(lng + 3) * KX * S, (55 - lat) * S] as const;
const iso = (gx: number, gy: number, z = 0) => [(gx - gy) * C30, (gx + gy) * 0.5 - z] as const;
const at = (lat: number, lng: number, z = 0) => iso(...ground(lat, lng), z);
const SLAB = 8;

type Ring = number[][];
function ringPath(rings: Ring[], dy = 0) {
  return rings
    .map((r) => "M" + r.map(([lng, lat]) => at(lat!, lng!).map((n, i) => (n + (i ? dy : 0)).toFixed(1)).join(",")).join("L") + "Z")
    .join("");
}
const keep = (rings: Ring[]) => rings.filter((r) => r.some(([, lat]) => lat! < 59.4));
const UK = keep(coast.uk as Ring[]);
const IE = keep(coast.ie as Ring[]);
const LAND = { uk: ringPath(UK), ukSlab: ringPath(UK, SLAB), ie: ringPath(IE), ieSlab: ringPath(IE, SLAB) };

/**
 * The atlas: every listed school as a small isometric tower on a raised map of
 * the UK, placed from its official coordinates. Towers rise where schools
 * cluster. Coastline: Natural Earth (public domain).
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
  /** Slugs to light up; every other school recedes. */
  spotlight?: string[];
  label?: string;
}) {
  const [focus, setFocus] = useState<string | null>(null);
  const [hover, setHover] = useState<AtlasPoint | null>(null);
  const lit = spotlight ? new Set(spotlight) : null;

  const towers = useMemo(() => {
    const out = points.map((p) => {
      const near = points.filter((q) => Math.hypot((q.lat - p.lat) * 1.6, q.lng - p.lng) < 0.34).length;
      const [gx, gy] = ground(p.lat, p.lng);
      return { p, gx, gy, h: 5 + Math.sqrt(near) * 7.5 };
    });
    return out.sort((a, b) => a.gx + a.gy - (b.gx + b.gy));
  }, [points]);
  const maxH = Math.max(...towers.map((t) => t.h));

  const box = useMemo(() => {
    const xs: number[] = [];
    const ys: number[] = [];
    for (const r of [...UK, ...IE])
      for (const [lng, lat] of r) {
        const [x, y] = at(lat!, lng!);
        xs.push(x);
        ys.push(y);
      }
    const x0 = Math.min(...xs) - 12;
    const y0 = Math.min(...ys) - 70;
    return { x0, y0, w: Math.max(...xs) + 12 - x0, h: Math.max(...ys) + SLAB + 26 - y0 };
  }, []);

  const labelled = lit ? [] : focus ? [focus] : groups.slice(0, 4).map((g) => g.slug);
  const callouts = (() => {
    const placed: { slug: string; name: string; n: number; ax: number; ay: number; x: number; y: number; w: number }[] = [];
    for (const slug of labelled) {
      const g = groups.find((x) => x.slug === slug);
      const tall = towers.filter((t) => t.p.group === slug).sort((a, b) => b.h - a.h)[0];
      if (!g || !tall) continue;
      const [ax, ay] = iso(tall.gx, tall.gy, tall.h);
      const w = (g.name.length + String(g.n).length + 1) * 7.9 + 26;
      let y = ay - 30;
      const x = Math.min(Math.max(ax, box.x0 + w / 2 + 4), box.x0 + box.w - w / 2 - 4);
      while (placed.some((o) => Math.abs(o.y - y) < 26 && Math.abs(o.x - x) < (o.w + w) / 2 + 6)) y -= 28;
      placed.push({ slug, name: g.name, n: g.n, ax, ay, x, y, w });
    }
    return placed;
  })();

  const description = label ?? `Isometric map of ${points.length} grammar schools, each placed from its official coordinates. Most are in ${groups.slice(0, 3).map((g) => g.name).join(", ")}.`;

  return (
    <div className={clsx("grid gap-6", legend && "md:grid-cols-[minmax(0,1fr)_14rem] md:items-start", className)}>
      <div className="relative">
        <svg viewBox={`${box.x0} ${box.y0} ${box.w} ${box.h}`} className="block h-auto w-full overflow-visible" role="img" aria-label={description}>
          <defs>
            <filter id="atlas-shadow" x="-10%" y="-10%" width="120%" height="130%">
              <feGaussianBlur stdDeviation="9" />
            </filter>
          </defs>
          {/* The land: a soft shadow, a slab edge, then the surface */}
          <path d={LAND.uk + LAND.ie} transform="translate(10 26)" filter="url(#atlas-shadow)" style={{ fill: "#2c0b8e", opacity: 0.14 }} />
          <path d={LAND.ieSlab} style={{ fill: "#cdd5e3" }} />
          <path d={LAND.ie} style={{ fill: "#eef1f7" }} />
          <path d={LAND.ukSlab} style={{ fill: "#b9c6de" }} />
          <path d={LAND.uk} strokeWidth="0.8" style={{ fill: "#ffffff", stroke: "#d8e0ee" }} />
          {towers.map((t, i) => {
            const on = lit ? lit.has(t.p.slug) : focus === t.p.group || hover === t.p;
            const dim = lit ? !on : !!focus && focus !== t.p.group;
            const k = Math.round((t.h / maxH) * 100);
            const hue = on && (lit || hover === t.p) ? "var(--copper)" : `color-mix(in srgb, var(--green-deep) ${Math.max(0, k - 45)}%, var(--green))`;
            const tone = dim ? "#c9cfdb" : hue;
            const b = on ? 3 : 2.3;
            const h = t.h * (hover === t.p ? 1.12 : 1);
            const P = (x: number, y: number, z: number) => iso(t.gx + x, t.gy + y, z).map((n) => n.toFixed(1)).join(",");
            return (
              <g
                key={t.p.slug}
                className="atlas-rise"
                style={{ animationDelay: `${Math.round((i / towers.length) * 800)}ms` }}
                onPointerEnter={() => setHover(t.p)}
                onPointerLeave={() => setHover(null)}
              >
                <polygon points={`${P(-b, b, 0)} ${P(b, b, 0)} ${P(b, b, h)} ${P(-b, b, h)}`} style={{ fill: tone }} />
                <polygon points={`${P(b, b, 0)} ${P(b, -b, 0)} ${P(b, -b, h)} ${P(b, b, h)}`} style={{ fill: `color-mix(in srgb, ${tone} 72%, #0a0c10)` }} />
                <polygon points={`${P(-b, -b, h)} ${P(b, -b, h)} ${P(b, b, h)} ${P(-b, b, h)}`} style={{ fill: `color-mix(in srgb, ${tone} 55%, #ffffff)` }} />
              </g>
            );
          })}
          {callouts.map((c) => (
            <g key={c.slug} className="anim-fade pointer-events-none">
              <line x1={c.ax} y1={c.ay - 2} x2={c.x} y2={c.y + 11} strokeWidth="1" style={{ stroke: "var(--ink-3)" }} />
              <circle cx={c.ax} cy={c.ay - 2} r="1.8" style={{ fill: "var(--ink)" }} />
              <rect x={c.x - c.w / 2} y={c.y - 12} width={c.w} height={24} rx={12} style={{ fill: "#ffffff", stroke: "var(--rule)", filter: "drop-shadow(0 4px 8px rgb(44 11 142 / 0.14))" }} />
              <text x={c.x} y={c.y + 4.5} textAnchor="middle" className="fill-[var(--ink)] text-[14px] font-semibold">
                {c.name} <tspan className="fill-[var(--ink-3)] font-mono text-[12.5px] font-normal">{c.n}</tspan>
              </text>
            </g>
          ))}
        </svg>
        {hover ? (
          <p className="pointer-events-none absolute top-2 left-2 rounded-[6px] border border-rule bg-card px-3 py-2 text-small shadow-[0_8px_24px_-12px_rgb(44_11_142/0.35)]">
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
                className={clsx("flex items-baseline justify-between gap-3 rounded-[3px] border-l-2 px-2 py-1 text-[0.95rem] no-underline transition-colors duration-[var(--d-1)]", focus === g.slug ? "border-green bg-card text-ink" : "border-transparent text-ink-2 hover:text-ink")}
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
