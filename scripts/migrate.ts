import "./_env";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { closeDb, db } from "@/db";

async function main() {
  // DDL should bypass connection poolers; Neon's Vercel integration provides DATABASE_URL_UNPOOLED.
  if (process.env.DATABASE_URL_UNPOOLED) process.env.DATABASE_URL = process.env.DATABASE_URL_UNPOOLED;
  await migrate(db(), { migrationsFolder: "./src/db/migrations" });
  console.log("Migrations applied");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(closeDb);
