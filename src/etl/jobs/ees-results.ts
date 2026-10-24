import { sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { MEASURES, type MeasureKey } from "@/domain/measures";
import { parseCsv } from "../csv";
import { academicYearLabel, csvUrl, downloadCsv, getDataSet, getMeta, parseValue, query, resolveFilterOptions, resolveIndicators } from "../ees";
import { runJob, type JobContext } from "../runner";
import { identifierMap } from "../school-store";

/** Stable EES data set ids (they persist across new versions of the data). */
export const EES_DATASETS = {
  ks4Schools: "19e39901-a96c-be76-b9c2-6af54ae076d2",
  ks4NationalBySchoolType: "18e39901-7fe3-8372-8b2b-33f7ae1e1d12",
  ks4GeographyBySchoolType: "18e39901-b47f-4a75-9c4b-d529e590d916",
  ks5Schools: "019c2960-81e3-70c2-8d65-72c3718ae4fd",
} as const;

type ResultRow = typeof schema.academicResults.$inferInsert;
type AreaRow = typeof schema.areaResults.$inferInsert;

async function upsertResults(rows: ResultRow[]) {
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    await db()
      .insert(schema.academicResults)
      .values(chunk)
      .onConflictDoUpdate({
        target: [schema.academicResults.schoolId, schema.academicResults.measure, schema.academicResults.academicYear, schema.academicResults.breakdown],
        set: {
          value: sql`excluded.value`,
          valueText: sql`excluded.value_text`,
          statusCode: sql`excluded.status_code`,
          cohort: sql`excluded.cohort`,
          dataVersion: sql`excluded.data_version`,
          sourceDocumentId: sql`excluded.source_document_id`,
          sourceLocator: sql`excluded.source_locator`,
          lastCheckedAt: sql`excluded.last_checked_at`,
          updatedAt: new Date(),
        },
      });
  }
}

async function upsertAreaResults(rows: AreaRow[]) {
  for (let i = 0; i < rows.length; i += 500) {
    await db()
      .insert(schema.areaResults)
      .values(rows.slice(i, i + 500))
      .onConflictDoUpdate({
        target: [schema.areaResults.areaCode, schema.areaResults.measure, schema.areaResults.academicYear, schema.areaResults.population],
        set: {
          value: sql`excluded.value`,
          valueText: sql`excluded.value_text`,
          statusCode: sql`excluded.status_code`,
          dataVersion: sql`excluded.data_version`,
          sourceDocumentId: sql`excluded.source_document_id`,
          lastCheckedAt: sql`excluded.last_checked_at`,
        },
      });
  }
}

const KS4_MEASURES: MeasureKey[] = [
  "ks4_pupils",
  "ks4_attainment8",
  "ks4_engmath_94_pct",
  "ks4_engmath_95_pct",
  "ks4_engmath_97_pct",
  "ks4_progress8",
  "ks4_progress8_lower_ci",
  "ks4_progress8_upper_ci",
  "ks4_triple_science_pct",
];

export async function importKs4(ctx: JobContext) {
  const id = EES_DATASETS.ks4Schools;
  const info = await getDataSet(id);
  const body = await downloadCsv(id);
  const { documentId } = await ctx.recordDocument({
    title: `${info.title} (KS4 performance), version ${info.latestVersion.version}`,
    url: csvUrl(id),
    body,
    contentType: "text/csv",
    publishedAt: info.latestVersion.published.slice(0, 10),
    version: info.latestVersion.version,
    extension: "csv",
  });
  const urns = await identifierMap("urn");
  const columns = ["time_period", "geographic_level", "school_urn", "version", "breakdown_topic", "pupil_count", ...KS4_MEASURES.map((m) => MEASURES[m].column)];
  const rows = parseCsv(body.toString("utf8"), columns, (r) => r.geographic_level === "School" && r.breakdown_topic === "Total" && urns.has(r.school_urn ?? ""));
  ctx.counters.rowsRead = rows.length;
  const now = new Date();
  const out: ResultRow[] = [];
  for (const r of rows) {
    const schoolId = urns.get(r.school_urn!)!;
    const year = academicYearLabel(r.time_period!);
    const cohort = parseValue(r.pupil_count).value;
    for (const m of KS4_MEASURES) {
      const v = parseValue(r[MEASURES[m].column]);
      out.push({
        schoolId,
        measure: m,
        academicYear: year,
        value: v.value,
        valueText: v.text,
        statusCode: v.statusCode,
        cohort: cohort === null ? null : Math.round(cohort),
        dataVersion: r.version ?? null,
        sourceDocumentId: documentId,
        sourceLocator: `URN ${r.school_urn}, ${year}, breakdown Total`,
        verificationStatus: "officially_verified",
        confidence: "high",
        lastCheckedAt: now,
      });
    }
  }
  await upsertResults(out);
  ctx.counters.rowsInserted = out.length;
  ctx.stats.schoolsWithResults = new Set(rows.map((r) => r.school_urn)).size;

  await importKs4Comparators(ctx);
}

async function importKs4Comparators(ctx: JobContext) {
  const now = new Date();
  const cols = ["attainment8_average", "engmath_95_percent", "engmath_94_percent", "engmath_97_percent", "progress8_average"];
  const colToMeasure = Object.fromEntries(KS4_MEASURES.map((m) => [MEASURES[m].column, m]));
  const rows: AreaRow[] = [];

  // National: all state-funded mainstream schools and selective schools only.
  const natId = EES_DATASETS.ks4NationalBySchoolType;
  const [natInfo, natMeta] = await Promise.all([getDataSet(natId), getMeta(natId)]);
  const natDoc = await ctx.recordDocument({
    title: `${natInfo.title} (KS4), version ${natInfo.latestVersion.version}`,
    url: `https://api.education.gov.uk/statistics/v1/data-sets/${natId}`,
    body: Buffer.from(JSON.stringify(natInfo)),
    contentType: "application/json",
    publishedAt: natInfo.latestVersion.published.slice(0, 10),
    version: natInfo.latestVersion.version,
    extension: "json",
  });
  const natIndicators = resolveIndicators(natMeta, cols);
  const natFilters = resolveFilterOptions(natMeta, {
    school_admission_type: ["Selective schools", "Total"],
    establishment_type_group: ["State-funded mainstream"],
  });
  const admissionFilterId = Object.keys(natFilters)[0]!;
  const selectiveOptionId = natFilters[admissionFilterId]![0]!;
  for (const res of await query(natId, natMeta, { geographicLevel: "NAT", filterOptions: natFilters, indicatorIds: [...natIndicators.keys()] })) {
    const population = res.filters[admissionFilterId] === selectiveOptionId ? "selective_schools" : "state_funded_mainstream";
    for (const [indId, col] of natIndicators) {
      const v = parseValue(res.values[indId]);
      rows.push({ areaCode: "E92000001", areaLevel: "national", areaName: "England", measure: colToMeasure[col]!, academicYear: academicYearLabel(res.timePeriod.period), population, value: v.value, valueText: v.text, statusCode: v.statusCode, sourceDocumentId: natDoc.documentId, verificationStatus: "officially_verified", lastCheckedAt: now });
    }
  }

  // Local authorities (state-funded mainstream) for every LA where we hold a school.
  const geoId = EES_DATASETS.ks4GeographyBySchoolType;
  const [geoInfo, geoMeta] = await Promise.all([getDataSet(geoId), getMeta(geoId)]);
  const geoDoc = await ctx.recordDocument({
    title: `${geoInfo.title} (KS4), version ${geoInfo.latestVersion.version}`,
    url: `https://api.education.gov.uk/statistics/v1/data-sets/${geoId}`,
    body: Buffer.from(JSON.stringify(geoInfo)),
    contentType: "application/json",
    publishedAt: geoInfo.latestVersion.published.slice(0, 10),
    version: geoInfo.latestVersion.version,
    extension: "json",
  });
  const geoIndicators = resolveIndicators(geoMeta, cols);
  const laLocations = new Map((geoMeta.locations.find((l) => l.level.code === "LA")?.options ?? []).map((o) => [o.id, o]));
  for (const res of await query(geoId, geoMeta, {
    geographicLevel: "LA",
    filterOptions: resolveFilterOptions(geoMeta, { establishment_type_group: ["State-funded mainstream"] }),
    indicatorIds: [...geoIndicators.keys()],
  })) {
    const loc = laLocations.get(res.locations.LA ?? "");
    if (!loc?.code) continue;
    for (const [indId, col] of geoIndicators) {
      const v = parseValue(res.values[indId]);
      rows.push({ areaCode: loc.code, areaLevel: "local_authority", areaName: loc.label, measure: colToMeasure[col]!, academicYear: academicYearLabel(res.timePeriod.period), population: "state_funded_mainstream", value: v.value, valueText: v.text, statusCode: v.statusCode, sourceDocumentId: geoDoc.documentId, verificationStatus: "officially_verified", lastCheckedAt: now });
    }
  }
  await upsertAreaResults(rows);
  ctx.stats.comparatorRows = rows.length;
}

const KS5_MEASURES: { measure: MeasureKey; cohort: string; textColumn?: string }[] = [
  { measure: "ks5_alevel_students", cohort: "A level" },
  { measure: "ks5_alevel_aps_per_entry", cohort: "A level", textColumn: "aps_per_entry_grade" },
  { measure: "ks5_alevel_best3_aps", cohort: "A level", textColumn: "best_three_alevels_grade" },
  { measure: "ks5_alevel_aab_pct", cohort: "A level" },
  { measure: "ks5_alevel_value_added", cohort: "A level" },
  { measure: "ks5_retained_pct", cohort: "A level" },
];

export async function importKs5(ctx: JobContext) {
  const id = EES_DATASETS.ks5Schools;
  const info = await getDataSet(id);
  const body = await downloadCsv(id);
  const { documentId } = await ctx.recordDocument({
    title: `${info.title} (16 to 18 performance), version ${info.latestVersion.version}`,
    url: csvUrl(id),
    body,
    contentType: "text/csv",
    publishedAt: info.latestVersion.published.slice(0, 10),
    version: info.latestVersion.version,
    extension: "csv",
  });
  const urns = await identifierMap("urn");
  const rows = parseCsv(body.toString("utf8"), undefined, (r) => r.geographic_level === "School" && r.disadvantage_status === "Total" && r.exam_cohort === "A level" && urns.has(r.school_urn ?? ""));
  ctx.counters.rowsRead = rows.length;
  const now = new Date();
  const out: ResultRow[] = [];
  for (const r of rows) {
    const schoolId = urns.get(r.school_urn!)!;
    const year = academicYearLabel(r.time_period!);
    const cohort = parseValue(r.end1618_student_count).value;
    for (const m of KS5_MEASURES) {
      const v = parseValue(r[MEASURES[m.measure].column]);
      out.push({
        schoolId,
        measure: m.measure,
        academicYear: year,
        value: v.value,
        valueText: m.textColumn ? (r[m.textColumn] && !/^[a-z]$/.test(r[m.textColumn]!) ? r[m.textColumn]! : null) : v.text,
        statusCode: v.statusCode,
        cohort: cohort === null ? null : Math.round(cohort),
        dataVersion: r.version ?? null,
        sourceDocumentId: documentId,
        sourceLocator: `URN ${r.school_urn}, ${year}, exam cohort A level`,
        verificationStatus: "officially_verified",
        confidence: "high",
        lastCheckedAt: now,
      });
    }
  }
  await upsertResults(out);
  ctx.counters.rowsInserted = out.length;
  ctx.stats.schoolsWithResults = new Set(rows.map((r) => r.school_urn)).size;
}

export const runKs4 = (trigger?: string) => runJob("ees_ks4", "ees_ks4", importKs4, { trigger });
export const runKs5 = (trigger?: string) => runJob("ees_1618", "ees_1618", importKs5, { trigger });
