import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { clampEntryYear, selectableEntryYears } from "@/lib/academic-year";
import { formatDate } from "@/lib/format";
import { getDocuments, getEntranceTests, getPolicies, getSchoolCore, getSchoolEvents, loadSources, policyForYear } from "@/server/profile";
import { AdmissionsSummary, CriteriaList, KeyDates, NoPolicy, PolicyDetails, ThreeSteps, YearPicker } from "@/components/school/admissions";
import { Callout, SectionHeading } from "@/components/ui/primitives";
import { VerificationBadge } from "@/components/ui/verification";

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

  return (
    <div className="grid gap-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="max-w-3xl">
          <h2 className="text-2xl font-semibold sm:text-3xl">How places are allocated</h2>
          <p className="mt-1 text-ink-2">Admissions rules change each year, so every rule here belongs to one entry year. Choose the year your child will start.</p>
        </div>
        <YearPicker years={years} selected={entryYear} basePath={`/schools/${slug}/admissions`} />
      </div>

      <ThreeSteps />

      {isNI ? (
        <Callout title="Northern Ireland transfer">
          Children transfer to Year 8. Each school publishes its own admissions criteria each year through the Education Authority, setting out how it uses SEAG outcomes and other criteria.{" "}
          <Link href="/admissions/northern-ireland">How the NI process works</Link>.
        </Callout>
      ) : null}

      {policy ? (
        <>
          <AdmissionsSummary policy={policy} sources={sources} testName={test?.test.name ?? null} testSlug={test?.test.slug ?? null} />
          {policy.status === "awaiting_verification" ? (
            <Callout tone="warn" title="Not yet checked by an editor">
              We extracted these rules from the school&apos;s published policy and cite each one, but an editor has not yet confirmed them. Always read the official document before relying on them.
            </Callout>
          ) : null}
          <section aria-labelledby="criteria">
            <SectionHeading id="criteria" title="Oversubscription criteria" description="The order in which qualified applicants are offered places when there are more applicants than places." />
            <CriteriaList policy={policy} sources={sources} />
          </section>
          {policy.scoreRules.length ? (
            <section aria-labelledby="scores">
              <SectionHeading id="scores" title="Score rules" description="Every score rule in the policy, with who it applies to. Scores only apply to this school's own test." />
              <ul className="grid gap-3">
                {policy.scoreRules.map((r) => (
                  <li key={r.id} className="rounded-xl border border-line bg-surface p-4">
                    <p className="font-semibold text-ink">
                      {r.scoreValue ?? "—"} <span className="font-normal text-ink-3">· {r.scoreScale}</span>
                    </p>
                    <p className="mt-1 text-sm text-ink-2">{r.description}</p>
                    <p className="mt-1 text-xs text-ink-3">Policy reference: {r.sourceLocator}</p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <section aria-labelledby="details">
            <SectionHeading id="details" title="The detail" />
            <PolicyDetails policy={policy} />
          </section>
        </>
      ) : (
        <NoPolicy schoolName={school.name} entryYear={entryYear} website={contact?.website} otherYears={otherYears} />
      )}

      <section aria-labelledby="dates">
        <SectionHeading id="dates" title={`Key dates for September ${entryYear} entry`} />
        <KeyDates events={[...events]} entryYear={entryYear} today={today} />
      </section>

      {versions.length > 1 ? (
        <section aria-labelledby="versions">
          <SectionHeading id="versions" title="Version history" description="When a school's rules change, the old version is kept so you can see what changed." />
          <ul className="grid gap-2 text-sm">
            {versions.map((v) => (
              <li key={v.id} className="flex flex-wrap items-center gap-2">
                Version {v.version} · recorded {formatDate(v.createdAt)} <VerificationBadge status={v.status === "superseded" ? "historical" : v.verificationStatus} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="docs">
        <SectionHeading id="docs" title="Official documents" description="Documents we have retrieved for this school, with dates." />
        {documents.length ? (
          <ul className="grid gap-2 text-sm">
            {documents.map(({ doc, source }) => (
              <li key={doc.id} className="rounded-lg border border-line bg-surface px-4 py-3">
                <a href={doc.url} className="link font-medium" rel="noopener noreferrer" target="_blank">
                  {doc.title}
                </a>
                <span className="block text-xs text-ink-3">
                  {source.publisher} · retrieved {formatDate(doc.retrievedAt)} · {doc.status === "active" ? "current" : doc.status}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-2">We have not retrieved any documents for this school yet.</p>
        )}
      </section>
    </div>
  );
}
