import "server-only";
import { randomBytes } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { CATCHMENT_LABEL, EIF_GRADE, FRAMEWORK_LABEL, GENDER_LABEL, OUT_OF_AREA_LABEL, SELECTIVITY_LABEL } from "@/domain/labels";
import { formatMeasure, MEASURES, type MeasureKey } from "@/domain/measures";
import { formatNumber } from "@/lib/format";
import { getAllocations, getComparators, getEntranceTests, getInspections, getPolicies, getResults, getSchoolCore, policyForYear } from "./profile";
import { latestByFramework, latestPublished, measureRows } from "./profile-view";

export const COMPARE_GROUPS = {
  basics: "School basics",
  admissions: "Admissions",
  results: "Results",
  inspection: "Inspection",
  demand: "Applications and offers",
} as const;

export type CompareGroup = keyof typeof COMPARE_GROUPS;

export function parseGroups(dims?: string): CompareGroup[] {
  const all = Object.keys(COMPARE_GROUPS) as CompareGroup[];
  const picked = (dims ?? "").split(",").filter((d): d is CompareGroup => all.includes(d as CompareGroup));
  return picked.length ? picked : all;
}

export interface CompareRow {
  group: CompareGroup;
  label: string;
  values: string[];
  /** Values differ in a way that matters (not just "—" vs a value). */
  differs: boolean;
  note?: string;
}

export interface CompareSchool {
  slug: string;
  name: string;
  town: string | null;
  la: string | null;
  nation: string;
}

export async function loadComparison(slugs: string[], entryYear: number) {
  const unique = [...new Set(slugs)].slice(0, 5);
  const loaded = (await Promise.all(unique.map((s) => getSchoolCore(s)))).filter((c): c is NonNullable<typeof c> => !!c);
  const data = await Promise.all(
    loaded.map(async (core) => {
      const [policies, tests, results, comparators, inspections, allocations] = await Promise.all([
        getPolicies(core.school.id),
        getEntranceTests(core.school.id, entryYear),
        getResults(core.school.id),
        getComparators(core.la?.code),
        getInspections(core.school.id),
        getAllocations(core.school.id),
      ]);
      return { core, policy: policyForYear(policies, entryYear), tests, results, comparators, inspections, allocations };
    }),
  );

  const schools: CompareSchool[] = data.map((d) => ({ slug: d.core.school.slug, name: d.core.school.name, town: d.core.location?.town ?? null, la: d.core.la?.name ?? null, nation: d.core.school.nation }));
  const rows: CompareRow[] = [];
  const add = (group: CompareGroup, label: string, values: string[], note?: string) => {
    const real = values.filter((v) => v !== "—" && !v.startsWith("Not "));
    rows.push({ group, label, values, differs: new Set(real).size > 1, note });
  };

  add("basics", "Location", data.map((d) => [d.core.location?.town, d.core.la?.name].filter(Boolean).join(", ") || "—"));
  add("basics", "Type", data.map((d) => SELECTIVITY_LABEL[d.core.school.selectivity] ?? "—"));
  add("basics", "Pupils admitted", data.map((d) => GENDER_LABEL[d.core.school.gender] ?? "—"));
  add("basics", "Sixth form", data.map((d) => (d.core.school.hasSixthForm === null ? "Not recorded" : d.core.school.hasSixthForm ? "Yes" : "No")));
  add("basics", "Boarding", data.map((d) => (d.core.school.boarding === "boarding" ? "Yes" : d.core.school.boarding === "none" ? "No" : "Not recorded")));
  add("basics", "Pupils on roll", data.map((d) => (d.core.census?.pupils ? formatNumber(d.core.census.pupils) : "—")));
  add("basics", "Capacity", data.map((d) => (d.core.census?.capacity ? formatNumber(d.core.census.capacity) : "—")));

  const testNames = data.map((d) => d.tests[0]?.test.name ?? "Not recorded");
  const distinctTests = new Set(testNames.filter((t) => t !== "Not recorded"));
  add("admissions", "Entrance test", testNames, distinctTests.size > 1 ? "These schools use different tests, so a score in one cannot be compared with, or used for, the other." : undefined);
  add("admissions", "Admissions rules held", data.map((d) => (d.policy ? (d.policy.status === "published" ? "Verified" : "Awaiting verification") : `Not held for ${entryYear}`)));
  add("admissions", "Qualifying score", data.map((d) => {
    const r = d.policy?.scoreRules.find((x) => x.kind === "qualifying_threshold");
    return r?.scoreValue != null ? `${r.scoreValue} (${r.scoreScale ?? "test score"})` : "—";
  }), distinctTests.size > 1 ? "Qualifying scores are on each test's own scale." : undefined);
  add("admissions", "Published admission number", data.map((d) => (d.policy?.publishedAdmissionNumber ? String(d.policy.publishedAdmissionNumber) : "—")));
  add("admissions", "Catchment", data.map((d) => (d.policy ? CATCHMENT_LABEL[d.policy.catchmentType]! : "—")));
  add("admissions", "Out-of-area applicants", data.map((d) => (d.policy ? OUT_OF_AREA_LABEL[d.policy.outOfAreaRoute]! : "—")));
  add("admissions", "Pupil Premium priority", data.map((d) => (d.policy ? (d.policy.criteria.some((c) => c.category === "pupil_premium") ? "Yes" : "No") : "—")));
  add("admissions", "Sibling priority", data.map((d) => (d.policy ? (d.policy.criteria.some((c) => c.category === "sibling") ? "Yes" : "No") : "—")));
  add("admissions", "Tie-break", data.map((d) => d.policy?.tieBreak ?? "—"));

  const measures: MeasureKey[] = ["ks4_attainment8", "ks4_engmath_95_pct", "ks4_engmath_97_pct", "ks5_alevel_aps_per_entry", "ks5_alevel_aab_pct"];
  for (const m of measures) {
    const latest = data.map((d) => latestPublished(measureRows(d.results, d.comparators, m, d.core.la?.code)));
    const years = new Set(latest.filter(Boolean).map((l) => l!.year));
    add(
      "results",
      MEASURES[m].label,
      latest.map((l) => (l ? `${formatMeasure(MEASURES[m], l.value)}${l.valueText ? ` (${l.valueText})` : ""} · ${l.year}` : "Not published")),
      years.size > 1 ? "Latest figures are from different years; compare like with like on each school's results page." : undefined,
    );
  }

  const insp = data.map((d) => latestByFramework(d.inspections)[0] ?? null);
  const frameworks = new Set(insp.filter(Boolean).map((i) => i!.framework));
  add(
    "inspection",
    "Latest inspection",
    insp.map((i) => {
      if (!i) return "Not recorded";
      if (i.framework === "report_card_2025") return `Report card, ${i.startDate}: ${i.evaluations.map((e) => e.grade).filter((g, idx, a) => a.indexOf(g) === idx).join(" / ")}`;
      if (i.framework === "eif_2019") return `Graded, ${i.startDate}: ${i.overallEffectiveness ? EIF_GRADE[String(i.overallEffectiveness)] : "—"}`;
      return `${FRAMEWORK_LABEL[i.framework]?.split(" (")[0]}, ${i.startDate}: ${i.outcome ?? "—"}`;
    }),
    frameworks.size > 1 ? "These inspections were carried out under different frameworks and are not directly comparable." : undefined,
  );

  const latestYear = Math.max(0, ...data.flatMap((d) => d.allocations.map((a) => a.entryYear)));
  const alloc = (d: (typeof data)[number], m: string) => d.allocations.find((a) => a.entryYear === latestYear && a.metric === m)?.value ?? null;
  if (latestYear) {
    add("demand", `Named as first preference (${latestYear})`, data.map((d) => (alloc(d, "times_first_preference") !== null ? formatNumber(alloc(d, "times_first_preference")) : "—")));
    add("demand", `Offers made (${latestYear})`, data.map((d) => (alloc(d, "offers_made") !== null ? formatNumber(alloc(d, "offers_made")) : "—")));
    add("demand", `Offers to families in other LAs (${latestYear})`, data.map((d) => (alloc(d, "offers_to_other_la") !== null ? formatNumber(alloc(d, "offers_to_other_la")) : "—")));
  }
  return { schools, rows, entryYear };
}

/** Persist a comparison and return a short stable slug. Identical sets reuse the same slug. */
export async function saveComparison(slugs: string[], entryYear: number, userId?: number | null): Promise<string | null> {
  const unique = [...new Set(slugs)].slice(0, 5);
  const rows = await db().select({ id: schema.schools.id, slug: schema.schools.slug }).from(schema.schools).where(inArray(schema.schools.slug, unique));
  if (rows.length < 2) return null;
  const ids = unique.map((s) => rows.find((r) => r.slug === s)?.id).filter((i): i is number => !!i);
  const existing = await db().query.comparisons.findMany({ where: eq(schema.comparisons.entryYear, entryYear) });
  const match = existing.find((c) => c.schoolIds.length === ids.length && c.schoolIds.every((v, i) => v === ids[i]));
  if (match) return match.slug;
  const slug = randomBytes(6).toString("base64url").toLowerCase().replace(/[^a-z0-9]/g, "x");
  await db().insert(schema.comparisons).values({ slug, schoolIds: ids, entryYear, userId: userId ?? null });
  return slug;
}

export async function loadSavedComparison(slug: string) {
  const c = await db().query.comparisons.findFirst({ where: eq(schema.comparisons.slug, slug) });
  if (!c) return null;
  const schools = await db().select({ id: schema.schools.id, slug: schema.schools.slug }).from(schema.schools).where(inArray(schema.schools.id, c.schoolIds));
  return { slugs: c.schoolIds.map((id) => schools.find((s) => s.id === id)?.slug).filter((s): s is string => !!s), entryYear: c.entryYear };
}
