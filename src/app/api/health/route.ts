import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";

export const dynamic = "force-dynamic";

/** Liveness + database reachability, for load balancers and container health checks. */
export async function GET() {
  try {
    await db().execute(sql`SELECT 1`);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false, error: "database unreachable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
