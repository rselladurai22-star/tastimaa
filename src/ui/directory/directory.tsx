import Link from "next/link";
import { clsx } from "clsx";
import { CATCHMENT_LABEL, GENDER_LABEL, SELECTIVITY_SHORT } from "@/domain/labels";
import { formatMiles, relativeAge } from "@/lib/format";
import type { SearchResult, SchoolListItem } from "@/server/schools";
import { directoryQueryString, type DirectoryParams } from "@/server/search-params";
import { IconClose, IconFilter, IconList, IconMap, IconTable } from "../icons";
import { Gap, Note, Tag } from "../kit";
import { CompareTray, SaveButton } from "../shortlist";
import { Status } from "../status";
import { Filters, testOptions } from "./filters";
import { MapDesk } from "./map-desk";

type Bench = Record<string, number>;

const SORTS: [DirectoryParams["sort"] | undefined, string][] = [
  [undefined, "Best match"],
  ["name", "Name"],
  ["gcse", "Attainment 8"],
  ["alevel", "A level"],
  ["distance", "Distance"],
];

/** Attainment 8 on its full 0–90 scale, with the selective-school average for the same year. */
function A8Bar({ value, year, bench }: { value: number | null; year: string | null; bench: Bench }) {
  if (value === null) return <span className="text-small text-ink-2">Not published</span>;
  const b = year ? bench[year] : undefined;
  return (
    <span className="block">
      <span className="flex items-baseline justify-between gap-2">
        <span className="font-mono text-[0.98rem] text-ink">{value.toFixed(1)}</span>
        <span className="font-mono text-[0.75rem] text-ink-2">{year}</span>
      </span>
      <span aria-hidden className="relative mt-1.5 block h-1.5 rounded-full bg-sage-deep">
        <span className="absolute inset-y-0 left-0 rounded-full bg-green-bright" style={{ width: `${(value / 90) * 100}%` }} />
        {b !== undefined ? <span className="absolute -top-1 -bottom-1 w-[2px] bg-copper" style={{ left: `${(b / 90) * 100}%` }} /> : null}
      </span>
      {b !== undefined ? <span className="sr-only">Selective schools average {b.toFixed(1)}.</span> : null}
    </span>
  );
}

function Ledger({ items, offset, bench, precision }: { items: SchoolListItem[]; offset: number; bench: Bench; precision?: "postcode_centroid" | "postcode_district" }) {
  return (
    <ol className="border-t border-ink">
      {items.map((s, i) => (
        <li key={s.id} className="group/row relative grid grid-cols-[2.25rem_minmax(0,1fr)_auto] gap-x-3 gap-y-3 border-b border-rule py-5 transition-colors duration-[var(--d-1)] hover:bg-card/70 sm:grid-cols-[2.5rem_minmax(0,1fr)_auto] lg:grid-cols-[2.5rem_minmax(0,1.5fr)_minmax(0,1fr)_8rem_auto] lg:items-start">
          <span className="pt-1.5 font-mono text-[0.82rem] text-ink-2">{String(offset + i + 1).padStart(2, "0")}</span>
          <div className="min-w-0">
            <h3 className="text-[1.3rem] leading-snug">
              <Link href={`/schools/${s.slug}`} className="text-ink no-underline after:absolute after:inset-0 group-hover/row:text-green hover:underline">
                {s.name}
              </Link>
            </h3>
            <p className="mt-0.5 text-[0.98rem] text-ink-2">{[s.town, s.laName].filter(Boolean).join(" · ") || "Location not recorded"}</p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              <Tag>{SELECTIVITY_SHORT[s.selectivity]}</Tag>
              {s.gender !== "unknown" ? <Tag>{GENDER_LABEL[s.gender]}</Tag> : null}
              {s.hasSixthForm ? <Tag>Sixth form</Tag> : null}
              {s.boarding === "boarding" ? <Tag>Boarding</Tag> : null}
            </div>
            <p className="mt-2.5 flex flex-wrap items-center gap-2 text-small text-ink-2">
              {s.policyStatus === "awaiting_verification" ? <Status status="awaiting_verification" quiet /> : null}
              Record checked {relativeAge(s.lastCheckedAt)}
            </p>
          </div>
          <div className="relative z-10 col-start-3 row-start-1 flex flex-col items-end gap-2 lg:col-start-5">
            {s.distanceMiles !== null ? (
              <p className="text-right" title={precision === "postcode_district" ? "Straight-line distance from the centre of the postcode district" : "Straight-line distance from your postcode's centre point"}>
                <span className="block font-mono text-[1rem] text-ink">{formatMiles(s.distanceMiles)}</span>
                <span className="block text-[0.8rem] text-ink-2">straight line</span>
              </p>
            ) : null}
            <SaveButton slug={s.slug} name={s.name} variant="icon" />
          </div>
          <dl className="col-span-2 col-start-2 grid grid-cols-2 gap-x-5 gap-y-2 text-[0.95rem] lg:col-span-1 lg:col-start-3 lg:row-start-1 lg:grid-cols-1">
            <div>
              <dt className="label text-[0.72rem]">Entrance test</dt>
              <dd className="text-ink">{s.testNames?.length ? s.testNames.join(", ") : <span className="text-ink-2">Not yet recorded</span>}</dd>
            </div>
            <div>
              <dt className="label text-[0.72rem]">Catchment</dt>
              <dd className="text-ink">{s.catchmentType ? CATCHMENT_LABEL[s.catchmentType] : <span className="text-ink-2">Not yet recorded</span>}</dd>
            </div>
          </dl>
          <div className="col-span-2 col-start-2 grid grid-cols-2 gap-x-5 lg:col-span-1 lg:col-start-4 lg:row-start-1 lg:grid-cols-1 lg:gap-y-3">
            <div>
              <p className="label text-[0.72rem]">Attainment 8</p>
              <A8Bar value={s.attainment8} year={s.attainment8Year} bench={bench} />
            </div>
            <div>
              <p className="label text-[0.72rem]">A level</p>
              <p className="font-mono text-[0.98rem] text-ink">
                {s.alevelGrade ? (
                  <>
                    {s.alevelGrade} <span className="text-[0.75rem] text-ink-2">{s.alevelYear}</span>
                  </>
                ) : (
                  <span className="font-sans text-small text-ink-2">Not published</span>
                )}
              </p>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

function SortLink({ active, href, children }: { active: boolean; href: string; children: React.ReactNode }) {
  return (
    <Link href={href} aria-current={active ? "true" : undefined} className={clsx("relative py-1 no-underline transition-colors", active ? "font-semibold text-ink after:absolute after:inset-x-0 after:-bottom-0.5 after:h-[2px] after:bg-copper" : "text-ink-2 hover:text-ink")}>
      {children}
    </Link>
  );
}

function ResultsTable({ r, p, basePath, bench }: { r: SearchResult; p: DirectoryParams; basePath: string; bench: Bench }) {
  const head = "sticky top-0 z-[1] border-b border-ink bg-paper px-3 py-2.5 text-left align-bottom font-mono text-[0.75rem] font-medium tracking-[0.06em] text-ink-2 uppercase";
  const cell = "border-b border-rule px-3 py-3 align-top";
  const sortHref = (sort: DirectoryParams["sort"]) => `${basePath}${directoryQueryString(p, { sort, page: 1 })}`;
  return (
    <div className="relative max-h-[75vh] overflow-auto rounded-[5px] border border-rule bg-card" role="region" aria-label="Results table" tabIndex={0}>
      <table className="w-full min-w-[860px] border-collapse text-[0.95rem]">
        <caption className="sr-only">Grammar schools matching your search</caption>
        <thead>
          <tr>
            <th scope="col" className={head}>
              <Link href={sortHref("name")} className="text-ink-2 no-underline hover:text-ink">
                School {p.sort === "name" ? "↓" : ""}
              </Link>
            </th>
            <th scope="col" className={head}>
              Type
            </th>
            <th scope="col" className={head}>
              Test
            </th>
            <th scope="col" className={head}>
              Catchment
            </th>
            <th scope="col" className={clsx(head, "text-right")}>
              <Link href={sortHref("gcse")} className="text-ink-2 no-underline hover:text-ink">
                Attainment 8 {p.sort === "gcse" ? "↓" : ""}
              </Link>
            </th>
            <th scope="col" className={clsx(head, "text-right")}>
              <Link href={sortHref("alevel")} className="text-ink-2 no-underline hover:text-ink">
                A level {p.sort === "alevel" ? "↓" : ""}
              </Link>
            </th>
            {r.location ? (
              <th scope="col" className={clsx(head, "text-right")}>
                Distance
              </th>
            ) : null}
            <th scope="col" className={head}>
              <span className="sr-only">Shortlist</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {r.items.map((s) => {
            const b = s.attainment8Year ? bench[s.attainment8Year] : undefined;
            const diff = s.attainment8 !== null && b !== undefined ? s.attainment8 - b : null;
            return (
              <tr key={s.id} className="transition-colors hover:bg-paper">
                <th scope="row" className={clsx(cell, "text-left font-semibold")}>
                  <Link href={`/schools/${s.slug}`} className="text-ink no-underline hover:text-green hover:underline">
                    {s.name}
                  </Link>
                  <span className="block text-small font-normal text-ink-2">{[s.town, s.laName].filter(Boolean).join(", ")}</span>
                </th>
                <td className={clsx(cell, "text-ink-2")}>
                  {SELECTIVITY_SHORT[s.selectivity]}
                  <span className="block text-small">{GENDER_LABEL[s.gender]}</span>
                </td>
                <td className={clsx(cell, "text-ink-2")}>{s.testNames?.join(", ") ?? "—"}</td>
                <td className={clsx(cell, "text-ink-2")}>{s.catchmentType ? CATCHMENT_LABEL[s.catchmentType] : "—"}</td>
                <td className={clsx(cell, "text-right font-mono")}>
                  {s.attainment8 !== null ? (
                    <>
                      {s.attainment8.toFixed(1)}
                      <span className="block text-[0.75rem] text-ink-2">
                        {s.attainment8Year}
                        {diff !== null ? ` · ${diff >= 0 ? "+" : "−"}${Math.abs(diff).toFixed(1)} vs sel.` : ""}
                      </span>
                    </>
                  ) : (
                    "—"
                  )}
                </td>
                <td className={clsx(cell, "text-right font-mono")}>
                  {s.alevelGrade ? (
                    <>
                      {s.alevelGrade}
                      <span className="block text-[0.75rem] text-ink-2">{s.alevelYear}</span>
                    </>
                  ) : (
                    "—"
                  )}
                </td>
                {r.location ? <td className={clsx(cell, "text-right font-mono whitespace-nowrap")}>{s.distanceMiles !== null ? formatMiles(s.distanceMiles) : "—"}</td> : null}
                <td className={clsx(cell, "py-2")}>
                  <SaveButton slug={s.slug} name={s.name} variant="icon" />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function pageWindow(page: number, pages: number): (number | "…")[] {
  const set = new Set([1, pages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= pages));
  const sorted = [...set].sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1]! > 1) out.push("…");
    out.push(n);
  });
  return out;
}

/** Active filters as removable chips — each one a link to the same search without it. */
async function activeChips(p: DirectoryParams, basePath: string, lockArea: boolean) {
  const chips: { label: string; href: string }[] = [];
  const without = (o: Partial<DirectoryParams>) => `${basePath}${directoryQueryString(p, { ...o, page: 1 })}`;
  if (p.q) chips.push({ label: `“${p.q}”`, href: without({ q: "" }) });
  if (p.postcode) chips.push({ label: `Within ${p.radius ?? 30} mi of ${p.postcode.toUpperCase()}`, href: without({ postcode: undefined, radius: undefined, sort: p.sort === "distance" ? undefined : p.sort }) });
  if (!lockArea && p.nation) chips.push({ label: p.nation === "england" ? "England" : "Northern Ireland", href: without({ nation: undefined }) });
  for (const g of p.gender) chips.push({ label: GENDER_LABEL[g]!, href: without({ gender: p.gender.filter((x) => x !== g) }) });
  for (const s of p.selectivity) chips.push({ label: s === "fully_selective" ? "Grammar (fully selective)" : "Partially selective", href: without({ selectivity: p.selectivity.filter((x) => x !== s) }) });
  if (p.sixthForm) chips.push({ label: "Sixth form", href: without({ sixthForm: undefined }) });
  if (p.boarding) chips.push({ label: "Boarding", href: without({ boarding: undefined }) });
  if (p.test) {
    const t = (await testOptions()).find((x) => x.slug === p.test);
    chips.push({ label: t?.name ?? p.test, href: without({ test: undefined }) });
  }
  if (p.outOfArea) chips.push({ label: "Admits out-of-area", href: without({ outOfArea: undefined }) });
  if (p.scoreRoute) chips.push({ label: "Published score threshold", href: without({ scoreRoute: undefined }) });
  if (p.siblingPriority) chips.push({ label: "Sibling priority", href: without({ siblingPriority: undefined }) });
  if (p.history) chips.push({ label: "Has offer history", href: without({ history: undefined }) });
  return chips;
}

/**
 * The research desk: a filter rail, a toolbar of views and orderings, removable
 * filter chips, and results as a ledger, a table or a street map.
 */
export async function DirectoryDesk({ p, result, basePath, lockArea = false, entryYear, bench }: { p: DirectoryParams; result: SearchResult; basePath: string; lockArea?: boolean; entryYear: number; bench: Bench }) {
  const view = p.view ?? "list";
  const pages = Math.max(1, Math.ceil(result.total / result.pageSize));
  const chips = await activeChips(p, basePath, lockArea);
  const offset = (p.page - 1) * result.pageSize;
  const href = (o: Partial<DirectoryParams>) => `${basePath}${directoryQueryString(p, o)}`;

  return (
    <div className="grid grid-cols-1 gap-x-10 gap-y-6 lg:grid-cols-[17.5rem_minmax(0,1fr)]">
      <aside aria-label="Filters" className="min-w-0">
        <details className="group/f rounded-[8px] border border-rule bg-card lg:hidden">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 font-semibold text-ink">
            <span className="flex items-center gap-2">
              <IconFilter size={18} /> Refine results
              {chips.length ? <span className="grid size-6 place-items-center rounded-full bg-green font-mono text-[0.75rem] text-paper">{chips.length}</span> : null}
            </span>
            <span className="text-small font-normal text-ink-2 group-open/f:hidden">Show</span>
            <span className="hidden text-small font-normal text-ink-2 group-open/f:inline">Hide</span>
          </summary>
          <div className="border-t border-rule bg-card p-4 [--rail-bg:var(--card)]">
            <Filters p={p} basePath={basePath} lockArea={lockArea} idPrefix="fm" />
          </div>
        </details>
        <div className="sticky top-[calc(var(--header-h)+1.25rem)] hidden max-h-[calc(100vh-var(--header-h)-2.5rem)] overflow-y-auto bg-paper pr-2 pb-2 lg:block">
          <p className="mb-4 flex items-center gap-2 font-display text-[1.3rem] text-ink">
            <IconFilter size={18} className="text-copper-ink" /> Refine
          </p>
          <Filters p={p} basePath={basePath} lockArea={lockArea} idPrefix="fd" />
        </div>
      </aside>

      <section aria-labelledby="results-heading" className="min-w-0">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 border-b border-rule pb-4">
          <div className="min-w-0">
            <h2 id="results-heading" className="font-display text-[1.6rem] leading-tight text-ink" aria-live="polite">
              <span className="num">{result.total}</span> {result.total === 1 ? "school" : "schools"}
            </h2>
            <p className="mt-1 text-[0.98rem] text-ink-2">
              {result.query ? <>Matching &ldquo;{result.query}&rdquo;. </> : null}
              {result.location ? <>Within {p.radius ?? 30} miles of {result.location.label}. </> : null}
              {pages > 1 ? `Showing ${offset + 1}–${Math.min(offset + result.pageSize, result.total)}.` : null}
            </p>
          </div>
          <nav aria-label="Result views" className="flex rounded-[5px] border border-control bg-card p-[3px]">
            {(
              [
                ["list", "Ledger", IconList],
                ["table", "Table", IconTable],
                ["map", "Map", IconMap],
              ] as const
            ).map(([v, label, Icon]) => (
              <Link
                key={v}
                href={href({ view: v === "list" ? undefined : v, page: 1 })}
                aria-current={view === v ? "page" : undefined}
                className={clsx("inline-flex min-h-9 items-center gap-1.5 rounded-[3px] px-3 text-[0.95rem] font-semibold no-underline transition-colors duration-[var(--d-1)]", view === v ? "bg-ink text-paper" : "text-ink-2 hover:text-ink")}
              >
                <Icon size={16} /> {label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="label">Order</span>
          <nav aria-label="Sort results" className="flex flex-wrap gap-x-4 gap-y-1 text-[0.95rem]">
            {SORTS.filter(([k]) => k !== "distance" || result.location).map(([k, l]) => (
              <SortLink key={l} active={(p.sort ?? undefined) === k || (k === undefined && p.sort === "relevance")} href={href({ sort: k, page: 1 })}>
                {l}
              </SortLink>
            ))}
          </nav>
        </div>

        {chips.length ? (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="sr-only">Active filters:</span>
            <ul className="flex flex-wrap gap-1.5">
              {chips.map((c) => (
                <li key={c.label}>
                  <Link href={c.href} className="group/chip inline-flex min-h-9 items-center gap-1.5 rounded-[4px] border border-green/30 bg-green-wash py-1 pr-2 pl-3 text-[0.92rem] font-semibold text-green no-underline transition-colors hover:border-green">
                    {c.label}
                    <IconClose size={14} className="transition-transform duration-[var(--d-1)] group-hover/chip:rotate-90" />
                    <span className="sr-only">— remove this filter</span>
                  </Link>
                </li>
              ))}
            </ul>
            {chips.length > 1 ? (
              <Link href={basePath} className="a text-[0.92rem]">
                Clear all
              </Link>
            ) : null}
          </div>
        ) : null}

        {result.locationError ? (
          <Note tone="caution" className="mt-5">
            {result.locationError}
          </Note>
        ) : null}
        {result.location ? (
          <p className="mt-4 max-w-[70ch] text-small leading-relaxed text-ink-2">
            Distances are straight lines from the centre of {result.location.precision === "postcode_district" ? "the postcode district" : "your postcode"}. Schools measure from your exact home address using their own published method, so their figures will differ — and
            distance alone doesn&apos;t tell you whether a child is eligible.
          </p>
        ) : null}

        <div className="mt-6">
          {result.items.length === 0 ? (
            <Gap title="No schools match these filters">
              Try removing a filter or widening the distance. Admissions-rule filters only match schools whose {entryYear} policy we hold — <Link href="/methodology#coverage">see coverage</Link>.
            </Gap>
          ) : view === "map" ? (
            <MapDesk
              offset={offset}
              items={result.items.map((s) => ({ slug: s.slug, name: s.name, sub: [s.town, s.laName].filter(Boolean).join(", "), lat: s.lat, lng: s.lng, distance: s.distanceMiles !== null ? formatMiles(s.distanceMiles) : null }))}
              origin={result.location ? { lat: result.location.latitude, lng: result.location.longitude, label: result.location.label } : null}
            />
          ) : view === "table" ? (
            <ResultsTable r={result} p={p} basePath={basePath} bench={bench} />
          ) : (
            <>
              <p className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-small text-ink-2">
                <span className="inline-flex items-center gap-2">
                  <span aria-hidden className="h-1.5 w-6 rounded-full bg-green-bright" /> Attainment 8, on its 0–90 scale
                </span>
                <span className="inline-flex items-center gap-2">
                  <span aria-hidden className="h-3.5 w-[2px] bg-copper" /> Average for all selective schools, same year
                </span>
              </p>
              <Ledger items={result.items} offset={offset} bench={bench} precision={result.location?.precision} />
            </>
          )}
        </div>

        {pages > 1 ? (
          <nav aria-label="Pagination" className="mt-8 flex flex-wrap items-center justify-between gap-4">
            {p.page > 1 ? (
              <Link href={href({ page: p.page - 1 })} rel="prev" className="inline-flex min-h-10 items-center rounded-[4px] border border-control bg-card px-3.5 font-semibold text-ink no-underline hover:border-ink">
                Previous
              </Link>
            ) : (
              <span />
            )}
            <ol className="flex items-center gap-1 font-mono text-[0.9rem]">
              {pageWindow(p.page, pages).map((n, i) =>
                n === "…" ? (
                  <li key={`gap${i}`} aria-hidden className="px-1 text-ink-3">
                    …
                  </li>
                ) : (
                  <li key={n}>
                    <Link
                      href={href({ page: n })}
                      aria-current={n === p.page ? "page" : undefined}
                      aria-label={`Page ${n} of ${pages}`}
                      className={clsx("grid h-10 min-w-10 place-items-center rounded-[4px] px-2 no-underline", n === p.page ? "bg-ink text-paper" : "text-ink-2 hover:bg-card hover:text-ink")}
                    >
                      {n}
                    </Link>
                  </li>
                ),
              )}
            </ol>
            {p.page < pages ? (
              <Link href={href({ page: p.page + 1 })} rel="next" className="inline-flex min-h-10 items-center rounded-[4px] border border-control bg-card px-3.5 font-semibold text-ink no-underline hover:border-ink">
                Next
              </Link>
            ) : (
              <span />
            )}
          </nav>
        ) : null}
      </section>
      <CompareTray />
    </div>
  );
}
