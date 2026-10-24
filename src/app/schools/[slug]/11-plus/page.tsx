import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { clampEntryYear, selectableEntryYears } from "@/lib/academic-year";
import { getEntranceTests, getSchoolCore, getSchoolEvents, loadSources } from "@/server/profile";
import { KeyDates, YearPicker } from "@/components/school/admissions";
import { Callout, Card, EmptyState, SectionHeading } from "@/components/ui/primitives";
import { SourceNote } from "@/components/ui/source-note";
import { VerificationBadge } from "@/components/ui/verification";

import { tabIndexable } from "@/server/indexability";

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
  const testEvents = [...events].filter((e) => e.test_name);

  return (
    <div className="grid gap-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="max-w-3xl">
          <h2 className="text-2xl font-semibold sm:text-3xl">Entrance test</h2>
          <p className="mt-1 text-ink-2">Test arrangements differ between schools and areas. A score from one test can&apos;t be used for another school&apos;s test.</p>
        </div>
        <YearPicker years={selectableEntryYears()} selected={entryYear} basePath={`/schools/${slug}/11-plus`} />
      </div>
      {tests.length === 0 ? (
        <EmptyState title={`We don't hold verified test arrangements for ${school.name} for September ${entryYear} entry`}>
          Check the school&apos;s admissions page{contact?.website ? (
            <>
              {" "}
              (
              <a className="link" href={contact.website} rel="noopener noreferrer" target="_blank">
                school website
              </a>
              )
            </>
          ) : null}
          . Read our <Link className="link" href="/11-plus">guide to how 11+ tests work</Link>.
        </EmptyState>
      ) : (
        tests.map(({ test, link, provider }) => (
          <Card key={test.id} className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xl font-semibold">
                <Link href={`/11-plus/${test.slug}`} className="hover:underline">
                  {test.name}
                </Link>
              </h3>
              <VerificationBadge status={test.verificationStatus} />
            </div>
            {test.summary ? <p className="mt-2 text-ink-2">{test.summary}</p> : null}
            <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-ink-3">Set by</dt>
                <dd className="font-medium">{provider?.name ?? "Not recorded"}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-3">Administered by</dt>
                <dd className="font-medium">{test.administeredBy ?? "Not recorded"}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-3">Format</dt>
                <dd className="font-medium">{test.format ?? "Not recorded"}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-3">Scores</dt>
                <dd className="font-medium">{test.scoreScale ?? "Not recorded"}</dd>
              </div>
              {test.components?.length ? (
                <div className="sm:col-span-2">
                  <dt className="text-xs text-ink-3">What it covers</dt>
                  <dd>
                    <ul className="mt-1 grid gap-1">
                      {test.components.map((c) => (
                        <li key={c.subject}>
                          <strong>{c.subject}</strong>
                          {c.detail ? ` — ${c.detail}` : ""}
                        </li>
                      ))}
                    </ul>
                  </dd>
                </div>
              ) : null}
              {test.standardisation ? (
                <div className="sm:col-span-2">
                  <dt className="text-xs text-ink-3">Age standardisation</dt>
                  <dd>{test.standardisation}</dd>
                </div>
              ) : null}
            </dl>
            <SourceNote source={test.sourceDocumentId ? sources.get(test.sourceDocumentId) : null} locator={test.sourceLocator} status={test.verificationStatus} />
            <p className="mt-3 text-xs text-ink-3">
              Why we link this school to this test: {link.notes ?? "recorded by an editor"} <VerificationBadge status={link.verificationStatus} className="ml-1" />
            </p>
          </Card>
        ))
      )}
      <section aria-labelledby="test-dates">
        <SectionHeading id="test-dates" title="Registration and test dates" />
        <KeyDates events={testEvents} entryYear={entryYear} today={today} emptyText={`We don't hold official test dates for September ${entryYear} entry yet. Dates are shown only once published by the test administrator.`} />
      </section>
      <Callout title="Reasonable adjustments and illness on the test day">
        Test administrators can make access arrangements for children with special educational needs or disabilities, usually only if requested before a deadline. Check the administrator&apos;s guidance early in Year 5.
      </Callout>
    </div>
  );
}
