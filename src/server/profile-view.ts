import "server-only";
import { MEASURES, MEASURE_YEAR_NOTES, type MeasureKey } from "@/domain/measures";
import type { getComparators, getInspections, getResults } from "./profile";

type Results = Awaited<ReturnType<typeof getResults>>;
type Comparators = Awaited<ReturnType<typeof getComparators>>;

export interface MeasureRow {
  year: string;
  value: number | null;
  valueText: string | null;
  statusCode: string | null;
  dataVersion: string | null;
  cohort: number | null;
  la: number | null;
  nationalAll: number | null;
  nationalSelective: number | null;
  note: string | null;
  sourceDocumentId: number | null;
  sourceLocator: string | null;
}

export function measureRows(results: Results, comparators: Comparators, measure: MeasureKey, laCode: string | null | undefined): MeasureRow[] {
  const rows = results.filter((r) => r.measure === measure);
  const years = [...new Set(rows.map((r) => r.academicYear))].sort();
  return years.map((year) => {
    const r = rows.find((x) => x.academicYear === year)!;
    const cmp = (code: string, population: string) => comparators.find((c) => c.areaCode === code && c.measure === measure && c.academicYear === year && c.population === population)?.value ?? null;
    return {
      year,
      value: r.value,
      valueText: r.valueText,
      statusCode: r.statusCode,
      dataVersion: r.dataVersion,
      cohort: r.cohort,
      la: laCode ? cmp(laCode, "state_funded_mainstream") : null,
      nationalAll: cmp("E92000001", "state_funded_mainstream"),
      nationalSelective: cmp("E92000001", "selective_schools"),
      note: MEASURE_YEAR_NOTES[measure]?.[year] ?? null,
      sourceDocumentId: r.sourceDocumentId,
      sourceLocator: r.sourceLocator,
    };
  });
}

export function latestPublished(rows: MeasureRow[]): MeasureRow | null {
  for (let i = rows.length - 1; i >= 0; i--) if (rows[i]!.value !== null) return rows[i]!;
  return null;
}

export const KS4_HEADLINE: MeasureKey[] = ["ks4_attainment8", "ks4_engmath_95_pct", "ks4_engmath_97_pct", "ks4_progress8"];
export const KS5_HEADLINE: MeasureKey[] = ["ks5_alevel_aps_per_entry", "ks5_alevel_aab_pct", "ks5_alevel_best3_aps", "ks5_alevel_value_added"];

export function measureDef(m: MeasureKey) {
  return MEASURES[m];
}

type Inspections = Awaited<ReturnType<typeof getInspections>>;

/** The latest inspection under each framework, newest framework first. Frameworks are never merged. */
export function latestByFramework(inspections: Inspections) {
  const order = ["report_card_2025", "eif_2019", "eif_2019_ungraded", "pre_2019"];
  const out: Inspections = [];
  for (const f of order) {
    const i = inspections.filter((x) => x.framework === f).sort((a, b) => String(b.startDate).localeCompare(String(a.startDate)))[0];
    if (i) out.push(i);
  }
  return out;
}
