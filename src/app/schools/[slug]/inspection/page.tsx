import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getInspections, getSchoolCore, loadSources } from "@/server/profile";
import { InspectionList } from "@/components/school/inspection-history";
import { Callout } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const core = await getSchoolCore(slug);
  if (!core) return {};
  return {
    title: `${core.school.name} Ofsted inspection and report card`,
    description: `Latest Ofsted inspection outcomes for ${core.school.name}, with report card evaluations and earlier graded and ungraded inspections kept separate.`,
    alternates: { canonical: `/schools/${slug}/inspection` },
  };
}

export default async function InspectionPage({ params }: Props) {
  const { slug } = await params;
  const core = await getSchoolCore(slug);
  if (!core) notFound();
  const inspections = await getInspections(core.school.id);
  const sources = await loadSources(inspections.map((i) => i.sourceDocumentId));
  return (
    <div className="grid gap-8">
      <div className="max-w-3xl">
        <h2 className="text-2xl font-semibold sm:text-3xl">Inspection</h2>
        <p className="mt-1 text-ink-2">From Ofsted&apos;s monthly management information. Each inspection is shown under the framework it was carried out with.</p>
      </div>
      {core.school.nation === "england" ? (
        <Callout title="Two different inspection systems">
          Since 10 November 2025 Ofsted publishes report cards that grade several areas separately. Earlier graded inspections gave a single overall effectiveness judgement. The two are not equivalent, so we never convert one into the other.
        </Callout>
      ) : null}
      <InspectionList inspections={inspections} sources={sources} nation={core.school.nation} />
    </div>
  );
}
