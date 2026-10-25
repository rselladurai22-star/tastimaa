import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { tabIndexable } from "@/server/indexability";
import { getComparators, getResults, getSchoolCore, loadSources } from "@/server/profile";
import { KS4_HEADLINE, KS5_HEADLINE, measureRows } from "@/server/profile-view";
import { Gap, Note } from "@/ui/kit";
import { MeasureFigure, ResultsCaveat } from "@/ui/report/evidence";
import { ChapterIntro, ReportBody, RSection } from "@/ui/report/parts";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const core = await getSchoolCore(slug);
  if (!core) return {};
  return {
    title: `${core.school.name} GCSE and A level results by year`,
    description: `Official DfE GCSE (Attainment 8, English and maths) and A level results for ${core.school.name}, compared with all selective schools and local averages.`,
    alternates: { canonical: `/schools/${slug}/results` },
    robots: (await tabIndexable(slug, "results")) ? undefined : { index: false, follow: true },
  };
}

export default async function ResultsPage({ params }: Props) {
  const { slug } = await params;
  const core = await getSchoolCore(slug);
  if (!core) notFound();
  const { school, la } = core;
  if (school.nation === "northern_ireland") {
    return (
      <ReportBody contents={[{ id: "ni-results", label: "Results in Northern Ireland" }]}>
        <ChapterIntro kicker="Chapter 05 · Results" title="Results" lede="Official figures only." />
        <RSection id="ni-results" title="Results for Northern Ireland schools">
          <Note>School-level GCSE and A level results for Northern Ireland are published by the Department of Education (NI) and are not yet integrated. We will not show figures until they come from that official source.</Note>
        </RSection>
      </ReportBody>
    );
  }
  const [results, comparators] = await Promise.all([getResults(school.id), getComparators(la?.code)]);
  const sources = await loadSources(results.map((r) => r.sourceDocumentId));
  const ks4 = KS4_HEADLINE.map((m) => ({ m, rows: measureRows(results, comparators, m, la?.code) })).filter((x) => x.rows.length);
  const ks5 = KS5_HEADLINE.map((m) => ({ m, rows: measureRows(results, comparators, m, la?.code) })).filter((x) => x.rows.length);
  return (
    <ReportBody
      contents={[
        { id: "reading", label: "Reading fairly" },
        { id: "gcse", label: "GCSE" },
        { id: "alevel", label: "A level" },
      ]}
    >
      <ChapterIntro kicker="Chapter 05 · Results" title="Results" lede="Official figures from the Department for Education, each against the average for all selective schools. Provisional figures may be revised." />
      <RSection id="reading" mark="A" title="Before you read the charts">
        <ResultsCaveat />
      </RSection>
      <RSection id="gcse" mark="B" title="GCSE (key stage 4)">
        {ks4.length ? (
          <div className="grid gap-8">
            {ks4.map(({ m, rows }, i) => (
              <MeasureFigure key={m} n={`B${i + 1}`} measure={m} rows={rows} laName={la?.name ?? null} sources={sources} />
            ))}
          </div>
        ) : (
          <Gap title="No key stage 4 results are published for this school">The school may be new, recently converted, or 16–18 only.</Gap>
        )}
      </RSection>
      <RSection id="alevel" mark="C" title="A level (16 to 18)">
        {ks5.length ? (
          <div className="grid gap-8">
            {ks5.map(({ m, rows }, i) => (
              <MeasureFigure key={m} n={`C${i + 1}`} measure={m} rows={rows} laName={la?.name ?? null} sources={sources} />
            ))}
          </div>
        ) : (
          <Gap title="No A level results are published for this school">{school.hasSixthForm === false ? "The school does not have a sixth form." : "DfE has not published A level measures for this school."}</Gap>
        )}
      </RSection>
    </ReportBody>
  );
}
