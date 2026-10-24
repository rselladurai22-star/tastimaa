import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { clampEntryYear, selectableEntryYears } from "@/lib/academic-year";
import { formatDate } from "@/lib/format";
import { tabIndexable } from "@/server/indexability";
import { getDocuments, getEntranceTests, getPolicies, getSchoolCore, getSchoolEvents, loadSources, policyForYear } from "@/server/profile";
import { IconDocument } from "@/ui/icons";
import { ExternalLink, Note, Source } from "@/ui/kit";
import { AdmissionsGlance, ChapterIntro, NoPolicy, PolicyDetails, ReportBody, RSection, YearPicker } from "@/ui/report/parts";
import { Status } from "@/ui/status";
import { JourneyStepper } from "@/ui/viz/admission-journey";
import { DateLine, PriorityLadder } from "@/ui/viz/admissions-viz";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ year?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const core = await getSchoolCore(slug);
  if (!core) return {};
  return {
    title: `${core.school.name} admissions: criteria, qualifying score and how places are allocated`,
    description: `How ${core.school.name} allocates places: entrance test, qualifying score, oversubscription criteria, tie-breaks, waiting lists and appeals, from the school's determined admission arrangements.`,
    alternates: { canonical: `/schools/${slug}/admissions` },
    robots: (await tabIndexable(slug, "admissions")) ? undefined : { index: false, follow: true },
  };
}

export default async function AdmissionsPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const core = await getSchoolCore(slug);
  if (!core) notFound();
  const { school, contact } = core;
  const years = selectableEntryYears();
  const entryYear = clampEntryYear((await searchParams).year);
  const [policies, tests, documents] = await Promise.all([getPolicies(school.id), getEntranceTests(school.id, entryYear), getDocuments(school.id)]);
  const events = await getSchoolEvents(school.id, tests.map((t) => t.test.id), school.nation);
  const policy = policyForYear(policies, entryYear);
  const sources = await loadSources([policy?.sourceDocumentId, ...documents.map((d) => d.doc.id)]);
  const versions = policies.filter((p) => p.cycle.entryYear === entryYear);
  const otherYears = [...new Set(policies.filter((p) => p.status !== "superseded" && p.cycle.entryYear !== entryYear).map((p) => p.cycle.entryYear))];
  const test = tests[0];
  const today = new Date().toISOString().slice(0, 10);
  const isNI = school.nation === "northern_ireland";
  const yearEvents = [...events].filter((e) => e.entry_year === entryYear);

  const contents = [
    { id: "how-it-works", label: "How it works" },
    { id: "summary", label: "This year's rules" },
    ...(policy ? [{ id: "criteria", label: "Oversubscription criteria" }] : []),
    ...(policy?.scoreRules.length ? [{ id: "scores", label: "Score rules" }] : []),
    ...(policy ? [{ id: "details", label: "The detail" }] : []),
    { id: "dates", label: "Key dates" },
    ...(versions.length > 1 ? [{ id: "versions", label: "Version history" }] : []),
    { id: "docs", label: "Official documents" },
  ];
  const marks = Object.fromEntries(contents.map((c, i) => [c.id, String.fromCharCode(65 + i)]));

  return (
    <ReportBody contents={contents}>
      <ChapterIntro
        kicker="Chapter 02 · Admissions"
        title="How places are allocated"
        lede="Admissions rules change each year, so every rule here belongs to one entry year. Choose the year your child will start."
        aside={<YearPicker years={years} selected={entryYear} basePath={`/schools/${slug}/admissions`} />}
      />

      <RSection id="how-it-works" mark={marks["how-it-works"]} title="Three steps, in order" lede="Qualifying makes a child eligible to be considered. The criteria then decide the order, until places run out.">
        <JourneyStepper />
      </RSection>

      {isNI ? (
        <Note title="Northern Ireland transfer">
          Children transfer to Year 8. Each school publishes its own admissions criteria each year through the Education Authority, setting out how it uses SEAG outcomes and other criteria. <Link href="/admissions/northern-ireland">How the NI process works</Link>.
        </Note>
      ) : null}

      <RSection id="summary" mark={marks.summary} title={`September ${entryYear} entry`}>
        {policy ? (
          <div className="grid gap-4">
            <AdmissionsGlance policy={policy} sources={sources} testName={test?.test.name ?? null} testSlug={test?.test.slug ?? null} />
            {policy.status === "awaiting_verification" ? (
              <Note tone="caution" title="Not yet checked by an editor">
                We extracted these rules from the school&apos;s published policy and cite each one, but an editor has not yet confirmed them. Always read the official document before relying on them.
              </Note>
            ) : null}
          </div>
        ) : (
          <NoPolicy schoolName={school.name} entryYear={entryYear} website={contact?.website} otherYears={otherYears} />
        )}
      </RSection>

      {policy ? (
        <RSection id="criteria" mark={marks.criteria} title="Oversubscription criteria" lede="The order in which qualified applicants are offered places when there are more applicants than places. Open a rung to read the policy's wording.">
          <PriorityLadder policy={policy} testName={test?.test.name ?? null} />
          <Source source={policy.sourceDocumentId ? sources.get(policy.sourceDocumentId) : null} locator="Oversubscription criteria" status={policy.verificationStatus} />
        </RSection>
      ) : null}

      {policy?.scoreRules.length ? (
        <RSection id="scores" mark={marks.scores} title="Score rules" lede="Every score rule in the policy, with who it applies to. Scores only apply to this school's own test.">
          <ul className="grid gap-px overflow-hidden rounded-[6px] border border-rule bg-rule">
            {policy.scoreRules.map((r) => (
              <li key={r.id} className="grid gap-x-6 gap-y-1 bg-card px-5 py-4 sm:grid-cols-[8rem_minmax(0,1fr)]">
                <p>
                  <span className="block font-display text-[1.9rem] leading-none text-ink num">{r.scoreValue ?? "—"}</span>
                  <span className="mt-1 block text-small text-ink-2">{r.scoreScale}</span>
                </p>
                <div>
                  <p className="text-[1.02rem] leading-relaxed text-ink">{r.description}</p>
                  <p className="mt-1 font-mono text-[0.8rem] text-ink-2">Policy reference: {r.sourceLocator}</p>
                </div>
              </li>
            ))}
          </ul>
        </RSection>
      ) : null}

      {policy ? (
        <RSection id="details" mark={marks.details} title="The detail" lede="Address rules, distance, waiting lists and appeals, in the policy's terms.">
          <PolicyDetails policy={policy} />
        </RSection>
      ) : null}

      <RSection id="dates" mark={marks.dates} title={`Key dates for September ${entryYear} entry`}>
        <DateLine events={yearEvents} today={today} emptyText={`We don't hold verified dates for September ${entryYear} entry for this school yet. Dates are only shown once taken from an official source.`} />
      </RSection>

      {versions.length > 1 ? (
        <RSection id="versions" mark={marks.versions} title="Version history" lede="When a school's rules change, the old version is kept so you can see what changed.">
          <ol className="border-l border-rule">
            {versions.map((v) => (
              <li key={v.id} className="relative flex flex-wrap items-center gap-3 py-2 pl-5">
                <span aria-hidden className="absolute top-1/2 -left-[5px] size-[9px] -translate-y-1/2 rounded-full border-2 border-green bg-paper" />
                <span className="font-mono text-[0.9rem] text-ink">v{v.version}</span>
                <span className="text-ink-2">recorded {formatDate(v.createdAt)}</span>
                <Status status={v.status === "superseded" ? "historical" : v.verificationStatus} />
              </li>
            ))}
          </ol>
        </RSection>
      ) : null}

      <RSection id="docs" mark={marks.docs} title="Official documents" lede="Documents we have retrieved for this school, with dates.">
        {documents.length ? (
          <ul className="grid gap-px overflow-hidden rounded-[6px] border border-rule bg-rule">
            {documents.map(({ doc, source }) => (
              <li key={doc.id} className="flex gap-3 bg-card px-4 py-3.5">
                <IconDocument size={18} className="mt-0.5 shrink-0 text-copper-ink" />
                <div className="min-w-0">
                  <ExternalLink href={doc.url} className="font-semibold">
                    {doc.title}
                  </ExternalLink>
                  <span className="mt-0.5 block text-small text-ink-2">
                    {source.publisher} · retrieved {formatDate(doc.retrievedAt)} · {doc.status === "active" ? "current" : doc.status}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-ink-2">We have not retrieved any documents for this school yet.</p>
        )}
      </RSection>
    </ReportBody>
  );
}
