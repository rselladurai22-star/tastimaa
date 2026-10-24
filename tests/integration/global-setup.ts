import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

/** Recreate the schema from migrations so every run starts clean. */
export default async function setup() {
  const url = process.env.TEST_DATABASE_URL ?? "postgres://gsi:gsi@localhost:5432/gsi_test";
  if (!/test/.test(url)) throw new Error(`Refusing to reset a non-test database: ${url}`);
  const sql = postgres(url, { max: 1, onnotice: () => {} });
  await sql.unsafe("DROP SCHEMA IF EXISTS drizzle CASCADE; DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;");
  await migrate(drizzle(sql), { migrationsFolder: "./src/db/migrations" });
  await sql.end();
}
