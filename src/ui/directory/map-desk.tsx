"use client";

import Link from "next/link";
import { useState } from "react";
import { clsx } from "clsx";
import { SchoolMap } from "../viz/school-map";

export interface MapDeskItem {
  slug: string;
  name: string;
  sub: string;
  lat: number | null;
  lng: number | null;
  distance: string | null;
}

/** Map view: the result list beside a street map; pointing at a school lights its marker. */
export function MapDesk({ items, origin, offset }: { items: MapDeskItem[]; origin: { lat: number; lng: number; label: string } | null; offset: number }) {
  const [hl, setHl] = useState<string | null>(null);
  const points = items.filter((s) => s.lat !== null && s.lng !== null).map((s) => ({ slug: s.slug, name: s.name, lat: s.lat!, lng: s.lng!, sub: s.sub }));
  const missing = items.length - points.length;
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,19rem)_minmax(0,1fr)]">
      <ol className="order-2 max-h-[36rem] overflow-y-auto rounded-[8px] border border-rule bg-card lg:order-1" onPointerLeave={() => setHl(null)}>
        {items.map((s, i) => (
          <li key={s.slug} className="border-b border-rule last:border-0">
            <Link
              href={`/schools/${s.slug}`}
              onPointerEnter={() => setHl(s.slug)}
              onFocus={() => setHl(s.slug)}
              onBlur={() => setHl(null)}
              className={clsx("grid grid-cols-[2rem_minmax(0,1fr)] gap-2 px-3 py-2.5 no-underline transition-colors duration-[var(--d-1)]", hl === s.slug ? "bg-copper-wash" : "hover:bg-paper")}
            >
              <span className="pt-0.5 font-mono text-[0.8rem] text-ink-2">{String(offset + i + 1).padStart(2, "0")}</span>
              <span className="min-w-0">
                <span className="block font-semibold text-ink">{s.name}</span>
                <span className="block truncate text-small text-ink-2">
                  {s.sub}
                  {s.distance ? ` · ${s.distance}` : ""}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
      <div className="order-1 min-w-0 lg:order-2">
        <SchoolMap points={points} origin={origin} highlight={hl} height="clamp(22rem, 60vh, 36rem)" />
        {missing > 0 ? <p className="mt-1 text-small text-ink-2">{missing} of these schools have no recorded location, so they appear only in the list.</p> : null}
      </div>
    </div>
  );
}
