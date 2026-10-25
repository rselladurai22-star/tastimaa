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
  const [hover, setHover] = useState<string | null>(null);
  const lit = spotlight ? new Set(spotlight) : null;

  // Schools are grouped into neighbourhoods (cells about 45 km across) and drawn
  // as one small isometric campus each: a bigger campus means more schools.
  const campuses = useMemo(() => {
    const cells = new Map<string, AtlasPoint[]>();
    for (const p of points) {
      const key = `${Math.round(p.lat / 0.42)}:${Math.round(p.lng / 0.62)}`;
      cells.set(key, [...(cells.get(key) ?? []), p]);
    }
    return [...cells.entries()]
      .map(([key, list]) => {
        const lat = list.reduce((t, p) => t + p.lat, 0) / list.length;
        const lng = list.reduce((t, p) => t + p.lng, 0) / list.length;
        const [gx, gy] = ground(lat, lng);
        const counts = new Map<string, number>();
        list.forEach((p) => counts.set(p.group, (counts.get(p.group) ?? 0) + 1));
        const group = [...counts.entries()].sort((x, y) => y[1] - x[1])[0]![0];
        const k = Math.sqrt(list.length);
        return { key, list, gx, gy, group, w: 8 + k * 3.4, h: 6 + k * 2.2 };
      })
      .sort((a, b) => a.gx + a.gy - (b.gx + b.gy));
  }, [points]);
  const hovered = campuses.find((c) => c.key === hover) ?? null;

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

  const labelled = lit ? [] : focus ? [focus] : [];
  const callouts = (() => {
    const placed: { slug: string; name: string; n: number; ax: number; ay: number; x: number; y: number; w: number }[] = [];
    for (const slug of labelled) {
      const g = groups.find((x) => x.slug === slug);
      const tall = campuses.filter((t) => t.group === slug).sort((a, b) => b.list.length - a.list.length)[0];
      if (!g || !tall) continue;
      const [ax, ay] = iso(tall.gx, tall.gy, tall.h + tall.w * 0.6 + 4);
      const w = (g.name.length + String(g.n).length + 1) * 7.9 + 26;
      let y = ay - 30;
      const x = Math.min(Math.max(ax, box.x0 + w / 2 + 4), box.x0 + box.w - w / 2 - 4);
      while (placed.some((o) => Math.abs(o.y - y) < 26 && Math.abs(o.x - x) < (o.w + w) / 2 + 6)) y -= 28;
      placed.push({ slug, name: g.name, n: g.n, ax, ay, x, y, w });
    }
    return placed;
  })();

  const description = label ?? `Isometric map of ${points.length} grammar schools, drawn as small school buildings grouped by neighbourhood from their official coordinates. Most are in ${groups.slice(0, 3).map((g) => g.name).join(", ")}.`;

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
          {campuses.map((c, i) => {
            const litHere = lit ? c.list.some((p) => lit.has(p.slug)) : false;
            const dim = lit ? !litHere : !!focus && focus !== c.group;
            const hot = hover === c.key || litHere || (focus === c.group && !lit);
            const roof = dim ? "#c2c8d4" : hot ? "var(--copper)" : "var(--green)";
            const W2 = c.w / 2;
            const D2 = c.w * 0.4;
            const h = c.h;
            const ridge = c.w * 0.55;
            const P = (x: number, y: number, z: number) => iso(c.gx + x, c.gy + y, z).map((n) => n.toFixed(1)).join(",");
            return (
              <g key={c.key} className="atlas-rise cursor-default" style={{ animationDelay: `${Math.round((i / campuses.length) * 800)}ms` }} onPointerEnter={() => setHover(c.key)} onPointerLeave={() => setHover(null)}>
                {/* contact shadow */}
                <polygon points={`${P(-W2 + 1, -D2 + 2, 0)} ${P(W2 + 4, -D2 + 2, 0)} ${P(W2 + 4, D2 + 4, 0)} ${P(-W2 + 1, D2 + 4, 0)}`} style={{ fill: "#2c0b8e", opacity: 0.16 }} />
                {/* back roof slope */}
                <polygon points={`${P(-W2, -D2, h)} ${P(W2, -D2, h)} ${P(W2, 0, h + ridge)} ${P(-W2, 0, h + ridge)}`} style={{ fill: `color-mix(in srgb, ${roof} 70%, #000)` }} />
                {/* front-left wall */}
                <polygon points={`${P(-W2, D2, 0)} ${P(W2, D2, 0)} ${P(W2, D2, h)} ${P(-W2, D2, h)}`} style={{ fill: dim ? "#eef0f4" : "#ffffff" }} />
                {/* front-right wall with gable */}
                <polygon points={`${P(W2, D2, 0)} ${P(W2, -D2, 0)} ${P(W2, -D2, h)} ${P(W2, 0, h + ridge)} ${P(W2, D2, h)}`} style={{ fill: dim ? "#d9dde5" : "#dfe4ee" }} />
                {/* front roof slope */}
                <polygon points={`${P(-W2, 0, h + ridge)} ${P(W2, 0, h + ridge)} ${P(W2, D2 + 0.6, h - 0.4)} ${P(-W2 - 0.6, D2 + 0.6, h - 0.4)}`} style={{ fill: roof }} />
              </g>
            );
          })}
          {/* Count badges on their own layer, biggest first; a badge that would collide is left out */}
          {(() => {
            const shown: { x: number; y: number }[] = [];
            return [...campuses]
              .filter((c) => c.list.length >= 2 && !(lit ? !c.list.some((p) => lit.has(p.slug)) : !!focus && focus !== c.group))
              .sort((a, b) => b.list.length - a.list.length)
              .map((c) => {
                const [x, y] = iso(c.gx, c.gy, c.h + c.w * 0.55 + 8);
                if (shown.some((o) => Math.hypot(o.x - x, o.y - y) < 19)) return null;
                shown.push({ x, y });
                const hot = hover === c.key;
                return (
                  <g key={`b-${c.key}`} className="anim-fade pointer-events-none">
                    <circle cx={x} cy={y} r={c.list.length >= 10 ? 9.5 : 8} style={{ fill: "#ffffff", stroke: hot ? "var(--copper)" : "var(--green)", strokeWidth: 1.4, filter: "drop-shadow(0 2px 3px rgb(44 11 142 / 0.3))" }} />
                    <text x={x} y={y + 3.6} textAnchor="middle" className="text-[10.5px] font-bold" style={{ fill: hot ? "var(--copper-ink)" : "var(--green-deep)" }}>
                      {c.list.length}
                    </text>
                  </g>
                );
              });
          })()}
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
        {hovered ? (
          <p className="pointer-events-none absolute top-2 left-2 max-w-[18rem] rounded-[8px] border border-rule bg-card px-3 py-2 text-small shadow-[0_8px_24px_-12px_rgb(44_11_142/0.35)]">
            <span className="block font-semibold text-ink">
              {hovered.list.length === 1 ? hovered.list[0]!.name : `${hovered.list.length} schools near ${hovered.list.find((p) => p.town)?.town ?? hovered.list[0]!.groupName}`}
            </span>
            <span className="text-ink-2">
              {hovered.list.length === 1
                ? [hovered.list[0]!.town, hovered.list[0]!.groupName].filter(Boolean).join(" · ")
                : `${hovered.list
                    .slice(0, 3)
                    .map((p) => p.name)
                    .join(", ")}${hovered.list.length > 3 ? "…" : ""}`}
            </span>
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
