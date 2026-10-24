import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/lib/env";
import * as schema from "./schema";

export type Database = PostgresJsDatabase<typeof schema>;

declare global {
  var __gsiSql: ReturnType<typeof postgres> | undefined;
  var __gsiDb: Database | undefined;
}

/**
 * Neon's connection strings include `channel_binding=require`, which postgres.js
 * doesn't understand and would send to the server as a runtime setting.
 */
export function normaliseDatabaseUrl(raw: string): string {
  const url = new URL(raw);
  url.searchParams.delete("channel_binding");
  return url.toString();
}

/** Shared connection pool. Reused across hot reloads in development. */
export function sqlClient() {
  if (!globalThis.__gsiSql) {
    const e = env();
    globalThis.__gsiSql = postgres(normaliseDatabaseUrl(e.DATABASE_URL), {
      max: e.DATABASE_POOL_MAX,
      prepare: e.DATABASE_PREPARE,
      idle_timeout: 20,
      connect_timeout: 10,
      onnotice: () => {},
    });
  }
  return globalThis.__gsiSql;
}

export function db(): Database {
  if (!globalThis.__gsiDb) {
    globalThis.__gsiDb = drizzle(sqlClient(), { schema });
  }
  return globalThis.__gsiDb;
}

export async function closeDb() {
  if (globalThis.__gsiSql) {
    await globalThis.__gsiSql.end({ timeout: 5 });
    globalThis.__gsiSql = undefined;
    globalThis.__gsiDb = undefined;
  }
}

export { schema };
