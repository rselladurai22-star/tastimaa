import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllocations, getSchoolCore, loadSources } from "@/server/profile";
import { AllocationsSection } from "@/components/school/inspection-history";
import { Callout, SectionHeading } from "@/components/ui/primitives";

import { tabIndexable } from "@/server/indexability";

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
  return (
    <div className="grid gap-8">
      <div className="max-w-3xl">
        <h2 className="text-2xl font-semibold sm:text-3xl">Applications and offers</h2>
        <p className="mt-1 text-ink-2">Year-by-year demand for Year 7 places, from DfE&apos;s school-level applications and offers statistics.</p>
      </div>
      <AllocationsSection rows={rows} sources={sources} schoolName={core.school.name} />
      <section aria-labelledby="scores-distances">
        <SectionHeading id="scores-distances" title="Lowest scores and last-offer distances" />
        <Callout>
          Some schools and councils publish the lowest score or furthest distance offered each year. We add these only from the official publication, by year and admission category. They describe what happened in a past year — they are not a pass mark or a
          catchment boundary, and they change every year. We don&apos;t hold these figures for this school yet.
        </Callout>
      </section>
    </div>
  );
}
