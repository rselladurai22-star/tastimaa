import Link from "next/link";
import { List, Map as MapIcon, SlidersHorizontal, Table2 } from "lucide-react";
import { clsx } from "clsx";
import { db, schema } from "@/db";
import { CATCHMENT_LABEL, GENDER_LABEL, SELECTIVITY_SHORT } from "@/domain/labels";
import { formatMiles } from "@/lib/format";
import { directoryQueryString, type DirectoryParams } from "@/server/search-params";
import type { SearchResult } from "@/server/schools";
import { SchoolCard } from "@/components/school/school-card";
import { CompareTray } from "@/components/school/shortlist";
import { SchoolMap } from "@/components/map/school-map";
import { Callout, EmptyState } from "@/components/ui/primitives";

async function testOptions() {
  return db().select({ slug: schema.entranceTests.slug, name: schema.entranceTests.name }).from(schema.entranceTests).orderBy(schema.entranceTests.name);
}

function Check({ name, value, checked, label }: { name: string; value: string; checked: boolean; label: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 rounded-md px-1 py-1 text-sm text-ink-2 hover:text-ink">
      <input type="checkbox" name={name} value={value} defaultChecked={checked} className="size-4 rounded border-line-strong accent-[var(--accent)]" />
      {label}
    </label>
  );
}

async function Filters({ p, basePath, lockArea, idPrefix }: { p: DirectoryParams; basePath: string; lockArea: boolean; idPrefix: string }) {
  // Rendered twice (mobile disclosure and desktop sidebar), so ids need a per-copy prefix.
  const fid = (name: string) => `${idPrefix}-${name}`;
  const tests = await testOptions();
  return (
    <form method="get" action={basePath} className="space-y-6">
      {p.q ? <input type="hidden" name="q" value={p.q} /> : null}
      {p.view ? <input type="hidden" name="view" value={p.view} /> : null}
      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-ink">Near a postcode</legend>
        <div className="flex gap-2">
          <label htmlFor={fid("postcode")} className="sr-only">
            Postcode
          </label>
          <input id={fid("postcode")} name="postcode" defaultValue={p.postcode ?? ""} placeholder="e.g. HP21 7RP" autoComplete="postal-code" className="w-full min-w-0 rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm uppercase placeholder:normal-case" />
          <label htmlFor={fid("radius")} className="sr-only">
            Radius
          </label>
          <select id={fid("radius")} name="radius" defaultValue={String(p.radius ?? 30)} className="rounded-lg border border-line-strong bg-surface px-2 py-2 text-sm">
            {[5, 10, 20, 30, 50, 100].map((r) => (
              <option key={r} value={r}>
                {r} mi
              </option>
            ))}
          </select>
        </div>
        <p className="mt-1.5 text-xs text-ink-3">Distances are straight-line from the centre of your postcode — not the method schools use to rank applications.</p>
      </fieldset>

      {!lockArea ? (
        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-ink">Nation</legend>
          <div className="grid gap-0.5">
            {[
              ["", "All"],
              ["england", "England"],
              ["northern_ireland", "Northern Ireland"],
            ].map(([v, l]) => (
              <label key={v} className="flex cursor-pointer items-center gap-2.5 px-1 py-1 text-sm text-ink-2">
                <input type="radio" name="nation" value={v} defaultChecked={(p.nation ?? "") === v} className="size-4 accent-[var(--accent)]" />
                {l}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-ink">Pupils admitted</legend>
        <Check name="gender" value="boys" checked={p.gender.includes("boys")} label="Boys" />
        <Check name="gender" value="girls" checked={p.gender.includes("girls")} label="Girls" />
        <Check name="gender" value="mixed" checked={p.gender.includes("mixed")} label="Co-educational" />
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-ink">School type</legend>
        <Check name="selectivity" value="fully_selective" checked={p.selectivity.includes("fully_selective")} label="Grammar (fully selective)" />
        <Check name="selectivity" value="partially_selective" checked={p.selectivity.includes("partially_selective")} label="Partially selective" />
        <Check name="sixthForm" value="1" checked={!!p.sixthForm} label="Has a sixth form" />
        <Check name="boarding" value="1" checked={!!p.boarding} label="Offers boarding" />
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-ink">Entrance test</legend>
        <label htmlFor={fid("test")} className="sr-only">
          Entrance test
        </label>
        <select id={fid("test")} name="test" defaultValue={p.test ?? ""} className="w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm">
          <option value="">Any test</option>
          {tests.map((t) => (
            <option key={t.slug} value={t.slug}>
              {t.name}
            </option>
          ))}
        </select>
      </fieldset>

      <fieldset>
        <legend className="mb-1 text-sm font-semibold text-ink">Admissions rules</legend>
        <p className="mb-2 text-xs text-ink-3">Only schools whose admissions policy we hold for the selected year can match.</p>
        <Check name="outOfArea" value="1" checked={!!p.outOfArea} label="Admits out-of-area applicants" />
        <Check name="scoreRoute" value="1" checked={!!p.scoreRoute} label="Published score threshold" />
        <Check name="siblingPriority" value="1" checked={!!p.siblingPriority} label="Sibling priority" />
        <Check name="history" value="1" checked={!!p.history} label="Has historical offer data" />
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-ink">Sort by</legend>
        <label htmlFor={fid("sort")} className="sr-only">
          Sort by
        </label>
        <select id={fid("sort")} name="sort" defaultValue={p.sort ?? ""} className="w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm">
          <option value="">Best match</option>
          <option value="distance">Distance (needs a postcode)</option>
          <option value="name">Name (A–Z)</option>
          <option value="gcse">Attainment 8 (latest published)</option>
          <option value="alevel">A level points per entry (latest)</option>
        </select>
      </fieldset>

      <div className="flex gap-2">
        <button type="submit" className="flex-1 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover dark:text-[#0f1112]">
          Apply filters
        </button>
        <Link href={basePath} className="rounded-lg border border-line-strong px-3 py-2.5 text-sm font-medium text-ink-2 hover:bg-surface-2">
          Reset
        </Link>
      </div>
    </form>
  );
}

function ResultsTable({ r }: { r: SearchResult }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-surface">
      <table className="w-full min-w-[720px] text-sm">
        <caption className="sr-only">Grammar schools matching your search</caption>
        <thead className="border-b border-line bg-surface-2 text-left text-xs text-ink-3">
          <tr>
            <th scope="col" className="px-4 py-2.5 font-medium">School</th>
            <th scope="col" className="px-4 py-2.5 font-medium">Type</th>
            <th scope="col" className="px-4 py-2.5 font-medium">Test</th>
            <th scope="col" className="px-4 py-2.5 font-medium">Catchment</th>
            <th scope="col" className="px-4 py-2.5 text-right font-medium">Attainment 8</th>
            <th scope="col" className="px-4 py-2.5 text-right font-medium">A level</th>
            {r.location ? <th scope="col" className="px-4 py-2.5 text-right font-medium">Distance</th> : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {r.items.map((s) => (
            <tr key={s.id} className="hover:bg-surface-2/60">
              <th scope="row" className="px-4 py-2.5 text-left font-medium">
                <Link href={`/schools/${s.slug}`} className="hover:underline">
                  {s.name}
                </Link>
                <span className="block text-xs font-normal text-ink-3">{[s.town, s.laName].filter(Boolean).join(", ")}</span>
              </th>
              <td className="px-4 py-2.5 text-ink-2">
                {SELECTIVITY_SHORT[s.selectivity]} · {GENDER_LABEL[s.gender]}
              </td>
              <td className="px-4 py-2.5 text-ink-2">{s.testNames?.join(", ") ?? "—"}</td>
              <td className="px-4 py-2.5 text-ink-2">{s.catchmentType ? CATCHMENT_LABEL[s.catchmentType] : "—"}</td>
              <td className="px-4 py-2.5 text-right tabular">{s.attainment8 !== null ? `${s.attainment8.toFixed(1)} (${s.attainment8Year})` : "—"}</td>
              <td className="px-4 py-2.5 text-right tabular">{s.alevelGrade ? `${s.alevelGrade} (${s.alevelYear})` : "—"}</td>
              {r.location ? <td className="px-4 py-2.5 text-right tabular">{s.distanceMiles !== null ? formatMiles(s.distanceMiles) : "—"}</td> : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export async function DirectoryView({ p, result, basePath, lockArea = false, entryYear }: { p: DirectoryParams; result: SearchResult; basePath: string; lockArea?: boolean; entryYear: number }) {
  const view = p.view ?? "list";
  const pages = Math.max(1, Math.ceil(result.total / result.pageSize));
  const activeFilters = [p.gender.length, p.selectivity.length, p.sixthForm, p.boarding, p.test, p.outOfArea, p.scoreRoute, p.siblingPriority, p.history, p.postcode, !lockArea && p.nation].filter(Boolean).length;

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[18rem_minmax(0,1fr)]">
      <aside aria-label="Filters">
        <details className="group rounded-xl border border-line bg-surface lg:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2">
              <SlidersHorizontal aria-hidden className="size-4" /> Filters {activeFilters ? `(${activeFilters})` : ""}
            </span>
            <span className="text-xs text-ink-3 group-open:hidden">Show</span>
            <span className="hidden text-xs text-ink-3 group-open:inline">Hide</span>
          </summary>
          <div className="border-t border-line p-4">
            <Filters p={p} basePath={basePath} lockArea={lockArea} idPrefix="fm" />
          </div>
        </details>
        <div className="sticky top-24 hidden max-h-[calc(100vh-7rem)] overflow-auto rounded-xl border border-line bg-surface p-5 lg:block">
          <Filters p={p} basePath={basePath} lockArea={lockArea} idPrefix="fd" />
        </div>
      </aside>

      <section aria-labelledby="results-heading" className="min-w-0">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 id="results-heading" className="font-sans text-base font-semibold text-ink" aria-live="polite">
            {result.total} {result.total === 1 ? "school" : "schools"}
            {result.query ? <> matching &ldquo;{result.query}&rdquo;</> : null}
            {result.location ? <> within {p.radius ?? 30} miles of {result.location.label}</> : null}
          </h2>
          <nav aria-label="Result views" className="flex rounded-lg border border-line bg-surface p-0.5 text-sm">
            {(
              [
                ["list", "List", List],
                ["map", "Map", MapIcon],
                ["table", "Table", Table2],
              ] as const
            ).map(([v, label, Icon]) => (
              <Link
                key={v}
                href={`${basePath}${directoryQueryString(p, { view: v === "list" ? undefined : v, page: 1 })}`}
                aria-current={view === v ? "page" : undefined}
                className={clsx("flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium", view === v ? "bg-accent-soft text-accent-ink" : "text-ink-2 hover:text-ink")}
              >
                <Icon aria-hidden className="size-4" /> {label}
              </Link>
            ))}
          </nav>
        </div>

        {result.locationError ? (
          <Callout tone="warn" className="mb-4">
            {result.locationError}
          </Callout>
        ) : null}
        {result.location ? (
          <p className="mb-4 text-xs text-ink-3">
            Distances are measured in a straight line from the centre of {result.location.precision === "postcode_district" ? "the postcode district" : "your postcode"}. Schools measure distance from your exact home address using their own published method, so the figures will differ. Distance alone does not tell you whether a child is eligible.
          </p>
        ) : null}

        {result.items.length === 0 ? (
          <EmptyState title="No schools match these filters">
            Try removing a filter or widening the distance. Admissions-rule filters only match schools whose {entryYear} policy we hold — <Link className="link" href="/methodology#coverage">see coverage</Link>.
          </EmptyState>
        ) : view === "map" ? (
          <>
            <SchoolMap
              points={result.items.filter((s) => s.lat !== null && s.lng !== null).map((s) => ({ slug: s.slug, name: s.name, lat: s.lat!, lng: s.lng!, sub: [s.town, s.laName].filter(Boolean).join(", ") }))}
              origin={result.location ? { lat: result.location.latitude, lng: result.location.longitude, label: result.location.label } : null}
            />
            <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
              {result.items.map((s) => (
                <li key={s.id}>
                  <Link href={`/schools/${s.slug}`} className="link">
                    {s.name}
                  </Link>{" "}
                  <span className="text-ink-3">{s.town}</span>
                </li>
              ))}
            </ul>
          </>
        ) : view === "table" ? (
          <ResultsTable r={result} />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {result.items.map((s) => (
              <SchoolCard key={s.id} s={s} locationPrecision={result.location?.precision} />
            ))}
          </div>
        )}

        {pages > 1 ? (
          <nav aria-label="Pagination" className="mt-8 flex items-center justify-between text-sm">
            {p.page > 1 ? (
              <Link href={`${basePath}${directoryQueryString(p, { page: p.page - 1 })}`} className="rounded-lg border border-line-strong px-3 py-2 hover:bg-surface-2" rel="prev">
                Previous
              </Link>
            ) : (
              <span />
            )}
            <span className="text-ink-3">
              Page {p.page} of {pages}
            </span>
            {p.page < pages ? (
              <Link href={`${basePath}${directoryQueryString(p, { page: p.page + 1 })}`} className="rounded-lg border border-line-strong px-3 py-2 hover:bg-surface-2" rel="next">
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
