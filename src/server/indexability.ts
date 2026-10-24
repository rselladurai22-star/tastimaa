import "server-only";
import { cache } from "react";
import { sql } from "drizzle-orm";
import { db } from "@/db";

export type ProfileFlags = {
  slug: string;
  nation: string;
  hasPolicy: boolean;
  hasTest: boolean;
  hasResults: boolean;
  hasInspections: boolean;
  hasAllocations: boolean;
  updatedAt: string;
};

/**
 * Which profile tabs have enough distinct, sourced content to deserve indexing.
 * Thin tabs stay useful to visitors but are excluded from sitemaps and marked noindex.
 */
export const profileFlags = cache(async (slug?: string): Promise<ProfileFlags[]> => {
  const rows = await db().execute<ProfileFlags & { updated_at: string }>(sql`
    SELECT s.slug, s.nation,
      EXISTS (SELECT 1 FROM admission_policies p WHERE p.school_id = s.id AND p.status IN ('published','awaiting_verification')) AS "hasPolicy",
      EXISTS (SELECT 1 FROM school_entrance_tests t WHERE t.school_id = s.id) AS "hasTest",
      EXISTS (SELECT 1 FROM academic_results r WHERE r.school_id = s.id AND r.value IS NOT NULL) AS "hasResults",
      EXISTS (SELECT 1 FROM inspections i WHERE i.school_id = s.id) AS "hasInspections",
      EXISTS (SELECT 1 FROM historical_allocations h WHERE h.school_id = s.id AND h.value IS NOT NULL) AS "hasAllocations",
      greatest(s.updated_at, s.last_checked_at) AS updated_at
    FROM schools s
    WHERE s.is_open AND s.selectivity <> 'non_selective' ${slug ? sql`AND s.slug = ${slug}` : sql``}
  `);
  return rows.map((r) => ({ ...r, updatedAt: new Date(r.updated_at).toISOString() }));
});

export async function tabIndexable(slug: string, tab: "admissions" | "11-plus" | "catchment" | "results" | "inspection" | "historical-admissions"): Promise<boolean> {
  const [f] = await profileFlags(slug);
  if (!f) return false;
  switch (tab) {
    case "admissions":
    case "catchment":
      return f.hasPolicy;
    case "11-plus":
      return f.hasTest;
    case "results":
      return f.hasResults;
    case "inspection":
      return f.hasInspections;
    case "historical-admissions":
      return f.hasAllocations;
  }
}
