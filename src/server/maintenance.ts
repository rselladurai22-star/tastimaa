import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";

/** Retention rules from the privacy notice, applied daily. */
export async function runMaintenance() {
  const r = await db().transaction(async (tx) => {
    const sessions = await tx.execute(sql`DELETE FROM sessions WHERE expires_at < now()`);
    const tokens = await tx.execute(sql`DELETE FROM login_tokens WHERE expires_at < now() - interval '1 day'`);
    const rate = await tx.execute(sql`DELETE FROM rate_limits WHERE window_start < now() - interval '1 hour'`);
    const postcodes = await tx.execute(sql`DELETE FROM postcode_cache WHERE fetched_at < now() - interval '30 days'`);
    // A run killed by a platform time limit never records its end; don't leave it "running" forever.
    const abandoned = await tx.execute(sql`
      UPDATE ingestion_runs SET status = 'failed', error = 'Did not finish: the process was stopped before the run completed (for example by a hosting time limit).'
      WHERE status = 'running' AND started_at < now() - interval '1 hour'`);
    const ai = await tx.execute(sql`DELETE FROM ai_queries WHERE created_at < now() - interval '12 months'`);
    const unconfirmed = await tx.execute(sql`DELETE FROM reminder_subscriptions WHERE confirmed_at IS NULL AND created_at < now() - interval '7 days'`);
    const corrections = await tx.execute(sql`UPDATE admin_review_tasks SET submitted_by_email = NULL WHERE submitted_by_email IS NOT NULL AND resolved_at < now() - interval '6 months'`);
    const stale = await tx.execute(sql`
      INSERT INTO admin_review_tasks (type, title, school_id, priority, payload)
      SELECT 'stale_record', 'Record not refreshed in 30 days: ' || s.name, s.id, 3, jsonb_build_object('lastCheckedAt', s.last_checked_at)
      FROM schools s
      WHERE s.is_open AND s.last_checked_at < now() - interval '30 days'
        AND NOT EXISTS (SELECT 1 FROM admin_review_tasks t WHERE t.school_id = s.id AND t.type = 'stale_record' AND t.status = 'open')`);
    return { sessions: sessions.count, tokens: tokens.count, rate: rate.count, postcodes: postcodes.count, abandonedRuns: abandoned.count, ai: ai.count, unconfirmed: unconfirmed.count, corrections: corrections.count, staleFlagged: stale.count };
  });
  return r;
}
