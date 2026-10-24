"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { CatchmentCheck as Result } from "@/server/catchment";
import { IconClose, IconPlus } from "../icons";
import { controlClass } from "../kit";
import { CatchmentCheck } from "../report/catchment-check";
import { SchoolMap } from "../viz/school-map";

export interface DeskSchool {
  slug: string;
  name: string;
  lat: number | null;
  lng: number | null;
  rule: string;
}

/** Pick schools, check a postcode, and see both on the map. */
export function CatchmentDesk({ schools, entryYear }: { schools: DeskSchool[]; entryYear: number }) {
  const router = useRouter();
  const [origin, setOrigin] = useState<Result | null>(null);
  const [q, setQ] = useState("");
  const [sugs, setSugs] = useState<{ label: string; href: string; sublabel: string; type: string }[]>([]);
  const shown = q.trim().length < 2 ? [] : sugs;
  const href = (slugs: string[]) => `/tools/catchment-checker?${slugs.length ? `schools=${slugs.join(",")}&` : ""}year=${entryYear}`;

  useEffect(() => {
    if (q.trim().length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/search/suggest?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((j) => setSugs(j.suggestions.filter((s: { type: string }) => s.type === "school")))
        .catch(() => {});
    }, 150);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  const points = schools.filter((s) => s.lat !== null && s.lng !== null).map((s) => ({ slug: s.slug, name: s.name, lat: s.lat!, lng: s.lng!, sub: s.rule }));

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-x-10 gap-y-8 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
      <div className="grid content-start gap-7">
        <section aria-labelledby="cd-schools">
          <h2 id="cd-schools" className="mb-3 flex items-center gap-3 font-semibold text-ink">
            <span className="grid size-7 place-items-center rounded-full bg-ink font-mono text-[0.8rem] text-paper">1</span>
            Schools <span className="font-normal text-ink-2">· up to five</span>
          </h2>
          {schools.length ? (
            <ul className="grid gap-px overflow-hidden rounded-[6px] border border-rule bg-rule">
              {schools.map((s) => (
                <li key={s.slug} className="flex items-center justify-between gap-2 bg-card py-2 pr-1.5 pl-4">
                  <span className="min-w-0">
                    <Link href={`/schools/${s.slug}/catchment?year=${entryYear}`} className="block truncate font-semibold text-ink no-underline hover:text-green hover:underline">
                      {s.name}
                    </Link>
                    <span className="text-small text-ink-2">{s.rule}</span>
                  </span>
                  <Link href={href(schools.filter((x) => x.slug !== s.slug).map((x) => x.slug))} aria-label={`Remove ${s.name}`} className="grid size-9 shrink-0 place-items-center rounded-[4px] text-ink-2 hover:bg-sage hover:text-ink">
                    <IconClose size={16} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
          {schools.length < 5 ? (
            <div className="relative mt-2">
              <label htmlFor="cd-add" className="sr-only">
                Add a school
              </label>
              <IconPlus size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-3" />
              <input id="cd-add" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Add a school" autoComplete="off" className={`${controlClass} pl-9`} />
              {shown.length ? (
                <ul className="anim-fade absolute z-20 mt-1 w-full overflow-hidden rounded-[6px] border border-rule bg-card shadow-lift">
                  {shown.map((s) => {
                    const slug = s.href.replace("/schools/", "");
                    return (
                      <li key={s.href}>
                        <button
                          type="button"
                          onClick={() => {
                            setQ("");
                            if (!schools.some((x) => x.slug === slug)) router.push(href([...schools.map((x) => x.slug), slug]));
                          }}
                          className="block w-full px-4 py-2.5 text-left hover:bg-green-wash"
                        >
                          <span className="block font-semibold text-ink">{s.label}</span>
                          <span className="block text-small text-ink-2">{s.sublabel}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          ) : null}
        </section>
        <section aria-labelledby="cd-check">
          <h2 id="cd-check" className="mb-3 flex items-center gap-3 font-semibold text-ink">
            <span className="grid size-7 place-items-center rounded-full bg-ink font-mono text-[0.8rem] text-paper">2</span>
            Check a postcode
          </h2>
          {schools.length ? <CatchmentCheck schools={schools} entryYear={entryYear} onResult={setOrigin} /> : <p className="text-ink-2">Add a school first.</p>}
        </section>
      </div>
      <div className="min-w-0 lg:sticky lg:top-[calc(var(--header-h)+2rem)] lg:self-start">
        {points.length ? (
          <SchoolMap
            key={`${points.map((p) => p.slug).join(",")}-${origin?.postcode ?? ""}`}
            points={points}
            origin={origin ? { lat: origin.latitude, lng: origin.longitude, label: origin.postcode } : null}
            height="clamp(20rem, 55vh, 32rem)"
            label="Map of the chosen schools"
            note={origin ? `Diamond: the centre of ${origin.postcode} — not your exact address. Boundaries are drawn on each school's catchment chapter when verified.` : "School sites. Check a postcode to place it on the map."}
          />
        ) : (
          <div className="grid aspect-[4/3] place-items-center rounded-[8px] border border-dashed border-rule-strong bg-card p-8 text-center text-ink-2">The map appears once you add a school.</div>
        )}
      </div>
    </div>
  );
}
