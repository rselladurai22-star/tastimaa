import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { clean, decodeCsv, parseCsv, toIsoDate, toInt } from "../csv";
import { fetchBuffer, fetchJson } from "../http";
import { runJob, type JobContext } from "../runner";
import { identifierMap } from "../school-store";

const CONTENT_API = "https://www.gov.uk/api/content/government/statistical-data-sets/monthly-management-information-ofsteds-school-inspections-outcomes";

/** Report card evaluation areas under the renewed framework (from 10 November 2025). */
export const REPORT_CARD_AREAS = [
  ["Inclusion", "inclusion"],
  ["Curriculum and teaching", "curriculum_and_teaching"],
  ["Achievement", "achievement"],
  ["Attendance and behaviour", "attendance_and_behaviour"],
  ["Personal development and wellbeing", "personal_development_and_wellbeing"],
  ["Leadership and governance", "leadership_and_governance"],
  ["Early years (where applicable)", "early_years"],
  ["Post-16 provision (where applicable)", "post_16"],
] as const;

/** Graded judgements under the 2019 education inspection framework (1–4). */
export const EIF_AREAS = [
  ["Latest OEIF quality of education", "quality_of_education"],
  ["Latest OEIF behaviour and attitudes", "behaviour_and_attitudes"],
  ["Latest OEIF personal development", "personal_development"],
  ["Latest OEIF effectiveness of leadership and management", "leadership_and_management"],
  ["Latest OEIF early years provision (where applicable)", "early_years"],
  ["Latest OEIF sixth form provision (where applicable)", "sixth_form"],
] as const;

interface Attachment {
  title: string;
  url: string;
  content_type?: string;
}

/** Choose the most recent "latest inspections as at …" CSV. Exported for tests. */
export function pickLatestInspectionsCsv(attachments: Attachment[]): Attachment | null {
  const candidates = attachments
    .filter((a) => /latest inspections/i.test(a.title) && /state-funded schools/i.test(a.title) && (a.content_type === "text/csv" || a.url.endsWith(".csv")))
    .map((a) => {
      const m = /as at (\d{1,2}) ([A-Za-z]+) (\d{4})/.exec(a.title);
      const date = m ? new Date(`${m[1]} ${m[2]} ${m[3]} UTC`) : null;
      return { a, t: date && !Number.isNaN(date.getTime()) ? date.getTime() : 0 };
    })
    .sort((x, y) => y.t - x.t);
  return candidates[0]?.a ?? null;
}


export async function importOfsted(ctx: JobContext) {
  const content = await fetchJson<{ details: { attachments: Attachment[] } }>(CONTENT_API);
  const att = pickLatestInspectionsCsv(content.details.attachments);
  if (!att) throw new Error("No 'latest inspections' CSV found on the Ofsted management information page");
  const { body } = await fetchBuffer(att.url, { timeoutMs: 300_000 });
  const asAt = /as at (.+)$/.exec(att.title)?.[1] ?? null;
  const { documentId } = await ctx.recordDocument({ title: att.title, url: att.url, body, contentType: "text/csv", extension: "csv" });
  ctx.stats.file = att.title;

  const urns = await identifierMap("urn");
  const rows = parseCsv(decodeCsv(body), undefined, (r) => urns.has(r.URN ?? ""));
  ctx.counters.rowsRead = rows.length;
  const now = new Date();

  async function saveInspection(
    schoolId: number,
    data: Omit<typeof schema.inspections.$inferInsert, "schoolId" | "sourceDocumentId" | "verificationStatus" | "lastCheckedAt">,
    evaluations: { area: string; grade: string; scale: string }[],
  ) {
    const values = { ...data, schoolId, sourceDocumentId: documentId, verificationStatus: "officially_verified" as const, confidence: "high" as const, lastCheckedAt: now };
    const existing = await db().query.inspections.findFirst({
      where: and(eq(schema.inspections.schoolId, schoolId), eq(schema.inspections.inspectionNumber, data.inspectionNumber)),
      columns: { id: true },
    });
    let id: number;
    if (existing) {
      await db().update(schema.inspections).set({ ...values, updatedAt: now }).where(eq(schema.inspections.id, existing.id));
      id = existing.id;
      ctx.counters.rowsUnchanged++;
    } else {
      const [row] = await db().insert(schema.inspections).values(values).returning({ id: schema.inspections.id });
      id = row!.id;
      ctx.counters.rowsInserted++;
    }
    await db().delete(schema.inspectionEvaluations).where(eq(schema.inspectionEvaluations.inspectionId, id));
    if (evaluations.length) await db().insert(schema.inspectionEvaluations).values(evaluations.map((e) => ({ ...e, inspectionId: id })));
  }

  for (const r of rows) {
    const schoolId = urns.get(r.URN!)!;
    const locator = `${att.title}, URN ${r.URN}`;
    try {
      // 1. Renewed framework report card (Nov 2025 onwards).
      const rcNumber = clean(r["Inspection number of latest full inspection"]);
      if (rcNumber) {
        const evals = REPORT_CARD_AREAS.map(([col, area]) => ({ area, grade: clean(r[col]) ?? "", scale: "report_card_5" })).filter((e) => e.grade && e.grade !== "Not applicable");
        await saveInspection(
          schoolId,
          {
            inspectionNumber: rcNumber,
            framework: "report_card_2025",
            inspectionType: clean(r["Inspection type"]),
            startDate: toIsoDate(r["Inspection start date"]),
            publicationDate: toIsoDate(r["Publication date"]),
            urnAtInspection: clean(r["URN at time of latest full inspection"]),
            relatesToCurrentUrn: clean(r["Does the latest full inspection relate to the URN of the current school?"]) === "Yes",
            overallEffectiveness: null,
            outcome: null,
            categoryOfConcern: clean(r["Category of concern"]),
            safeguarding: clean(r["Safeguarding standards"]),
            reportUrl: clean(r["Web Link"]),
            sourceLocator: locator,
          },
          evals,
        );
      }
      // 2. Latest graded inspection under the 2019 EIF.
      const eifNumber = clean(r["Inspection number of latest OEIF graded inspection"]);
      if (eifNumber) {
        const evals = EIF_AREAS.map(([col, area]) => ({ area, grade: clean(r[col]) ?? "", scale: "eif_4" })).filter((e) => /^[1-4]$/.test(e.grade));
        await saveInspection(
          schoolId,
          {
            inspectionNumber: eifNumber,
            framework: "eif_2019",
            inspectionType: clean(r["Inspection type of latest OEIF graded inspection"]),
            startDate: toIsoDate(r["Inspection start date of latest OEIF graded inspection"]),
            publicationDate: toIsoDate(r["Publication date of latest OEIF graded inspection"]),
            urnAtInspection: clean(r["URN at time of latest OEIF graded inspection"]),
            relatesToCurrentUrn: clean(r["Does the latest OEIF graded inspection relate to the URN of the current school?"]) === "Yes",
            overallEffectiveness: toInt(r["Latest OEIF overall effectiveness"]),
            outcome: null,
            categoryOfConcern: clean(r["Latest OEIF category of concern"]),
            safeguarding: clean(r["Latest OEIF  safeguarding is effective?"]),
            reportUrl: clean(r["Web Link"]),
            sourceLocator: locator,
          },
          evals,
        );
      }
      // 3. Latest ungraded inspection.
      const ungNumber = clean(r["Latest ungraded inspection number"]);
      if (ungNumber) {
        await saveInspection(
          schoolId,
          {
            inspectionNumber: ungNumber,
            framework: "eif_2019_ungraded",
            inspectionType: "Ungraded inspection",
            startDate: toIsoDate(r["Date of latest ungraded inspection"]),
            publicationDate: toIsoDate(r["Ungraded inspection publication date"]),
            urnAtInspection: clean(r["URN at time of the ungraded inspection"]),
            relatesToCurrentUrn: clean(r["Does the ungraded inspection relate to the URN of the current school?"]) === "Yes",
            overallEffectiveness: null,
            outcome: clean(r["Ungraded inspection overall outcome"]),
            categoryOfConcern: null,
            safeguarding: null,
            reportUrl: clean(r["Web Link"]),
            sourceLocator: locator,
          },
          [],
        );
      }
      if (!rcNumber && !eifNumber && !ungNumber) await ctx.issue("info", "no_inspection_in_mi", "No inspection recorded in the management information", r.URN);
    } catch (err) {
      ctx.counters.rowsRejected++;
      await ctx.issue("error", "row_failed", err instanceof Error ? err.message : String(err), r.URN);
    }
  }
  ctx.stats.asAt = asAt;
}

export const runOfsted = (trigger?: string) => runJob("ofsted_mi", "ofsted_mi", importOfsted, { trigger });
