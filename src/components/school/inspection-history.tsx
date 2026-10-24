import { ExternalLink } from "lucide-react";
import { EIF_GRADE, FRAMEWORK_LABEL, INSPECTION_AREA_LABEL, REPORT_CARD_SCALE } from "@/domain/labels";
import { formatDate, formatNumber } from "@/lib/format";
import type { getAllocations, getInspections, SourceRef } from "@/server/profile";
import { TrendChart } from "@/components/charts/trend-chart";
import { Callout, Card, EmptyState } from "@/components/ui/primitives";
import { SourceNote } from "@/components/ui/source-note";

type Inspection = Awaited<ReturnType<typeof getInspections>>[number];

function ReportCardGrade({ grade }: { grade: string }) {
  const idx = REPORT_CARD_SCALE.indexOf(grade as (typeof REPORT_CARD_SCALE)[number]);
  return (
    <span className="inline-flex items-center gap-2">
      <span aria-hidden className="flex gap-0.5">
        {REPORT_CARD_SCALE.map((g, i) => (
          <span key={g} className={i >= idx && idx >= 0 ? "h-2 w-3 rounded-sm bg-accent" : "h-2 w-3 rounded-sm bg-surface-3"} />
        )).reverse()}
      </span>
      <span className="font-semibold text-ink">{grade}</span>
    </span>
  );
}

export function InspectionCard({ i, sources }: { i: Inspection; sources: Map<number, SourceRef> }) {
  const doc = i.sourceDocumentId ? sources.get(i.sourceDocumentId) : null;
  return (
    <Card className="p-5">
      <p className="text-xs font-semibold tracking-wide text-accent-ink uppercase">{FRAMEWORK_LABEL[i.framework]}</p>
      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-sans text-base font-semibold text-ink">
          Inspected {formatDate(i.startDate)}
          {i.publicationDate ? <span className="font-normal text-ink-3"> · published {formatDate(i.publicationDate)}</span> : null}
        </h3>
        {i.reportUrl ? (
          <a href={i.reportUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm link">
            Ofsted report <ExternalLink aria-hidden className="size-3.5" />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        ) : null}
      </div>
      {i.relatesToCurrentUrn === false ? <p className="mt-1 text-xs text-warn">This inspection was of a predecessor school (URN {i.urnAtInspection}).</p> : null}

      {i.framework === "report_card_2025" ? (
        <>
          <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {i.evaluations.map((e) => (
              <div key={e.area} className="flex items-center justify-between gap-3 border-b border-line/70 pb-2">
                <dt className="text-sm text-ink-2">{INSPECTION_AREA_LABEL[e.area] ?? e.area}</dt>
                <dd className="text-sm">
                  <ReportCardGrade grade={e.grade} />
                </dd>
              </div>
            ))}
            <div className="flex items-center justify-between gap-3 border-b border-line/70 pb-2">
              <dt className="text-sm text-ink-2">Safeguarding</dt>
              <dd className="text-sm font-semibold text-ink">{i.safeguarding ?? "—"}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-ink-3">Report cards grade each area separately on a five-point scale (Exceptional, Strong standard, Expected standard, Needs attention, Urgent improvement). There is no single overall grade.</p>
        </>
      ) : i.framework === "eif_2019" ? (
        <>
          <p className="mt-3 text-sm">
            Overall effectiveness: <strong className="text-ink">{i.overallEffectiveness ? EIF_GRADE[String(i.overallEffectiveness)] : "—"}</strong>
          </p>
          <dl className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
            {i.evaluations.map((e) => (
              <div key={e.area} className="flex justify-between gap-3 border-b border-line/70 pb-1.5 text-sm">
                <dt className="text-ink-2">{INSPECTION_AREA_LABEL[e.area] ?? e.area}</dt>
                <dd className="font-medium text-ink">{EIF_GRADE[e.grade] ?? e.grade}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-ink-3">One-word judgements from the 2019 framework are not equivalent to report card grades and should not be compared directly with them.</p>
        </>
      ) : (
        <p className="mt-3 text-sm">
          Outcome: <strong className="text-ink">{i.outcome ?? "—"}</strong>
        </p>
      )}
      <SourceNote source={doc} locator={i.sourceLocator} status={i.verificationStatus} />
    </Card>
  );
}

export function InspectionList({ inspections, sources, nation }: { inspections: Inspection[]; sources: Map<number, SourceRef>; nation: string }) {
  if (nation === "northern_ireland") {
    return (
      <Callout title="Inspections in Northern Ireland">
        Schools in Northern Ireland are inspected by the Education and Training Inspectorate (ETI), not Ofsted. We have not yet integrated ETI reports — see the{" "}
        <a href="https://www.etini.gov.uk/" rel="noopener noreferrer" target="_blank">
          ETI website
        </a>
        .
      </Callout>
    );
  }
  if (!inspections.length) return <EmptyState title="No inspection is recorded in Ofsted's latest management information">Some schools that converted to academies have not been inspected under their new URN yet.</EmptyState>;
  return (
    <div className="grid gap-4">
      {inspections.map((i) => (
        <InspectionCard key={i.id} i={i} sources={sources} />
      ))}
    </div>
  );
}

type Allocations = Awaited<ReturnType<typeof getAllocations>>;

export function AllocationsSection({ rows, sources, schoolName }: { rows: Allocations; sources: Map<number, SourceRef>; schoolName: string }) {
  if (!rows.length) {
    return <EmptyState title="No applications and offers data is published for this school">DfE publishes school-level offers for England only. Northern Ireland allocation data is not yet integrated.</EmptyState>;
  }
  const years = [...new Set(rows.map((r) => r.entryYear))].sort();
  const get = (y: number, m: string) => rows.find((r) => r.entryYear === y && r.metric === m)?.value ?? null;
  const doc = rows.at(-1)?.sourceDocumentId ? sources.get(rows.at(-1)!.sourceDocumentId!) : null;
  const latest = years.at(-1)!;
  const first = get(latest, "times_first_preference");
  const offers = get(latest, "offers_made");
  return (
    <div className="grid gap-6">
      <Callout title="What these figures are — and are not">
        These are counts from DfE&apos;s national offer day data, reported by councils. They show demand (how often families named the school) and how many offers were made. They are <strong>not</strong> lowest qualifying scores or
        last-offer distances, and they don&apos;t tell you whether your child would get a place.
      </Callout>
      {first !== null && offers !== null ? (
        <p className="text-lg text-ink-2">
          For September {latest} entry, families named {schoolName} as their first preference <strong className="text-ink">{formatNumber(first)}</strong> times, and <strong className="text-ink">{formatNumber(offers)}</strong> offers were
          made on national offer day.
        </p>
      ) : null}
      <TrendChart
        title="First preferences and offers on national offer day"
        caption="Year of entry (September). Same scale for both series."
        xs={years.map(String)}
        unit="count"
        decimals={0}
        series={[
          { key: "first", label: "Named as first preference", color: "--series-1", points: years.map((y) => ({ x: String(y), y: get(y, "times_first_preference") })) },
          { key: "offers", label: "Offers made", color: "--series-2", points: years.map((y) => ({ x: String(y), y: get(y, "offers_made") })) },
        ]}
      />
      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full min-w-[720px] text-sm tabular">
          <caption className="sr-only">Applications and offers by year of entry</caption>
          <thead className="border-b border-line bg-surface-2 text-left text-xs text-ink-3">
            <tr>
              <th scope="col" className="px-4 py-2.5 font-medium">Entry</th>
              <th scope="col" className="px-4 py-2.5 text-right font-medium">Named as any preference</th>
              <th scope="col" className="px-4 py-2.5 text-right font-medium">First preferences</th>
              <th scope="col" className="px-4 py-2.5 text-right font-medium">Offers made</th>
              <th scope="col" className="px-4 py-2.5 text-right font-medium">Applications from other LAs</th>
              <th scope="col" className="px-4 py-2.5 text-right font-medium">Offers to other LAs</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {years
              .slice()
              .reverse()
              .map((y) => (
                <tr key={y}>
                  <th scope="row" className="px-4 py-2 text-left font-medium">
                    September {y}
                  </th>
                  <td className="px-4 py-2 text-right">{formatNumber(get(y, "times_any_preference"))}</td>
                  <td className="px-4 py-2 text-right">{formatNumber(get(y, "times_first_preference"))}</td>
                  <td className="px-4 py-2 text-right font-semibold">{formatNumber(get(y, "offers_made"))}</td>
                  <td className="px-4 py-2 text-right">{formatNumber(get(y, "applications_from_other_la"))}</td>
                  <td className="px-4 py-2 text-right">{formatNumber(get(y, "offers_to_other_la"))}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-ink-3">
        “Other LAs” means families living outside the local authority where the school is. Offers to them show that out-of-area admission has happened — not that it will again, or for which criteria.
      </p>
      <SourceNote source={doc} status="officially_verified" />
    </div>
  );
}
