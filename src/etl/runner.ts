import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { logger } from "@/lib/logger";
import { putObject } from "./storage";
import { sha256 } from "./http";
import { ensureSource, type SourceKey } from "./sources";

export interface RunCounters {
  rowsRead: number;
  rowsInserted: number;
  rowsUpdated: number;
  rowsUnchanged: number;
  rowsRejected: number;
}

export interface JobContext {
  runId: number;
  sourceId: number;
  counters: RunCounters;
  stats: Record<string, unknown>;
  issue(severity: "info" | "warning" | "error", code: string, message: string, recordRef?: string): Promise<void>;
  /**
   * Store a downloaded file and register it as a source document. Returns the
   * document id and whether identical content was already ingested.
   */
  recordDocument(input: {
    title: string;
    url: string;
    body: Buffer;
    contentType?: string | null;
    publishedAt?: string | null;
    academicYear?: string | null;
    entryYear?: number | null;
    version?: string | null;
    schoolId?: number | null;
    extension?: string;
  }): Promise<{ documentId: number; unchanged: boolean }>;
}

export interface JobResult {
  runId: number;
  status: "succeeded" | "partial" | "failed";
  counters: RunCounters;
  error?: string;
}

/**
 * Execute an ingestion job with full bookkeeping: an `ingestion_runs` row is
 * created up front, counters and issues are recorded, and failures are
 * captured rather than thrown so scheduled refreshes never crash the worker.
 */
export async function runJob(
  job: string,
  sourceKey: SourceKey,
  fn: (ctx: JobContext) => Promise<void>,
  opts: { trigger?: string } = {},
): Promise<JobResult> {
  const sourceId = await ensureSource(sourceKey);
  const [run] = await db()
    .insert(schema.ingestionRuns)
    .values({ job, sourceId, trigger: opts.trigger ?? "manual" })
    .returning({ id: schema.ingestionRuns.id });
  if (!run) throw new Error("Could not create ingestion run");
  const runId = run.id;
  const counters: RunCounters = { rowsRead: 0, rowsInserted: 0, rowsUpdated: 0, rowsUnchanged: 0, rowsRejected: 0 };
  const stats: Record<string, unknown> = {};
  let errorCount = 0;
  let lastDocumentId: number | undefined;

  const ctx: JobContext = {
    runId,
    sourceId,
    counters,
    stats,
    async issue(severity, code, message, recordRef) {
      if (severity === "error") errorCount++;
      await db().insert(schema.ingestionIssues).values({ runId, severity, code, message, recordRef });
    },
    async recordDocument(input) {
      const checksum = sha256(input.body);
      const existing = await db().query.sourceDocuments.findFirst({
        where: and(eq(schema.sourceDocuments.url, input.url), eq(schema.sourceDocuments.checksumSha256, checksum)),
        columns: { id: true },
      });
      if (existing) {
        await db()
          .update(schema.sourceDocuments)
          .set({ retrievedAt: new Date(), updatedAt: new Date() })
          .where(eq(schema.sourceDocuments.id, existing.id));
        lastDocumentId = existing.id;
        return { documentId: existing.id, unchanged: true };
      }
      const ext = input.extension ?? "bin";
      const key = `sources/${sourceKey}/${new Date().toISOString().slice(0, 10)}-${checksum.slice(0, 12)}.${ext}`;
      await putObject(key, input.body);
      // Older versions of the same URL become "superseded".
      const [doc] = await db()
        .insert(schema.sourceDocuments)
        .values({
          sourceId,
          schoolId: input.schoolId ?? null,
          title: input.title,
          url: input.url,
          publishedAt: input.publishedAt ?? null,
          academicYear: input.academicYear ?? null,
          entryYear: input.entryYear ?? null,
          version: input.version ?? null,
          checksumSha256: checksum,
          contentType: input.contentType ?? null,
          byteSize: input.body.byteLength,
          storageKey: key,
        })
        .returning({ id: schema.sourceDocuments.id });
      if (!doc) throw new Error("Could not record source document");
      lastDocumentId = doc.id;
      return { documentId: doc.id, unchanged: false };
    },
  };

  const started = Date.now();
  logger.info("job started", { job, runId });
  try {
    await fn(ctx);
    const status = errorCount > 0 ? "partial" : "succeeded";
    await db()
      .update(schema.ingestionRuns)
      .set({ status, finishedAt: new Date(), documentId: lastDocumentId ?? null, ...counters, stats })
      .where(eq(schema.ingestionRuns.id, runId));
    if (status === "succeeded") {
      // A clean run supersedes earlier failures of the same job.
      await db()
        .update(schema.adminReviewTasks)
        .set({ status: "resolved", resolvedAt: new Date(), resolutionNote: `Superseded by successful run #${runId}`, updatedAt: new Date() })
        .where(and(eq(schema.adminReviewTasks.type, "ingestion_failure"), inArray(schema.adminReviewTasks.status, ["open", "in_review"]), sql`${schema.adminReviewTasks.payload}->>'job' = ${job}`));
    }
    logger.info("job finished", { job, runId, status, ms: Date.now() - started, ...counters });
    return { runId, status, counters };
  } catch (err) {
    const cause = err instanceof Error && err.cause instanceof Error ? ` — cause: ${err.cause.message}` : "";
    const raw = err instanceof Error ? err.message : String(err);
    // Drizzle query errors embed the whole statement; keep the first line only.
    const message = `${raw.split("\n")[0]!.slice(0, 300)}${cause}`;
    await db()
      .update(schema.ingestionRuns)
      .set({ status: "failed", finishedAt: new Date(), error: message.slice(0, 4000), documentId: lastDocumentId ?? null, ...counters, stats })
      .where(eq(schema.ingestionRuns.id, runId));
    // One open task per failing job: repeat failures update it rather than flooding the queue.
    const payload = { job, runId, error: message.slice(0, 2000) };
    const [existing] = await db()
      .select({ id: schema.adminReviewTasks.id })
      .from(schema.adminReviewTasks)
      .where(and(eq(schema.adminReviewTasks.type, "ingestion_failure"), inArray(schema.adminReviewTasks.status, ["open", "in_review"]), sql`${schema.adminReviewTasks.payload}->>'job' = ${job}`))
      .limit(1);
    if (existing) await db().update(schema.adminReviewTasks).set({ payload, updatedAt: new Date() }).where(eq(schema.adminReviewTasks.id, existing.id));
    else await db().insert(schema.adminReviewTasks).values({ type: "ingestion_failure", title: `Ingestion job "${job}" failed`, priority: 1, payload });
    logger.error("job failed", { job, runId, error: err });
    return { runId, status: "failed", counters, error: message };
  }
}

/** Most recent successful run for a job (used for freshness reporting). */
export async function lastSuccessfulRun(job: string) {
  return db().query.ingestionRuns.findFirst({
    where: and(eq(schema.ingestionRuns.job, job), eq(schema.ingestionRuns.status, "succeeded")),
    orderBy: desc(schema.ingestionRuns.startedAt),
  });
}
