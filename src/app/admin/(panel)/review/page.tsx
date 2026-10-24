import Link from "next/link";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { relativeAge } from "@/lib/format";

const TYPES = ["extracted_policy", "extracted_rule", "user_correction", "missing_field", "ingestion_failure", "conflicting_sources", "stale_record", "change_detected"];

export default async function ReviewQueue({ searchParams }: { searchParams: Promise<{ type?: string; status?: string }> }) {
  const sp = await searchParams;
  const type = TYPES.includes(sp.type ?? "") ? sp.type! : null;
  const status = ["open", "approved", "rejected", "resolved"].includes(sp.status ?? "") ? sp.status! : "open";
  const rows = await db().execute<{ id: number; type: string; status: string; priority: number; title: string; created_at: string; school: string | null; slug: string | null }>(sql`
    SELECT t.id, t.type, t.status, t.priority, t.title, t.created_at, s.name AS school, s.slug
    FROM admin_review_tasks t LEFT JOIN schools s ON s.id = t.school_id
    WHERE (${type}::text IS NULL OR t.type::text = ${type}) AND (${status} = 'open' AND t.status IN ('open','in_review') OR t.status::text = ${status})
    ORDER BY t.priority, t.created_at DESC LIMIT 200
  `);
  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-semibold">Review queue</h1>
      <p className="max-w-3xl text-sm text-ink-2">Nothing extracted automatically or submitted by users becomes a verified fact until it is approved here against the cited evidence.</p>
      <nav className="flex flex-wrap gap-2 text-sm" aria-label="Filter">
        {[null, ...TYPES].map((t) => (
          <Link key={t ?? "all"} href={`/admin/review?${t ? `type=${t}&` : ""}status=${status}`} className={t === type ? "rounded-full bg-accent-soft px-3 py-1 font-semibold text-accent-ink" : "rounded-full border border-line px-3 py-1 text-ink-2"}>
            {t ? t.replace(/_/g, " ") : "all"}
          </Link>
        ))}
        <span className="mx-2 text-ink-3">|</span>
        {["open", "approved", "rejected", "resolved"].map((s) => (
          <Link key={s} href={`/admin/review?${type ? `type=${type}&` : ""}status=${s}`} className={s === status ? "font-semibold underline" : "text-ink-2"}>
            {s}
          </Link>
        ))}
      </nav>
      <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
        {rows.length === 0 ? <li className="p-6 text-sm text-ink-3">Nothing here.</li> : null}
        {rows.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <span className={r.priority === 1 ? "rounded bg-bad-soft px-1.5 py-0.5 text-xs font-semibold text-bad" : "rounded bg-surface-2 px-1.5 py-0.5 text-xs text-ink-2"}>P{r.priority}</span>
            <span className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-xs">{r.type}</span>
            <Link href={`/admin/review/${r.id}`} className="min-w-0 flex-1 font-medium hover:underline">
              {r.title}
            </Link>
            <span className="text-xs text-ink-3">
              {r.school ?? ""} · {relativeAge(r.created_at)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
