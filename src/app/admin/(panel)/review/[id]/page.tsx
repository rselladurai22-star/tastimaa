import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { formatDate } from "@/lib/format";
import { approveTask, rejectTask, resolveTask } from "@/app/admin/actions";
import { Status as VerificationBadge } from "@/ui/status";
import { requireRole } from "@/server/auth";

export default async function ReviewTask({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  await requireRole(["admin", "editor"]);
  const id = Number((await params).id);
  const sp = await searchParams;
  if (!Number.isInteger(id)) notFound();
  const task = await db().query.adminReviewTasks.findFirst({ where: eq(schema.adminReviewTasks.id, id) });
  if (!task) notFound();
  const school = task.schoolId ? await db().query.schools.findFirst({ where: eq(schema.schools.id, task.schoolId) }) : null;
  const doc = task.evidenceDocumentId ? await db().query.sourceDocuments.findFirst({ where: eq(schema.sourceDocuments.id, task.evidenceDocumentId) }) : null;
  const policy = task.entityType === "admission_policy" && task.entityId ? await db().query.admissionPolicies.findFirst({ where: eq(schema.admissionPolicies.id, task.entityId) }) : null;
  const criteria = policy ? await db().select().from(schema.admissionCriteria).where(eq(schema.admissionCriteria.policyId, policy.id)).orderBy(asc(schema.admissionCriteria.rank)) : [];
  const rules = policy ? await db().select().from(schema.scoreRules).where(eq(schema.scoreRules.policyId, policy.id)) : [];
  const passages = doc ? await db().execute<{ locator: string | null; text: string }>(sql`SELECT locator, text FROM source_extracts WHERE document_id = ${doc.id} ORDER BY id LIMIT 60`) : [];
  const open = task.status === "open" || task.status === "in_review";
  return (
    <div className="grid gap-6">
      <div>
        <Link href="/admin/review" className="text-sm a">
          ← Review queue
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">{task.title}</h1>
        <p className="mt-1 text-sm text-ink-3">
          {task.type} · status {task.status} · created {formatDate(task.createdAt)}
          {school ? (
            <>
              {" "}
              ·{" "}
              <Link href={`/schools/${school.slug}`} className="a">
                {school.name}
              </Link>
            </>
          ) : null}
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="grid content-start gap-4">
          {policy ? (
            <div className="rounded-[8px] border border-rule bg-card p-5 text-sm">
              <div className="flex items-center justify-between">
                <h2 className="font-sans font-semibold">Proposed policy (v{policy.version})</h2>
                <VerificationBadge status={policy.verificationStatus} />
              </div>
              <dl className="mt-3 grid gap-2">
                <div><dt className="text-xs text-ink-3">PAN</dt><dd>{policy.publishedAdmissionNumber ?? "—"}</dd></div>
                <div><dt className="text-xs text-ink-3">Summary</dt><dd>{policy.summary}</dd></div>
                <div><dt className="text-xs text-ink-3">Catchment</dt><dd>{policy.catchmentType} — {policy.catchmentSummary}</dd></div>
                <div><dt className="text-xs text-ink-3">Tie-break</dt><dd>{policy.tieBreak}</dd></div>
              </dl>
              <h3 className="mt-4 font-sans font-semibold">Score rules</h3>
              <ul className="mt-1 grid gap-1">{rules.map((r) => <li key={r.id}>{r.kind}: {r.scoreValue} ({r.appliesTo}) — {r.sourceLocator}</li>)}</ul>
              <h3 className="mt-4 font-sans font-semibold">Criteria</h3>
              <ol className="mt-1 grid gap-1">{criteria.map((c) => <li key={c.id}>{c.rank}. {c.title} <span className="text-ink-3">[{c.sourceLocator}] {JSON.stringify(c.conditions)}</span></li>)}</ol>
            </div>
          ) : null}
          <div className="rounded-[8px] border border-rule bg-card p-5">
            <h2 className="font-sans font-semibold">Payload</h2>
            <pre className="relative mt-2 max-h-[28rem] overflow-auto rounded bg-paper p-3 text-xs whitespace-pre-wrap">{JSON.stringify(task.payload, null, 2)}</pre>
            {task.submittedByEmail ? <p className="mt-2 text-xs text-ink-3">Submitted by {task.submittedByEmail}</p> : null}
          </div>
          {open ? (
            <div className="rounded-[8px] border border-rule bg-card p-5">
              <h2 className="font-sans font-semibold">Decision</h2>
              {sp.error === "note" ? <p className="mt-2 text-sm text-bad">A note is required when rejecting.</p> : null}
              <form className="mt-3 grid gap-3">
                <input type="hidden" name="taskId" value={task.id} />
                <label htmlFor="note" className="text-sm font-medium">Note (what you checked, or why rejected)</label>
                <textarea id="note" name="note" rows={3} className="min-h-11 w-full rounded-[5px] border border-control bg-card px-3 text-ink focus:border-green focus:outline-none text-sm" />
                <div className="flex flex-wrap gap-2">
                  {policy ? (
                    <button formAction={approveTask} className="rounded-[5px] bg-green px-4 py-2 text-sm font-semibold text-paper">
                      Approve and publish as verified
                    </button>
                  ) : null}
                  {policy ? (
                    <button formAction={rejectTask} className="rounded-[5px] border border-bad/40 px-4 py-2 text-sm font-semibold text-bad">
                      Reject
                    </button>
                  ) : null}
                  <button formAction={resolveTask} className="rounded-[5px] border border-control px-4 py-2 text-sm font-medium">
                    Mark resolved
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <p className="text-sm text-ink-2">Resolved {task.resolvedAt ? formatDate(task.resolvedAt) : ""}: {task.resolutionNote}</p>
          )}
        </div>
        <div className="rounded-[8px] border border-rule bg-card p-5">
          <h2 className="font-sans font-semibold">Evidence</h2>
          {doc ? (
            <>
              <p className="mt-2 text-sm">
                <a href={doc.url} className="a" target="_blank" rel="noopener noreferrer">
                  {doc.title}
                </a>{" "}
                <span className="text-ink-3">retrieved {formatDate(doc.retrievedAt)} · sha256 {doc.checksumSha256?.slice(0, 12) ?? "—"}</span>
              </p>
              <ol className="relative mt-3 grid max-h-[40rem] gap-2 overflow-auto text-xs">
                {passages.map((p, i) => (
                  <li key={i} className="rounded border border-rule p-2">
                    <span className="font-semibold text-ink-3">{p.locator}</span>
                    <p className="mt-1 whitespace-pre-wrap text-ink-2">{p.text}</p>
                  </li>
                ))}
              </ol>
            </>
          ) : (
            <p className="mt-2 text-sm text-ink-3">No evidence document attached.</p>
          )}
        </div>
      </div>
    </div>
  );
}
