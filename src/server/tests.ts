import "server-only";
import { asc, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";

export async function listTests() {
  const rows = await db().execute<{ id: number; slug: string; name: string; nation: string; area_description: string | null; summary: string | null; verification_status: string; provider_name: string | null; provider_slug: string | null; schools: number }>(sql`
    SELECT t.id, t.slug, t.name, t.nation, t.area_description, t.summary, t.verification_status, p.name AS provider_name, p.slug AS provider_slug,
      (SELECT count(DISTINCT school_id)::int FROM school_entrance_tests st WHERE st.test_id = t.id) AS schools
    FROM entrance_tests t LEFT JOIN test_providers p ON p.id = t.provider_id ORDER BY t.nation, t.name
  `);
  return [...rows];
}

export async function getTest(slug: string) {
  const test = await db().query.entranceTests.findFirst({ where: eq(schema.entranceTests.slug, slug) });
  if (!test) return null;
  const provider = test.providerId ? await db().query.testProviders.findFirst({ where: eq(schema.testProviders.id, test.providerId) }) : null;
  const schools = await db().execute<{ slug: string; name: string; town: string | null; gender: string; entry_year: number; verification_status: string }>(sql`
    SELECT DISTINCT ON (s.id) s.slug, s.name, l.town, s.gender, st.entry_year, st.verification_status
    FROM school_entrance_tests st JOIN schools s ON s.id = st.school_id LEFT JOIN school_locations l ON l.school_id = s.id
    WHERE st.test_id = ${test.id} ORDER BY s.id, st.entry_year
  `);
  const events = await db()
    .select({ e: schema.admissionEvents, c: schema.admissionCycles })
    .from(schema.admissionEvents)
    .innerJoin(schema.admissionCycles, eq(schema.admissionCycles.id, schema.admissionEvents.cycleId))
    .where(eq(schema.admissionEvents.testId, test.id))
    .orderBy(asc(schema.admissionEvents.startsOn));
  return { test, provider, schools: [...schools].sort((a, b) => a.name.localeCompare(b.name)), events };
}

export async function listProviders() {
  return db().select().from(schema.testProviders).orderBy(asc(schema.testProviders.name));
}
