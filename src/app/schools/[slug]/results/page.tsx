import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getComparators, getResults, getSchoolCore, loadSources } from "@/server/profile";
import { KS4_HEADLINE, KS5_HEADLINE, measureRows } from "@/server/profile-view";
import { MeasureChart, MeasureTable, ResultsCaveat } from "@/components/school/results";
import { Callout, EmptyState, SectionHeading } from "@/components/ui/primitives";

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
  };
}

export default async function ResultsPage({ params }: Props) {
  const { slug } = await params;
  const core = await getSchoolCore(slug);
  if (!core) notFound();
  const { school, la } = core;
  if (school.nation === "northern_ireland") {
    return <Callout title="Results for Northern Ireland schools">School-level GCSE and A level results for Northern Ireland are published by the Department of Education (NI) and are not yet integrated. We will not show figures until they come from that official source.</Callout>;
  }
  const [results, comparators] = await Promise.all([getResults(school.id), getComparators(la?.code)]);
  const sources = await loadSources(results.map((r) => r.sourceDocumentId));
  const ks4 = KS4_HEADLINE.map((m) => ({ m, rows: measureRows(results, comparators, m, la?.code) })).filter((x) => x.rows.length);
  const ks5 = KS5_HEADLINE.map((m) => ({ m, rows: measureRows(results, comparators, m, la?.code) })).filter((x) => x.rows.length);
  return (
    <div className="grid gap-10">
      <div className="max-w-3xl">
        <h2 className="text-2xl font-semibold sm:text-3xl">Results</h2>
        <p className="mt-1 text-ink-2">Official figures from the Department for Education. Provisional figures may be revised.</p>
      </div>
      <ResultsCaveat />
      <section aria-labelledby="gcse">
        <SectionHeading id="gcse" title="GCSE (key stage 4)" />
        {ks4.length ? (
          <div className="grid gap-6">
            {ks4.map(({ m, rows }) => (
              <div key={m} className="grid gap-4 xl:grid-cols-2">
                <MeasureTable measure={m} rows={rows} laName={la?.name ?? null} sources={sources} />
                <MeasureChart measure={m} rows={rows} laName={la?.name ?? null} />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No key stage 4 results are published for this school">The school may be new, recently converted, or 16–18 only.</EmptyState>
        )}
      </section>
      <section aria-labelledby="alevel">
        <SectionHeading id="alevel" title="A level (16 to 18)" />
        {ks5.length ? (
          <div className="grid gap-6">
            {ks5.map(({ m, rows }) => (
              <div key={m} className="grid gap-4 xl:grid-cols-2">
                <MeasureTable measure={m} rows={rows} laName={la?.name ?? null} sources={sources} />
                <MeasureChart measure={m} rows={rows} laName={la?.name ?? null} />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No A level results are published for this school">{school.hasSixthForm === false ? "The school does not have a sixth form." : "DfE has not published A level measures for this school."}</EmptyState>
        )}
      </section>
    </div>
  );
}
