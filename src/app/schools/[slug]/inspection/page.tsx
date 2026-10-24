import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { tabIndexable } from "@/server/indexability";
import { getInspections, getSchoolCore, loadSources } from "@/server/profile";
import { Gap, Note } from "@/ui/kit";
import { InspectionEntry, NIInspectionNote } from "@/ui/report/evidence";
import { ChapterIntro, ReportBody, RSection } from "@/ui/report/parts";

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
    robots: (await tabIndexable(slug, "inspection")) ? undefined : { index: false, follow: true },
  };
}

export default async function InspectionPage({ params }: Props) {
  const { slug } = await params;
  const core = await getSchoolCore(slug);
  if (!core) notFound();
  const inspections = await getInspections(core.school.id);
  const sources = await loadSources(inspections.map((i) => i.sourceDocumentId));
  const isNI = core.school.nation === "northern_ireland";
  return (
    <ReportBody
      contents={[
        ...(!isNI ? [{ id: "frameworks", label: "Two systems" }] : []),
        { id: "history", label: "Inspection history" },
      ]}
    >
      <ChapterIntro kicker="Chapter 06 · Inspection" title="Inspection" lede="From Ofsted's monthly management information. Each inspection is shown under the framework it was carried out with." />
      {!isNI ? (
        <RSection id="frameworks" mark="A" title="Two different inspection systems">
          <Note>
            Since 10 November 2025 Ofsted publishes report cards that grade several areas separately. Earlier graded inspections gave a single overall effectiveness judgement. The two are not equivalent, so we never convert one into the other.
          </Note>
        </RSection>
      ) : null}
      <RSection id="history" mark={isNI ? "A" : "B"} title="Inspection history" lede={inspections.length > 1 ? "Newest first." : undefined}>
        {isNI ? (
          <NIInspectionNote />
        ) : inspections.length ? (
          <ol className="grid gap-10">
            {inspections.map((i, n) => (
              <li key={i.id}>
                <InspectionEntry i={i} sources={sources} lead={n === 0} />
              </li>
            ))}
          </ol>
        ) : (
          <Gap title="No inspection is recorded in Ofsted's latest management information">Some schools that converted to academies have not been inspected under their new URN yet.</Gap>
        )}
      </RSection>
    </ReportBody>
  );
}
