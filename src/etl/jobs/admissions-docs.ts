import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { and, eq } from "drizzle-orm";
import { extractText, getDocumentProxy } from "unpdf";
import { z } from "zod";
import { db, schema } from "@/db";
import { extractPolicyFacts } from "../admissions-extract";
import { HttpError, politeFetch } from "../http";
import { runJob, type JobContext } from "../runner";
import { identifierMap } from "../school-store";

const manifestSchema = z.object({
  documents: z.array(
    z.object({
      urn: z.string(),
      schoolName: z.string(),
      entryYear: z.number().int(),
      title: z.string(),
      url: z.string().url(),
      landingPage: z.string().url().optional(),
    }),
  ),
});

/** Split page text into passages small enough for retrieval. */
export function toPassages(pageText: string, max = 1200): string[] {
  const clean = pageText.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  if (!clean) return [];
  const paras = clean.split(/\n\s*\n|(?<=\.)\s{2,}/);
  const out: string[] = [];
  let buf = "";
  for (const p of paras) {
    if ((buf + " " + p).length > max && buf) {
      out.push(buf.trim());
      buf = "";
    }
    if (p.length > max) {
      for (let i = 0; i < p.length; i += max) out.push(p.slice(i, i + max).trim());
    } else buf += " " + p;
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

export async function extractPdfPages(body: Buffer): Promise<string[]> {
  const pdf = await getDocumentProxy(new Uint8Array(body));
  const { text } = await extractText(pdf, { mergePages: false });
  return Array.isArray(text) ? text : [text];
}

/** Store a document's text as passages and raise a review task with extracted proposals. */
export async function processPolicyDocument(
  ctx: JobContext,
  input: { schoolId: number; documentId: number; title: string; entryYear: number; body: Buffer },
) {
  const pages = await extractPdfPages(input.body);
  await db().delete(schema.sourceExtracts).where(eq(schema.sourceExtracts.documentId, input.documentId));
  const passages = pages.flatMap((p, i) => toPassages(p).map((t) => ({ text: t, locator: `page ${i + 1}` })));
  if (passages.length) {
    await db()
      .insert(schema.sourceExtracts)
      .values(passages.map((p) => ({ documentId: input.documentId, schoolId: input.schoolId, locator: p.locator, heading: input.title, text: p.text })));
  }
  const facts = extractPolicyFacts(pages);
  const existing = await db().query.adminReviewTasks.findFirst({
    where: and(eq(schema.adminReviewTasks.type, "extracted_policy"), eq(schema.adminReviewTasks.evidenceDocumentId, input.documentId)),
    columns: { id: true },
  });
  if (!existing) {
    await db().insert(schema.adminReviewTasks).values({
      type: "extracted_policy",
      title: `Review extracted admissions facts: ${input.title}`,
      schoolId: input.schoolId,
      priority: 2,
      entityType: "admission_policy",
      payload: { entryYear: input.entryYear, pages: pages.length, facts },
      evidenceDocumentId: input.documentId,
      evidenceLocator: `${pages.length} pages`,
    });
  }
  ctx.stats[`doc_${input.documentId}`] = { pages: pages.length, passages: passages.length, warnings: facts.warnings };
  return { pages: pages.length, passages: passages.length, facts };
}

export async function importAdmissionsDocuments(ctx: JobContext) {
  const manifest = manifestSchema.parse(JSON.parse(await readFile(join(process.cwd(), "data", "curated", "admissions-documents.json"), "utf8")));
  const urns = await identifierMap("urn");
  for (const doc of manifest.documents) {
    ctx.counters.rowsRead++;
    const schoolId = urns.get(doc.urn);
    if (!schoolId) {
      ctx.counters.rowsRejected++;
      await ctx.issue("error", "unknown_school", `No school with URN ${doc.urn} (${doc.schoolName})`, doc.urn);
      continue;
    }
    try {
      const { body, contentType } = await politeFetch(doc.url, { timeoutMs: 60_000, maxBytes: 30 * 1024 * 1024 });
      if (!/pdf/i.test(contentType ?? "") && body.subarray(0, 4).toString() !== "%PDF") throw new Error(`Not a PDF (content-type ${contentType})`);
      const { documentId, unchanged } = await ctx.recordDocument({
        title: doc.title,
        url: doc.url,
        body,
        contentType: "application/pdf",
        entryYear: doc.entryYear,
        schoolId,
        extension: "pdf",
      });
      if (unchanged) {
        ctx.counters.rowsUnchanged++;
        continue;
      }
      // A new version of a policy for the same school and year supersedes the old one.
      await processPolicyDocument(ctx, { schoolId, documentId, title: doc.title, entryYear: doc.entryYear, body });
      ctx.counters.rowsInserted++;
    } catch (err) {
      const robotsBlocked = err instanceof HttpError && err.status === 999;
      ctx.counters.rowsRejected++;
      await ctx.issue(robotsBlocked ? "warning" : "error", robotsBlocked ? "robots_disallowed" : "fetch_failed", err instanceof Error ? err.message : String(err), doc.url);
      const open = await db().query.adminReviewTasks.findFirst({
        where: and(eq(schema.adminReviewTasks.type, "missing_field"), eq(schema.adminReviewTasks.schoolId, schoolId), eq(schema.adminReviewTasks.status, "open")),
        columns: { id: true, title: true },
      });
      if (!open || !open.title.includes(doc.title)) {
        await db().insert(schema.adminReviewTasks).values({
          type: "missing_field",
          title: `Manual upload needed: ${doc.title}`,
          schoolId,
          priority: 2,
          payload: {
            reason: robotsBlocked ? "The publisher's robots.txt does not permit automated retrieval of this document." : `Automated retrieval failed: ${err instanceof Error ? err.message : String(err)}`,
            url: doc.url,
            landingPage: doc.landingPage,
            entryYear: doc.entryYear,
          },
        });
      }
    }
  }
}

export const runAdmissionsDocuments = (trigger?: string) => runJob("admissions_documents", "school_admissions_documents", importAdmissionsDocuments, { trigger });
