import "server-only";
import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";

/**
 * Client key: a salted hash of the IP so raw addresses are never stored.
 * The leftmost X-Forwarded-For entries are whatever the client sent, so we take
 * the entry added by our own outermost proxy: TRUSTED_PROXY_HOPS from the right
 * (default 1, i.e. one reverse proxy or platform edge in front of the app).
 */
export function clientIp(req: Request): string {
  const hops = Math.max(1, Math.floor(Number(process.env.TRUSTED_PROXY_HOPS ?? 1)) || 1);
  const chain = (req.headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return chain[Math.max(0, chain.length - hops)] || req.headers.get("x-real-ip") || "unknown";
}

export function clientKey(req: Request): string {
  const ip = clientIp(req);
  return createHash("sha256").update(`${process.env.SESSION_SECRET ?? "dev"}:${ip}`).digest("hex").slice(0, 24);
}

/**
 * Fixed-window limiter backed by Postgres so it works across instances.
 * Returns a 429 response when the limit is exceeded, otherwise null.
 */
export async function rateLimit(req: Request, bucket: string, limit: number, windowSeconds: number): Promise<NextResponse | null> {
  const key = `${bucket}:${clientKey(req)}`;
  try {
    const [row] = await db().execute<{ count: number }>(sql`
      INSERT INTO rate_limits (key, window_start, count) VALUES (${key}, now(), 1)
      ON CONFLICT (key) DO UPDATE SET
        count = CASE WHEN rate_limits.window_start < now() - make_interval(secs => ${windowSeconds}) THEN 1 ELSE rate_limits.count + 1 END,
        window_start = CASE WHEN rate_limits.window_start < now() - make_interval(secs => ${windowSeconds}) THEN now() ELSE rate_limits.window_start END
      RETURNING count
    `);
    if (row && row.count > limit) {
      return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429, headers: { "Retry-After": String(windowSeconds) } });
    }
  } catch {
    // Fail open: rate limiting must never take the site down.
  }
  return null;
}
