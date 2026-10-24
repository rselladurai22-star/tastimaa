import { describe, expect, it } from "vitest";
import { assess, type FamilyInput, type PolicyInput } from "@/domain/eligibility";

const school = { slug: "ags", name: "Aylesbury Grammar School", nation: "england" as const, gender: "boys" as const };

/** Mirrors the structure of Aylesbury Grammar School's 2027 policy. */
function policy(overrides: Partial<PolicyInput> = {}): PolicyInput {
  return {
    schoolSlug: "ags",
    schoolName: "Aylesbury Grammar School",
    nation: "england",
    gender: "boys",
    entryYear: 2027,
    status: "published",
    verificationStatus: "officially_verified",
    sourceStatus: "active",
    publishedAdmissionNumber: 186,
    testSlug: "bucks-stt",
    testName: "Buckinghamshire Secondary Transfer Test",
    catchmentType: "defined_area",
    hasVerifiedBoundary: false,
    scoreRules: [
      { kind: "qualifying_threshold", appliesTo: "all", scoreValue: 121, scoreScale: "STTS", description: "121 qualifies", locator: "p2" },
      { kind: "reserved_places_threshold", appliesTo: "pupil_premium_catchment_or_looked_after", scoreValue: 115, scoreScale: "STTS", description: "115-120", locator: "p3" },
    ],
    criteria: [
      { rank: 1, category: "looked_after", title: "Looked after", requiresQualification: true, placesReserved: null, conditions: { lookedAfter: true }, locator: "5.1.1" },
      { rank: 2, category: "pupil_premium", title: "Reserved PP 115-120", requiresQualification: false, placesReserved: 6, conditions: { scoreMin: 115, scoreMax: 120, anyOf: [{ lookedAfter: true }, { pupilPremium: true, inCatchment: true }] }, locator: "5.1.2" },
      { rank: 3, category: "pupil_premium", title: "Catchment PP", requiresQualification: true, placesReserved: null, conditions: { pupilPremium: true, inCatchment: true }, locator: "5.1.3" },
      { rank: 4, category: "sibling", title: "Sibling", requiresQualification: true, placesReserved: null, conditions: { sibling: true }, locator: "5.1.4" },
      { rank: 9, category: "catchment_resident", title: "Catchment", requiresQualification: true, placesReserved: null, conditions: { inCatchment: true }, locator: "5.1.9" },
      { rank: 10, category: "other", title: "All other boys", requiresQualification: true, placesReserved: null, conditions: {}, locator: "5.1.10" },
    ],
    ...overrides,
  };
}

const fam = (f: Partial<FamilyInput> = {}): FamilyInput => ({ entryYear: 2027, ...f });

describe("eligibility engine", () => {
  it("separates qualifying from receiving an offer (no probability, explicit wording)", () => {
    const a = assess(policy(), fam({ score: { value: 125, testSlug: "bucks-stt" }, lookedAfter: "no", pupilPremium: false, siblingAt: { ags: false }, catchment: { ags: { value: false, source: "verified_boundary" } } }), school);
    expect(a.academic.status).toBe("requirement_met");
    expect(a.academic.explanation).toMatch(/not an offer/);
    expect(a.bestCriterion?.rank).toBe(10);
    expect(a.overall).toBe("confirmed_rule_match");
    expect(a.outlook).toMatch(/do not estimate a probability/);
    expect(a.outlook).not.toMatch(/\d+%/);
  });

  it("scenario 1: school with no defined catchment has no catchment questions", () => {
    const p = policy({ catchmentType: "none", criteria: [{ rank: 1, category: "other", title: "All qualified", requiresQualification: true, placesReserved: null, conditions: {}, locator: null }] });
    const a = assess(p, fam({ score: { value: 130, testSlug: "bucks-stt" } }), school);
    expect(a.unknown.some((u) => u.includes("catchment"))).toBe(false);
    expect(a.overall).toBe("confirmed_rule_match");
  });

  it("scenario 2: verified boundary gives a confirmed catchment match", () => {
    const a = assess(policy(), fam({ score: { value: 121, testSlug: "bucks-stt" }, lookedAfter: "no", pupilPremium: false, siblingAt: { ags: false }, catchment: { ags: { value: true, source: "verified_boundary" } } }), school);
    expect(a.bestCriterion?.rank).toBe(9);
    expect(a.bestCriterion?.match).toBe("confirmed");
  });

  it("family-declared catchment is only a possible match", () => {
    const a = assess(policy(), fam({ score: { value: 121, testSlug: "bucks-stt" }, lookedAfter: "no", pupilPremium: false, siblingAt: { ags: false }, catchment: { ags: { value: true, source: "family_declared" } } }), school);
    expect(a.bestCriterion?.rank).toBe(9);
    expect(a.bestCriterion?.match).toBe("possible");
  });

  it("scenario 3: distance criteria never claim a rank", () => {
    const p = policy({ catchmentType: "distance_only", criteria: [{ rank: 1, category: "distance", title: "Distance", requiresQualification: true, placesReserved: null, conditions: {}, locator: null }] });
    const a = assess(p, fam({ score: { value: 130, testSlug: "bucks-stt" } }), school);
    expect(a.criteria[0]!.reasons.join(" ")).toMatch(/can't tell where your home would rank/);
  });

  it("scenario 4: multiple thresholds — reserved places for 115–120 Pupil Premium catchment", () => {
    const a = assess(policy(), fam({ score: { value: 117, testSlug: "bucks-stt" }, lookedAfter: "no", pupilPremium: true, catchment: { ags: { value: true, source: "verified_boundary" } } }), school);
    expect(a.academic.status).toBe("requirement_not_met");
    expect(a.bestCriterion?.rank).toBe(2);
    expect(a.criteria.find((c) => c.rank === 10)?.match).toBe("no_match");
  });

  it("below the reserved band does not match any criterion", () => {
    const a = assess(policy(), fam({ score: { value: 110, testSlug: "bucks-stt" }, lookedAfter: "no", pupilPremium: true, catchment: { ags: { value: true, source: "verified_boundary" } } }), school);
    expect(a.overall).toBe("rule_does_not_match");
    expect(a.outlook).toMatch(/not considered/);
  });

  it("scenario 5: out-of-area applicants who qualify match the lowest-priority criterion", () => {
    const a = assess(policy(), fam({ score: { value: 140, testSlug: "bucks-stt" }, lookedAfter: "no", pupilPremium: false, siblingAt: { ags: false }, catchment: { ags: { value: false, source: "verified_boundary" } } }), school);
    expect(a.bestCriterion?.title).toBe("All other boys");
  });

  it("scenario 6: never uses another year's policy", () => {
    const a = assess(policy({ entryYear: 2027 }), fam({ entryYear: 2028, score: { value: 130, testSlug: "bucks-stt" } }), school);
    expect(a.assessable).toBe(false);
    expect(a.warnings.map((w) => w.code)).toContain("no_policy_for_year");
  });

  it("scenario 8: conflicting sources block the assessment", () => {
    const a = assess(policy({ verificationStatus: "conflicting" }), fam({ score: { value: 130, testSlug: "bucks-stt" } }), school);
    expect(a.assessable).toBe(false);
    expect(a.warnings.map((w) => w.code)).toContain("conflicting_sources");
  });

  it("scenario 9: Northern Ireland school without a single threshold cannot be scored", () => {
    const ni = { slug: "methody", name: "Methodist College", nation: "northern_ireland" as const, gender: "mixed" as const };
    const p = policy({ schoolSlug: "methody", schoolName: "Methodist College", nation: "northern_ireland", gender: "mixed", testSlug: "seag", testName: "SEAG Entrance Assessment", scoreRules: [], criteria: [] });
    const a = assess(p, fam({ score: { value: 220, testSlug: "seag" } }), ni);
    expect(a.academic.status).toBe("cannot_determine");
    expect(a.academic.explanation).toMatch(/Northern Ireland/);
    expect(a.warnings.map((w) => w.code)).toContain("ni_process");
    expect(a.nextActions.join(" ")).toMatch(/Education Authority/);
    expect(a.nextActions.join(" ")).not.toMatch(/31 October/);
  });

  it("scenario 12: no child information gives questions, not a verdict", () => {
    const a = assess(policy(), fam(), school);
    expect(a.academic.status).toBe("not_assessed");
    expect(a.overall).toBe("insufficient_information");
    expect(a.unknown.length).toBeGreaterThan(0);
  });

  it("scenario 13: a score from an unrelated test is rejected", () => {
    const a = assess(policy(), fam({ score: { value: 121, testSlug: "kent-test" } }), school);
    expect(a.academic.status).toBe("cannot_determine");
    expect(a.warnings.map((w) => w.code)).toContain("score_from_other_test");
  });

  it("scenario 14: being close to the school is never treated as being in catchment", () => {
    // No catchment answer given: proximity alone must not produce a catchment match.
    const a = assess(policy(), fam({ score: { value: 125, testSlug: "bucks-stt" }, lookedAfter: "no", pupilPremium: false, siblingAt: { ags: false } }), school);
    expect(a.criteria.find((c) => c.rank === 9)?.match).toBe("insufficient_information");
  });

  it("scenario 15: withdrawn source caps matches to possible and warns", () => {
    const a = assess(policy({ sourceStatus: "withdrawn" }), fam({ score: { value: 140, testSlug: "bucks-stt" }, lookedAfter: "no", pupilPremium: false, siblingAt: { ags: false }, catchment: { ags: { value: false, source: "verified_boundary" } } }), school);
    expect(a.warnings.map((w) => w.code)).toContain("source_withdrawn");
    expect(a.bestCriterion?.match).toBe("possible");
  });

  it("unverified policies are labelled and capped to possible", () => {
    const a = assess(policy({ status: "awaiting_verification", verificationStatus: "awaiting_verification" }), fam({ score: { value: 140, testSlug: "bucks-stt" }, lookedAfter: "no", pupilPremium: false, siblingAt: { ags: false }, catchment: { ags: { value: false, source: "verified_boundary" } } }), school);
    expect(a.warnings.map((w) => w.code)).toContain("awaiting_verification");
    expect(a.overall).toBe("possible_rule_match");
  });

  it("single-sex schools do not assess children they do not admit", () => {
    const a = assess(policy(), fam({ childSex: "girl", score: { value: 140, testSlug: "bucks-stt" } }), school);
    expect(a.overall).toBe("rule_does_not_match");
    expect(a.warnings.map((w) => w.code)).toContain("single_sex");
  });

  it("test registration status maps to may register / pending", () => {
    expect(assess(policy(), fam({ testStatus: "not_registered" }), school).academic.status).toBe("may_register");
    expect(assess(policy(), fam({ testStatus: "sat_awaiting" }), school).academic.status).toBe("result_pending");
  });
});
