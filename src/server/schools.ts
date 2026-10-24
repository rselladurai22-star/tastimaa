import "server-only";
import { sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { defaultEntryYear } from "@/lib/academic-year";
import { lookupOutcode, lookupPostcode } from "@/lib/postcode";
import { expandQuery, looksLikePostcode, normaliseQuery, toPrefixTsQuery } from "@/lib/search-terms";
import { PAGE_SIZE, type DirectoryParams } from "./search-params";

export type SchoolListItem = {
  id: number;
  slug: string;
  name: string;
  nation: "england" | "northern_ireland";
  selectivity: "fully_selective" | "partially_selective" | "selective_stream" | "non_selective";
  gender: "boys" | "girls" | "mixed" | "unknown";
  hasSixthForm: boolean | null;
  boarding: "none" | "boarding" | "unknown";
  town: string | null;
  postcode: string | null;
  laName: string | null;
  laSlug: string | null;
  regionName: string | null;
  lat: number | null;
  lng: number | null;
  distanceMiles: number | null;
  pupils: number | null;
  attainment8: number | null;
  attainment8Year: string | null;
  alevelAps: number | null;
  alevelGrade: string | null;
  alevelYear: string | null;
  testNames: string[] | null;
  policyStatus: string | null;
  catchmentType: string | null;
  outOfAreaRoute: string | null;
  pan: number | null;
  lastCheckedAt: string | null;
  verificationStatus: string;
};

export interface SearchResult {
  items: SchoolListItem[];
  total: number;
  page: number;
  pageSize: number;
  location: { label: string; latitude: number; longitude: number; precision: "postcode_centroid" | "postcode_district" } | null;
  locationError: string | null;
  query: string;
}

const MILES = 1609.344;

/**
 * The directory query. Every filter maps to stored data; nothing is inferred.
 */
export async function searchSchools(p: DirectoryParams, opts: { entryYear?: number; pageSize?: number } = {}): Promise<SearchResult> {
  const entryYear = opts.entryYear ?? defaultEntryYear();
  const pageSize = opts.pageSize ?? PAGE_SIZE;
  let q = p.q;
  let location: SearchResult["location"] = null;
  let locationError: string | null = null;

  // A postcode typed into the search box becomes a location search.
  const pcInput = p.postcode || (looksLikePostcode(q) ? q : "");
  if (pcInput) {
    const kind = looksLikePostcode(pcInput);
    if (kind === "full") {
      const r = await lookupPostcode(pcInput);
      if (r.ok) location = { label: r.location.postcode, latitude: r.location.latitude, longitude: r.location.longitude, precision: "postcode_centroid" };
      else locationError = r.message;
    } else if (kind === "outward") {
      const r = await lookupOutcode(pcInput);
      if (r.ok) location = { label: r.outcode, latitude: r.latitude, longitude: r.longitude, precision: "postcode_district" };
      else locationError = r.message;
    } else locationError = "That doesn't look like a valid UK postcode.";
    if (looksLikePostcode(q)) q = "";
  }

  const where: SQL[] = [sql`s.is_open`, sql`s.selectivity <> 'non_selective'`];
  if (p.nation) where.push(sql`s.nation = ${p.nation}`);
  if (p.area) where.push(sql`(la.slug = ${p.area} OR r.slug = ${p.area} OR (${p.area} = 'england' AND s.nation = 'england') OR (${p.area} = 'northern-ireland' AND s.nation = 'northern_ireland'))`);
  if (p.gender.length) where.push(sql`s.gender IN (${sql.join(p.gender.map((g) => sql`${g}`), sql`, `)})`);
  if (p.selectivity.length) where.push(sql`s.selectivity IN (${sql.join(p.selectivity.map((g) => sql`${g}`), sql`, `)})`);
  if (p.sixthForm) where.push(sql`s.has_sixth_form = true`);
  if (p.boarding) where.push(sql`s.boarding = 'boarding'`);
  if (p.test) where.push(sql`EXISTS (SELECT 1 FROM school_entrance_tests st JOIN entrance_tests t ON t.id = st.test_id WHERE st.school_id = s.id AND t.slug = ${p.test})`);
  if (p.outOfArea) where.push(sql`pol.out_of_area_route IN ('yes', 'limited')`);
  if (p.scoreRoute) where.push(sql`EXISTS (SELECT 1 FROM score_rules sr WHERE sr.policy_id = pol.id)`);
  if (p.siblingPriority) where.push(sql`EXISTS (SELECT 1 FROM admission_criteria ac WHERE ac.policy_id = pol.id AND ac.category = 'sibling')`);
  if (p.history) where.push(sql`EXISTS (SELECT 1 FROM historical_allocations ha WHERE ha.school_id = s.id)`);

  const point = location ? sql`ST_SetSRID(ST_MakePoint(${location.longitude}, ${location.latitude}), 4326)::geography` : null;
  const radius = p.radius ?? (location ? 30 : undefined);
  if (point && radius) where.push(sql`ST_DWithin(l.location, ${point}, ${radius * MILES})`);

  const tsq = q ? toPrefixTsQuery(q) : null;
  const expanded = q ? expandQuery(q) : "";
  const norm = q ? normaliseQuery(q) : "";
  let rank: SQL = sql`0`;
  if (q && tsq) {
    where.push(sql`(s.search_document @@ to_tsquery('simple', ${tsq}) OR word_similarity(${expanded}, s.search_text) > 0.45 OR word_similarity(${norm}, s.search_text) > 0.45)`);
    rank = sql`(ts_rank(s.search_document, to_tsquery('simple', ${tsq})) * 2 + greatest(word_similarity(${expanded}, s.search_text), similarity(${norm}, lower(immutable_unaccent(s.name)))))`;
  }

  const distance = point ? sql`ST_Distance(l.location, ${point}) / ${MILES}` : sql`NULL::float8`;
  const sort = p.sort ?? (point ? "distance" : q ? "relevance" : "name");
  const orderBy =
    sort === "distance" && point
      ? sql`distance_miles ASC NULLS LAST`
      : sort === "relevance" && q
        ? sql`rank DESC, s.name ASC`
        : sort === "gcse"
          ? sql`a8.value DESC NULLS LAST, s.name ASC`
          : sort === "alevel"
            ? sql`aps.value DESC NULLS LAST, s.name ASC`
            : sql`s.name ASC`;

  const offset = (p.page - 1) * pageSize;
  const rows = await db().execute<SchoolListItem & { total: number; rank: number }>(sql`
    WITH a8 AS (
      SELECT DISTINCT ON (school_id) school_id, value, academic_year
      FROM academic_results WHERE measure = 'ks4_attainment8' AND value IS NOT NULL
      ORDER BY school_id, academic_year DESC
    ), aps AS (
      SELECT DISTINCT ON (school_id) school_id, value, value_text, academic_year
      FROM academic_results WHERE measure = 'ks5_alevel_aps_per_entry' AND value IS NOT NULL
      ORDER BY school_id, academic_year DESC
    ), tests AS (
      SELECT st.school_id, array_agg(DISTINCT t.name ORDER BY t.name) AS names
      FROM school_entrance_tests st JOIN entrance_tests t ON t.id = st.test_id
      WHERE st.entry_year = ${entryYear} GROUP BY st.school_id
    ), pol AS (
      SELECT DISTINCT ON (p.school_id) p.id, p.school_id, p.status, p.catchment_type, p.out_of_area_route, p.published_admission_number
      FROM admission_policies p JOIN admission_cycles c ON c.id = p.cycle_id
      WHERE p.status IN ('published', 'awaiting_verification') AND c.entry_year = ${entryYear}
      ORDER BY p.school_id, p.version DESC
    ), census AS (
      SELECT DISTINCT ON (school_id) school_id, pupils FROM school_census ORDER BY school_id, census_date DESC
    )
    SELECT s.id, s.slug, s.name, s.nation, s.selectivity, s.gender,
           s.has_sixth_form AS "hasSixthForm", s.boarding,
           l.town, l.postcode,
           la.name AS "laName", la.slug AS "laSlug", r.name AS "regionName",
           ST_Y(l.location::geometry) AS lat, ST_X(l.location::geometry) AS lng,
           ${distance} AS distance_miles,
           census.pupils,
           a8.value AS attainment8, a8.academic_year AS "attainment8Year",
           aps.value AS "alevelAps", aps.value_text AS "alevelGrade", aps.academic_year AS "alevelYear",
           tests.names AS "testNames",
           pol.status AS "policyStatus", pol.catchment_type AS "catchmentType", pol.out_of_area_route AS "outOfAreaRoute",
           pol.published_admission_number AS pan,
           s.last_checked_at AS "lastCheckedAt", s.verification_status AS "verificationStatus",
           ${rank} AS rank,
           count(*) OVER () AS total
    FROM schools s
    LEFT JOIN school_locations l ON l.school_id = s.id
    LEFT JOIN geographic_areas la ON la.id = s.local_authority_id
    LEFT JOIN geographic_areas r ON r.id = s.region_id
    LEFT JOIN a8 ON a8.school_id = s.id
    LEFT JOIN aps ON aps.school_id = s.id
    LEFT JOIN tests ON tests.school_id = s.id
    LEFT JOIN pol ON pol.school_id = s.id
    LEFT JOIN census ON census.school_id = s.id
    WHERE ${sql.join(where, sql` AND `)}
    ORDER BY ${orderBy}
    LIMIT ${pageSize} OFFSET ${offset}
  `);
  const items = rows.map((r) => ({
    ...r,
    distanceMiles: (r as unknown as { distance_miles: number | null }).distance_miles === null ? null : Number((r as unknown as { distance_miles: number }).distance_miles),
    lat: r.lat === null ? null : Number(r.lat),
    lng: r.lng === null ? null : Number(r.lng),
    lastCheckedAt: r.lastCheckedAt ? new Date(r.lastCheckedAt).toISOString() : null,
  }));
  return { items, total: rows[0] ? Number(rows[0].total) : 0, page: p.page, pageSize, location, locationError, query: q };
}

export interface Suggestion {
  type: "school" | "area";
  label: string;
  sublabel: string;
  href: string;
}

/** Autocomplete: schools by name/former name/town (typo-tolerant) plus matching areas. */
export async function suggest(raw: string): Promise<Suggestion[]> {
  const q = raw.trim();
  if (q.length < 2) return [];
  const tsq = toPrefixTsQuery(q);
  const expanded = expandQuery(q);
  const norm = normaliseQuery(q);
  if (!tsq) return [];
  const schools = await db().execute<{ slug: string; name: string; town: string | null; la: string | null; nation: string }>(sql`
    SELECT s.slug, s.name, l.town, la.name AS la, s.nation
    FROM schools s
    LEFT JOIN school_locations l ON l.school_id = s.id
    LEFT JOIN geographic_areas la ON la.id = s.local_authority_id
    WHERE s.is_open AND s.selectivity <> 'non_selective'
      AND (s.search_document @@ to_tsquery('simple', ${tsq}) OR word_similarity(${expanded}, s.search_text) > 0.5 OR word_similarity(${norm}, s.search_text) > 0.5)
    ORDER BY ts_rank(s.search_document, to_tsquery('simple', ${tsq})) * 2 + greatest(word_similarity(${expanded}, s.search_text), similarity(${norm}, lower(immutable_unaccent(s.name)))) DESC, s.name
    LIMIT 7
  `);
  const areas = await db().execute<{ slug: string; name: string; type: string; n: number }>(sql`
    SELECT a.slug, a.name, a.type, count(s.id)::int AS n
    FROM geographic_areas a
    JOIN schools s ON (s.local_authority_id = a.id OR s.region_id = a.id) AND s.is_open AND s.selectivity <> 'non_selective'
    WHERE a.type IN ('local_authority', 'region') AND (lower(a.name) LIKE ${`${norm}%`} OR similarity(lower(a.name), ${norm}) > 0.4)
    GROUP BY a.id ORDER BY count(s.id) DESC LIMIT 3
  `);
  return [
    ...areas.map((a) => ({ type: "area" as const, label: a.name, sublabel: `${a.n} school${a.n === 1 ? "" : "s"} · ${a.type === "region" ? "region" : "local authority"}`, href: `/grammar-schools/${a.slug}` })),
    ...schools.map((s) => ({ type: "school" as const, label: s.name, sublabel: [s.town, s.la].filter(Boolean).join(", "), href: `/schools/${s.slug}` })),
  ];
}

export type AreaSummary = {
  id: number;
  slug: string;
  name: string;
  type: string;
  nation: string;
  schools: number;
  parentSlug: string | null;
  parentName: string | null;
};

export async function listAreas(type: "local_authority" | "region"): Promise<AreaSummary[]> {
  const rows = await db().execute<AreaSummary>(sql`
    SELECT a.id, a.slug, a.name, a.type, a.nation, count(s.id)::int AS schools, p.slug AS "parentSlug", p.name AS "parentName"
    FROM geographic_areas a
    LEFT JOIN geographic_areas p ON p.id = a.parent_id
    JOIN schools s ON (CASE WHEN a.type = 'region' THEN s.region_id ELSE s.local_authority_id END) = a.id AND s.is_open AND s.selectivity <> 'non_selective'
    WHERE a.type = ${type}
    GROUP BY a.id, p.slug, p.name
    ORDER BY count(s.id) DESC, a.name
  `);
  return [...rows];
}

export async function getArea(slug: string) {
  const [area] = await db().execute<{ id: number; slug: string; name: string; type: string; nation: string; code: string | null; parent_slug: string | null; parent_name: string | null }>(sql`
    SELECT a.id, a.slug, a.name, a.type, a.nation, a.code, p.slug AS parent_slug, p.name AS parent_name
    FROM geographic_areas a LEFT JOIN geographic_areas p ON p.id = a.parent_id WHERE a.slug = ${slug}
  `);
  return area ?? null;
}

export async function siteStats() {
  const [row] = await db().execute<{ england: number; ni: number; partial: number; las: number; inspections: number; results: number; allocations: number; policies: number }>(sql`
    SELECT
      count(*) FILTER (WHERE nation = 'england' AND selectivity = 'fully_selective' AND is_open)::int AS england,
      count(*) FILTER (WHERE nation = 'northern_ireland' AND is_open)::int AS ni,
      count(*) FILTER (WHERE selectivity = 'partially_selective' AND is_open)::int AS partial,
      (SELECT count(DISTINCT local_authority_id) FROM schools WHERE nation = 'england' AND is_open)::int AS las,
      (SELECT count(*) FROM inspections)::int AS inspections,
      (SELECT count(*) FROM academic_results WHERE value IS NOT NULL)::int AS results,
      (SELECT count(*) FROM historical_allocations WHERE value IS NOT NULL)::int AS allocations,
      (SELECT count(*) FROM admission_policies WHERE status IN ('published','awaiting_verification'))::int AS policies
    FROM schools
  `);
  return row!;
}

/** Map points for every school (small payload for the map view). */
export async function allSchoolPoints() {
  const rows = await db().execute<{ slug: string; name: string; lat: number; lng: number; gender: string; nation: string; selectivity: string }>(sql`
    SELECT s.slug, s.name, ST_Y(l.location::geometry) AS lat, ST_X(l.location::geometry) AS lng, s.gender, s.nation, s.selectivity
    FROM schools s JOIN school_locations l ON l.school_id = s.id
    WHERE s.is_open AND s.selectivity <> 'non_selective' AND l.location IS NOT NULL
  `);
  return rows.map((r) => ({ ...r, lat: Number(r.lat), lng: Number(r.lng) }));
}
