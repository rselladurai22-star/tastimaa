import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { JOBS } from "@/etl/jobs";
import { env } from "@/lib/env";
import { runMaintenance } from "@/server/maintenance";
import { sendDueReminders } from "@/server/reminders";

export const maxDuration = 800;

function authorised(req: Request): boolean {
  const secret = env().CRON_SECRET;
  const header = req.headers.get("authorization") ?? "";
  if (!secret) return false;
  const a = Buffer.from(header);
  const b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Scheduled refreshes. Call with `Authorization: Bearer $CRON_SECRET`.
 * Large imports are better run by the worker (`npm run etl -- <job>`); see docs/DEPLOYMENT.md.
 */
export async function GET(req: Request, { params }: { params: Promise<{ job: string }> }) {
  if (!authorised(req)) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const { job } = await params;
  if (job === "maintenance") return NextResponse.json(await runMaintenance());
  if (job === "reminders") return NextResponse.json(await sendDueReminders());
  const def = JOBS[job];
  if (!def) return NextResponse.json({ error: "Unknown job" }, { status: 404 });
  const result = await def.run("cron");
  return NextResponse.json(result, { status: result.status === "failed" ? 500 : 200 });
}
