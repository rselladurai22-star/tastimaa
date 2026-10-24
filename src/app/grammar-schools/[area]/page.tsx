import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { defaultEntryYear } from "@/lib/academic-year";
import { formatNumber } from "@/lib/format";
import { schoolPoints, selectiveA8 } from "@/server/insights";
import { getArea, searchSchools } from "@/server/schools";
import { parseDirectoryParams } from "@/server/search-params";
import { Breadcrumbs } from "@/ui/breadcrumbs";
import { DirectoryDesk } from "@/ui/directory/directory";
import { Kicker, Note, Page } from "@/ui/kit";
import { Status } from "@/ui/status";
import { AtlasMap } from "@/ui/viz/atlas-map";

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
  const [stats, result, points, bench] = await Promise.all([areaStats(area), searchSchools(p, { entryYear }), schoolPoints(), selectiveA8()]);
  if (stats.total === 0) notFound();
  const isNI = area.nation === "northern_ireland";
  const crumbs = [{ href: "/grammar-schools", label: "Grammar schools" }];
  if (area.parent_slug && area.parent_slug !== area.slug) crumbs.push({ href: `/grammar-schools/${area.parent_slug}`, label: area.parent_name ?? area.parent_slug });
  crumbs.push({ href: `/grammar-schools/${area.slug}`, label: area.name });
  const lo = stats.latestOffers;

  const inArea = points.filter((pt) =>
    area.type === "nation" ? (area.nation === "northern_ireland" ? pt.nation === "northern_ireland" : pt.nation === "england") : area.type === "region" ? pt.region_slug === area.slug : area.type === "education_authority" ? pt.nation === "northern_ireland" : pt.la_slug === area.slug,
  );
  const notRecorded = stats.total - stats.boys - stats.girls - stats.mixed;
  const parts = [
    { k: "Boys", v: stats.boys, c: "var(--series-3)" },
    { k: "Girls", v: stats.girls, c: "var(--series-2)" },
    { k: "Co-educational", v: stats.mixed, c: "var(--series-1)" },
    { k: "Not recorded", v: notRecorded, c: "var(--rule-strong)" },
  ].filter((x) => x.v > 0);

  return (
    <>
      <div className="border-b border-rule">
        <Page className="pt-6 pb-10">
          <Breadcrumbs items={crumbs} />
          <div className="mt-6 grid gap-x-14 gap-y-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
            <div className="min-w-0">
              <Kicker>Area profile{area.parent_name && area.parent_slug !== area.slug ? ` · ${area.parent_name}` : ""}</Kicker>
              <h1 className="mt-3 text-h1 [font-variation-settings:'opsz'_60]">Grammar schools in {area.name}</h1>
              <p className="mt-4 max-w-[46rem] text-lede leading-[1.5] text-ink-2">
                {area.name} has {stats.total} {isNI ? "grammar" : "selective"} {stats.total === 1 ? "school" : "schools"}: {stats.boys} for boys, {stats.girls} for girls and {stats.mixed} co-educational
                {stats.mixed + stats.boys + stats.girls < stats.total ? " (gender policy not recorded for the rest)" : ""}. {stats.sixth} {stats.sixth === 1 ? "has" : "have"} a sixth form.
                {stats.partial ? ` ${stats.partial} ${stats.partial === 1 ? "is" : "are"} partially selective.` : ""}
              </p>
              {isNI ? (
                <Note className="mt-6 max-w-[46rem]" title="Northern Ireland uses a different system">
                  Children transfer to Year 8 (not Year 7). Most grammar schools that select academically use the SEAG Entrance Assessment, and each school sets its own admissions criteria. Applications go through the Education Authority.{" "}
                  <Link href="/admissions/northern-ireland">How transfer works in Northern Ireland</Link>.
                </Note>
              ) : null}

              <dl className="mt-8 grid grid-cols-2 border-t border-ink sm:grid-cols-4">
                {[
                  ["Schools", formatNumber(stats.total), null],
                  ["Pupils", formatNumber(stats.pupils), "latest census"],
                  ...(lo
                    ? [
                        ["Offers made", formatNumber(lo.offers), `Sept ${lo.entry_year} entry`],
                        ["First preferences", formatNumber(lo.first), `Sept ${lo.entry_year} entry`],
                      ]
                    : []),
                ].map(([k, v, m]) => (
                  <div key={k as string} className="border-b border-rule py-3 pr-4">
                    <dt className="label">{k}</dt>
                    <dd className="mt-1.5 font-display text-[1.9rem] leading-none text-ink num">{v}</dd>
                    {m ? <dd className="mt-1 text-small text-ink-2">{m}</dd> : null}
                  </div>
                ))}
              </dl>
              {lo ? (
                <p className="mt-3 max-w-[60ch] text-small text-ink-2">
                  National offer day, September {lo.entry_year} entry, {lo.schools} schools. {formatNumber(lo.other_la_offers)} offers went to families living in another local authority. Source: DfE school-level applications and offers.
                </p>
              ) : null}

              <div className="mt-8 grid gap-8 sm:grid-cols-2">
                <div>
                  <p className="label mb-2">Who they admit</p>
                  <div className="flex h-3 w-full overflow-hidden rounded-[2px]" aria-hidden>
                    {parts.map((x) => (
                      <span key={x.k} className="h-full border-r-2 border-paper last:border-r-0" style={{ width: `${(x.v / stats.total) * 100}%`, background: x.c }} />
                    ))}
                  </div>
                  <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-small text-ink-2">
                    {parts.map((x) => (
                      <li key={x.k} className="inline-flex items-center gap-2">
                        <span aria-hidden className="size-2.5 rounded-[1px]" style={{ background: x.c }} />
                        {x.k} <span className="font-mono text-ink">{x.v}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                {stats.tests.length ? (
                  <div>
                    <p className="label mb-2">Entrance tests used here</p>
                    <ul className="grid gap-1.5">
                      {stats.tests.map((t) => (
                        <li key={t.slug} className="flex flex-wrap items-baseline gap-x-2">
                          <Link href={`/11-plus/${t.slug}`} className="a font-semibold">
                            {t.name}
                          </Link>
                          <span className="text-small text-ink-2">
                            {t.n} {t.n === 1 ? "school" : "schools"}
                          </span>
                          {t.verification_status !== "officially_verified" ? <Status status={t.verification_status} quiet /> : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </div>
            <figure className="min-w-0 lg:pt-6">
              <AtlasMap points={points} groups={[]} legend={false} spotlight={inArea.map((x) => x.slug)} label={`Map: the ${inArea.length} schools in ${area.name}, in copper, among all ${points.length} grammar schools.`} />
              <figcaption className="mt-2 text-small leading-relaxed text-ink-2">
                <span className="label mr-2 text-copper-ink">Where it sits</span>
                {area.name}&apos;s schools in copper, among every grammar school in the atlas.
              </figcaption>
            </figure>
          </div>
        </Page>
      </div>

      <Page className="pt-8 pb-6">
        <DirectoryDesk p={p} result={result} basePath={`/grammar-schools/${area.slug}`} lockArea entryYear={entryYear} bench={bench} />
      </Page>
    </>
  );
}
