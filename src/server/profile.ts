import "server-only";
import { cache } from "react";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/db";

export type VerificationStatus = (typeof schema.verificationStatusEnum.enumValues)[number];

export interface SourceRef {
  id: number;
  title: string;
  url: string;
  publisher: string | null;
  retrievedAt: string;
  publishedAt: string | null;
  status: string;
  sourceName: string;
  licence: string;
}

/** Load source documents by id, for citation footnotes. */
export async function loadSources(ids: (number | null | undefined)[]): Promise<Map<number, SourceRef>> {
  const unique = [...new Set(ids.filter((i): i is number => typeof i === "number"))];
  if (!unique.length) return new Map();
  const rows = await db()
    .select({
      id: schema.sourceDocuments.id,
      title: schema.sourceDocuments.title,
      url: schema.sourceDocuments.url,
      publisher: schema.sourceDocuments.publisher,
      retrievedAt: schema.sourceDocuments.retrievedAt,
      publishedAt: schema.sourceDocuments.publishedAt,
      status: schema.sourceDocuments.status,
      sourceName: schema.sources.name,
      sourcePublisher: schema.sources.publisher,
      licence: schema.sources.licence,
    })
    .from(schema.sourceDocuments)
    .innerJoin(schema.sources, eq(schema.sources.id, schema.sourceDocuments.sourceId))
    .where(inArray(schema.sourceDocuments.id, unique));
  return new Map(
    rows.map((r) => [
      r.id,
      { id: r.id, title: r.title, url: r.url, publisher: r.publisher ?? r.sourcePublisher, retrievedAt: r.retrievedAt.toISOString(), publishedAt: r.publishedAt, status: r.status, sourceName: r.sourceName, licence: r.licence },
    ]),
  );
}

export const getSchoolCore = cache(async (slug: string) => {
  const school = await db().query.schools.findFirst({ where: eq(schema.schools.slug, slug) });
  if (!school) return null;
  const [loc] = await db().execute<{ street: string | null; locality: string | null; address3: string | null; town: string | null; county: string | null; postcode: string | null; lat: number | null; lng: number | null; location_method: string | null; source_document_id: number | null }>(sql`
    SELECT street, locality, address3, town, county, postcode, ST_Y(location::geometry) AS lat, ST_X(location::geometry) AS lng, location_method, source_document_id
    FROM school_locations WHERE school_id = ${school.id}
  `);
  const [contact, identifiers, names, census, la, region] = await Promise.all([
    db().query.schoolContacts.findFirst({ where: eq(schema.schoolContacts.schoolId, school.id) }),
    db().query.schoolIdentifiers.findMany({ where: eq(schema.schoolIdentifiers.schoolId, school.id) }),
    db().query.schoolNames.findMany({ where: eq(schema.schoolNames.schoolId, school.id), orderBy: desc(schema.schoolNames.validTo) }),
    db().query.schoolCensus.findFirst({ where: eq(schema.schoolCensus.schoolId, school.id), orderBy: desc(schema.schoolCensus.censusDate) }),
    school.localAuthorityId ? db().query.geographicAreas.findFirst({ where: eq(schema.geographicAreas.id, school.localAuthorityId) }) : Promise.resolve(undefined),
    school.regionId ? db().query.geographicAreas.findFirst({ where: eq(schema.geographicAreas.id, school.regionId) }) : Promise.resolve(undefined),
  ]);
  return {
    school,
    location: loc ? { ...loc, lat: loc.lat === null ? null : Number(loc.lat), lng: loc.lng === null ? null : Number(loc.lng) } : null,
    contact: contact ?? null,
    identifiers,
    formerNames: names.filter((n) => !n.isCurrent),
    census: census ?? null,
    la: la ?? null,
    region: region ?? null,
  };
});

export type SchoolCoreData = NonNullable<Awaited<ReturnType<typeof getSchoolCore>>>;

export async function getEntranceTests(schoolId: number, entryYear: number) {
  return db()
    .select({ test: schema.entranceTests, link: schema.schoolEntranceTests, provider: schema.testProviders })
    .from(schema.schoolEntranceTests)
    .innerJoin(schema.entranceTests, eq(schema.entranceTests.id, schema.schoolEntranceTests.testId))
    .leftJoin(schema.testProviders, eq(schema.testProviders.id, schema.entranceTests.providerId))
    .where(and(eq(schema.schoolEntranceTests.schoolId, schoolId), eq(schema.schoolEntranceTests.entryYear, entryYear)));
}

/** Admission policies visible to the public: published, or clearly labelled as awaiting verification. */
export async function getPolicies(schoolId: number) {
  const policies = await db()
    .select({ policy: schema.admissionPolicies, cycle: schema.admissionCycles })
    .from(schema.admissionPolicies)
    .innerJoin(schema.admissionCycles, eq(schema.admissionCycles.id, schema.admissionPolicies.cycleId))
    .where(and(eq(schema.admissionPolicies.schoolId, schoolId), inArray(schema.admissionPolicies.status, ["published", "awaiting_verification", "superseded"])))
    .orderBy(desc(schema.admissionCycles.entryYear), desc(schema.admissionPolicies.version));
  const ids = policies.map((p) => p.policy.id);
  const [criteria, scoreRules] = ids.length
    ? await Promise.all([
        db().select().from(schema.admissionCriteria).where(inArray(schema.admissionCriteria.policyId, ids)).orderBy(asc(schema.admissionCriteria.rank)),
        db().select().from(schema.scoreRules).where(inArray(schema.scoreRules.policyId, ids)),
      ])
    : [[], []];
  return policies.map((p) => ({
    ...p.policy,
    cycle: p.cycle,
    criteria: criteria.filter((c) => c.policyId === p.policy.id),
    scoreRules: scoreRules.filter((r) => r.policyId === p.policy.id),
  }));
}

export type PolicyWithRules = Awaited<ReturnType<typeof getPolicies>>[number];

/** Choose the policy for an entry year; never substitute another year's rules. */
export function policyForYear(policies: PolicyWithRules[], entryYear: number): PolicyWithRules | null {
  return policies.find((p) => p.cycle.entryYear === entryYear && p.status !== "superseded") ?? null;
}

export async function getResults(schoolId: number) {
  return db().select().from(schema.academicResults).where(eq(schema.academicResults.schoolId, schoolId)).orderBy(asc(schema.academicResults.academicYear));
}

export async function getComparators(laCode: string | null | undefined) {
  const codes = ["E92000001", ...(laCode ? [laCode] : [])];
  return db().select().from(schema.areaResults).where(inArray(schema.areaResults.areaCode, codes));
}

export async function getInspections(schoolId: number) {
  const rows = await db().select().from(schema.inspections).where(eq(schema.inspections.schoolId, schoolId)).orderBy(desc(schema.inspections.startDate));
  const ids = rows.map((r) => r.id);
  const evals = ids.length ? await db().select().from(schema.inspectionEvaluations).where(inArray(schema.inspectionEvaluations.inspectionId, ids)) : [];
  return rows.map((r) => ({ ...r, evaluations: evals.filter((e) => e.inspectionId === r.id) }));
}

export async function getAllocations(schoolId: number) {
  return db().select().from(schema.historicalAllocations).where(eq(schema.historicalAllocations.schoolId, schoolId)).orderBy(asc(schema.historicalAllocations.entryYear));
}

export async function getSchoolEvents(schoolId: number, testIds: number[], nation: string) {
  return db().execute<{ id: number; title: string; description: string | null; event_type: string; starts_on: string; ends_on: string | null; url: string | null; scope: string; entry_year: number; verification_status: VerificationStatus; source_document_id: number | null; source_locator: string | null; test_name: string | null }>(sql`
    SELECT e.id, e.title, e.description, e.event_type, e.starts_on::text, e.ends_on::text, e.url, e.scope, c.entry_year,
           e.verification_status, e.source_document_id, e.source_locator, t.name AS test_name
    FROM admission_events e
    JOIN admission_cycles c ON c.id = e.cycle_id
    LEFT JOIN entrance_tests t ON t.id = e.test_id
    WHERE (e.school_id = ${schoolId})
       OR (e.scope = 'nation' AND c.nation = ${nation})
       OR (e.test_id IN (${testIds.length ? sql.join(testIds.map((i) => sql`${i}`), sql`, `) : sql`NULL`}))
    ORDER BY e.starts_on
  `);
}

export async function getChanges(schoolId: number) {
  return db().select().from(schema.changeEvents).where(eq(schema.changeEvents.schoolId, schoolId)).orderBy(desc(schema.changeEvents.detectedAt)).limit(30);
}

export async function getFeatures(schoolId: number) {
  return db().select().from(schema.schoolFeatures).where(eq(schema.schoolFeatures.schoolId, schoolId));
}

export async function getCatchments(schoolId: number) {
  return db().execute<{ id: number; name: string; kind: string; effective_entry_year: number; licence: string; verification_status: VerificationStatus; source_document_id: number | null; geojson: string }>(sql`
    SELECT id, name, kind, effective_entry_year, licence, verification_status, source_document_id, ST_AsGeoJSON(geometry::geometry, 6) AS geojson
    FROM catchment_boundaries WHERE school_id = ${schoolId} ORDER BY effective_entry_year DESC
  `);
}

export async function getDocuments(schoolId: number) {
  return db()
    .select({ doc: schema.sourceDocuments, source: schema.sources })
    .from(schema.sourceDocuments)
    .innerJoin(schema.sources, eq(schema.sources.id, schema.sourceDocuments.sourceId))
    .where(eq(schema.sourceDocuments.schoolId, schoolId))
    .orderBy(desc(schema.sourceDocuments.retrievedAt));
}

/** Nearby selective schools (by school location, not a family's address). */
export async function getNearbySchools(schoolId: number, limit = 6) {
  const rows = await db().execute<{ slug: string; name: string; town: string | null; gender: string; miles: number }>(sql`
    SELECT s.slug, s.name, l.town, s.gender, ST_Distance(l.location, me.location) / 1609.344 AS miles
    FROM school_locations me
    JOIN school_locations l ON l.school_id <> me.school_id AND l.location IS NOT NULL
    JOIN schools s ON s.id = l.school_id AND s.is_open AND s.selectivity <> 'non_selective'
    WHERE me.school_id = ${schoolId} AND me.location IS NOT NULL
    ORDER BY l.location <-> me.location
    LIMIT ${limit}
  `);
  return rows.map((r) => ({ ...r, miles: Number(r.miles) }));
}
