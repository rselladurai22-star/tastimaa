import "server-only";
import { cache } from "react";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { regionsWithCounts, upcomingEvents } from "./insights";

export interface NavData {
  regions: { slug: string; name: string; n: number }[];
  ni: number;
  tests: { slug: string; name: string; nation: string; schools: number; status: string }[];
  dates: { id: number; title: string; startsOn: string; status: string; nation: string }[];
}

/** Live figures for the navigation panels. One round trip per request, shared across the page. */
export const navData = cache(async (): Promise<NavData> => {
  try {
    const [regions, tests, events, ni] = await Promise.all([
      regionsWithCounts(),
      db().execute<{ slug: string; name: string; nation: string; schools: number; status: string }>(sql`
        SELECT t.slug, t.name, t.nation, t.verification_status AS status,
          (SELECT count(DISTINCT st.school_id)::int FROM school_entrance_tests st WHERE st.test_id = t.id) AS schools
        FROM entrance_tests t ORDER BY schools DESC, t.name`),
      upcomingEvents(3),
      db().execute<{ n: number }>(sql`SELECT count(*)::int AS n FROM schools WHERE nation = 'northern_ireland' AND is_open AND selectivity <> 'non_selective'`),
    ]);
    return {
      regions: regions.map((r) => ({ slug: r.slug, name: r.name, n: r.n })),
      ni: ni[0]?.n ?? 0,
      tests: [...tests],
      dates: events.map((e) => ({ id: e.id, title: e.title, startsOn: e.starts_on, status: e.verification_status, nation: e.nation })),
    };
  } catch {
    // The header must render even if the database is briefly unavailable.
    return { regions: [], ni: 0, tests: [], dates: [] };
  }
});
