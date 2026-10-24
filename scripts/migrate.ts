import "./_env";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { closeDb, db } from "@/db";

async function main() {
  await migrate(db(), { migrationsFolder: "./src/db/migrations" });
  console.log("Migrations applied");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(closeDb);
