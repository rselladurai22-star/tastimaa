"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { clsx } from "clsx";
import { IconArrow, IconMap } from "../icons";

export interface RegionProfile {
  slug: string;
  name: string;
  n: number;
  boys: number;
  girls: number;
  mixed: number;
  sixth: number;
  tests: string[];
  las: string[];
}

/** Region list with a detail panel — every number from the school register. */
export function RegionExplorer({ regions }: { regions: RegionProfile[] }) {
  const [sel, setSel] = useState((regions.find((x) => x.boys + x.girls + x.mixed > 0) ?? regions[0])?.slug ?? "");
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const r = regions.find((x) => x.slug === sel) ?? regions[0];
  if (!r) return null;
  const max = Math.max(...regions.map((x) => x.n));
  const notRecorded = r.n - r.boys - r.girls - r.mixed;
  const parts = [
    { k: "Boys", v: r.boys, c: "var(--series-3)" },
    { k: "Girls", v: r.girls, c: "var(--series-2)" },
    { k: "Co-educational", v: r.mixed, c: "var(--series-1)" },
    { k: "Not recorded", v: notRecorded, c: "var(--rule-strong)" },
  ].filter((p) => p.v > 0);

  return (
    <div className="playground grid overflow-hidden lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
      <div role="tablist" aria-label="Regions" aria-orientation="vertical" className="border-b border-rule bg-paper p-2 lg:border-r lg:border-b-0">
        {regions.map((x, i) => (
          <button
            key={x.slug}
            ref={(el) => {
              tabs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`rx-tab-${x.slug}`}
            aria-selected={x.slug === r.slug}
            aria-controls="rx-panel"
            tabIndex={x.slug === r.slug ? 0 : -1}
            onClick={() => setSel(x.slug)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault();
                const next = (i + (e.key === "ArrowDown" ? 1 : regions.length - 1)) % regions.length;
                setSel(regions[next]!.slug);
                tabs.current[next]?.focus();
              }
            }}
            className={clsx(
              "grid w-full grid-cols-[minmax(0,11.5rem)_1fr_2rem] items-center gap-3 rounded-[4px] px-3 py-2 text-left text-[0.98rem] transition-colors duration-[var(--d-1)]",
              x.slug === r.slug ? "bg-card font-semibold text-ink shadow-[inset_2px_0_0_var(--copper)]" : "text-ink-2 hover:bg-card hover:text-ink",
            )}
          >
            <span className="truncate">{x.name}</span>
            <span aria-hidden className="h-1.5 rounded-full bg-sage-deep">
              <span className="block h-full rounded-full bg-green-bright transition-[width] duration-[var(--d-4)] ease-[var(--ease-out)]" style={{ width: `${(x.n / max) * 100}%` }} />
            </span>
            <span className="text-right font-mono text-[0.85rem]">{x.n}</span>
          </button>
        ))}
      </div>
      <div id="rx-panel" role="tabpanel" aria-labelledby={`rx-tab-${r.slug}`} className="p-6 sm:p-8">
        <div key={r.slug} className="anim-rise">
          <p className="label">Region</p>
          <h3 className="mt-1 text-h2">{r.name}</h3>
          <p className="mt-3 max-w-[52ch] text-[1.05rem] leading-relaxed text-ink-2">
            {r.n} {r.slug === "northern-ireland" ? "grammar" : "selective"} {r.n === 1 ? "school" : "schools"}
            {r.las.length ? `, across ${r.las.length} ${r.las.length === 1 ? "council area" : "council areas"}` : ""}. {r.sixth} {r.sixth === 1 ? "has" : "have"} a sixth form.
          </p>

          <div className="mt-6">
            <p className="label mb-2">Who they admit</p>
            <div className="flex h-3 w-full overflow-hidden rounded-[2px]" aria-hidden>
              {parts.map((p) => (
                <span key={p.k} className="h-full border-r-2 border-card last:border-r-0" style={{ width: `${(p.v / r.n) * 100}%`, background: p.c }} />
              ))}
            </div>
            <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-small text-ink-2">
              {parts.map((p) => (
                <li key={p.k} className="inline-flex items-center gap-2">
                  <span aria-hidden className="size-2.5 rounded-[1px]" style={{ background: p.c }} />
                  {p.k} <span className="font-mono text-ink">{p.v}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <div>
              <p className="label mb-2">Entrance tests we hold</p>
              {r.tests.length ? (
                <ul className="grid gap-1 text-[0.98rem] text-ink">
                  {r.tests.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-[0.98rem] text-ink-2">Not yet recorded for this region.</p>
              )}
            </div>
            <div>
              <p className="label mb-2">Council areas</p>
              <p className="text-[0.98rem] leading-relaxed text-ink">
                {r.las.slice(0, 6).join(", ")}
                {r.las.length > 6 ? ` and ${r.las.length - 6} more` : ""}
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={`/grammar-schools/${r.slug}`} className="group/c inline-flex min-h-11 items-center gap-2 rounded-[5px] bg-green px-4 font-semibold text-paper no-underline transition-colors hover:bg-green-deep">
              Schools in {r.name} <IconArrow size={16} className="transition-transform duration-[var(--d-2)] group-hover/c:translate-x-0.5" />
            </Link>
            <Link href={`/grammar-schools/${r.slug}?view=map`} className="inline-flex min-h-11 items-center gap-2 rounded-[5px] border border-control bg-card px-4 font-semibold text-ink no-underline hover:border-ink">
              <IconMap size={17} /> On the map
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
