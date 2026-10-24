import { env } from "@/lib/env";
import { bulkLookup, normalisePostcode, type PostcodeLocation } from "@/lib/postcode";
import { db, schema } from "@/db";
import { fetchBuffer, fetchText } from "../http";
import { runJob, type JobContext } from "../runner";
import { identifierMap, refreshSearchIndex, takenSlugs, upsertArea, upsertIdentifier, upsertLocation, upsertName, upsertSchool, type SchoolCore } from "../school-store";
import { readWorkbook, sheetRecords, type Cell } from "../xlsx";

const ARTICLE = "https://www.education-ni.gov.uk/articles/school-enrolments-school-level-data";
const ORIGIN = "https://www.education-ni.gov.uk";

const str = (c: Cell | undefined) => (c === null || c === undefined ? null : String(c).trim() || null);
const num = (c: Cell | undefined) => (typeof c === "number" ? c : c === null || c === undefined ? null : Number.isFinite(Number(String(c).replace(/[%,]/g, ""))) ? Number(String(c).replace(/[%,]/g, "")) : null);

/** Find the newest school-level publication and its post-primary workbook. Exported for tests. */
export function pickLatestPublication(articleHtml: string): string | null {
  const links = [...articleHtml.matchAll(/href="(\/publications\/school-enrolments?-school-level-dat[ae]-(\d{4,8}))"/g)];
  if (!links.length) return null;
  // Slugs end in e.g. 202425 or 20252026 — compare on the starting year.
  const scored = links.map((m) => ({ path: m[1]!, start: Number((m[2] ?? "").slice(0, 4)) }));
  scored.sort((a, b) => b.start - a.start);
  return ORIGIN + scored[0]!.path;
}

export function pickPostPrimaryWorkbook(publicationHtml: string): string | null {
  const m = [...publicationHtml.matchAll(/href="([^"]*post%20primary[^"]*\.xlsx)"/gi)];
  return m.length ? m[0]![1]!.replace(/^\//, ORIGIN + "/") : null;
}

export async function importNiSchools(ctx: JobContext) {
  const article = await fetchText(ARTICLE);
  const pubUrl = pickLatestPublication(article);
  if (!pubUrl) throw new Error("Could not find a school-level enrolment publication");
  const pubHtml = await fetchText(pubUrl);
  const xlsxUrl = pickPostPrimaryWorkbook(pubHtml);
  if (!xlsxUrl) throw new Error(`No post-primary workbook found on ${pubUrl}`);
  const yearMatch = /(\d{4})(\d{2}|\d{4})$/.exec(pubUrl);
  const academicYear = yearMatch ? `${yearMatch[1]}/${yearMatch[2]!.slice(-2)}` : null;

  const { body } = await fetchBuffer(xlsxUrl);
  const { documentId } = await ctx.recordDocument({
    title: `DE NI school enrolment – post-primary school level data ${academicYear ?? ""}`.trim(),
    url: xlsxUrl,
    body,
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    academicYear,
    extension: "xlsx",
  });
  ctx.stats.publication = pubUrl;

  const wb = readWorkbook(body);
  const ref = sheetRecords(wb.get("Reference Data") ?? [], "DENI ref");
  const enrol = new Map(sheetRecords(wb.get("Enrolments") ?? [], "DENI ref").map((r) => [str(r["DENI ref"]), r]));
  const fsm = new Map(sheetRecords(wb.get("FSM") ?? [], "DENI ref").map((r) => [str(r["DENI ref"]), r]));
  ctx.counters.rowsRead = ref.length;
  const grammar = ref.filter((r) => str(r["School Type"]) === "Grammar");
  ctx.stats.grammarSchools = grammar.length;
  if (grammar.length < 30) throw new Error(`Only ${grammar.length} grammar schools found — workbook layout may have changed`);

  const ni = await upsertArea({ name: "Northern Ireland", type: "nation", nation: "northern_ireland", code: "N92000002", slug: "northern-ireland" });
  const ea = await upsertArea({ name: "Education Authority (Northern Ireland)", type: "education_authority", nation: "northern_ireland", parentId: ni, slug: "education-authority-ni" });
  const deniMap = await identifierMap("deni");
  const taken = await takenSlugs();

  let geo = new Map<string, PostcodeLocation>();
  if (env().NI_POSTCODES_ENABLED) {
    const pcs = grammar.map((r) => normalisePostcode(str(r.Postcode) ?? "")).filter((p): p is string => !!p);
    try {
      geo = await bulkLookup(pcs);
    } catch (err) {
      await ctx.issue("warning", "geocode_failed", `Postcode geocoding failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  } else {
    await ctx.issue("info", "ni_geocoding_disabled", "NI_POSTCODES_ENABLED is false; Northern Ireland schools imported without coordinates");
  }

  const now = new Date();
  for (const r of grammar) {
    const deni = str(r["DENI ref"]);
    const name = str(r["School name"]);
    if (!deni || !name) {
      ctx.counters.rowsRejected++;
      continue;
    }
    try {
      const council = str(r["District Council (2014)"]);
      const regionId = council ? await upsertArea({ name: council, type: "region", nation: "northern_ireland", parentId: ni }) : null;
      const e = enrol.get(deni);
      const y13 = num(e?.["Total: Year 13"]) ?? 0;
      const y14 = num(e?.["Total: Year 14"]) ?? 0;
      const total = num(fsm.get(deni)?.["Total enrolment"]) ?? num(e?.["Mainstream Total"]);
      const core: SchoolCore = {
        name,
        nation: "northern_ireland",
        selectivity: "fully_selective",
        status: "Open",
        isOpen: true,
        establishmentType: "Grammar school",
        establishmentGroup: "Northern Ireland post-primary",
        governance: str(r["Management Type"]),
        phase: "Post-primary",
        gender: "unknown",
        ageLow: null,
        ageHigh: null,
        // Derived from census enrolment: pupils recorded in Years 13–14.
        hasSixthForm: e ? y13 + y14 > 0 : null,
        boarding: "unknown",
        religiousCharacter: null,
        trustName: null,
        trustCode: null,
        localAuthorityId: ea,
        regionId,
        openDate: null,
        closeDate: null,
        sourceDocumentId: documentId,
        sourceLocator: `Reference Data, DENI ref ${deni}`,
        verificationStatus: "officially_verified",
        confidence: "high",
        lastCheckedAt: now,
      };
      const town = str(r.Town);
      const { id } = await upsertSchool(ctx, core, deniMap.get(deni), [name, `${name} ${town ?? ""}`, `${name} ${deni}`], taken);
      deniMap.set(deni, id);
      await upsertIdentifier(id, "deni", deni, { sourceDocumentId: documentId });
      await upsertName(id, name, true, `DENI ${deni}`, documentId);
      const pc = normalisePostcode(str(r.Postcode) ?? "");
      const g = pc ? geo.get(pc) : undefined;
      await upsertLocation(
        id,
        {
          street: [str(r["Building number"]), str(r["Address Line"])].filter(Boolean).join(" ") || null,
          locality: null,
          address3: null,
          town,
          county: null,
          postcode: pc,
          easting: null,
          northing: null,
          latitude: g?.latitude ?? null,
          longitude: g?.longitude ?? null,
          method: g ? "postcode_centroid" : null,
        },
        documentId,
      );
      const yearGroups: Record<string, number> = {};
      for (const y of [8, 9, 10, 11, 12, 13, 14]) {
        const v = num(e?.[`Total: Year ${y}`]);
        if (v !== null) yearGroups[`Year ${y}`] = v;
      }
      const censusDate = academicYear ? `${academicYear.slice(0, 4)}-10-01` : null;
      if (censusDate) {
        const pct = num(fsm.get(deni)?.["% fsme"]);
        const census = {
          pupils: total,
          capacity: null,
          percentFsm: pct === null ? null : String(pct <= 1 ? Math.round(pct * 1000) / 10 : pct),
          yearGroupCounts: yearGroups,
          sourceDocumentId: documentId,
          sourceLocator: `Enrolments/FSM, DENI ref ${deni}`,
          verificationStatus: "officially_verified" as const,
          lastCheckedAt: now,
        };
        await db()
          .insert(schema.schoolCensus)
          .values({ schoolId: id, censusDate, ...census })
          .onConflictDoUpdate({ target: [schema.schoolCensus.schoolId, schema.schoolCensus.censusDate], set: census });
      }
    } catch (err) {
      ctx.counters.rowsRejected++;
      await ctx.issue("error", "row_failed", err instanceof Error ? err.message : String(err), deni);
    }
  }
  await refreshSearchIndex();
}

export function runNiSchools(trigger?: string) {
  return runJob("ni_schools", "deni_census", importNiSchools, { trigger });
}
