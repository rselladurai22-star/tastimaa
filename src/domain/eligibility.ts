/**
 * Rule-based admissions eligibility assessment.
 *
 * Core principle, applied everywhere:
 *   meeting the test standard  ≠  matching an admission criterion  ≠  receiving an offer.
 *
 * The engine only evaluates the structured rules of the policy for the exact
 * entry year requested. It never borrows another year's rules, never treats
 * a historical last-offer distance as a boundary, never treats a straight-line
 * distance from a postcode centre as the school's own measurement, and never
 * produces a numeric probability.
 */

export type Tri = "yes" | "no" | "unknown";

export type AcademicStatus = "not_assessed" | "may_register" | "result_pending" | "requirement_met" | "requirement_not_met" | "cannot_determine";

export type CriterionMatch = "confirmed" | "possible" | "no_match" | "insufficient_information";

export type OverallCriteria = "confirmed_rule_match" | "possible_rule_match" | "rule_does_not_match" | "insufficient_information";

export interface PolicyInput {
  schoolSlug: string;
  schoolName: string;
  nation: "england" | "northern_ireland";
  gender: "boys" | "girls" | "mixed" | "unknown";
  entryYear: number;
  status: "published" | "awaiting_verification" | "superseded" | "draft" | "rejected";
  verificationStatus: "officially_verified" | "awaiting_verification" | "historical" | "estimated" | "unavailable" | "conflicting";
  sourceStatus?: "active" | "superseded" | "withdrawn" | "unavailable";
  sourceUrl?: string | null;
  publishedAdmissionNumber: number | null;
  testSlug: string | null;
  testName: string | null;
  catchmentType: "none" | "defined_area" | "distance_only" | "multiple_areas" | "unknown";
  hasVerifiedBoundary: boolean;
  scoreRules: { kind: string; appliesTo: string; scoreValue: number | null; scoreScale: string | null; description: string; locator: string | null }[];
  criteria: { rank: number; category: string; title: string; requiresQualification: boolean | null; placesReserved: number | null; conditions: Record<string, unknown>; locator: string | null }[];
}

export interface FamilyInput {
  entryYear: number;
  childSex?: "boy" | "girl" | null;
  /** Child's test status for this school's test. */
  testStatus?: "not_registered" | "registered" | "sat_awaiting" | "have_result" | null;
  score?: { value: number; testSlug: string } | null;
  lookedAfter?: "looked_after" | "previously_looked_after" | "no" | null;
  pupilPremium?: boolean | null;
  /** Per school: sibling who will be on roll at entry. */
  siblingAt?: Record<string, boolean | null>;
  staffChild?: Record<string, boolean | null>;
  medicalSocial?: boolean | null;
  ehcpNamesSchool?: Record<string, boolean | null>;
  /**
   * Per school: is the home inside the school's catchment? `source` says how we
   * know: a point-in-polygon test against a verified official boundary, or the
   * family's own declaration (e.g. after using the council's checker).
   */
  catchment?: Record<string, { value: boolean | null; source: "verified_boundary" | "family_declared" }>;
}

export interface CriterionResult {
  rank: number;
  title: string;
  category: string;
  match: CriterionMatch;
  reasons: string[];
  locator: string | null;
}

export interface Assessment {
  schoolSlug: string;
  schoolName: string;
  entryYear: number;
  assessable: boolean;
  academic: { status: AcademicStatus; explanation: string; threshold: number | null; scale: string | null };
  criteria: CriterionResult[];
  overall: OverallCriteria;
  /** Highest-priority criterion the family confirmed or possibly matches. */
  bestCriterion: CriterionResult | null;
  satisfied: string[];
  unknown: string[];
  nextActions: string[];
  outlook: string;
  warnings: { code: string; message: string }[];
}

const and3 = (vals: Tri[]): Tri => (vals.includes("no") ? "no" : vals.includes("unknown") ? "unknown" : "yes");
const or3 = (vals: Tri[]): Tri => (vals.includes("yes") ? "yes" : vals.includes("unknown") ? "unknown" : "no");
const fromBool = (b: boolean | null | undefined): Tri => (b === true ? "yes" : b === false ? "no" : "unknown");

interface Ctx {
  policy: PolicyInput;
  family: FamilyInput;
  qualified: Tri;
  assumptions: Set<string>;
  unknowns: Set<string>;
  reasons: string[];
}

function evalCondition(cond: Record<string, unknown>, ctx: Ctx): Tri {
  const parts: Tri[] = [];
  const { family, policy } = ctx;
  for (const [key, expected] of Object.entries(cond)) {
    switch (key) {
      case "lookedAfter": {
        const v: Tri = family.lookedAfter == null ? "unknown" : family.lookedAfter === "no" ? "no" : "yes";
        if (v === "unknown") ctx.unknowns.add("Whether your child is looked after or previously looked after");
        parts.push(expected ? v : v === "yes" ? "no" : v === "no" ? "yes" : "unknown");
        break;
      }
      case "pupilPremium": {
        const v = fromBool(family.pupilPremium);
        if (v === "unknown") ctx.unknowns.add("Pupil Premium eligibility");
        parts.push(v);
        break;
      }
      case "inCatchment": {
        const c = family.catchment?.[policy.schoolSlug];
        const v = fromBool(c?.value ?? null);
        if (v === "unknown") ctx.unknowns.add(`Whether your home is inside ${policy.schoolName}'s catchment area`);
        else if (c?.source === "family_declared") ctx.assumptions.add("catchment declared by you, not checked against an official boundary");
        parts.push(v);
        break;
      }
      case "sibling": {
        const v = fromBool(family.siblingAt?.[policy.schoolSlug]);
        if (v === "unknown") ctx.unknowns.add(`Whether a brother or sister will be at ${policy.schoolName}`);
        parts.push(v);
        break;
      }
      case "siblingAtLinkedSchool":
      case "formerSibling":
        ctx.unknowns.add(key === "formerSibling" ? `Whether a sibling previously attended ${policy.schoolName}` : `Whether a sibling will attend ${String(expected)}`);
        parts.push("unknown");
        break;
      case "staffChild": {
        const v = fromBool(family.staffChild?.[policy.schoolSlug]);
        if (v === "unknown") ctx.unknowns.add(`Whether a parent works at ${policy.schoolName} and meets the staff criterion`);
        parts.push(v);
        break;
      }
      case "medicalSocial": {
        const v = fromBool(family.medicalSocial);
        if (v === "unknown") ctx.unknowns.add("Whether you have professional evidence of exceptional medical or social need");
        parts.push(v);
        break;
      }
      case "ehcpNamed": {
        parts.push(fromBool(family.ehcpNamesSchool?.[policy.schoolSlug]));
        break;
      }
      case "scoreMin":
      case "scoreMax": {
        const s = usableScore(ctx);
        if (s === null) {
          ctx.unknowns.add("Your child's score in this school's test");
          parts.push("unknown");
        } else {
          parts.push(key === "scoreMin" ? (s >= Number(expected) ? "yes" : "no") : s <= Number(expected) ? "yes" : "no");
        }
        break;
      }
      case "anyOf": {
        const subs = Array.isArray(expected) ? expected : [];
        parts.push(or3(subs.map((c) => evalCondition(c as Record<string, unknown>, ctx))));
        break;
      }
      default:
        // An unknown structured condition is never assumed to be met.
        ctx.unknowns.add(`A condition we can't assess automatically (${key})`);
        parts.push("unknown");
    }
  }
  return and3(parts);
}

function usableScore(ctx: Ctx): number | null {
  const s = ctx.family.score;
  if (!s) return null;
  if (!ctx.policy.testSlug || s.testSlug !== ctx.policy.testSlug) return null;
  return s.value;
}

function academic(policy: PolicyInput, family: FamilyInput): Assessment["academic"] & { qualified: Tri; warnings: { code: string; message: string }[] } {
  const warnings: { code: string; message: string }[] = [];
  const threshold = policy.scoreRules.find((r) => r.kind === "qualifying_threshold" && (r.appliesTo === "all" || r.appliesTo === "") && r.scoreValue !== null) ?? null;
  const scale = threshold?.scoreScale ?? policy.testName;
  const base = { threshold: threshold?.scoreValue ?? null, scale };

  if (family.score && policy.testSlug && family.score.testSlug !== policy.testSlug) {
    warnings.push({ code: "score_from_other_test", message: `A score from a different test can't be used for ${policy.schoolName}, which uses ${policy.testName ?? "its own test"}. Scores from different tests are on different scales.` });
    return { ...base, status: "cannot_determine", explanation: `We can't assess a score from another test against ${policy.schoolName}'s requirement.`, qualified: "unknown", warnings };
  }
  if (family.score && !policy.testSlug) {
    warnings.push({ code: "test_unknown", message: `We don't yet hold which entrance test ${policy.schoolName} uses for ${policy.entryYear} entry.` });
    return { ...base, status: "cannot_determine", explanation: "We don't hold this school's test arrangements for this year.", qualified: "unknown", warnings };
  }
  if (!family.score) {
    if (family.testStatus === "not_registered") return { ...base, status: "may_register", explanation: `Your child needs to sit ${policy.testName ?? "the school's entrance test"} to be considered. Check the registration deadline.`, qualified: "unknown", warnings };
    if (family.testStatus === "registered" || family.testStatus === "sat_awaiting") return { ...base, status: "result_pending", explanation: "Results are not yet available.", qualified: "unknown", warnings };
    return { ...base, status: "not_assessed", explanation: "No test result was entered.", qualified: "unknown", warnings };
  }
  if (!threshold) {
    return {
      ...base,
      status: "cannot_determine",
      explanation:
        policy.nation === "northern_ireland"
          ? "Northern Ireland schools set their own admissions criteria for using SEAG outcomes; we don't hold a single qualifying score for this school."
          : "We don't hold a published qualifying score for this school and year.",
      qualified: "unknown",
      warnings,
    };
  }
  if (family.score.value >= threshold.scoreValue!) {
    return { ...base, status: "requirement_met", explanation: `A score of ${family.score.value} meets the published qualifying score of ${threshold.scoreValue}. Qualifying makes your child eligible to be considered — it is not an offer.`, qualified: "yes", warnings };
  }
  return { ...base, status: "requirement_not_met", explanation: `A score of ${family.score.value} is below the published qualifying score of ${threshold.scoreValue}.`, qualified: "no", warnings };
}

export function assess(policy: PolicyInput | null, family: FamilyInput, school: { slug: string; name: string; nation: "england" | "northern_ireland"; gender: PolicyInput["gender"] }): Assessment {
  const warnings: Assessment["warnings"] = [];
  const empty = (outlook: string): Assessment => ({
    schoolSlug: school.slug,
    schoolName: school.name,
    entryYear: family.entryYear,
    assessable: false,
    academic: { status: "cannot_determine", explanation: "No admissions rules are held for this year.", threshold: null, scale: null },
    criteria: [],
    overall: "insufficient_information",
    bestCriterion: null,
    satisfied: [],
    unknown: [],
    nextActions: [`Read ${school.name}'s determined admission arrangements for September ${family.entryYear} entry on the school's website.`],
    outlook,
    warnings,
  });

  if (school.gender !== "mixed" && school.gender !== "unknown" && family.childSex) {
    const ok = (school.gender === "boys" && family.childSex === "boy") || (school.gender === "girls" && family.childSex === "girl");
    if (!ok) {
      warnings.push({ code: "single_sex", message: `${school.name} admits ${school.gender} in Year ${school.nation === "northern_ireland" ? 8 : 7}.` });
      const r = empty(`${school.name} is a ${school.gender === "boys" ? "boys'" : "girls'"} school at this entry point, so its Year ${school.nation === "northern_ireland" ? 8 : 7} admissions rules would not apply to your child.`);
      r.overall = "rule_does_not_match";
      return r;
    }
  }

  if (!policy || policy.entryYear !== family.entryYear || policy.status === "superseded" || policy.status === "draft" || policy.status === "rejected") {
    warnings.push({ code: "no_policy_for_year", message: `We don't hold ${school.name}'s admissions rules for September ${family.entryYear} entry. Rules from other years are not used because they can change.` });
    return empty("We can't assess this school for the selected year. Check the school's determined arrangements directly.");
  }
  if (policy.verificationStatus === "conflicting") {
    warnings.push({ code: "conflicting_sources", message: "Official sources for this policy disagree and an editor is reviewing them. We won't assess it until that's resolved." });
    return empty("The rules we hold conflict with another official source, so we are not giving an assessment.");
  }
  if (policy.sourceStatus === "withdrawn" || policy.sourceStatus === "unavailable") {
    warnings.push({ code: "source_withdrawn", message: "The source document for these rules has been withdrawn or is no longer available. The school may have replaced it." });
  }
  if (policy.status === "awaiting_verification" || policy.verificationStatus === "awaiting_verification") {
    warnings.push({ code: "awaiting_verification", message: "These rules were taken from the school's published policy but have not yet been checked by an editor." });
  }
  if (policy.nation === "northern_ireland") {
    warnings.push({ code: "ni_process", message: "Northern Ireland transfer works differently: applications go through the Education Authority and each school applies its own published criteria." });
  }

  const ac = academic(policy, family);
  warnings.push(...ac.warnings);
  const ctx: Ctx = { policy, family, qualified: ac.qualified, assumptions: new Set(), unknowns: new Set(), reasons: [] };
  const capToPossible = policy.status !== "published" || policy.verificationStatus !== "officially_verified" || policy.sourceStatus === "withdrawn";

  const results: CriterionResult[] = policy.criteria
    .slice()
    .sort((a, b) => a.rank - b.rank)
    .map((c) => {
      // Assumptions are tracked per criterion: each criterion's match depends only on its own conditions.
      ctx.assumptions = new Set();
      const reasons: string[] = [];
      let t = evalCondition(c.conditions ?? {}, ctx);
      if (c.requiresQualification) {
        if (ac.qualified === "no") {
          t = "no";
          reasons.push("Applies only to children who meet the qualifying standard.");
        } else if (ac.qualified === "unknown" && t !== "no") {
          t = "unknown";
          reasons.push("Applies only to children who meet the qualifying standard, which we can't confirm yet.");
        }
      }
      if (c.category === "distance") reasons.push("Distance ranks applicants; we can't tell where your home would rank. Schools measure from your exact address using their own method.");
      const newAssumption = ctx.assumptions.size > 0;
      let match: CriterionMatch = t === "yes" ? (capToPossible || newAssumption ? "possible" : "confirmed") : t === "no" ? "no_match" : "insufficient_information";
      if (t === "unknown" && Object.keys(c.conditions ?? {}).length === 0 && ac.qualified === "unknown") match = "insufficient_information";
      if (match === "possible" && newAssumption) reasons.push("Depends on information we couldn't check against an official source.");
      return { rank: c.rank, title: c.title, category: c.category, match, reasons, locator: c.locator };
    });

  const best = results.find((r) => r.match === "confirmed" || r.match === "possible") ?? null;
  const anyUnknown = results.some((r) => r.match === "insufficient_information");
  const overall: OverallCriteria = best ? (best.match === "confirmed" ? "confirmed_rule_match" : "possible_rule_match") : anyUnknown || !results.length ? "insufficient_information" : "rule_does_not_match";

  const satisfied: string[] = [];
  if (ac.status === "requirement_met") satisfied.push(`Meets the published qualifying score (${ac.threshold}).`);
  if (best) satisfied.push(`Matches oversubscription criterion ${best.rank}: ${best.title}.`);
  const unknown = [...ctx.unknowns];
  const nextActions: string[] = [];
  if (ac.status === "may_register") nextActions.push(`Register for ${policy.testName ?? "the entrance test"} before the deadline.`);
  if (ac.status === "result_pending") nextActions.push("Wait for the test result, then come back to re-check.");
  if (ac.status === "requirement_not_met") nextActions.push("Check whether the school offers a review of test results or reserved places for particular groups (see the criteria below).");
  if (policy.nation === "england") nextActions.push(`Name the school on your home council's application by 31 October ${family.entryYear - 1}, even if it is in another council area.`);
  else nextActions.push("Apply through the Education Authority's transfer process and read the school's own published criteria.");
  if (unknown.some((u) => u.includes("catchment"))) nextActions.push("Check your address with the council's or school's official catchment checker.");

  let outlook: string;
  if (ac.status === "requirement_not_met" && !best) {
    outlook = `Under the September ${family.entryYear} rules we hold, a child below the qualifying score is not considered for the main criteria. Reserved-place or review routes, where they exist, are shown above.`;
  } else if (best) {
    const above = results.filter((r) => r.rank < best.rank).length;
    outlook = `Your child would be considered under criterion ${best.rank} (${best.title}). ${above ? `${above} higher-priority ${above === 1 ? "criterion is" : "criteria are"} filled first.` : "This is the highest-priority criterion."} Whether a place is offered depends on how many applicants rank above your child this year${policy.publishedAdmissionNumber ? ` for ${policy.publishedAdmissionNumber} places` : ""}. We do not estimate a probability: the published data cannot support a reliable one.`;
  } else if (overall === "insufficient_information") {
    outlook = "We need more information before we can say which admission criterion would apply. Answer the questions listed under “Still unknown”.";
  } else {
    outlook = "On the information given, none of the published criteria would apply.";
  }

  return {
    schoolSlug: school.slug,
    schoolName: school.name,
    entryYear: family.entryYear,
    assessable: true,
    academic: { status: ac.status, explanation: ac.explanation, threshold: ac.threshold, scale: ac.scale },
    criteria: results,
    overall,
    bestCriterion: best,
    satisfied,
    unknown,
    nextActions,
    outlook,
    warnings,
  };
}

export const ACADEMIC_LABEL: Record<AcademicStatus, string> = {
  not_assessed: "Not assessed",
  may_register: "May register",
  result_pending: "Test result pending",
  requirement_met: "Qualifying requirement met",
  requirement_not_met: "Qualifying requirement not met",
  cannot_determine: "Cannot determine",
};

export const OVERALL_LABEL: Record<OverallCriteria, string> = {
  confirmed_rule_match: "Confirmed rule match",
  possible_rule_match: "Possible rule match",
  rule_does_not_match: "Rule does not match",
  insufficient_information: "Insufficient information",
};

export const MATCH_LABEL: Record<CriterionMatch, string> = {
  confirmed: "Matches",
  possible: "Possible match",
  no_match: "Does not match",
  insufficient_information: "Need more information",
};
