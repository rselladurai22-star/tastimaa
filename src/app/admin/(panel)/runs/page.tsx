import { desc, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { formatDate } from "@/lib/format";
import { requireRole } from "@/server/auth";

export default async function RunsPage() {
  await requireRole(["admin", "editor"]);
  const runs = await db().select().from(schema.ingestionRuns).orderBy(desc(schema.ingestionRuns.startedAt)).limit(50);
  const issues = runs.length ? await db().select().from(schema.ingestionIssues).where(inArray(schema.ingestionIssues.runId, runs.map((r) => r.id))) : [];
  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-semibold">Ingestion runs</h1>
      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="border-b border-line bg-surface-2 text-left text-xs text-ink-3">
            <tr>
              {["#", "Job", "Trigger", "Started", "Duration", "Status", "Read", "Inserted", "Updated", "Unchanged", "Rejected", "Issues"].map((h) => (
                <th key={h} className="px-3 py-2 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line tabular">
            {runs.map((r) => {
              const ri = issues.filter((i) => i.runId === r.id);
              return (
                <tr key={r.id} className="align-top">
                  <td className="px-3 py-2">{r.id}</td>
                  <td className="px-3 py-2 font-mono text-xs">{r.job}</td>
                  <td className="px-3 py-2 text-xs">{r.trigger}</td>
                  <td className="px-3 py-2 text-xs">{formatDate(r.startedAt)} {r.startedAt.toISOString().slice(11, 16)}</td>
                  <td className="px-3 py-2 text-xs">{r.finishedAt ? `${Math.round((r.finishedAt.getTime() - r.startedAt.getTime()) / 1000)}s` : r.status === "running" ? "running" : "did not finish"}</td>
                  <td className={r.status === "failed" ? "px-3 py-2 font-semibold text-bad" : r.status === "partial" ? "px-3 py-2 text-warn" : "px-3 py-2 text-ok"}>
                    {r.status}
                    {r.error ? <span className="block max-w-xs text-xs font-normal">{r.error}</span> : null}
                  </td>
                  <td className="px-3 py-2">{r.rowsRead}</td>
                  <td className="px-3 py-2">{r.rowsInserted}</td>
                  <td className="px-3 py-2">{r.rowsUpdated}</td>
                  <td className="px-3 py-2">{r.rowsUnchanged}</td>
                  <td className="px-3 py-2">{r.rowsRejected}</td>
                  <td className="px-3 py-2 text-xs">
                    {ri.length ? (
                      <details>
                        <summary className="cursor-pointer">{ri.length}</summary>
                        <ul className="mt-1 grid gap-1">{ri.slice(0, 20).map((i) => <li key={i.id}>[{i.severity}] {i.code}: {i.message}</li>)}</ul>
                      </details>
                    ) : (
                      0
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
