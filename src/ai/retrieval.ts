import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { CATCHMENT_LABEL, EIF_GRADE, GENDER_LABEL, OUT_OF_AREA_LABEL, SELECTIVITY_LABEL } from "@/domain/labels";
import { formatMeasure, MEASURES } from "@/domain/measures";
import { defaultEntryYear } from "@/lib/academic-year";
import { formatDate } from "@/lib/format";
import { absoluteUrl } from "@/lib/site";
import { expandQuery, normaliseQuery } from "@/lib/search-terms";
import { getAllocations, getComparators, getEntranceTests, getInspections, getPolicies, getResults, getSchoolCore, getSchoolEvents } from "@/server/profile";
import { latestByFramework, latestPublished, measureRows } from "@/server/profile-view";
import { NATIONAL_KNOWLEDGE } from "./knowledge";

/**
 * A unit of evidence handed to the answer generator. `text` is untrusted
 * reference data: it is passed as a document, never as an instruction.
 */
export interface RetrievedDoc {
  id: string;
  kind: "school_facts" | "policy_passage" | "national_rule";
  title: string;
  url: string;
  text: string;
  verification: string;
  /** e.g. the academic year or entry year the facts relate to */
  period?: string;
}

/**
 * Find schools named in the question (typo-tolerant). Matching uses the
 * distinctive part of each name ("Aylesbury" in "Aylesbury Grammar School") so
 * generic words like "grammar school" never match every school.
 */
export async function schoolsMentioned(question: string, limit = 3): Promise<string[]> {
  const norm = normaliseQuery(question);
  const expanded = expandQuery(question);
  if (norm.length < 3) return [];
  const rows = await db().execute<{ slug: string; distinctive: number; full_sim: number }>(sql`
    WITH c AS (
      SELECT s.slug, translate(lower(immutable_unaccent(s.name)), '''’', '') AS name,
             trim(regexp_replace(translate(lower(immutable_unaccent(s.name)), '''’', ''), '\\m(grammar|school|schools|high|the|for|boys|girls|academy|college|of|and|selective|a|county|royal)\\M', ' ', 'g')) AS core
      FROM schools s WHERE s.is_open AND s.selectivity <> 'non_selective'
    )
    SELECT slug,
      greatest(word_similarity(core, ${norm}), word_similarity(core, ${expanded})) AS distinctive,
      greatest(word_similarity(name, ${norm}), word_similarity(name, ${expanded})) AS full_sim
    FROM c WHERE length(regexp_replace(core, '\\s', '', 'g')) >= 3
    ORDER BY distinctive DESC, full_sim DESC
    LIMIT 10
  `);
  const strong = rows.filter((r) => Number(r.distinctive) >= 0.75);
  if (!strong.length) return [];
  const best = Math.max(...strong.map((r) => Number(r.full_sim)));
  return strong.filter((r) => Number(r.full_sim) >= best - 0.08).slice(0, limit).map((r) => r.slug);
}

/** A structured fact sheet for one school, built only from stored, sourced data. */
export async function schoolFactSheet(slug: string, entryYear = defaultEntryYear()): Promise<RetrievedDoc | null> {
  const core = await getSchoolCore(slug);
  if (!core) return null;
  const { school, location, la, census, formerNames } = core;
  const [policies, tests, results, inspections, allocations] = await Promise.all([getPolicies(school.id), getEntranceTests(school.id, entryYear), getResults(school.id), getInspections(school.id), getAllocations(school.id)]);
  const [events, comparators] = await Promise.all([getSchoolEvents(school.id, tests.map((t) => t.test.id), school.nation), getComparators(la?.code)]);
  const lines: string[] = [];
  lines.push(`School: ${school.name} (${SELECTIVITY_LABEL[school.selectivity]}; ${GENDER_LABEL[school.gender]}; ${school.nation === "northern_ireland" ? "Northern Ireland" : "England"}).`);
  lines.push(`Location: ${[location?.town, location?.postcode, la?.name].filter(Boolean).join(", ")}.`);
  if (formerNames.length) lines.push(`Former names: ${formerNames.map((n) => n.name).join("; ")}.`);
  lines.push(`Sixth form: ${school.hasSixthForm === null ? "not recorded" : school.hasSixthForm ? "yes" : "no"}. Boarding: ${school.boarding}.`);
  if (census) lines.push(`Pupils on roll: ${census.pupils ?? "not recorded"} (census ${census.censusDate}); capacity ${census.capacity ?? "not recorded"}.`);
  if (tests.length) lines.push(`Entrance test for September ${entryYear} entry: ${tests.map((t) => `${t.test.name} (link ${t.link.verificationStatus.replace(/_/g, " ")})`).join("; ")}.`);
  else lines.push(`Entrance test for September ${entryYear} entry: not recorded in our database.`);

  for (const p of policies.filter((x) => x.status !== "superseded")) {
    lines.push(`Admissions policy for ${p.cycle.label} (status: ${p.status.replace(/_/g, " ")}; version ${p.version}):`);
    if (p.publishedAdmissionNumber) lines.push(`- Published admission number: ${p.publishedAdmissionNumber}.`);
    if (p.qualificationSummary) lines.push(`- Qualification: ${p.qualificationSummary}`);
    for (const r of p.scoreRules) lines.push(`- Score rule (${r.kind.replace(/_/g, " ")}, applies to ${r.appliesTo.replace(/_/g, " ")}): ${r.scoreValue ?? "—"} — ${r.description} [${r.sourceLocator ?? ""}]`);
    lines.push(`- Catchment: ${CATCHMENT_LABEL[p.catchmentType]}. ${p.catchmentSummary ?? ""}`);
    lines.push(`- Out-of-area applicants: ${OUT_OF_AREA_LABEL[p.outOfAreaRoute]}.`);
    p.criteria.forEach((c) => lines.push(`- Oversubscription criterion ${c.rank}: ${c.title}${c.description ? ` — ${c.description}` : ""} [${c.sourceLocator ?? ""}]`));
    if (p.tieBreak) lines.push(`- Tie-break: ${p.tieBreak}`);
    if (p.distanceMethod) lines.push(`- Distance measurement: ${p.distanceMethod}`);
    if (p.waitingList) lines.push(`- Waiting list: ${p.waitingList}`);
    if (p.appeals) lines.push(`- Appeals: ${p.appeals}`);
    if (p.addressRules) lines.push(`- Home address: ${p.addressRules}`);
  }
  if (!policies.some((p) => p.cycle.entryYear === entryYear && p.status !== "superseded")) lines.push(`No admissions policy is held in our database for September ${entryYear} entry.`);

  const ev = [...events].filter((e) => e.entry_year === entryYear);
  if (ev.length) lines.push(`Key dates for September ${entryYear} entry: ${ev.map((e) => `${formatDate(e.starts_on)} — ${e.title}${e.test_name ? ` (${e.test_name})` : ""} [${e.verification_status.replace(/_/g, " ")}]`).join("; ")}.`);

  for (const m of ["ks4_attainment8", "ks4_engmath_95_pct", "ks4_progress8", "ks5_alevel_aps_per_entry", "ks5_alevel_aab_pct"] as const) {
    const rows = measureRows(results, comparators, m, la?.code);
    if (!rows.length) continue;
    const latest = latestPublished(rows);
    const series = rows.map((r) => `${r.year}: ${r.value === null ? `not published${r.statusCode ? ` (${r.statusCode})` : ""}` : `${formatMeasure(MEASURES[m], r.value)}${r.valueText ? ` (${r.valueText})` : ""}`} [${r.dataVersion ?? ""}]`).join("; ");
    lines.push(`${MEASURES[m].label} (DfE): ${series}.${latest?.nationalSelective != null ? ` All selective schools in England, ${latest.year}: ${formatMeasure(MEASURES[m], latest.nationalSelective)}.` : ""}`);
  }
  for (const i of latestByFramework(inspections)) {
    if (i.framework === "report_card_2025") lines.push(`Ofsted report card inspection ${i.startDate}: ${i.evaluations.map((e) => `${e.area.replace(/_/g, " ")}: ${e.grade}`).join("; ")}; safeguarding ${i.safeguarding ?? "—"}.`);
    else if (i.framework === "eif_2019") lines.push(`Ofsted graded inspection (2019 framework) ${i.startDate}: overall effectiveness ${i.overallEffectiveness ? EIF_GRADE[String(i.overallEffectiveness)] : "—"}.`);
    else lines.push(`Ofsted ungraded inspection ${i.startDate}: ${i.outcome ?? "—"}.`);
  }
  const years = [...new Set(allocations.map((a) => a.entryYear))].sort().slice(-4);
  for (const y of years) {
    const g = (m: string) => allocations.find((a) => a.entryYear === y && a.metric === m)?.value;
    lines.push(`Applications and offers, September ${y} entry (DfE national offer day data): named as first preference ${g("times_first_preference") ?? "—"} times; ${g("offers_made") ?? "—"} offers made; ${g("applications_from_other_la") ?? "—"} applications and ${g("offers_to_other_la") ?? "—"} offers involving families from other local authorities.`);
  }
  lines.push("Historical lowest scores and last-offer distances: not held in our database for this school.");
  return { id: `school:${slug}`, kind: "school_facts", title: `${school.name} — fact sheet`, url: absoluteUrl(`/schools/${slug}`), text: lines.join("\n"), verification: school.verificationStatus, period: `September ${entryYear} entry` };
}

/** Full-text search over stored passages from official admissions documents. */
export async function policyPassages(question: string, schoolSlugs: string[], limit = 6): Promise<RetrievedDoc[]> {
  const rows = await db().execute<{ id: number; text: string; locator: string | null; title: string; url: string; status: string; rank: number }>(sql`
    SELECT x.id, x.text, x.locator, d.title, d.url, d.status, ts_rank(x.search_document, websearch_to_tsquery('english', ${question})) AS rank
    FROM source_extracts x
    JOIN source_documents d ON d.id = x.document_id
    LEFT JOIN schools s ON s.id = x.school_id
    WHERE x.search_document @@ websearch_to_tsquery('english', ${question})
       OR (${schoolSlugs.length > 0} AND s.slug IN (${schoolSlugs.length ? sql.join(schoolSlugs.map((s) => sql`${s}`), sql`, `) : sql`NULL`}) AND x.search_document @@ to_tsquery('english', 'admiss | criteri | catchment | distanc | score | sibling | premium | waiting | appeal'))
    ORDER BY rank DESC
    LIMIT ${limit}
  `);
  return rows.map((r) => ({ id: `extract:${r.id}`, kind: "policy_passage", title: `${r.title} (${r.locator ?? "passage"})`, url: r.url, text: r.text, verification: r.status === "active" ? "official_document" : r.status }));
}

function nationalDocs(question: string): RetrievedDoc[] {
  const q = question.toLowerCase();
  return NATIONAL_KNOWLEDGE.filter((k) => k.keywords.some((w) => q.includes(w))).map((k) => ({ id: `rule:${k.id}`, kind: "national_rule", title: k.title, url: k.url, text: k.text, verification: k.verification }));
}

export async function retrieve(question: string, opts: { schoolSlug?: string | null; entryYear?: number } = {}): Promise<RetrievedDoc[]> {
  const mentioned = await schoolsMentioned(question);
  const slugs = [...new Set([...(opts.schoolSlug ? [opts.schoolSlug] : []), ...mentioned])].slice(0, 3);
  const sheets = (await Promise.all(slugs.map((s) => schoolFactSheet(s, opts.entryYear)))).filter((d): d is RetrievedDoc => !!d);
  const passages = await policyPassages(question, slugs);
  const rules = nationalDocs(question);
  // Always include the platform's core definitions so the assistant can explain qualifying vs offers.
  const core = NATIONAL_KNOWLEDGE.find((k) => k.id === "three-steps")!;
  // Rules first: they frame the answer; then school facts, then supporting passages.
  const all = [...rules, ...sheets, ...passages];
  if (!all.some((d) => d.id === `rule:${core.id}`)) all.push({ id: `rule:${core.id}`, kind: "national_rule", title: core.title, url: core.url, text: core.text, verification: core.verification });
  return all.slice(0, 12);
}
