/**
 * Registry of the academic performance measures we publish. Each measure maps
 * to exactly one official DfE indicator; we never combine measures or derive
 * composite rankings.
 */
export type MeasureKey =
  | "ks4_pupils"
  | "ks4_attainment8"
  | "ks4_engmath_94_pct"
  | "ks4_engmath_95_pct"
  | "ks4_engmath_97_pct"
  | "ks4_progress8"
  | "ks4_progress8_lower_ci"
  | "ks4_progress8_upper_ci"
  | "ks4_triple_science_pct"
  | "ks5_alevel_students"
  | "ks5_alevel_aps_per_entry"
  | "ks5_alevel_best3_aps"
  | "ks5_alevel_aab_pct"
  | "ks5_alevel_value_added"
  | "ks5_retained_pct";

export interface MeasureDef {
  key: MeasureKey;
  stage: "ks4" | "ks5";
  label: string;
  short: string;
  unit: "score" | "percent" | "count" | "points" | "va";
  decimals: number;
  description: string;
  /** Show in headline tables and comparisons. */
  headline: boolean;
  /** Source indicator column in the EES data set. */
  column: string;
}

export const MEASURES: Record<MeasureKey, MeasureDef> = {
  ks4_pupils: { key: "ks4_pupils", stage: "ks4", label: "Pupils at the end of key stage 4", short: "KS4 cohort", unit: "count", decimals: 0, description: "Number of pupils at the end of Year 11 included in the results.", headline: false, column: "pupil_count" },
  ks4_attainment8: {
    key: "ks4_attainment8",
    stage: "ks4",
    label: "Average Attainment 8 score",
    short: "Attainment 8",
    unit: "score",
    decimals: 1,
    description: "Average of pupils' grades across eight GCSE-level qualifications, with English and maths double-weighted. Maximum 90.",
    headline: true,
    column: "attainment8_average",
  },
  ks4_engmath_95_pct: {
    key: "ks4_engmath_95_pct",
    stage: "ks4",
    label: "Grade 5 or above in English and maths GCSEs",
    short: "Eng & maths 5+",
    unit: "percent",
    decimals: 1,
    description: "Percentage of pupils achieving grade 5 or above in both English and maths GCSEs.",
    headline: true,
    column: "engmath_95_percent",
  },
  ks4_engmath_94_pct: { key: "ks4_engmath_94_pct", stage: "ks4", label: "Grade 4 or above in English and maths GCSEs", short: "Eng & maths 4+", unit: "percent", decimals: 1, description: "Percentage of pupils achieving grade 4 or above in both English and maths GCSEs.", headline: false, column: "engmath_94_percent" },
  ks4_engmath_97_pct: { key: "ks4_engmath_97_pct", stage: "ks4", label: "Grade 7 or above in English and maths GCSEs", short: "Eng & maths 7+", unit: "percent", decimals: 1, description: "Percentage of pupils achieving grade 7 or above in both English and maths GCSEs.", headline: true, column: "engmath_97_percent" },
  ks4_progress8: {
    key: "ks4_progress8",
    stage: "ks4",
    label: "Progress 8 score",
    short: "Progress 8",
    unit: "va",
    decimals: 2,
    description: "Progress pupils made from the end of primary school compared with pupils with similar starting points nationally. 0 is the national average.",
    headline: true,
    column: "progress8_average",
  },
  ks4_progress8_lower_ci: { key: "ks4_progress8_lower_ci", stage: "ks4", label: "Progress 8 lower 95% confidence limit", short: "P8 lower CI", unit: "va", decimals: 2, description: "Lower bound of the 95% confidence interval.", headline: false, column: "progress8_lower_95_ci" },
  ks4_progress8_upper_ci: { key: "ks4_progress8_upper_ci", stage: "ks4", label: "Progress 8 upper 95% confidence limit", short: "P8 upper CI", unit: "va", decimals: 2, description: "Upper bound of the 95% confidence interval.", headline: false, column: "progress8_upper_95_ci" },
  ks4_triple_science_pct: { key: "ks4_triple_science_pct", stage: "ks4", label: "Pupils entering biology, chemistry and physics", short: "Triple science entry", unit: "percent", decimals: 1, description: "Percentage of pupils entered for GCSEs in all three separate sciences.", headline: false, column: "sci_triple_entering_percent" },
  ks5_alevel_students: { key: "ks5_alevel_students", stage: "ks5", label: "A level students", short: "A level cohort", unit: "count", decimals: 0, description: "Students at the end of 16–18 study included in A level measures.", headline: false, column: "end1618_student_count" },
  ks5_alevel_aps_per_entry: {
    key: "ks5_alevel_aps_per_entry",
    stage: "ks5",
    label: "A level average point score per entry",
    short: "A level APS/entry",
    unit: "points",
    decimals: 2,
    description: "Average points per A level entry (A* = 60, A = 50, B = 40, C = 30, D = 20, E = 10). The equivalent grade is shown alongside.",
    headline: true,
    column: "aps_per_entry",
  },
  ks5_alevel_best3_aps: { key: "ks5_alevel_best3_aps", stage: "ks5", label: "Best three A levels average point score", short: "Best 3 A levels", unit: "points", decimals: 2, description: "Average points across each student's best three A levels.", headline: false, column: "best_three_alevels_aps" },
  ks5_alevel_aab_pct: { key: "ks5_alevel_aab_pct", stage: "ks5", label: "Students achieving AAB or better (2+ facilitating subjects)", short: "AAB+", unit: "percent", decimals: 1, description: "Percentage of A level students achieving grades AAB or better, at least two in facilitating subjects.", headline: true, column: "aab_percent" },
  ks5_alevel_value_added: { key: "ks5_alevel_value_added", stage: "ks5", label: "A level value added", short: "A level VA", unit: "va", decimals: 2, description: "Progress students made compared with similar students nationally. 0 is the national average.", headline: false, column: "value_added" },
  ks5_retained_pct: { key: "ks5_retained_pct", stage: "ks5", label: "Students retained to the end of their main study", short: "Retention", unit: "percent", decimals: 1, description: "Percentage of students who completed their main programme of study.", headline: false, column: "retained_percent" },
};

/** Explanations of the publisher symbols used when no value is published. */
export const STATUS_CODES: Record<string, string> = {
  z: "Not applicable — DfE does not publish this measure for this school or year.",
  c: "Suppressed by DfE to protect confidentiality (small numbers).",
  x: "Not available.",
  low: "Rounds to zero but is not zero.",
  u: "Low reliability.",
  missing: "No figure was published.",
};

/**
 * Editorial notes on comparability, keyed by measure and academic year. These
 * are shown next to the figures, never silently applied.
 */
export const MEASURE_YEAR_NOTES: Partial<Record<MeasureKey, Record<string, string>>> = {
  ks4_progress8: {
    "2024/25": "Progress 8 needs key stage 2 results. Pupils finishing Year 11 in 2025 had no KS2 tests in 2020 (cancelled during the pandemic), so DfE did not publish Progress 8 for this year.",
    "2025/26": "Pupils finishing Year 11 in 2026 had no KS2 tests in 2021 (cancelled during the pandemic), so DfE did not publish Progress 8 for this year.",
  },
};

export function formatMeasure(def: MeasureDef, value: number | null): string {
  if (value === null || value === undefined) return "—";
  const fixed = value.toFixed(def.decimals);
  if (def.unit === "percent") return `${fixed}%`;
  if (def.unit === "va" && value > 0) return `+${fixed}`;
  return fixed;
}
