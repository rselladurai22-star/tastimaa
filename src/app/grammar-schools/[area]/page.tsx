import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { defaultEntryYear } from "@/lib/academic-year";
import { formatNumber } from "@/lib/format";
import { parseDirectoryParams } from "@/server/search-params";
import { getArea, searchSchools } from "@/server/schools";
import { DirectoryView } from "@/components/search/directory-view";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Callout, Container } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ area: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

function areaFilter(area: { id: number; type: string; nation: string }) {
  if (area.type === "nation") return sql`s.nation = ${area.nation}`;
  if (area.type === "region") return sql`s.region_id = ${area.id}`;
  return sql`s.local_authority_id = ${area.id}`;
}

async function areaStats(area: { id: number; type: string; nation: string }) {
  const f = areaFilter(area);
  const [row] = await db().execute<{ total: number; boys: number; girls: number; mixed: number; sixth: number; partial: number; pupils: number | null }>(sql`
    SELECT count(*)::int AS total,
      count(*) FILTER (WHERE gender = 'boys')::int AS boys,
      count(*) FILTER (WHERE gender = 'girls')::int AS girls,
      count(*) FILTER (WHERE gender = 'mixed')::int AS mixed,
      count(*) FILTER (WHERE has_sixth_form)::int AS sixth,
      count(*) FILTER (WHERE selectivity = 'partially_selective')::int AS partial,
      (SELECT sum(c.pupils)::int FROM school_census c JOIN schools s2 ON s2.id = c.school_id WHERE c.school_id IN (SELECT s.id FROM schools s WHERE s.is_open AND ${f}) AND c.census_date = (SELECT max(census_date) FROM school_census c2 WHERE c2.school_id = c.school_id)) AS pupils
    FROM schools s WHERE s.is_open AND s.selectivity <> 'non_selective' AND ${f}
  `);
  const offers = await db().execute<{ entry_year: number; offers: number; first: number; other_la_apps: number; other_la_offers: number; schools: number }>(sql`
    SELECT h.entry_year,
      sum(h.value) FILTER (WHERE h.metric = 'offers_made')::int AS offers,
      sum(h.value) FILTER (WHERE h.metric = 'times_first_preference')::int AS first,
      sum(h.value) FILTER (WHERE h.metric = 'applications_from_other_la')::int AS other_la_apps,
      sum(h.value) FILTER (WHERE h.metric = 'offers_to_other_la')::int AS other_la_offers,
      count(DISTINCT h.school_id)::int AS schools
    FROM historical_allocations h JOIN schools s ON s.id = h.school_id
    WHERE s.is_open AND s.selectivity <> 'non_selective' AND ${f}
    GROUP BY h.entry_year ORDER BY h.entry_year DESC LIMIT 1
  `);
  const tests = await db().execute<{ slug: string; name: string; n: number; verification_status: string }>(sql`
    SELECT t.slug, t.name, t.verification_status, count(DISTINCT st.school_id)::int AS n
    FROM school_entrance_tests st JOIN entrance_tests t ON t.id = st.test_id JOIN schools s ON s.id = st.school_id
    WHERE ${f} GROUP BY t.id ORDER BY n DESC
  `);
  return { ...row!, latestOffers: offers[0] ?? null, tests: [...tests] };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { area: slug } = await params;
  const area = await getArea(slug);
  if (!area) return { title: "Area not found" };
  const name = area.name === "Education Authority (Northern Ireland)" ? "Northern Ireland" : area.name;
  return {
    title: `Grammar schools in ${name}: admissions, tests and results`,
    description: `Every grammar school in ${name}, with entrance test arrangements, admissions rules, catchment information, official results and inspection outcomes.`,
    alternates: { canonical: `/grammar-schools/${area.slug}` },
  };
}

export default async function AreaPage({ params, searchParams }: Props) {
  const { area: slug } = await params;
  const area = await getArea(slug);
  if (!area || !["nation", "region", "local_authority", "education_authority"].includes(area.type)) notFound();
  const sp = await searchParams;
  const p = parseDirectoryParams({ ...sp, area: area.slug });
  const entryYear = defaultEntryYear();
  const [stats, result] = await Promise.all([areaStats(area), searchSchools(p, { entryYear })]);
  if (stats.total === 0) notFound();
  const isNI = area.nation === "northern_ireland";
  const crumbs = [{ href: "/grammar-schools", label: "Grammar schools" }];
  if (area.parent_slug && area.parent_slug !== area.slug) crumbs.push({ href: `/grammar-schools/${area.parent_slug}`, label: area.parent_name ?? area.parent_slug });
  crumbs.push({ href: `/grammar-schools/${area.slug}`, label: area.name });
  const lo = stats.latestOffers;

  return (
    <Container className="py-8">
      <Breadcrumbs items={crumbs} />
      <header className="mt-4 mb-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="max-w-3xl">
          <h1 className="text-3xl font-semibold sm:text-4xl">Grammar schools in {area.name}</h1>
          <p className="mt-3 text-lg text-ink-2">
            {area.name} has {stats.total} {isNI ? "grammar" : "selective"} {stats.total === 1 ? "school" : "schools"}: {stats.boys} for boys, {stats.girls} for girls and {stats.mixed} co-educational
            {stats.mixed + stats.boys + stats.girls < stats.total ? " (gender policy not recorded for the rest)" : ""}. {stats.sixth} have a sixth form.
            {stats.partial ? ` ${stats.partial} are partially selective.` : ""}
          </p>
          {isNI ? (
            <Callout className="mt-5" title="Northern Ireland uses a different system">
              Children transfer to Year 8 (not Year 7). Most grammar schools that select academically use the SEAG Entrance Assessment, and each school sets its own admissions criteria. Applications go through the
              Education Authority. <Link href="/admissions/northern-ireland">How transfer works in Northern Ireland</Link>.
            </Callout>
          ) : null}
        </div>
        <aside className="rounded-xl border border-line bg-surface p-5 text-sm">
          <h2 className="font-sans text-sm font-semibold text-ink">At a glance</h2>
          <dl className="mt-3 grid grid-cols-2 gap-4">
            <div>
              <dt className="text-xs text-ink-3">Schools</dt>
              <dd className="text-xl font-semibold">{stats.total}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-3">Pupils (latest census)</dt>
              <dd className="text-xl font-semibold">{formatNumber(stats.pupils)}</dd>
            </div>
            {lo ? (
              <>
                <div>
                  <dt className="text-xs text-ink-3">Year 7 offers, {lo.entry_year}</dt>
                  <dd className="text-xl font-semibold">{formatNumber(lo.offers)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-3">Named as first preference</dt>
                  <dd className="text-xl font-semibold">{formatNumber(lo.first)}</dd>
                </div>
              </>
            ) : null}
          </dl>
          {lo ? (
            <p className="mt-3 text-xs text-ink-3">
              National offer day, September {lo.entry_year} entry, {lo.schools} schools. {formatNumber(lo.other_la_offers)} offers went to families living in another local authority. Source: DfE school-level applications and
              offers.
            </p>
          ) : null}
          {stats.tests.length ? (
            <div className="mt-4 border-t border-line pt-4">
              <h3 className="font-sans text-xs font-semibold text-ink-3">Entrance tests used here</h3>
              <ul className="mt-2 grid gap-1">
                {stats.tests.map((t) => (
                  <li key={t.slug}>
                    <Link href={`/11-plus/${t.slug}`} className="link">
                      {t.name}
                    </Link>{" "}
                    <span className="text-ink-3">({t.n} schools)</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </aside>
      </header>
      <DirectoryView p={p} result={result} basePath={`/grammar-schools/${area.slug}`} lockArea entryYear={entryYear} />
    </Container>
  );
}
