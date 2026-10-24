import { EIF_GRADE, FRAMEWORK_LABEL, INSPECTION_AREA_LABEL } from "@/domain/labels";
import { formatMeasure, MEASURES, STATUS_CODES, type MeasureKey } from "@/domain/measures";
import { formatDate, formatNumber } from "@/lib/format";
import type { getAllocations, getInspections, SourceRef } from "@/server/profile";
import type { MeasureRow } from "@/server/profile-view";
import { IconChevron } from "../icons";
import { ExternalLink, Gap, Note, Source } from "../kit";
import { ReportCardScale } from "../viz/admissions-viz";
import { GroupedBars, LineChart, type Unit } from "../viz/charts";

/* ───────────────── Results ───────────────── */

function measureUnit(unit: string): Unit {
  return unit === "count" ? "count" : (unit as Unit);
}

/** One measure as a figure: trend against benchmarks, then the full table with status codes. */
export function MeasureFigure({ measure, rows, laName, sources, n }: { measure: MeasureKey; rows: MeasureRow[]; laName: string | null; sources: Map<number, SourceRef>; n: string }) {
  const def = MEASURES[measure];
  const published = rows.filter((r) => r.value !== null);
  const latest = published.at(-1) ?? null;
  const notes = rows.filter((r) => r.note);
  const latestSource = rows.at(-1)?.sourceDocumentId ? sources.get(rows.at(-1)!.sourceDocumentId!) : null;
  const showLa = rows.some((r) => r.la !== null);
  const showSel = rows.some((r) => r.nationalSelective !== null);
  const series = [
    { key: "school", label: "This school", tone: "school" as const, points: rows.map((r) => ({ x: r.year, y: r.value })) },
    ...(showSel ? [{ key: "sel", label: "All selective schools", short: "Selective avg", tone: "benchmark" as const, points: rows.map((r) => ({ x: r.year, y: r.nationalSelective })) }] : []),
    ...(showLa ? [{ key: "la", label: `${laName ?? "LA"} average`, short: "LA average", tone: "third" as const, points: rows.map((r) => ({ x: r.year, y: r.la })) }] : []),
  ];
  return (
    <figure className="grid gap-6 border-b border-rule pb-10 last:border-b-0 xl:grid-cols-[17rem_minmax(0,1fr)]">
      <div>
        <p className="label text-copper-ink">Fig. {n}</p>
        <h3 className="mt-1.5 text-h4">{def.label}</h3>
        <p className="mt-2 text-[0.98rem] leading-relaxed text-ink-2">{def.description}</p>
        {latest ? (
          <div className="mt-5">
            <p className="font-display text-[2.6rem] leading-none text-ink num [font-variation-settings:'opsz'_72]">
              {formatMeasure(def, latest.value)}
              {latest.valueText ? <span className="ml-2 font-sans text-[1.1rem] font-semibold text-ink-2">{latest.valueText}</span> : null}
            </p>
            <p className="mt-2 text-small text-ink-2">
              {latest.year} · {latest.dataVersion?.toLowerCase() ?? "official"}
              {latest.nationalSelective !== null ? (
                <>
                  <br />
                  All selective schools: {formatMeasure(def, latest.nationalSelective)}
                </>
              ) : null}
            </p>
          </div>
        ) : (
          <p className="mt-5 text-ink-2">Not published.</p>
        )}
      </div>
      <div className="min-w-0">
        {published.length >= 2 ? (
          <LineChart xs={rows.map((r) => r.year)} series={series} unit={measureUnit(def.unit)} decimals={def.decimals} label={`${def.label}, this school against benchmarks, by academic year`} table={false} />
        ) : (
          <p className="mb-3 text-small text-ink-2">A trend needs at least two published years, so only the table is shown.</p>
        )}
        <details className="group/t mt-3 border-t border-rule" open={published.length < 2}>
          <summary className="flex min-h-11 list-none items-center gap-2 text-[0.95rem] font-semibold text-green">
            <IconChevron size={16} className="transition-transform duration-[var(--d-2)] group-open/t:rotate-180" />
            Show the data as a table
          </summary>
          <div className="relative overflow-x-auto pb-1">
            <table className="w-full min-w-[520px] border-collapse text-[0.95rem]">
              <caption className="sr-only">{def.label} by year, with comparisons</caption>
              <thead>
                <tr className="border-b border-ink text-left font-mono text-[0.72rem] tracking-[0.06em] text-ink-2 uppercase">
                  <th scope="col" className="py-2 pr-3 font-medium">
                    Year
                  </th>
                  <th scope="col" className="py-2 pr-3 text-right font-medium">
                    This school
                  </th>
                  {showSel ? (
                    <th scope="col" className="py-2 pr-3 text-right font-medium">
                      All selective
                    </th>
                  ) : null}
                  {showLa ? (
                    <th scope="col" className="py-2 pr-3 text-right font-medium">
                      {laName ?? "LA"} (all)
                    </th>
                  ) : null}
                  <th scope="col" className="py-2 pr-3 text-right font-medium">
                    England (all)
                  </th>
                  <th scope="col" className="py-2 font-medium">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="num">
                {rows.map((r) => (
                  <tr key={r.year} className="border-b border-rule">
                    <th scope="row" className="py-2 pr-3 text-left font-mono font-normal text-ink-2">
                      {r.year}
                    </th>
                    <td className="py-2 pr-3 text-right font-semibold text-ink">
                      {r.value !== null ? (
                        <>
                          {formatMeasure(def, r.value)}
                          {r.valueText ? <span className="ml-1 font-normal text-ink-2">({r.valueText})</span> : null}
                        </>
                      ) : (
                        <span className="font-normal text-ink-2" title={r.statusCode ? STATUS_CODES[r.statusCode] : undefined}>
                          Not published{r.statusCode ? ` (${r.statusCode})` : ""}
                        </span>
                      )}
                    </td>
                    {showSel ? <td className="py-2 pr-3 text-right text-ink-2">{r.nationalSelective !== null ? formatMeasure(def, r.nationalSelective) : "—"}</td> : null}
                    {showLa ? <td className="py-2 pr-3 text-right text-ink-2">{r.la !== null ? formatMeasure(def, r.la) : "—"}</td> : null}
                    <td className="py-2 pr-3 text-right text-ink-2">{r.nationalAll !== null ? formatMeasure(def, r.nationalAll) : "—"}</td>
                    <td className="py-2 text-small text-ink-2">{r.dataVersion ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
        {notes.map((x) => (
          <p key={x.year} className="mt-2 text-small leading-relaxed text-ink-2">
            <span className="font-mono text-ink">{x.year}</span> — {x.note}
          </p>
        ))}
        {rows.some((r) => r.statusCode && r.statusCode !== "z") ? (
          <p className="mt-2 text-small text-ink-2">
            Codes:{" "}
            {Object.entries(STATUS_CODES)
              .filter(([k]) => rows.some((r) => r.statusCode === k))
              .map(([k, v]) => `${k} = ${v}`)
              .join("; ")}
          </p>
        ) : null}
        <Source source={latestSource} locator={rows.at(-1)?.sourceLocator} status="officially_verified" />
      </div>
    </figure>
  );
}

export function ResultsCaveat() {
  return (
    <Note title="Reading these results fairly">
      Grammar schools admit pupils with high prior attainment, so raw results are expected to sit well above all-school averages. The fairest comparison is with other selective schools; progress measures (where DfE publishes them) account for
      pupils&apos; starting points. We don&apos;t rank schools on raw results.
    </Note>
  );
}

/* ───────────────── Inspection ───────────────── */

type Inspection = Awaited<ReturnType<typeof getInspections>>[number];

export function InspectionEntry({ i, sources, lead = false }: { i: Inspection; sources: Map<number, SourceRef>; lead?: boolean }) {
  const doc = i.sourceDocumentId ? sources.get(i.sourceDocumentId) : null;
  return (
    <article className="grid gap-x-8 gap-y-4 md:grid-cols-[11rem_minmax(0,1fr)]">
      <div>
        <p className="font-display text-[1.6rem] leading-none text-ink num">{formatDate(i.startDate)}</p>
        <p className="mt-2 label text-[0.72rem] text-copper-ink">{FRAMEWORK_LABEL[i.framework]}</p>
        {i.publicationDate ? <p className="mt-1 text-small text-ink-2">Published {formatDate(i.publicationDate)}</p> : null}
      </div>
      <div className={lead ? "rounded-[8px] border border-rule bg-card p-5" : "border-l border-rule pl-5"}>
        {i.relatesToCurrentUrn === false ? <p className="mb-2 text-small font-semibold text-pend">This inspection was of a predecessor school (URN {i.urnAtInspection}).</p> : null}
        {i.framework === "report_card_2025" ? (
          <>
            <dl className="grid gap-x-8 sm:grid-cols-2">
              {i.evaluations.map((e) => (
                <div key={e.area} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-rule py-2.5">
                  <dt className="text-[0.95rem] text-ink-2">{INSPECTION_AREA_LABEL[e.area] ?? e.area}</dt>
                  <dd className="text-[0.95rem]">
                    <ReportCardScale grade={e.grade} />
                  </dd>
                </div>
              ))}
              <div className="flex items-center justify-between gap-3 border-b border-rule py-2.5">
                <dt className="text-[0.95rem] text-ink-2">Safeguarding</dt>
                <dd className="text-[0.95rem] font-semibold text-ink">{i.safeguarding ?? "—"}</dd>
              </div>
            </dl>
            <p className="mt-3 text-small leading-relaxed text-ink-2">Report cards grade each area separately on a five-point scale (Exceptional, Strong standard, Expected standard, Needs attention, Urgent improvement). There is no single overall grade.</p>
          </>
        ) : i.framework === "eif_2019" ? (
          <>
            <p className="text-[1.02rem]">
              Overall effectiveness: <strong className="text-ink">{i.overallEffectiveness ? EIF_GRADE[String(i.overallEffectiveness)] : "—"}</strong>
            </p>
            <dl className="mt-2 grid gap-x-8 sm:grid-cols-2">
              {i.evaluations.map((e) => (
                <div key={e.area} className="flex justify-between gap-3 border-b border-rule py-2 text-[0.95rem]">
                  <dt className="text-ink-2">{INSPECTION_AREA_LABEL[e.area] ?? e.area}</dt>
                  <dd className="font-semibold text-ink">{EIF_GRADE[e.grade] ?? e.grade}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-small leading-relaxed text-ink-2">One-word judgements from the 2019 framework are not equivalent to report card grades and should not be compared directly with them.</p>
          </>
        ) : (
          <p className="text-[1.02rem]">
            Outcome: <strong className="text-ink">{i.outcome ?? "—"}</strong>
          </p>
        )}
        {i.reportUrl ? (
          <p className="mt-3">
            <ExternalLink href={i.reportUrl}>Read the Ofsted report</ExternalLink>
          </p>
        ) : null}
        <Source source={doc} locator={i.sourceLocator} status={i.verificationStatus} />
      </div>
    </article>
  );
}

export function NIInspectionNote() {
  return (
    <Note title="Inspections in Northern Ireland">
      Schools in Northern Ireland are inspected by the Education and Training Inspectorate (ETI), not Ofsted. We have not yet integrated ETI reports — see the{" "}
      <a href="https://www.etini.gov.uk/" rel="noopener noreferrer" target="_blank">
        ETI website
      </a>
      .
    </Note>
  );
}

/* ───────────────── Applications and offers ───────────────── */

type Allocations = Awaited<ReturnType<typeof getAllocations>>;

export function allocationSeries(rows: Allocations) {
  const years = [...new Set(rows.map((r) => r.entryYear))].sort();
  const get = (y: number, m: string) => rows.find((r) => r.entryYear === y && r.metric === m)?.value ?? null;
  return { years, get };
}

export function DemandChart({ rows, height = 260 }: { rows: Allocations; height?: number }) {
  const { years, get } = allocationSeries(rows);
  return (
    <GroupedBars
      height={height}
      label="First preferences and offers made on national offer day, by year of September entry"
      xs={years.map(String)}
      series={[
        { key: "first", label: "Named as first preference", tone: "school", points: years.map((y) => ({ x: String(y), y: get(y, "times_first_preference") })) },
        { key: "offers", label: "Offers made", tone: "benchmark", points: years.map((y) => ({ x: String(y), y: get(y, "offers_made") })) },
      ]}
    />
  );
}

export function AllocationsTable({ rows }: { rows: Allocations }) {
  const { years, get } = allocationSeries(rows);
  const h = "border-b border-ink px-3 py-2 text-right font-mono text-[0.72rem] font-medium tracking-[0.06em] text-ink-2 uppercase";
  return (
    <div className="relative overflow-x-auto rounded-[5px] border border-rule bg-card" role="region" aria-label="Applications and offers by year" tabIndex={0}>
      <table className="w-full min-w-[720px] border-collapse text-[0.95rem] num">
        <caption className="sr-only">Applications and offers by year of entry</caption>
        <thead>
          <tr>
            <th scope="col" className={h.replace("text-right", "text-left")}>
              Entry
            </th>
            <th scope="col" className={h}>
              Any preference
            </th>
            <th scope="col" className={h}>
              First preferences
            </th>
            <th scope="col" className={h}>
              Offers made
            </th>
            <th scope="col" className={h}>
              Applications, other LAs
            </th>
            <th scope="col" className={h}>
              Offers, other LAs
            </th>
          </tr>
        </thead>
        <tbody>
          {years
            .slice()
            .reverse()
            .map((y) => (
              <tr key={y} className="border-b border-rule last:border-0">
                <th scope="row" className="px-3 py-2 text-left font-normal text-ink">
                  September {y}
                </th>
                <td className="px-3 py-2 text-right text-ink-2">{formatNumber(get(y, "times_any_preference"))}</td>
                <td className="px-3 py-2 text-right text-ink-2">{formatNumber(get(y, "times_first_preference"))}</td>
                <td className="px-3 py-2 text-right font-semibold text-ink">{formatNumber(get(y, "offers_made"))}</td>
                <td className="px-3 py-2 text-right text-ink-2">{formatNumber(get(y, "applications_from_other_la"))}</td>
                <td className="px-3 py-2 text-right text-ink-2">{formatNumber(get(y, "offers_to_other_la"))}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

export function NoAllocations() {
  return <Gap title="No applications and offers data is published for this school">DfE publishes school-level offers for England only. Northern Ireland allocation data is not yet integrated.</Gap>;
}
