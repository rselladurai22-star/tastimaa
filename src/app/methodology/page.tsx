import type { Metadata } from "next";
import Link from "next/link";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { ArticleShell, DeepHeading } from "@/ui/article/article";
import { Status, VERIFICATION_META, type Verification } from "@/ui/status";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Methodology: where our data comes from and how we verify it",
  description: "How we collect, verify and present grammar school information: official sources, verification states, update frequency, coverage and what we can't guarantee.",
  alternates: { canonical: "/methodology" },
};

const TOC = [
  { id: "included", label: "Which schools are included" },
  { id: "coverage", label: "Coverage today" },
  { id: "collection", label: "How data is collected" },
  { id: "verification", label: "Verification states" },
  { id: "results", label: "Results and rankings" },
  { id: "inspections", label: "Inspections" },
  { id: "location", label: "Location and catchment" },
  { id: "assistant", label: "The research assistant" },
  { id: "corrections", label: "Corrections" },
];

export default async function MethodologyPage() {
  const [c] = await db().execute<{ schools: number; with_policy: number; with_test: number; with_results: number; with_inspection: number; with_alloc: number; ni: number }>(sql`
    SELECT count(*)::int AS schools,
      count(*) FILTER (WHERE EXISTS (SELECT 1 FROM admission_policies p WHERE p.school_id = s.id AND p.status IN ('published','awaiting_verification')))::int AS with_policy,
      count(*) FILTER (WHERE EXISTS (SELECT 1 FROM school_entrance_tests t WHERE t.school_id = s.id))::int AS with_test,
      count(*) FILTER (WHERE EXISTS (SELECT 1 FROM academic_results r WHERE r.school_id = s.id AND r.value IS NOT NULL))::int AS with_results,
      count(*) FILTER (WHERE EXISTS (SELECT 1 FROM inspections i WHERE i.school_id = s.id))::int AS with_inspection,
      count(*) FILTER (WHERE EXISTS (SELECT 1 FROM historical_allocations h WHERE h.school_id = s.id))::int AS with_alloc,
      count(*) FILTER (WHERE s.nation = 'northern_ireland')::int AS ni
    FROM schools s WHERE s.is_open AND s.selectivity <> 'non_selective'
  `);
  const pct = (n: number) => `${n} of ${c!.schools} (${Math.round((n / c!.schools) * 100)}%)`;
  return (
    <ArticleShell
      crumbs={[{ href: "/methodology", label: "Methodology" }]}
      kicker="The atlas · how we work"
      title="Methodology"
      lede={<p>Our approach is simple: official sources first, every fact cited, and anything we can&apos;t verify labelled rather than guessed.</p>}
      description="Our approach is simple: official sources first, every fact cited, and anything we can't verify labelled rather than guessed."
      toc={TOC}
      related={[
        { href: "/data-sources", title: "Data sources and freshness", text: "Live status of every import.", kicker: "Trust" },
        { href: "/corrections", title: "Report a correction", text: "It goes to the same review queue as automated extractions.", kicker: "Trust" },
      ]}
      updated="2026-10-24"
      path="/methodology"
      sources={[
        { title: "Get Information about Schools — downloads", url: "https://get-information-schools.service.gov.uk/Downloads" },
        { title: "Explore Education Statistics API", url: "https://api.education.gov.uk/statistics/v1" },
        { title: "Ofsted management information", url: "https://www.gov.uk/government/statistical-data-sets/monthly-management-information-ofsteds-school-inspections-outcomes" },
        { title: "DE NI school enrolment data", url: "https://www.education-ni.gov.uk/articles/school-enrolments-school-level-data" },
      ]}
    >
      <DeepHeading id="included" n={1}>
        Which schools are included
      </DeepHeading>
      <p>
        <strong>England:</strong> every open state-funded school that the Department for Education&apos;s Get Information about Schools (GIAS) register records as having a <em>selective</em> admissions policy. Partially selective schools are not flagged in GIAS; we add them only from a
        cited source (currently the CSSE member list) and label them as awaiting verification.
      </p>
      <p>
        <strong>Northern Ireland:</strong> every school recorded as a grammar school in the Department of Education&apos;s school-level census data ({c!.ni} schools). <strong>Wales and Scotland</strong> have no state grammar schools.
      </p>
      <DeepHeading id="coverage" n={2}>
        Coverage today
      </DeepHeading>
      <ul>
        <li>Schools listed: {c!.schools}</li>
        <li>Official results (DfE): {pct(c!.with_results)} — Northern Ireland results are not yet integrated</li>
        <li>Ofsted inspection records: {pct(c!.with_inspection)} — Northern Ireland schools are inspected by ETI, not yet integrated</li>
        <li>Applications and offers history (DfE): {pct(c!.with_alloc)}</li>
        <li>Entrance test linked: {pct(c!.with_test)}</li>
        <li>Structured admissions policy held: {pct(c!.with_policy)}</li>
      </ul>
      <p>
        Admissions policies are the hardest data to collect: each of more than 160 admission authorities publishes its own document every year, often as a PDF. We add them school by school, and we never fill a gap with another year&apos;s rules or a guess.
      </p>
      <DeepHeading id="collection" n={3}>
        How data is collected
      </DeepHeading>
      <ul>
        <li><strong>Bulk official datasets</strong> (GIAS, DfE statistics, Ofsted, DE NI) are downloaded automatically on a schedule, checksummed, stored and imported with a full run log. GIAS&apos;s public search interface is never scraped.</li>
        <li><strong>School admissions documents</strong> are fetched only where the publisher&apos;s robots.txt allows it, at low request rates. Otherwise an editor uploads them manually. Text is extracted page by page and proposed facts go to a review queue — they are never published automatically.</li>
        <li><strong>Editorial research</strong> is entered with the exact page and passage it came from.</li>
      </ul>
      <DeepHeading id="verification" n={4}>
        Verification states
      </DeepHeading>
      <p>Every fact carries one of these labels:</p>
      <ul>
        {(Object.keys(VERIFICATION_META) as Verification[]).map((k) => (
          <li key={k}>
            <Status status={k} /> — {VERIFICATION_META[k].description}
          </li>
        ))}
      </ul>
      <DeepHeading id="results" n={5}>
        Results and rankings
      </DeepHeading>
      <p>
        We publish DfE measures exactly as released, with the year and whether figures are provisional or final. We don&apos;t create composite scores or league tables. Where DfE didn&apos;t publish a measure (for example Progress 8 for 2024/25 and 2025/26, because those cohorts
        had no key stage 2 tests), we say so.
      </p>
      <DeepHeading id="inspections" n={6}>
        Inspections
      </DeepHeading>
      <p>
        Ofsted&apos;s renewed framework (from 10 November 2025) grades several areas on a five-point scale in a report card. Earlier inspections gave one-word judgements. We show each under its own framework and never convert between them.
      </p>
      <DeepHeading id="location" n={7}>
        Location and catchment
      </DeepHeading>
      <p>
        Postcode locations are centre points from the ONS Postcode Directory (via postcodes.io), not exact addresses. Straight-line distances are labelled as approximate and are not the method schools use. We draw catchment boundaries only from official,
        verified geometry. Northern Ireland postcode lookup is switched off unless the operator has confirmed the licence permits it.
      </p>
      <DeepHeading id="assistant" n={8}>
        The research assistant
      </DeepHeading>
      <p>
        The assistant answers only from documents retrieved from this database and official publications, and cites them. Retrieved text is treated as data, not instructions. It never estimates the chance of a place. Without an AI provider configured, it shows the
        relevant verified facts directly.
      </p>
      <DeepHeading id="corrections" n={9}>
        Corrections
      </DeepHeading>
      <p>
        Spotted something wrong? <Link href="/corrections">Send a correction</Link>. It goes to the same review queue as automated extractions, and we record the outcome.
      </p>
    </ArticleShell>
  );
}
