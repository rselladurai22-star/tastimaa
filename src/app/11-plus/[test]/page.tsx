import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EVENT_TYPE_LABEL, GENDER_LABEL, NATION_LABEL } from "@/domain/labels";
import { formatWeekdayDate } from "@/lib/format";
import { loadSources } from "@/server/profile";
import { getTest } from "@/server/tests";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Callout, Card, Container, SectionHeading } from "@/components/ui/primitives";
import { SourceNote } from "@/components/ui/source-note";
import { VerificationBadge } from "@/components/ui/verification";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ test: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getTest((await params).test);
  if (!data) return { title: "Test not found" };
  return {
    title: `${data.test.name}: format, dates and schools`,
    description: `${data.test.name} — what it tests, how scores work, official registration and test dates, and the schools that use it.`,
    alternates: { canonical: `/11-plus/${data.test.slug}` },
  };
}

export default async function TestPage({ params }: Props) {
  const data = await getTest((await params).test);
  if (!data) notFound();
  const { test, provider, schools, events } = data;
  const sources = await loadSources([test.sourceDocumentId, ...events.map((e) => e.e.sourceDocumentId)]);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <Container className="py-8">
      <Breadcrumbs items={[{ href: "/11-plus", label: "11+ exams" }, { href: `/11-plus/${test.slug}`, label: test.name }]} />
      <header className="mt-4 mb-8 max-w-3xl">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold sm:text-4xl">{test.name}</h1>
          <VerificationBadge status={test.verificationStatus} />
        </div>
        <p className="mt-2 text-ink-3">
          {NATION_LABEL[test.nation]}
          {provider ? ` · set by ${provider.name}` : ""}
          {test.administeredBy ? ` · administered by ${test.administeredBy}` : ""}
        </p>
        {test.summary ? <p className="mt-4 text-lg text-ink-2">{test.summary}</p> : null}
      </header>
      {test.verificationStatus === "unavailable" ? (
        <Callout tone="warn" className="mb-8" title="Details not yet verified">
          We could not retrieve this test&apos;s current arrangements from the official source automatically. Please use the{" "}
          <a href={test.website ?? "#"} rel="noopener noreferrer" target="_blank">
            official page
          </a>{" "}
          until an editor has checked them.
        </Callout>
      ) : null}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid content-start gap-8">
          <Card className="p-6">
            <h2 className="font-sans text-base font-semibold">Format</h2>
            <dl className="mt-3 grid gap-4 text-sm">
              {test.format ? (
                <div>
                  <dt className="text-xs text-ink-3">Papers</dt>
                  <dd className="text-ink">{test.format}</dd>
                </div>
              ) : null}
              {test.components?.length ? (
                <div>
                  <dt className="text-xs text-ink-3">What it covers</dt>
                  <dd>
                    <ul className="mt-1 grid gap-1 text-ink">
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
                <div>
                  <dt className="text-xs text-ink-3">Standardisation</dt>
                  <dd className="text-ink">{test.standardisation}</dd>
                </div>
              ) : null}
              {test.scoreScale ? (
                <div>
                  <dt className="text-xs text-ink-3">How results are reported</dt>
                  <dd className="text-ink">{test.scoreScale}</dd>
                </div>
              ) : null}
            </dl>
            <SourceNote source={test.sourceDocumentId ? sources.get(test.sourceDocumentId) : null} locator={test.sourceLocator} status={test.verificationStatus} />
          </Card>
          <section aria-labelledby="dates">
            <SectionHeading id="dates" title="Key dates" description="Only dates published by the test administrator or schools are shown." />
            {events.length ? (
              <ol className="divide-y divide-line rounded-xl border border-line bg-surface">
                {events.map(({ e, c }) => (
                  <li key={e.id} className={(e.endsOn ?? e.startsOn) < today ? "px-5 py-4 opacity-70" : "px-5 py-4"}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-ink">{e.title}</span>
                      <span className="text-xs text-ink-3">{EVENT_TYPE_LABEL[e.eventType]}</span>
                      <VerificationBadge status={e.verificationStatus} />
                    </div>
                    <p className="text-sm text-ink-2">
                      {formatWeekdayDate(e.startsOn)}
                      {e.endsOn ? ` – ${formatWeekdayDate(e.endsOn)}` : ""} · {c.label}
                    </p>
                    {e.description ? <p className="mt-1 text-sm text-ink-3">{e.description}</p> : null}
                    <SourceNote source={e.sourceDocumentId ? sources.get(e.sourceDocumentId) : null} locator={e.sourceLocator} />
                  </li>
                ))}
              </ol>
            ) : (
              <Callout>No official dates are held yet for this test.</Callout>
            )}
          </section>
        </div>
        <aside>
          <Card className="p-5">
            <h2 className="font-sans text-sm font-semibold">Schools linked to this test ({schools.length})</h2>
            {schools.length ? (
              <ul className="mt-3 grid gap-2 text-sm">
                {schools.map((s) => (
                  <li key={s.slug}>
                    <Link href={`/schools/${s.slug}`} className="font-medium text-ink hover:underline">
                      {s.name}
                    </Link>
                    <span className="block text-xs text-ink-3">
                      {s.town} · {GENDER_LABEL[s.gender]}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-ink-2">School links have not been verified yet. Each school&apos;s published admissions criteria say whether it uses this test.</p>
            )}
            <p className="mt-3 text-xs text-ink-3">Links are awaiting editor verification unless marked otherwise on each school&apos;s profile.</p>
          </Card>
        </aside>
      </div>
    </Container>
  );
}
