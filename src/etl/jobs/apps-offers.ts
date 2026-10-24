import { and, eq, sql } from "drizzle-orm";
import { strFromU8, unzipSync } from "fflate";
import { db, schema } from "@/db";
import { parseCsv } from "../csv";
import { parseValue } from "../ees";
import { fetchBuffer, fetchText } from "../http";
import { runJob, type JobContext } from "../runner";
import { identifierMap } from "../school-store";

const PUBLICATION = "https://explore-education-statistics.service.gov.uk/find-statistics/secondary-and-primary-school-applications-and-offers";
const CONTENT_API = "https://content.explore-education-statistics.service.gov.uk/api";

/**
 * Metrics taken from DfE's school-level applications and offers file. These
 * are counts reported by local authorities for the national offer day — they
 * are not lowest scores or last-offer distances.
 */
export const APPS_OFFERS_METRICS = {
  offers_made: { column: "total_number_places_offered", label: "Offers made on national offer day", unit: "count" },
  preferred_offers: { column: "number_preferred_offers", label: "Offers to families who named the school as a preference", unit: "count" },
  first_preference_offers: { column: "number_1st_preference_offers", label: "Offers to first-preference applicants", unit: "count" },
  times_any_preference: { column: "times_put_as_any_preferred_school", label: "Times named as any preference", unit: "count" },
  times_first_preference: { column: "times_put_as_1st_preference", label: "Times named as first preference", unit: "count" },
  applications_from_other_la: { column: "all_applications_from_another_LA", label: "Applications from families in another local authority", unit: "count" },
  offers_to_other_la: { column: "offers_to_applicants_from_another_LA", label: "Offers to families in another local authority", unit: "count" },
} as const;

export type AppsOffersMetric = keyof typeof APPS_OFFERS_METRICS;

/** Extract the current release version id from the publication page's embedded data. Exported for tests. */
export function extractReleaseVersionId(html: string): string | null {
  const m = /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/.exec(html);
  if (!m) return null;
  try {
    const data = JSON.parse(m[1]!) as { props?: { pageProps?: { releaseVersionSummary?: { id?: string } } } };
    return data.props?.pageProps?.releaseVersionSummary?.id ?? null;
  } catch {
    return null;
  }
}

/** "202627" (academic year of entry) → 2026 (September of entry). */
export function entryYearFromTimePeriod(tp: string): number | null {
  const m = /^(\d{4})/.exec(tp);
  return m ? Number(m[1]) : null;
}

export async function importAppsOffers(ctx: JobContext) {
  const html = await fetchText(PUBLICATION);
  const releaseId = extractReleaseVersionId(html);
  if (!releaseId) throw new Error("Could not determine the latest applications and offers release");
  const url = `${CONTENT_API}/releases/${releaseId}/files?fromPage=ReleaseDownloads`;
  const { body } = await fetchBuffer(url, { timeoutMs: 600_000 });
  const files = unzipSync(body);
  const name = Object.keys(files).find((f) => /school.?level/i.test(f) && f.endsWith(".csv"));
  if (!name) throw new Error("School-level file not found in the release bundle");
  const { documentId } = await ctx.recordDocument({
    title: `DfE secondary and primary school applications and offers — ${name.split("/").pop()}`,
    url,
    body,
    contentType: "application/zip",
    extension: "zip",
  });
  ctx.stats.file = name;

  const urns = await identifierMap("urn");
  const laestabs = await identifierMap("laestab");
  const columns = ["time_period", "school_phase", "school_urn", "school_laestab", "entry_year", ...Object.values(APPS_OFFERS_METRICS).map((m) => m.column)];
  const rows = parseCsv(strFromU8(files[name]!).replace(/^﻿/, ""), columns, (r) => r.school_phase === "Secondary" && (urns.has(r.school_urn ?? "") || laestabs.has(r.school_laestab ?? "")));
  ctx.counters.rowsRead = rows.length;
  const now = new Date();
  const out: (typeof schema.historicalAllocations.$inferInsert)[] = [];
  const isCurrent: boolean[] = [];
  const currentUrns = new Set(
    (await db().select({ value: schema.schoolIdentifiers.value }).from(schema.schoolIdentifiers).where(and(eq(schema.schoolIdentifiers.scheme, "urn"), eq(schema.schoolIdentifiers.isCurrent, true)))).map((r) => r.value),
  );
  for (const r of rows) {
    const schoolId = urns.get(r.school_urn ?? "") ?? laestabs.get(r.school_laestab ?? "");
    const entryYear = entryYearFromTimePeriod(r.time_period ?? "");
    if (!schoolId || !entryYear) {
      ctx.counters.rowsRejected++;
      continue;
    }
    for (const [metric, def] of Object.entries(APPS_OFFERS_METRICS)) {
      const v = parseValue(r[def.column]);
      out.push({
        schoolId,
        entryYear,
        round: "national_offer_day",
        category: "all",
        metric,
        value: v.value,
        unit: def.unit,
        statusCode: v.statusCode,
        sourceDocumentId: documentId,
        sourceLocator: `${name.split("/").pop()}, time_period ${r.time_period}, LAESTAB ${r.school_laestab}`,
        verificationStatus: "officially_verified",
        confidence: "high",
        lastCheckedAt: now,
      });
      isCurrent.push(currentUrns.has(r.school_urn ?? ""));
    }
  }
  // A school can appear twice in one year (e.g. predecessor and successor URNs in a
  // conversion year). Keep the row reported under the current identifier.
  const deduped = new Map<string, { row: (typeof out)[number]; current: boolean }>();
  for (const [i, row] of out.entries()) {
    const key = `${row.schoolId}:${row.entryYear}:${row.metric}`;
    const current = isCurrent[i] ?? false;
    const prev = deduped.get(key);
    if (!prev || (current && !prev.current)) deduped.set(key, { row, current });
  }
  if (deduped.size !== out.length) await ctx.issue("info", "duplicate_school_year", `${out.length - deduped.size} duplicate school-year metrics collapsed`);
  const unique = [...deduped.values()].map((d) => d.row);
  for (let i = 0; i < unique.length; i += 500) {
    await db()
      .insert(schema.historicalAllocations)
      .values(unique.slice(i, i + 500))
      .onConflictDoUpdate({
        target: [schema.historicalAllocations.schoolId, schema.historicalAllocations.entryYear, schema.historicalAllocations.round, schema.historicalAllocations.category, schema.historicalAllocations.metric],
        set: {
          value: sql`excluded.value`,
          statusCode: sql`excluded.status_code`,
          sourceDocumentId: sql`excluded.source_document_id`,
          sourceLocator: sql`excluded.source_locator`,
          lastCheckedAt: sql`excluded.last_checked_at`,
          updatedAt: new Date(),
        },
      });
  }
  ctx.counters.rowsInserted = unique.length;
}

export const runAppsOffers = (trigger?: string) => runJob("ees_apps_offers", "ees_apps_offers", importAppsOffers, { trigger });
