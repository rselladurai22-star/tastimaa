import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GENDER_LABEL, NATION_LABEL } from "@/domain/labels";
import { loadSources } from "@/server/profile";
import { getTest } from "@/server/tests";
import { Breadcrumbs } from "@/ui/breadcrumbs";
import { Gap, Kicker, Note, Page, SectionHead, Source } from "@/ui/kit";
import { Status } from "@/ui/status";
import { DateLine } from "@/ui/viz/admissions-viz";

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
  const rows = events.map(({ e, c }) => {
    const doc = e.sourceDocumentId ? sources.get(e.sourceDocumentId) : null;
    return {
      id: e.id,
      title: e.title,
      description: e.description,
      event_type: e.eventType,
      starts_on: e.startsOn,
      ends_on: e.endsOn,
      url: e.url ?? doc?.url ?? null,
      verification_status: e.verificationStatus,
      context: (
        <>
          {c.label}
          {doc ? ` · Source: ${doc.title}${e.sourceLocator ? ` — ${e.sourceLocator}` : ""}` : ""}
        </>
      ),
    };
  });

  return (
    <>
      <div className="border-b border-rule bg-card/60">
        <Page className="pt-6 pb-10">
          <Breadcrumbs items={[{ href: "/11-plus", label: "11+ exams" }, { href: `/11-plus/${test.slug}`, label: test.name }]} />
          <div className="mt-8 max-w-[52rem]">
            <Kicker>Entrance test · {NATION_LABEL[test.nation]}</Kicker>
            <h1 className="mt-3 text-h1 leading-[1.05] [font-variation-settings:'opsz'_72]">{test.name}</h1>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[1.02rem] text-ink-2">
              <Status status={test.verificationStatus} />
              {provider ? <span>Set by {provider.name}</span> : null}
              {test.administeredBy ? <span>Administered by {test.administeredBy}</span> : null}
            </div>
            {test.summary ? <p className="mt-5 text-lede leading-[1.5] text-ink-2">{test.summary}</p> : null}
          </div>
        </Page>
      </div>

      <Page className="grid grid-cols-[minmax(0,1fr)] gap-x-14 gap-y-12 pt-10 pb-16 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="grid min-w-0 content-start gap-14">
          {test.verificationStatus === "unavailable" ? (
            <Note tone="caution" title="Details not yet verified">
              We could not retrieve this test&apos;s current arrangements from the official source automatically. Please use the{" "}
              <a href={test.website ?? "#"} rel="noopener noreferrer" target="_blank">
                official page
              </a>{" "}
              until an editor has checked them.
            </Note>
          ) : null}

          <section aria-labelledby="format">
            <SectionHead id="format" kicker="The paper" title="Format" />
            <dl className="mt-6 grid gap-px overflow-hidden rounded-[8px] border border-rule bg-rule sm:grid-cols-2">
              {[
                ["Papers", test.format],
                ["How results are reported", test.scoreScale],
              ].map(([k, v]) => (
                <div key={k} className="bg-card px-5 py-4">
                  <dt className="label text-[0.72rem]">{k}</dt>
                  <dd className="mt-1.5 text-[1.02rem] text-ink">{v ?? "Not recorded"}</dd>
                </div>
              ))}
            </dl>
            {test.components?.length ? (
              <ol className="mt-6 grid gap-4 sm:grid-cols-2">
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
            ) : null}
            {test.standardisation ? (
              <div className="mt-6 border-l-2 border-copper pl-4">
                <p className="label">Standardisation</p>
                <p className="mt-1 max-w-[68ch] text-[1.02rem] leading-relaxed text-ink">{test.standardisation}</p>
              </div>
            ) : null}
            <Source source={test.sourceDocumentId ? sources.get(test.sourceDocumentId) : null} locator={test.sourceLocator} status={test.verificationStatus} />
          </section>

          <section aria-labelledby="dates">
            <SectionHead id="dates" kicker="Timetable" title="Key dates" lede="Only dates published by the test administrator or schools are shown." />
            <div className="mt-6">{rows.length ? <DateLine events={rows} today={today} /> : <Gap title="No official dates are held yet for this test." />}</div>
          </section>
        </div>

        <aside className="min-w-0">
          <div className="lg:sticky lg:top-[calc(var(--header-h)+2rem)]">
            <div className="rounded-[8px] border border-rule bg-card">
              <h2 className="flex items-baseline justify-between border-b border-rule px-5 py-3 font-sans text-[1rem] font-semibold">
                Schools linked to this test <span className="font-mono text-[0.9rem] font-normal text-ink-2">{schools.length}</span>
              </h2>
              {schools.length ? (
                <ul className="max-h-[60vh] overflow-y-auto">
                  {schools.map((s) => (
                    <li key={s.slug} className="border-b border-rule last:border-0">
                      <Link href={`/schools/${s.slug}`} className="block px-5 py-2.5 no-underline hover:bg-paper">
                        <span className="block font-semibold text-ink">{s.name}</span>
                        <span className="text-small text-ink-2">
                          {s.town}
                          {s.gender !== "unknown" ? ` · ${GENDER_LABEL[s.gender]}` : ""}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-5 py-4 text-[0.98rem] text-ink-2">School links have not been verified yet. Each school&apos;s published admissions criteria say whether it uses this test.</p>
              )}
            </div>
            <p className="mt-3 text-small text-ink-2">Links are awaiting editor verification unless marked otherwise on each school&apos;s profile.</p>
          </div>
        </aside>
      </Page>
    </>
  );
}
