import Link from "next/link";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { JOBS } from "@/etl/jobs";
import { formatDate, relativeAge } from "@/lib/format";
import { requireRole } from "@/server/auth";
import { dataFreshness } from "@/server/insights";
import { runIngestionJob } from "@/app/admin/actions";

export default async function AdminDashboard() {
  // Checked per page as well as in the layout: layouts are not re-run on client navigation.
  const user = await requireRole(["admin", "editor"]);
  const [freshness, [q], [coverage], changes] = await Promise.all([
    dataFreshness(),
    db().execute<{ open: number; policies: number; corrections: number; failures: number; uploads: number }>(sql`
      SELECT count(*) FILTER (WHERE status IN ('open','in_review'))::int AS open,
        count(*) FILTER (WHERE status IN ('open','in_review') AND type IN ('extracted_policy','extracted_rule'))::int AS policies,
        count(*) FILTER (WHERE status IN ('open','in_review') AND type = 'user_correction')::int AS corrections,
        count(*) FILTER (WHERE status IN ('open','in_review') AND type = 'ingestion_failure')::int AS failures,
        count(*) FILTER (WHERE status IN ('open','in_review') AND type = 'missing_field')::int AS uploads
      FROM admin_review_tasks`),
    db().execute<{ schools: number; no_location: number; no_website: number; no_policy: number; no_test: number; stale: number; no_results: number; no_inspection: number }>(sql`
      SELECT count(*)::int AS schools,
        count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM school_locations l WHERE l.school_id = s.id AND l.location IS NOT NULL))::int AS no_location,
        count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM school_contacts c WHERE c.school_id = s.id AND c.website IS NOT NULL))::int AS no_website,
        count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM admission_policies p WHERE p.school_id = s.id AND p.status IN ('published','awaiting_verification')))::int AS no_policy,
        count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM school_entrance_tests t WHERE t.school_id = s.id))::int AS no_test,
        count(*) FILTER (WHERE s.last_checked_at < now() - interval '30 days')::int AS stale,
        count(*) FILTER (WHERE s.nation = 'england' AND NOT EXISTS (SELECT 1 FROM academic_results r WHERE r.school_id = s.id AND r.value IS NOT NULL))::int AS no_results,
        count(*) FILTER (WHERE s.nation = 'england' AND NOT EXISTS (SELECT 1 FROM inspections i WHERE i.school_id = s.id))::int AS no_inspection
      FROM schools s WHERE s.is_open AND s.selectivity <> 'non_selective'`),
    db().execute<{ name: string; slug: string; field: string; old_value: unknown; new_value: unknown; detected_at: string }>(sql`
      SELECT s.name, s.slug, c.field, c.old_value, c.new_value, c.detected_at FROM change_events c JOIN schools s ON s.id = c.school_id ORDER BY c.detected_at DESC LIMIT 12`),
  ]);
  const c = coverage!;
  const gaps: [string, number][] = [
    ["No admissions policy held", c.no_policy],
    ["No entrance test linked", c.no_test],
    ["No coordinates", c.no_location],
    ["No website", c.no_website],
    ["England: no results", c.no_results],
    ["England: no inspection", c.no_inspection],
    ["Not checked in 30 days", c.stale],
  ];
  return (
    <div className="grid gap-8">
      <h1 className="text-h2">Dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ["Open review tasks", q!.open, "/admin/review"],
          ["Policies to verify", q!.policies, "/admin/review?type=extracted_policy"],
          ["User corrections", q!.corrections, "/admin/review?type=user_correction"],
          ["Manual uploads needed", q!.uploads, "/admin/review?type=missing_field"],
          ["Ingestion failures", q!.failures, "/admin/review?type=ingestion_failure"],
        ].map(([label, n, href]) => (
          <Link key={label as string} href={href as string} className="rounded-[8px] border border-rule bg-card p-4 hover:border-control">
            <p className="text-xs text-ink-3">{label}</p>
            <p className={Number(n) > 0 && label === "Ingestion failures" ? "text-2xl font-semibold text-bad" : "text-2xl font-semibold"}>{n}</p>
          </Link>
        ))}
      </div>
      <section>
        <h2 className="mb-3 text-h4">Ingestion health</h2>
        <div className="relative overflow-x-auto rounded-[8px] border border-rule bg-card">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-ink bg-paper text-left font-mono text-[0.72rem] tracking-[0.06em] text-ink-2 uppercase">
              <tr>
                <th className="px-4 py-2 font-medium">Job</th>
                <th className="px-4 py-2 font-medium">Last success</th>
                <th className="px-4 py-2 font-medium">Last run</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Schedule</th>
                {user?.role === "admin" ? <th className="px-4 py-2 font-medium">Run</th> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {Object.keys(JOBS).map((job) => {
                const f = freshness.find((x) => x.job === job);
                return (
                  <tr key={job}>
                    <td className="px-4 py-2 font-mono text-xs">{job}</td>
                    <td className="px-4 py-2">{f?.last_success ? relativeAge(f.last_success) : "Never"}</td>
                    <td className="px-4 py-2">{f?.last_run ? formatDate(f.last_run) : "—"}</td>
                    <td className="px-4 py-2">{f?.last_status ?? "—"}</td>
                    <td className="px-4 py-2 font-mono text-xs">{JOBS[job]!.schedule}</td>
                    {user?.role === "admin" ? (
                      <td className="px-4 py-2">
                        <form action={runIngestionJob}>
                          <input type="hidden" name="job" value={job} />
                          <button type="submit" className="rounded-[4px] border border-rule px-2 py-1 text-xs hover:bg-sage">
                            Run now
                          </button>
                        </form>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-[8px] border border-rule bg-card p-5">
          <h2 className="text-h4">Coverage gaps ({c.schools} schools)</h2>
          <ul className="mt-3 grid gap-2 text-sm">
            {gaps.map(([label, n]) => (
              <li key={label} className="flex items-center gap-3">
                <span className="w-48 text-ink-2">{label}</span>
                <span className="h-2 flex-1 rounded bg-sage-deep">
                  <span className="block h-2 rounded bg-green" style={{ width: `${Math.round((n / Math.max(1, c.schools)) * 100)}%` }} />
                </span>
                <span className="w-12 text-right num">{n}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-[8px] border border-rule bg-card p-5">
          <h2 className="text-h4">Recent detected changes</h2>
          <ul className="mt-3 grid gap-2 text-sm">
            {changes.length ? (
              changes.map((ch, i) => (
                <li key={i}>
                  <Link className="a" href={`/schools/${ch.slug}`}>
                    {ch.name}
                  </Link>{" "}
                  <span className="text-ink-3">
                    {ch.field}: {JSON.stringify(ch.old_value)} → {JSON.stringify(ch.new_value)} · {relativeAge(ch.detected_at)}
                  </span>
                </li>
              ))
            ) : (
              <li className="text-ink-3">No changes detected yet.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
