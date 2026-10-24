import { db, schema } from "@/db";
import { eq, inArray } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { clean, decodeCsv, parseCsv, toInt, toIsoDate, toNum } from "../csv";
import { fetchBuffer, HttpError } from "../http";
import { runJob, type JobContext } from "../runner";
import { loadEditorial } from "./editorial";
import {
  identifierMap,
  refreshSearchIndex,
  takenSlugs,
  upsertArea,
  upsertIdentifier,
  upsertLocation,
  upsertName,
  upsertSchool,
  type SchoolCore,
} from "../school-store";

const BASE = "https://ea-edubase-api-prod.azurewebsites.net/edubase/downloads/public";

const COLUMNS = [
  "URN",
  "LA (code)",
  "LA (name)",
  "EstablishmentNumber",
  "EstablishmentName",
  "TypeOfEstablishment (name)",
  "EstablishmentTypeGroup (name)",
  "EstablishmentStatus (name)",
  "OpenDate",
  "CloseDate",
  "PhaseOfEducation (name)",
  "StatutoryLowAge",
  "StatutoryHighAge",
  "Boarders (name)",
  "OfficialSixthForm (name)",
  "Gender (name)",
  "ReligiousCharacter (name)",
  "AdmissionsPolicy (name)",
  "SchoolCapacity",
  "CensusDate",
  "NumberOfPupils",
  "NumberOfBoys",
  "NumberOfGirls",
  "PercentageFSM",
  "Trusts (code)",
  "Trusts (name)",
  "UKPRN",
  "Street",
  "Locality",
  "Address3",
  "Town",
  "County (name)",
  "Postcode",
  "SchoolWebsite",
  "TelephoneNum",
  "HeadTitle (name)",
  "HeadFirstName",
  "HeadLastName",
  "HeadPreferredJobTitle",
  "GOR (code)",
  "GOR (name)",
  "GSSLACode (name)",
  "Easting",
  "Northing",
  "UPRN",
] as const;

type GiasRow = Record<(typeof COLUMNS)[number], string>;

const STATE_FUNDED_GROUPS = new Set(["Academies", "Local authority maintained schools", "Free Schools"]);

/** Is this row a state-funded selective (grammar) school in England? Exported for tests. */
export function isStateGrammar(r: Pick<GiasRow, "AdmissionsPolicy (name)" | "EstablishmentTypeGroup (name)" | "PhaseOfEducation (name)" | "EstablishmentStatus (name)">) {
  return (
    r["AdmissionsPolicy (name)"] === "Selective" &&
    STATE_FUNDED_GROUPS.has(r["EstablishmentTypeGroup (name)"]) &&
    ["Secondary", "All-through", "16 plus", "Middle deemed secondary"].includes(r["PhaseOfEducation (name)"]) &&
    r["EstablishmentStatus (name)"] !== "Closed"
  );
}

export function mapGender(v: string): SchoolCore["gender"] {
  if (v === "Boys") return "boys";
  if (v === "Girls") return "girls";
  if (v === "Mixed") return "mixed";
  return "unknown";
}

export function mapBoarding(v: string): SchoolCore["boarding"] {
  if (v === "Boarding school") return "boarding";
  if (v === "No boarders") return "none";
  return "unknown";
}

export function mapSixthForm(v: string): boolean | null {
  if (v === "Has a sixth form") return true;
  if (v === "Does not have a sixth form") return false;
  return null;
}

function websiteUrl(v: string): string | null {
  const c = clean(v);
  if (!c) return null;
  return /^https?:\/\//i.test(c) ? c : `https://${c.replace(/^\/+/, "")}`;
}

/** GIAS publishes a dated file each day; walk back a few days if today's is not yet available. */
async function downloadLatest(prefix: string): Promise<{ url: string; body: Buffer; date: string }> {
  for (let back = 0; back < 7; back++) {
    const d = new Date(Date.now() - back * 86_400_000);
    const stamp = d.toISOString().slice(0, 10).replace(/-/g, "");
    const url = `${BASE}/${prefix}${stamp}.csv`;
    try {
      const { body } = await fetchBuffer(url, { attempts: 3, timeoutMs: 300_000 });
      if (body.byteLength < 1000) continue;
      return { url, body, date: d.toISOString().slice(0, 10) };
    } catch (err) {
      if (err instanceof HttpError && err.status === 404) continue;
      throw err;
    }
  }
  throw new Error(`No GIAS ${prefix} extract found in the last 7 days`);
}

export async function importGias(ctx: JobContext) {
  const extract = await downloadLatest("edubasealldata");
  const { documentId, unchanged } = await ctx.recordDocument({
    title: `GIAS all establishment data extract ${extract.date}`,
    url: extract.url,
    body: extract.body,
    contentType: "text/csv",
    publishedAt: extract.date,
    extension: "csv",
  });
  ctx.stats.extractDate = extract.date;
  ctx.stats.unchangedFile = unchanged;

  const urnMap = await identifierMap("urn");
  const rows = parseCsv(decodeCsv(extract.body), COLUMNS);
  ctx.counters.rowsRead = rows.length;
  const byUrn = new Map(rows.map((r) => [r.URN, r]));

  // Links file: predecessor/successor relationships for identity resolution.
  let links: { URN: string; LinkURN: string; LinkName: string; LinkType: string; LinkEstablishedDate: string }[] = [];
  try {
    const linkFile = await downloadLatest("links_edubasealldata");
    await ctx.recordDocument({ title: `GIAS links extract ${linkFile.date}`, url: linkFile.url, body: linkFile.body, contentType: "text/csv", publishedAt: linkFile.date, extension: "csv" });
    links = parseCsv(decodeCsv(linkFile.body), ["URN", "LinkURN", "LinkName", "LinkType", "LinkEstablishedDate"] as const);
  } catch (err) {
    await ctx.issue("warning", "links_unavailable", `Links file could not be downloaded: ${err instanceof Error ? err.message : String(err)}`);
  }
  const predecessorsOf = new Map<string, typeof links>();
  for (const l of links) {
    if (!l.LinkType.startsWith("Predecessor")) continue;
    const arr = predecessorsOf.get(l.URN) ?? [];
    arr.push(l);
    predecessorsOf.set(l.URN, arr);
  }

  // Partially selective schools are not flagged in GIAS; they come from cited editorial research.
  const editorial = await loadEditorial();
  const partial = new Map(editorial.partiallySelective.map((p) => [p.urn, p]));
  const selected = rows.filter((r) => isStateGrammar(r) || (partial.has(r.URN) && r["EstablishmentStatus (name)"] !== "Closed"));
  // Also refresh schools we already hold that are no longer flagged (closed / changed policy).
  // Only *current* URNs are refreshed: predecessor URNs point at the same school and must never overwrite it.
  const currentUrns = await identifierMap("urn", { currentOnly: true });
  const selectedUrns = new Set(selected.map((r) => r.URN));
  const predecessorUrns = new Set(selected.flatMap((r) => (predecessorsOf.get(r.URN) ?? []).map((p) => p.LinkURN)));
  const knownNotSelected = [...currentUrns.keys()]
    .filter((u) => !selectedUrns.has(u) && !predecessorUrns.has(u))
    .map((u) => byUrn.get(u))
    .filter((r): r is GiasRow => !!r);
  ctx.stats.selectiveOpen = selected.length;
  ctx.stats.previouslyKnownRefreshed = knownNotSelected.length;

  const england = await upsertArea({ name: "England", type: "nation", nation: "england", code: "E92000001", slug: "england" });
  const taken = await takenSlugs();
  const prov = { sourceDocumentId: documentId };
  const now = new Date();

  for (const r of [...selected, ...knownNotSelected]) {
    try {
      let existingId = urnMap.get(r.URN);
      // Identity resolution: a new URN whose predecessor we already hold (e.g. academy conversion)
      // continues the same school record so URLs and history are preserved.
      if (!existingId) {
        for (const p of predecessorsOf.get(r.URN) ?? []) {
          const prevId = urnMap.get(p.LinkURN);
          if (prevId) {
            existingId = prevId;
            await ctx.issue("info", "identity_successor", `URN ${r.URN} continues predecessor URN ${p.LinkURN}`, r.URN);
            break;
          }
        }
      }

      const regionName = clean(r["GOR (name)"]);
      const regionId = regionName ? await upsertArea({ name: regionName, type: "region", nation: "england", code: clean(r["GOR (code)"]), parentId: england }) : null;
      const laName = clean(r["LA (name)"]);
      const laId = laName
        ? await upsertArea({ name: laName, type: "local_authority", nation: "england", code: clean(r["GSSLACode (name)"]), legacyCode: clean(r["LA (code)"]), parentId: regionId })
        : null;

      const status = r["EstablishmentStatus (name)"];
      const group = r["EstablishmentTypeGroup (name)"];
      const core: SchoolCore = {
        name: r.EstablishmentName.trim(),
        nation: "england",
        selectivity: r["AdmissionsPolicy (name)"] === "Selective" ? "fully_selective" : partial.has(r.URN) ? "partially_selective" : "non_selective",
        status,
        isOpen: status !== "Closed",
        establishmentType: clean(r["TypeOfEstablishment (name)"]),
        establishmentGroup: clean(group),
        governance: group === "Local authority maintained schools" ? "Local authority maintained" : group === "Free Schools" ? "Free school (academy)" : "Academy",
        phase: clean(r["PhaseOfEducation (name)"]),
        gender: mapGender(r["Gender (name)"]),
        ageLow: toInt(r.StatutoryLowAge),
        ageHigh: toInt(r.StatutoryHighAge),
        hasSixthForm: mapSixthForm(r["OfficialSixthForm (name)"]),
        boarding: mapBoarding(r["Boarders (name)"]),
        religiousCharacter: clean(r["ReligiousCharacter (name)"]),
        trustName: clean(r["Trusts (name)"]),
        trustCode: clean(r["Trusts (code)"]),
        localAuthorityId: laId,
        regionId,
        openDate: toIsoDate(r.OpenDate),
        closeDate: toIsoDate(r.CloseDate),
        sourceDocumentId: documentId,
        sourceLocator: partial.has(r.URN) ? `URN ${r.URN}; selectivity: ${partial.get(r.URN)!.note}` : `URN ${r.URN}`,
        verificationStatus: partial.has(r.URN) ? "awaiting_verification" : "officially_verified",
        confidence: partial.has(r.URN) ? "medium" : "high",
        lastCheckedAt: now,
      };
      const town = clean(r.Town);
      const { id } = await upsertSchool(ctx, core, existingId, [core.name, `${core.name} ${town ?? ""}`, `${core.name} ${r.URN}`], taken);
      urnMap.set(r.URN, id);

      await upsertIdentifier(id, "urn", r.URN, prov);
      const laestab = clean(r["LA (code)"]) && clean(r.EstablishmentNumber) ? `${r["LA (code)"]}${r.EstablishmentNumber}` : null;
      await upsertIdentifier(id, "laestab", laestab, prov);
      await upsertIdentifier(id, "ukprn", clean(r.UKPRN), prov);
      await upsertIdentifier(id, "uprn", clean(r.UPRN), prov);

      // Current name + predecessor names (former names) for search.
      await db().update(schema.schoolNames).set({ isCurrent: false }).where(eq(schema.schoolNames.schoolId, id));
      await upsertName(id, core.name, true, `URN ${r.URN}`, documentId);
      for (const p of predecessorsOf.get(r.URN) ?? []) {
        const prevName = clean(p.LinkName) ?? clean(byUrn.get(p.LinkURN)?.EstablishmentName);
        if (prevName && prevName !== core.name) {
          await upsertName(id, prevName, false, `Predecessor URN ${p.LinkURN}`, documentId, toIsoDate(p.LinkEstablishedDate));
          await upsertIdentifier(id, "urn", p.LinkURN, prov, false);
        }
      }

      await upsertLocation(
        id,
        {
          street: clean(r.Street),
          locality: clean(r.Locality),
          address3: clean(r.Address3),
          town,
          county: clean(r["County (name)"]),
          postcode: clean(r.Postcode),
          easting: toInt(r.Easting),
          northing: toInt(r.Northing),
          method: toInt(r.Easting) ? "gias_easting_northing" : null,
        },
        documentId,
      );

      const head = [clean(r.HeadFirstName), clean(r.HeadLastName)].filter(Boolean).join(" ") || null;
      const contact = {
        website: websiteUrl(r.SchoolWebsite),
        telephone: clean(r.TelephoneNum),
        headTitle: clean(r["HeadTitle (name)"]),
        headName: head,
        headJobTitle: clean(r.HeadPreferredJobTitle),
        sourceDocumentId: documentId,
        verificationStatus: "officially_verified" as const,
        lastCheckedAt: now,
      };
      await db().insert(schema.schoolContacts).values({ schoolId: id, ...contact }).onConflictDoUpdate({ target: schema.schoolContacts.schoolId, set: contact });

      const censusDate = toIsoDate(r.CensusDate);
      if (censusDate) {
        const census = {
          pupils: toInt(r.NumberOfPupils),
          boys: toInt(r.NumberOfBoys),
          girls: toInt(r.NumberOfGirls),
          capacity: toInt(r.SchoolCapacity),
          percentFsm: toNum(r.PercentageFSM)?.toString() ?? null,
          sourceDocumentId: documentId,
          sourceLocator: `URN ${r.URN}`,
          verificationStatus: "officially_verified" as const,
          lastCheckedAt: now,
        };
        await db()
          .insert(schema.schoolCensus)
          .values({ schoolId: id, censusDate, ...census })
          .onConflictDoUpdate({ target: [schema.schoolCensus.schoolId, schema.schoolCensus.censusDate], set: census });
      }

      if (!clean(r.Easting)) await ctx.issue("warning", "missing_coordinates", `${core.name} has no easting/northing in GIAS`, r.URN);
    } catch (err) {
      ctx.counters.rowsRejected++;
      await ctx.issue("error", "row_failed", err instanceof Error ? err.message : String(err), r.URN);
    }
  }

  // Schools whose URN vanished entirely from GIAS are flagged for review rather than deleted.
  const missing = [...urnMap.entries()].filter(([urn]) => !byUrn.has(urn));
  if (missing.length) {
    const ids = [...new Set(missing.map(([, id]) => id))];
    const stillCurrent = await db()
      .select({ schoolId: schema.schoolIdentifiers.schoolId, value: schema.schoolIdentifiers.value })
      .from(schema.schoolIdentifiers)
      .where(inArray(schema.schoolIdentifiers.schoolId, ids));
    for (const m of stillCurrent.filter((s) => missing.some(([u]) => u === s.value))) {
      await ctx.issue("warning", "urn_missing_from_extract", `URN ${m.value} is no longer present in the GIAS extract`, m.value);
    }
  }

  await refreshSearchIndex();
  logger.info("gias import complete", { selected: selected.length });
}

export function runGias(trigger?: string) {
  return runJob("gias", "gias", importGias, { trigger });
}
