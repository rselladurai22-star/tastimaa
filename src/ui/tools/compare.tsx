import Link from "next/link";
import { clsx } from "clsx";
import { COMPARE_GROUPS, type CompareGroup, type CompareRow, type loadComparison } from "@/server/compare";
import { Gap, Note } from "../kit";
import { YearPicker } from "../report/parts";
import { AddSchool, RemoveSchool, ShareAndPrint } from "./compare-controls";

const MARKS = ["A", "B", "C", "D", "E"];

function Bar({ row, i }: { row: CompareRow; i: number }) {
  const v = row.nums?.[i];
  if (v === null || v === undefined) return null;
  const nums = row.nums!.filter((n): n is number => n !== null);
  const max = row.scaleMax ?? Math.max(...nums);
  const top = v === Math.max(...nums) && nums.length > 1 && new Set(nums).size > 1;
  return (
    <span aria-hidden className="mt-2 block h-1.5 w-full max-w-[12rem] rounded-full bg-sage-deep">
      <span className={clsx("block h-full origin-left rounded-full", top ? "bg-copper" : "bg-green-bright")} style={{ width: `${max ? Math.max(2, (v / max) * 100) : 0}%` }} />
    </span>
  );
}

/** Side-by-side comparison: sticky school headers, highlighted differences, bars for figures. */
export function CompareView({ data, groups, diffOnly, years, savedSlug }: { data: Awaited<ReturnType<typeof loadComparison>>; groups: CompareGroup[]; diffOnly: boolean; years: number[]; savedSlug?: string }) {
  const slugs = data.schools.map((s) => s.slug);
  const baseQs = `schools=${slugs.join(",")}&year=${data.entryYear}`;
  const qs = (g: CompareGroup[], d: boolean) => `/compare?${baseQs}${g.length !== Object.keys(COMPARE_GROUPS).length ? `&dims=${g.join(",")}` : ""}${d ? "&diff=1" : ""}`;
  const nations = new Set(data.schools.map((s) => s.nation));
  const differing = data.rows.filter((r) => groups.includes(r.group) && r.differs).length;

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-rule pb-5" data-no-print>
        <AddSchool current={slugs} entryYear={data.entryYear} />
        <ShareAndPrint slugs={slugs} entryYear={data.entryYear} savedSlug={savedSlug} />
      </div>
      {data.schools.length < 2 ? (
        <Gap title="Add at least two schools to compare">Search above, or shortlist schools from any profile or the directory.</Gap>
      ) : (
        <>
          <div className="flex flex-wrap items-end justify-between gap-4" data-no-print>
            <div>
              <p className="label mb-2">Show</p>
              <nav aria-label="Comparison sections" className="flex flex-wrap gap-1.5">
                {(Object.keys(COMPARE_GROUPS) as CompareGroup[]).map((g) => {
                  const on = groups.includes(g);
                  const next = on ? groups.filter((x) => x !== g) : [...groups, g];
                  return (
                    <Link
                      key={g}
                      href={qs(next.length ? next : groups, diffOnly)}
                      aria-current={on ? "true" : undefined}
                      className={clsx("inline-flex min-h-10 items-center rounded-[4px] border px-3 text-[0.95rem] font-semibold no-underline transition-colors", on ? "border-green bg-green text-paper" : "border-control bg-card text-ink-2 hover:text-ink")}
                    >
                      {COMPARE_GROUPS[g]}
                    </Link>
                  );
                })}
                <Link
                  href={qs(groups, !diffOnly)}
                  aria-current={diffOnly ? "true" : undefined}
                  className={clsx("inline-flex min-h-10 items-center gap-2 rounded-[4px] border px-3 text-[0.95rem] font-semibold no-underline transition-colors", diffOnly ? "border-copper bg-copper-wash text-copper-ink" : "border-control bg-card text-ink-2 hover:text-ink")}
                >
                  <span aria-hidden className="h-4 w-[3px] rounded-full bg-copper" /> Only differences <span className="font-mono text-[0.8rem] font-normal">{differing}</span>
                </Link>
              </nav>
            </div>
            <YearPicker years={years} selected={data.entryYear} basePath="/compare" extraQuery={`schools=${slugs.join(",")}`} />
          </div>
          {nations.size > 1 ? (
            <Note tone="caution">You are comparing schools in England and Northern Ireland. Their admissions systems, tests and entry years differ; rows are shown side by side for reference only.</Note>
          ) : null}
          <div className="relative overflow-x-auto rounded-[8px] border border-rule bg-card lg:overflow-visible">
            <table className="w-full min-w-[760px] table-fixed border-collapse text-[0.98rem]">
              <caption className="sr-only">Comparison of {data.schools.map((s) => s.name).join(", ")}</caption>
              <thead className="lg:sticky lg:top-[var(--header-h)] lg:z-10">
                <tr>
                  <th scope="col" className="sticky left-0 z-[2] w-52 border-b border-ink bg-paper px-4 py-4 text-left align-bottom lg:static">
                    <span className="label">September {data.entryYear} entry</span>
                  </th>
                  {data.schools.map((s, i) => (
                    <th key={s.slug} scope="col" className="border-b border-ink bg-paper px-4 py-4 text-left align-top">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span aria-hidden className="mb-1.5 grid size-6 place-items-center rounded-[3px] bg-ink font-mono text-[0.75rem] font-medium text-paper">
                            {MARKS[i]}
                          </span>
                          <Link href={`/schools/${s.slug}`} className="block font-display text-[1.12rem] leading-snug font-normal text-ink no-underline hover:text-green hover:underline">
                            {s.name}
                          </Link>
                          <span className="block text-small font-normal text-ink-2">{[s.town, s.la].filter(Boolean).join(", ")}</span>
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
                    <tbody key={g}>
                      <tr>
                        <th colSpan={data.schools.length + 1} scope="colgroup" className="border-b border-rule bg-sage/60 px-4 py-2 text-left">
                          <span className="label text-ink">{COMPARE_GROUPS[g]}</span>
                        </th>
                      </tr>
                      {rows.map((r) => (
                        <tr key={r.label} className={clsx("border-b border-rule", r.differs && "bg-copper-wash/35")}>
                          <th scope="row" className={clsx("sticky left-0 z-[1] px-4 py-3 text-left align-top text-[0.95rem] font-semibold text-ink-2 lg:static", r.differs ? "bg-[color-mix(in_srgb,var(--copper-wash)_35%,var(--card))] shadow-[inset_3px_0_0_var(--copper)]" : "bg-card")}>
                            {r.label}
                            {r.differs ? <span className="mt-1 block font-mono text-[0.72rem] font-medium tracking-[0.06em] text-copper-ink uppercase">Differs</span> : null}
                            {r.note ? <span className="mt-1 block text-small font-normal text-ink-2">{r.note}</span> : null}
                          </th>
                          {r.values.map((v, i) => (
                            <td key={i} className={clsx("px-4 py-3 align-top text-ink", r.nums ? "font-mono text-[0.95rem]" : "")}>
                              {v}
                              {r.nums ? <Bar row={r} i={i} /> : null}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  );
                })}
            </table>
          </div>
          <p className="flex flex-wrap items-center gap-x-5 gap-y-1 text-small text-ink-2">
            <span className="inline-flex items-center gap-2">
              <span aria-hidden className="h-4 w-[3px] rounded-full bg-copper" /> Rows that differ between schools
            </span>
            <span className="inline-flex items-center gap-2">
              <span aria-hidden className="h-1.5 w-6 rounded-full bg-copper" /> Highest figure in a row
            </span>
            <span className="inline-flex items-center gap-2">
              <span aria-hidden className="h-1.5 w-6 rounded-full bg-green-bright" /> Other figures, from zero
            </span>
          </p>
          <p className="max-w-[70ch] text-small leading-relaxed text-ink-2">
            We don&apos;t declare one school “better”: every row is a fact from an official source, and which ones matter depends on your child. Highlighted rows differ between schools. Full sources are on each school&apos;s profile.
          </p>
        </>
      )}
    </div>
  );
}
