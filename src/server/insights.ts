import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { JOBS } from "@/etl/jobs";

/** Last successful run per ingestion job, for public freshness reporting. */
export async function dataFreshness() {
  const rows = await db().execute<{ job: string; source_name: string | null; licence: string | null; homepage_url: string | null; last_success: string | null; last_run: string | null; last_status: string | null; rows_read: number | null }>(sql`
    WITH latest AS (
      SELECT DISTINCT ON (job) job, status, started_at, source_id FROM ingestion_runs ORDER BY job, started_at DESC
    ), ok AS (
      SELECT job, max(finished_at) AS last_success, (array_agg(rows_read ORDER BY finished_at DESC))[1] AS rows_read
      FROM ingestion_runs WHERE status IN ('succeeded', 'partial') GROUP BY job
    )
    SELECT l.job, s.name AS source_name, s.licence, s.homepage_url, ok.last_success, l.started_at AS last_run, l.status AS last_status, ok.rows_read
    FROM latest l LEFT JOIN ok ON ok.job = l.job LEFT JOIN sources s ON s.id = l.source_id
    ORDER BY l.job
  `);
  return rows.map((r) => ({ ...r, description: JOBS[r.job]?.description ?? r.job, schedule: JOBS[r.job]?.schedule ?? "manual" }));
}

/** Demand for grammar school places nationally (England), by entry year, from DfE data. */
export async function nationalDemandTrend() {
  const rows = await db().execute<{ entry_year: number; offers: number | null; first: number | null; schools: number }>(sql`
    SELECT h.entry_year,
      sum(h.value) FILTER (WHERE h.metric = 'offers_made')::int AS offers,
      sum(h.value) FILTER (WHERE h.metric = 'times_first_preference')::int AS first,
      count(DISTINCT h.school_id)::int AS schools
    FROM historical_allocations h JOIN schools s ON s.id = h.school_id
    WHERE s.nation = 'england' AND s.selectivity = 'fully_selective' AND s.is_open
    GROUP BY h.entry_year ORDER BY h.entry_year
  `);
  return [...rows];
}

export async function regionsWithCounts() {
  const rows = await db().execute<{ slug: string; name: string; nation: string; type: string; n: number; boys: number; girls: number; mixed: number }>(sql`
    SELECT a.slug, a.name, a.nation, a.type, count(s.id)::int AS n,
      count(s.id) FILTER (WHERE s.gender = 'boys')::int AS boys,
      count(s.id) FILTER (WHERE s.gender = 'girls')::int AS girls,
      count(s.id) FILTER (WHERE s.gender = 'mixed')::int AS mixed
    FROM geographic_areas a JOIN schools s ON s.region_id = a.id AND s.is_open AND s.selectivity <> 'non_selective'
    WHERE a.type = 'region' AND a.nation = 'england'
    GROUP BY a.id ORDER BY n DESC
  `);
  return [...rows];
}

/** Schools with the most complete records, to showcase what a profile contains. */
export async function featuredSchools(limit = 3) {
  const rows = await db().execute<{ slug: string; name: string; town: string | null; la: string | null; gender: string; has_policy: boolean; a8: number | null; a8_year: string | null; aps_grade: string | null; first_prefs: number | null; offers: number | null; entry_year: number | null; test: string | null }>(sql`
    WITH a8 AS (SELECT DISTINCT ON (school_id) school_id, value, academic_year FROM academic_results WHERE measure = 'ks4_attainment8' AND value IS NOT NULL ORDER BY school_id, academic_year DESC),
    aps AS (SELECT DISTINCT ON (school_id) school_id, value_text FROM academic_results WHERE measure = 'ks5_alevel_aps_per_entry' AND value IS NOT NULL ORDER BY school_id, academic_year DESC),
    ly AS (SELECT max(entry_year) AS y FROM historical_allocations),
    alloc AS (
      SELECT h.school_id, max(h.value) FILTER (WHERE metric = 'times_first_preference') AS first_prefs, max(h.value) FILTER (WHERE metric = 'offers_made') AS offers, max(h.entry_year) AS entry_year
      FROM historical_allocations h, ly WHERE h.entry_year = ly.y GROUP BY h.school_id
    ),
    t AS (SELECT DISTINCT ON (st.school_id) st.school_id, et.name FROM school_entrance_tests st JOIN entrance_tests et ON et.id = st.test_id ORDER BY st.school_id, st.entry_year)
    SELECT s.slug, s.name, l.town, la.name AS la, s.gender,
      EXISTS (SELECT 1 FROM admission_policies p WHERE p.school_id = s.id AND p.status IN ('published','awaiting_verification')) AS has_policy,
      a8.value AS a8, a8.academic_year AS a8_year, aps.value_text AS aps_grade, alloc.first_prefs, alloc.offers, alloc.entry_year, t.name AS test
    FROM schools s
    LEFT JOIN school_locations l ON l.school_id = s.id
    LEFT JOIN geographic_areas la ON la.id = s.local_authority_id
    LEFT JOIN a8 ON a8.school_id = s.id LEFT JOIN aps ON aps.school_id = s.id LEFT JOIN alloc ON alloc.school_id = s.id LEFT JOIN t ON t.school_id = s.id
    WHERE s.is_open AND s.nation = 'england' AND s.selectivity = 'fully_selective'
    ORDER BY has_policy DESC, (t.name IS NOT NULL) DESC, (a8.value IS NOT NULL AND aps.value_text IS NOT NULL) DESC, alloc.first_prefs DESC NULLS LAST
    LIMIT ${limit}
  `);
  return [...rows];
}

export async function upcomingEvents(limit = 6, today = new Date().toISOString().slice(0, 10)) {
  const rows = await db().execute<{ id: number; title: string; description: string | null; event_type: string; starts_on: string; ends_on: string | null; url: string | null; nation: string; entry_year: number; test_name: string | null; test_slug: string | null; verification_status: string }>(sql`
    SELECT e.id, e.title, e.description, e.event_type, e.starts_on::text, e.ends_on::text, e.url, c.nation, c.entry_year, t.name AS test_name, t.slug AS test_slug, e.verification_status
    FROM admission_events e JOIN admission_cycles c ON c.id = e.cycle_id LEFT JOIN entrance_tests t ON t.id = e.test_id
    WHERE coalesce(e.ends_on, e.starts_on) >= ${today}::date
    ORDER BY e.starts_on LIMIT ${limit}
  `);
  return [...rows];
}

export async function allEvents() {
  const rows = await db().execute<{ id: number; title: string; description: string | null; event_type: string; starts_on: string; ends_on: string | null; url: string | null; nation: string; entry_year: number; scope: string; test_name: string | null; test_slug: string | null; school_name: string | null; school_slug: string | null; verification_status: string; source_locator: string | null }>(sql`
    SELECT e.id, e.title, e.description, e.event_type, e.starts_on::text, e.ends_on::text, e.url, c.nation, c.entry_year, e.scope, t.name AS test_name, t.slug AS test_slug, s.name AS school_name, s.slug AS school_slug, e.verification_status, e.source_locator
    FROM admission_events e JOIN admission_cycles c ON c.id = e.cycle_id LEFT JOIN entrance_tests t ON t.id = e.test_id LEFT JOIN schools s ON s.id = e.school_id
    ORDER BY e.starts_on
  `);
  return [...rows];
}
