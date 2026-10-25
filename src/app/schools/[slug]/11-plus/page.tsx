import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { clampEntryYear, selectableEntryYears } from "@/lib/academic-year";
import { tabIndexable } from "@/server/indexability";
import { getEntranceTests, getSchoolCore, getSchoolEvents, loadSources } from "@/server/profile";
import { Gap, Note, Source } from "@/ui/kit";
import { ChapterIntro, ReportBody, RSection, YearPicker } from "@/ui/report/parts";
import { Status } from "@/ui/status";
import { DateLine } from "@/ui/viz/admissions-viz";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ year?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const core = await getSchoolCore(slug);
  if (!core) return {};
  return {
    title: `${core.school.name} 11+ entrance test: format, registration and dates`,
    description: `Which entrance test ${core.school.name} uses, what it covers, how scores are standardised and the official registration and test dates.`,
    alternates: { canonical: `/schools/${slug}/11-plus` },
    robots: (await tabIndexable(slug, "11-plus")) ? undefined : { index: false, follow: true },
  };
}

export default async function SchoolTestPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const core = await getSchoolCore(slug);
  if (!core) notFound();
  const { school, contact } = core;
  const entryYear = clampEntryYear((await searchParams).year);
  const tests = await getEntranceTests(school.id, entryYear);
  const events = await getSchoolEvents(school.id, tests.map((t) => t.test.id), school.nation);
  const sources = await loadSources(tests.flatMap((t) => [t.test.sourceDocumentId, t.link.sourceDocumentId]));
  const today = new Date().toISOString().slice(0, 10);
  const testEvents = [...events].filter((e) => e.test_name && e.entry_year === entryYear);

  const contents = [
    { id: "the-test", label: tests.length > 1 ? "The tests" : "The test" },
    { id: "test-dates", label: "Registration and dates" },
    { id: "adjustments", label: "Adjustments and illness" },
  ];

  return (
    <ReportBody contents={contents}>
      <ChapterIntro
        kicker="Chapter 03 · Entrance test"
        title="The entrance test"
        lede="Test arrangements differ between schools and areas. A score from one test can't be used for another school's test."
        aside={<YearPicker years={selectableEntryYears()} selected={entryYear} basePath={`/schools/${slug}/11-plus`} />}
      />

      <RSection id="the-test" mark="A" title={tests.length > 1 ? "Tests used for this entry" : "The test used for this entry"} lede={`September ${entryYear} entry.`}>
        {tests.length === 0 ? (
          <Gap title={`We don't hold verified test arrangements for ${school.name} for September ${entryYear} entry`}>
            Check the school&apos;s admissions page
            {contact?.website ? (
              <>
                {" "}
                (
                <a href={contact.website} rel="noopener noreferrer" target="_blank">
                  school website
                </a>
                )
              </>
            ) : null}
            . Read our <Link href="/11-plus">guide to how 11+ tests work</Link>.
          </Gap>
        ) : (
          <div className="grid gap-8">
            {tests.map(({ test, link, provider }) => (
              <article key={test.id} className="overflow-hidden rounded-[8px] border border-rule bg-card">
                <header className="flex flex-wrap items-start justify-between gap-3 border-b border-rule bg-paper px-5 py-4 sm:px-6">
                  <div>
                    <p className="label">Test dossier</p>
                    <h3 className="mt-1 text-h3">
                      <Link href={`/11-plus/${test.slug}`} className="text-ink no-underline hover:text-green hover:underline">
                        {test.name}
                      </Link>
                    </h3>
                  </div>
                  <Status status={test.verificationStatus} />
                </header>
                <div className="px-5 py-5 sm:px-6">
                  {test.summary ? <p className="max-w-[68ch] text-[1.05rem] leading-relaxed text-ink-2">{test.summary}</p> : null}
                  <dl className="mt-5 grid gap-px overflow-hidden rounded-[5px] border border-rule bg-rule sm:grid-cols-2">
                    {[
                      ["Set by", provider?.name ?? "Not recorded"],
                      ["Administered by", test.administeredBy ?? "Not recorded"],
                      ["Format", test.format ?? "Not recorded"],
                      ["Scores", test.scoreScale ?? "Not recorded"],
                    ].map(([k, v]) => (
                      <div key={k} className="bg-card px-4 py-3">
                        <dt className="label text-[0.72rem]">{k}</dt>
                        <dd className="mt-1 text-[1rem] font-semibold text-ink">{v}</dd>
                      </div>
                    ))}
                  </dl>
                  {test.components?.length ? (
                    <div className="mt-6">
                      <p className="label mb-3">What it covers</p>
                      <ol className="grid gap-3 sm:grid-cols-2">
                        {test.components.map((c, i) => (
                          <li key={c.subject} className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-2 border-t border-rule pt-3">
                            <span className="font-mono text-[0.85rem] text-copper-ink">{String(i + 1).padStart(2, "0")}</span>
                            <span>
                              <span className="block font-semibold text-ink">{c.subject}</span>
                              {c.detail ? <span className="mt-0.5 block text-[0.98rem] text-ink-2">{c.detail}</span> : null}
                            </span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  ) : null}
                  {test.standardisation ? (
                    <div className="mt-6 border-l-2 border-copper pl-4">
                      <p className="label">Age standardisation</p>
                      <p className="mt-1 max-w-[68ch] text-[1.02rem] leading-relaxed text-ink">{test.standardisation}</p>
                    </div>
                  ) : null}
                  <Source source={test.sourceDocumentId ? sources.get(test.sourceDocumentId) : null} locator={test.sourceLocator} status={test.verificationStatus} />
                  <p className="mt-3 flex flex-wrap items-center gap-2 text-small text-ink-2">
                    Why we link this school to this test: {link.notes ?? "recorded by an editor"} <Status status={link.verificationStatus} quiet />
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </RSection>

      <RSection id="test-dates" mark="B" title="Registration and test dates">
        <DateLine events={testEvents} today={today} emptyText={`We don't hold official test dates for September ${entryYear} entry yet. Dates are shown only once published by the test administrator.`} />
      </RSection>

      <RSection id="adjustments" mark="C" title="Reasonable adjustments and illness on the test day">
        <Note>Test administrators can make access arrangements for children with special educational needs or disabilities, usually only if requested before a deadline. Check the administrator&apos;s guidance early in Year 5.</Note>
      </RSection>
    </ReportBody>
  );
}
