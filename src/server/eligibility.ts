import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { assess, type Assessment, type FamilyInput, type PolicyInput } from "@/domain/eligibility";
import { checkCatchment } from "./catchment";
import { getEntranceTests, getPolicies, getSchoolCore, policyForYear } from "./profile";

/** A question the checker needs answered, derived from the selected schools' rules. */
export type Question =
  | { kind: "childSex" }
  | { kind: "test"; testSlug: string; testName: string; schools: string[] }
  | { kind: "lookedAfter" }
  | { kind: "pupilPremium" }
  | { kind: "medicalSocial" }
  | { kind: "sibling"; school: string; schoolName: string }
  | { kind: "staffChild"; school: string; schoolName: string }
  | { kind: "catchment"; school: string; schoolName: string; hasVerifiedBoundary: boolean };

export interface CheckerSchool {
  slug: string;
  name: string;
  nation: "england" | "northern_ireland";
  gender: PolicyInput["gender"];
  policy: PolicyInput | null;
  policySource: { title: string; url: string } | null;
  /** The school's entrance test for the year, known even when no policy is held. */
  test: { slug: string; name: string } | null;
}

function usesCondition(cond: unknown, key: string): boolean {
  if (!cond || typeof cond !== "object") return false;
  for (const [k, v] of Object.entries(cond as Record<string, unknown>)) {
    if (k === key) return true;
    if (k === "anyOf" && Array.isArray(v) && v.some((c) => usesCondition(c, key))) return true;
  }
  return false;
}

export async function loadCheckerSchools(slugs: string[], entryYear: number): Promise<CheckerSchool[]> {
  const out: CheckerSchool[] = [];
  for (const slug of [...new Set(slugs)].slice(0, 5)) {
    const core = await getSchoolCore(slug);
    if (!core || core.school.selectivity === "non_selective") continue;
    const [policies, tests] = await Promise.all([getPolicies(core.school.id), getEntranceTests(core.school.id, entryYear)]);
    const p = policyForYear(policies, entryYear);
    const test = tests[0]?.test ?? null;
    let policy: PolicyInput | null = null;
    let policySource: CheckerSchool["policySource"] = null;
    if (p) {
      const [doc] = p.sourceDocumentId ? await db().select().from(schema.sourceDocuments).where(inArray(schema.sourceDocuments.id, [p.sourceDocumentId])) : [];
      const boundaries = await db()
        .select({ id: schema.catchmentBoundaries.id })
        .from(schema.catchmentBoundaries)
        .where(and(eq(schema.catchmentBoundaries.schoolId, core.school.id), eq(schema.catchmentBoundaries.effectiveEntryYear, entryYear), eq(schema.catchmentBoundaries.verificationStatus, "officially_verified")));
      policySource = doc ? { title: doc.title, url: doc.url } : null;
      const pt = p.testId ? (tests.find((t) => t.test.id === p.testId)?.test ?? test) : test;
      policy = {
        schoolSlug: slug,
        schoolName: core.school.name,
        nation: core.school.nation === "northern_ireland" ? "northern_ireland" : "england",
        gender: core.school.gender,
        entryYear: p.cycle.entryYear,
        status: p.status,
        verificationStatus: p.verificationStatus,
        sourceStatus: doc?.status ?? "active",
        sourceUrl: doc?.url ?? null,
        publishedAdmissionNumber: p.publishedAdmissionNumber,
        testSlug: pt?.slug ?? null,
        testName: pt?.name ?? null,
        catchmentType: p.catchmentType,
        hasVerifiedBoundary: boundaries.length > 0,
        scoreRules: p.scoreRules.map((r) => ({ kind: r.kind, appliesTo: r.appliesTo, scoreValue: r.scoreValue, scoreScale: r.scoreScale, description: r.description, locator: r.sourceLocator })),
        criteria: p.criteria.map((c) => ({ rank: c.rank, category: c.category, title: c.title, requiresQualification: c.requiresQualification, placesReserved: c.placesReserved, conditions: c.conditions ?? {}, locator: c.sourceLocator })),
      };
    }
    out.push({
      slug,
      name: core.school.name,
      nation: core.school.nation === "northern_ireland" ? "northern_ireland" : "england",
      gender: core.school.gender,
      policy,
      policySource,
      test: test ? { slug: test.slug, name: test.name } : null,
    });
  }
  return out;
}

/** Ask only what the selected schools' rules actually depend on. */
export function questionsFor(schools: CheckerSchool[]): Question[] {
  const q: Question[] = [];
  if (schools.some((s) => s.gender === "boys" || s.gender === "girls")) q.push({ kind: "childSex" });
  const tests = new Map<string, { name: string; schools: string[] }>();
  for (const s of schools) {
    const slug = s.policy?.testSlug ?? s.test?.slug;
    const name = s.policy?.testName ?? s.test?.name;
    if (slug && name) {
      const t = tests.get(slug) ?? { name, schools: [] };
      t.schools.push(s.name);
      tests.set(slug, t);
    }
  }
  for (const [slug, t] of tests) q.push({ kind: "test", testSlug: slug, testName: t.name, schools: t.schools });
  const all = schools.flatMap((s) => s.policy?.criteria ?? []);
  if (all.some((c) => usesCondition(c.conditions, "lookedAfter"))) q.push({ kind: "lookedAfter" });
  if (all.some((c) => usesCondition(c.conditions, "pupilPremium"))) q.push({ kind: "pupilPremium" });
  if (all.some((c) => usesCondition(c.conditions, "medicalSocial"))) q.push({ kind: "medicalSocial" });
  for (const s of schools) {
    const cs = s.policy?.criteria ?? [];
    if (cs.some((c) => usesCondition(c.conditions, "sibling"))) q.push({ kind: "sibling", school: s.slug, schoolName: s.name });
    if (cs.some((c) => usesCondition(c.conditions, "staffChild"))) q.push({ kind: "staffChild", school: s.slug, schoolName: s.name });
    if (cs.some((c) => usesCondition(c.conditions, "inCatchment"))) q.push({ kind: "catchment", school: s.slug, schoolName: s.name, hasVerifiedBoundary: !!s.policy?.hasVerifiedBoundary });
  }
  return q;
}

export interface CheckerAnswers {
  childSex?: "boy" | "girl" | null;
  tests?: Record<string, { status?: FamilyInput["testStatus"]; score?: number | null }>;
  lookedAfter?: FamilyInput["lookedAfter"];
  pupilPremium?: boolean | null;
  medicalSocial?: boolean | null;
  sibling?: Record<string, boolean | null>;
  staffChild?: Record<string, boolean | null>;
  catchment?: Record<string, boolean | null>;
  postcode?: string | null;
}

export async function runChecker(slugs: string[], entryYear: number, answers: CheckerAnswers) {
  const schools = await loadCheckerSchools(slugs, entryYear);
  const questions = questionsFor(schools);
  const catchment: FamilyInput["catchment"] = {};
  for (const [slug, v] of Object.entries(answers.catchment ?? {})) catchment[slug] = { value: v, source: "family_declared" };
  let postcodeNote: string | null = null;
  if (answers.postcode) {
    const r = await checkCatchment(answers.postcode, schools.map((s) => s.slug), entryYear);
    if (r.ok) {
      for (const s of r.result.schools) {
        if (s.boundary.status !== "no_verified_boundary") catchment[s.slug] = { value: s.boundary.status === "inside", source: "verified_boundary" };
      }
    } else postcodeNote = r.message;
  }
  const results: Assessment[] = schools.map((s) => {
    const testSlug = s.policy?.testSlug ?? s.test?.slug ?? null;
    const t = testSlug ? answers.tests?.[testSlug] : undefined;
    const family: FamilyInput = {
      entryYear,
      childSex: answers.childSex ?? null,
      testStatus: t?.status ?? null,
      score: t?.score != null && testSlug ? { value: t.score, testSlug } : null,
      lookedAfter: answers.lookedAfter ?? null,
      pupilPremium: answers.pupilPremium ?? null,
      medicalSocial: answers.medicalSocial ?? null,
      siblingAt: answers.sibling ?? {},
      staffChild: answers.staffChild ?? {},
      catchment,
    };
    return assess(s.policy, family, { slug: s.slug, name: s.name, nation: s.nation, gender: s.gender });
  });
  return { schools: schools.map((s) => ({ slug: s.slug, name: s.name, nation: s.nation, gender: s.gender, policySource: s.policySource, hasPolicy: !!s.policy })), questions, results, postcodeNote };
}
