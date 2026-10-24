import Link from "next/link";
import { clsx } from "clsx";
import { COMPARE_GROUPS, type CompareGroup, type loadComparison } from "@/server/compare";
import { AddSchool, RemoveSchool, ShareAndPrint } from "./compare-controls";
import { YearPicker } from "./admissions";
import { Callout, EmptyState } from "@/components/ui/primitives";

export function CompareView({
  data,
  groups,
  diffOnly,
  years,
  savedSlug,
}: {
  data: Awaited<ReturnType<typeof loadComparison>>;
  groups: CompareGroup[];
  diffOnly: boolean;
  years: number[];
  savedSlug?: string;
}) {
  const slugs = data.schools.map((s) => s.slug);
  const baseQs = `schools=${slugs.join(",")}&year=${data.entryYear}`;
  const qs = (g: CompareGroup[], d: boolean) => `/compare?${baseQs}${g.length !== Object.keys(COMPARE_GROUPS).length ? `&dims=${g.join(",")}` : ""}${d ? "&diff=1" : ""}`;
  const nations = new Set(data.schools.map((s) => s.nation));

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4" data-no-print>
        <AddSchool current={slugs} entryYear={data.entryYear} />
        <ShareAndPrint slugs={slugs} entryYear={data.entryYear} savedSlug={savedSlug} />
      </div>
      {data.schools.length < 2 ? (
        <EmptyState title="Add at least two schools to compare">Search above, or shortlist schools from any profile or the directory.</EmptyState>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-4" data-no-print>
            <nav aria-label="Comparison sections" className="flex flex-wrap gap-1.5">
              {(Object.keys(COMPARE_GROUPS) as CompareGroup[]).map((g) => {
                const on = groups.includes(g);
                const next = on ? groups.filter((x) => x !== g) : [...groups, g];
                return (
                  <Link
                    key={g}
                    href={qs(next.length ? next : groups, diffOnly)}
                    aria-pressed={on}
                    className={clsx("rounded-full border px-3 py-1.5 text-sm font-medium", on ? "border-accent/40 bg-accent-soft text-accent-ink" : "border-line-strong text-ink-2 hover:text-ink")}
                  >
                    {COMPARE_GROUPS[g]}
                  </Link>
                );
              })}
              <Link href={qs(groups, !diffOnly)} aria-pressed={diffOnly} className={clsx("rounded-full border px-3 py-1.5 text-sm font-medium", diffOnly ? "border-ink bg-ink text-bg" : "border-line-strong text-ink-2 hover:text-ink")}>
                Only differences
              </Link>
            </nav>
            <YearPicker years={years} selected={data.entryYear} basePath="/compare" extraQuery={`schools=${slugs.join(",")}`} />
          </div>
          {nations.size > 1 ? (
            <Callout tone="warn">You are comparing schools in England and Northern Ireland. Their admissions systems, tests and entry years differ; rows are shown side by side for reference only.</Callout>
          ) : null}
          <div className="overflow-x-auto rounded-xl border border-line bg-surface">
            <table className="w-full min-w-[760px] text-sm">
              <caption className="sr-only">Comparison of {data.schools.map((s) => s.name).join(", ")}</caption>
              <thead className="sticky top-16 z-10 bg-surface">
                <tr className="border-b border-line">
                  <th scope="col" className="w-52 px-4 py-4 text-left text-xs font-medium text-ink-3">
                    September {data.entryYear} entry
                  </th>
                  {data.schools.map((s) => (
                    <th key={s.slug} scope="col" className="px-4 py-4 text-left align-top">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <Link href={`/schools/${s.slug}`} className="font-serif text-base font-semibold text-ink hover:underline">
                            {s.name}
                          </Link>
                          <span className="block text-xs font-normal text-ink-3">{[s.town, s.la].filter(Boolean).join(", ")}</span>
                        </div>
                        <RemoveSchool slug={s.slug} current={slugs} entryYear={data.entryYear} name={s.name} />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              {(Object.keys(COMPARE_GROUPS) as CompareGroup[])
                .filter((g) => groups.includes(g))
                .map((g) => {
                  const rows = data.rows.filter((r) => r.group === g && (!diffOnly || r.differs));
                  if (!rows.length) return null;
                  return (
                    <tbody key={g} className="divide-y divide-line">
                      <tr className="bg-surface-2">
                        <th colSpan={data.schools.length + 1} scope="colgroup" className="px-4 py-2 text-left text-xs font-semibold tracking-wide text-ink-2 uppercase">
                          {COMPARE_GROUPS[g]}
                        </th>
                      </tr>
                      {rows.map((r) => (
                        <tr key={r.label} className={r.differs ? "bg-warn-soft/30" : undefined}>
                          <th scope="row" className="px-4 py-3 text-left align-top text-xs font-medium text-ink-3">
                            {r.label}
                            {r.differs ? <span className="mt-0.5 block text-[11px] font-semibold text-warn">Differs</span> : null}
                            {r.note ? <span className="mt-1 block text-[11px] font-normal text-ink-3">{r.note}</span> : null}
                          </th>
                          {r.values.map((v, i) => (
                            <td key={i} className="px-4 py-3 align-top font-medium text-ink">
                              {v}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  );
                })}
            </table>
          </div>
          <p className="text-xs text-ink-3">
            We don&apos;t declare one school “better”: every row is a fact from an official source, and which ones matter depends on your child. Highlighted rows differ between schools. Full sources are on each school&apos;s profile.
          </p>
        </>
      )}
    </div>
  );
}
