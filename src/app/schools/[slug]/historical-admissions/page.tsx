import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { formatNumber } from "@/lib/format";
import { tabIndexable } from "@/server/indexability";
import { getAllocations, getSchoolCore, loadSources } from "@/server/profile";
import { Gap, Note, Source } from "@/ui/kit";
import { allocationSeries, AllocationsTable, DemandChart, NoAllocations } from "@/ui/report/evidence";
import { ChapterIntro, ReportBody, RSection } from "@/ui/report/parts";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const core = await getSchoolCore(slug);
  if (!core) return {};
  return {
    title: `${core.school.name} applications and offers by year`,
    description: `How many families named ${core.school.name} as a preference, offers made on national offer day and offers to families from other local authorities, from official DfE data.`,
    alternates: { canonical: `/schools/${slug}/historical-admissions` },
    robots: (await tabIndexable(slug, "historical-admissions")) ? undefined : { index: false, follow: true },
  };
}

export default async function HistoryPage({ params }: Props) {
  const { slug } = await params;
  const core = await getSchoolCore(slug);
  if (!core) notFound();
  const rows = await getAllocations(core.school.id);
  const sources = await loadSources(rows.map((r) => r.sourceDocumentId));
  const { years, get } = allocationSeries(rows);
  const latest = years.at(-1);
  const first = latest ? get(latest, "times_first_preference") : null;
  const offers = latest ? get(latest, "offers_made") : null;
  const doc = rows.at(-1)?.sourceDocumentId ? sources.get(rows.at(-1)!.sourceDocumentId!) : null;

  return (
    <ReportBody
      contents={[
        { id: "what", label: "What these figures are" },
        ...(rows.length ? [{ id: "trend", label: "Demand over time" }, { id: "table", label: "Year by year" }] : []),
        { id: "scores-distances", label: "Scores and distances" },
      ]}
    >
      <ChapterIntro kicker="Chapter 07 · Applications & offers" title="Applications and offers" lede="Year-by-year demand for Year 7 places, from DfE's school-level applications and offers statistics." />
      <RSection id="what" mark="A" title="What these figures are — and are not">
        <Note>
          These are counts from DfE&apos;s national offer day data, reported by councils. They show demand (how often families named the school) and how many offers were made. They are <strong>not</strong> lowest qualifying scores or last-offer
          distances, and they don&apos;t tell you whether your child would get a place.
        </Note>
      </RSection>
      {rows.length ? (
        <>
          <RSection id="trend" mark="B" title="Demand over time">
            {first !== null && offers !== null ? (
              <p className="mb-6 max-w-[60ch] text-lede leading-[1.5] text-ink-2">
                For September {latest} entry, families named {core.school.name} as their first preference <strong className="font-semibold text-ink">{formatNumber(first)}</strong> times, and{" "}
                <strong className="font-semibold text-ink">{formatNumber(offers)}</strong> offers were made on national offer day.
              </p>
            ) : null}
            <figure className="rounded-[8px] border border-rule bg-card p-5">
              <figcaption className="mb-3 flex flex-wrap items-baseline gap-x-3">
                <span className="label text-copper-ink">Fig. B1</span>
                <span className="font-display text-[1.2rem] text-ink">First preferences and offers on national offer day</span>
              </figcaption>
              <DemandChart rows={rows} />
              <p className="mt-3 text-small text-ink-2">Year of entry (September). Same scale for both series.</p>
            </figure>
          </RSection>
          <RSection id="table" mark="C" title="Year by year">
            <AllocationsTable rows={rows} />
            <p className="mt-3 max-w-[68ch] text-small leading-relaxed text-ink-2">
              “Other LAs” means families living outside the local authority where the school is. Offers to them show that out-of-area admission has happened — not that it will again, or for which criteria.
            </p>
            <Source source={doc} status="officially_verified" />
          </RSection>
        </>
      ) : (
        <NoAllocations />
      )}
      <RSection id="scores-distances" mark={rows.length ? "D" : "B"} title="Lowest scores and last-offer distances">
        <Gap title="Not held for this school yet">
          Some schools and councils publish the lowest score or furthest distance offered each year. We add these only from the official publication, by year and admission category. They describe what happened in a past year — they are not a pass mark
          or a catchment boundary, and they change every year.
        </Gap>
      </RSection>
    </ReportBody>
  );
}
