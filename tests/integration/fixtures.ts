import { sql } from "drizzle-orm";
import { db, schema } from "@/db";

/**
 * Synthetic fixtures (clearly fictional names) that exercise the regression
 * scenarios: verified boundary, distance-only, conflicting sources, missing
 * year, Northern Ireland/SEAG and missing results.
 */
export async function seed() {
  await db().execute(sql`TRUNCATE schools, sources, geographic_areas, entrance_tests, test_providers, admission_cycles, admin_review_tasks, comparisons, rate_limits RESTART IDENTITY CASCADE`);
  const [src] = await db().insert(schema.sources).values({ key: "editorial", name: "Test source", publisher: "Test", homepageUrl: "https://example.org", licence: "Test", method: "manual_entry" }).returning();
  const [doc] = await db().insert(schema.sourceDocuments).values({ sourceId: src!.id, title: "Alpha admissions policy 2027", url: "https://example.org/alpha-2027.pdf", status: "active" }).returning();
  const [withdrawn] = await db().insert(schema.sourceDocuments).values({ sourceId: src!.id, title: "Epsilon policy (withdrawn)", url: "https://example.org/epsilon.pdf", status: "withdrawn" }).returning();
  const [england] = await db().insert(schema.geographicAreas).values({ slug: "england", name: "England", type: "nation", nation: "england" }).returning();
  const [la] = await db().insert(schema.geographicAreas).values({ slug: "testshire", name: "Testshire", type: "local_authority", nation: "england", code: "E10000099", parentId: england!.id }).returning();
  const [ea] = await db().insert(schema.geographicAreas).values({ slug: "education-authority-ni", name: "Education Authority (Northern Ireland)", type: "education_authority", nation: "northern_ireland" }).returning();

  const mk = async (slug: string, name: string, nation: "england" | "northern_ireland", gender: "boys" | "girls" | "mixed", lat: number, lng: number, extra: Partial<typeof schema.schools.$inferInsert> = {}) => {
    const [s] = await db()
      .insert(schema.schools)
      .values({ slug, name, nation, selectivity: "fully_selective", status: "Open", gender, localAuthorityId: nation === "england" ? la!.id : ea!.id, verificationStatus: "officially_verified", lastCheckedAt: new Date(), ...extra })
      .returning();
    await db().execute(sql`INSERT INTO school_locations (school_id, town, postcode, location, verification_status) VALUES (${s!.id}, 'Testtown', 'TT1 1AA', ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography, 'officially_verified')`);
    await db().insert(schema.schoolNames).values({ schoolId: s!.id, name, isCurrent: true });
    await db().insert(schema.schoolIdentifiers).values({ schoolId: s!.id, scheme: "urn", value: String(900000 + s!.id) });
    return s!;
  };
  const alpha = await mk("alpha-grammar-school", "Alpha Grammar School", "england", "boys", 51.5, -0.8);
  const beta = await mk("beta-high-school-for-girls", "Beta High School for Girls", "england", "girls", 51.52, -0.82);
  const gamma = await mk("gamma-grammar-school", "Gamma Grammar School", "england", "mixed", 51.6, -0.9);
  const delta = await mk("delta-college-belfast", "Delta College, Belfast", "northern_ireland", "mixed", 54.59, -5.93);
  const epsilon = await mk("epsilon-grammar-school", "Epsilon Grammar School", "england", "mixed", 51.7, -1.0);
  await db().insert(schema.schoolNames).values({ schoolId: gamma.id, name: "Old Gamma County School", isCurrent: false });

  const [prov] = await db().insert(schema.testProviders).values({ slug: "test-provider", name: "Test Provider" }).returning();
  const [alphaTest] = await db().insert(schema.entranceTests).values({ slug: "alpha-test", name: "Alpha Area Test", nation: "england", providerId: prov!.id, verificationStatus: "officially_verified" }).returning();
  const [seag] = await db().insert(schema.entranceTests).values({ slug: "seag", name: "SEAG Entrance Assessment", nation: "northern_ireland", verificationStatus: "awaiting_verification" }).returning();
  for (const s of [alpha, beta, epsilon]) await db().insert(schema.schoolEntranceTests).values({ schoolId: s.id, testId: alphaTest!.id, entryYear: 2027, verificationStatus: "officially_verified" });
  await db().insert(schema.schoolEntranceTests).values({ schoolId: delta.id, testId: seag!.id, entryYear: 2027, verificationStatus: "awaiting_verification" });

  const [c2026] = await db().insert(schema.admissionCycles).values({ nation: "england", entryYear: 2026, entryPoint: "year7", label: "Year 7 entry, September 2026" }).returning();
  const [c2027] = await db().insert(schema.admissionCycles).values({ nation: "england", entryYear: 2027, entryPoint: "year7", label: "Year 7 entry, September 2027" }).returning();

  const policy = async (schoolId: number, cycleId: number, extra: Partial<typeof schema.admissionPolicies.$inferInsert>, criteria: { rank: number; category: (typeof schema.criterionCategoryEnum.enumValues)[number]; title: string; conditions: Record<string, unknown>; requiresQualification?: boolean }[], threshold?: number) => {
    const [p] = await db().insert(schema.admissionPolicies).values({ schoolId, cycleId, status: "published", verificationStatus: "officially_verified", testId: alphaTest!.id, sourceDocumentId: doc!.id, ...extra }).returning();
    for (const c of criteria) await db().insert(schema.admissionCriteria).values({ policyId: p!.id, rank: c.rank, category: c.category, title: c.title, conditions: c.conditions, requiresQualification: c.requiresQualification ?? true, verificationStatus: "officially_verified" });
    if (threshold) await db().insert(schema.scoreRules).values({ policyId: p!.id, testId: alphaTest!.id, kind: "qualifying_threshold", appliesTo: "all", scoreValue: threshold, scoreScale: "Alpha score", description: `Qualifying score ${threshold}`, verificationStatus: "officially_verified" });
    return p!;
  };
  await policy(alpha.id, c2027!.id, { catchmentType: "defined_area", outOfAreaRoute: "yes", publishedAdmissionNumber: 180 }, [
    { rank: 1, category: "looked_after", title: "Looked after", conditions: { lookedAfter: true } },
    { rank: 2, category: "catchment_resident", title: "Catchment", conditions: { inCatchment: true } },
    { rank: 3, category: "sibling", title: "Siblings", conditions: { sibling: true } },
    { rank: 4, category: "other", title: "All other boys", conditions: {} },
  ], 121);
  await policy(beta.id, c2027!.id, { catchmentType: "distance_only", outOfAreaRoute: "limited", verificationStatus: "conflicting" }, [{ rank: 1, category: "distance", title: "Distance", conditions: {} }], 110);
  await policy(gamma.id, c2026!.id, { catchmentType: "none", outOfAreaRoute: "yes" }, [{ rank: 1, category: "score_rank", title: "Score order", conditions: {} }], 115);
  await policy(epsilon.id, c2027!.id, { catchmentType: "none", outOfAreaRoute: "yes", sourceDocumentId: withdrawn!.id }, [{ rank: 1, category: "other", title: "All qualified", conditions: {} }], 121);

  // Verified boundary: a small square around Alpha for 2027; an unverified one for Beta must be ignored.
  const square = (lat: number, lng: number, d: number) => `MULTIPOLYGON(((${lng - d} ${lat - d}, ${lng + d} ${lat - d}, ${lng + d} ${lat + d}, ${lng - d} ${lat + d}, ${lng - d} ${lat - d})))`;
  await db().execute(sql`INSERT INTO catchment_boundaries (school_id, name, kind, geometry, effective_entry_year, licence, verification_status) VALUES (${alpha.id}, 'Alpha catchment', 'official_catchment', ST_GeogFromText(${square(51.5, -0.8, 0.05)}), 2027, 'OGL v3', 'officially_verified')`);
  await db().execute(sql`INSERT INTO catchment_boundaries (school_id, name, kind, geometry, effective_entry_year, licence, verification_status) VALUES (${beta.id}, 'Beta draft area', 'priority_area', ST_GeogFromText(${square(51.52, -0.82, 0.05)}), 2027, 'Unknown', 'awaiting_verification')`);

  await db().insert(schema.academicResults).values([
    { schoolId: alpha.id, measure: "ks4_attainment8", academicYear: "2024/25", value: 70.1, dataVersion: "Final", verificationStatus: "officially_verified" },
    { schoolId: alpha.id, measure: "ks4_attainment8", academicYear: "2025/26", value: 71.2, dataVersion: "Provisional", verificationStatus: "officially_verified" },
    { schoolId: beta.id, measure: "ks4_attainment8", academicYear: "2025/26", value: 73.4, dataVersion: "Provisional", verificationStatus: "officially_verified" },
  ]);
  await db().insert(schema.historicalAllocations).values([
    { schoolId: alpha.id, entryYear: 2026, metric: "offers_made", value: 180, verificationStatus: "officially_verified" },
    { schoolId: alpha.id, entryYear: 2026, metric: "times_first_preference", value: 250, verificationStatus: "officially_verified" },
  ]);
  return { alpha, beta, gamma, delta, epsilon, doc: doc!, cycles: { c2026: c2026!, c2027: c2027! } };
}
