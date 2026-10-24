// Vercel build: apply migrations for production deployments, then build.
// Preview builds skip migrations so they never alter the production schema.
import { execFileSync } from "node:child_process";

const run = (cmd, args) => execFileSync(cmd, args, { stdio: "inherit" });

if (process.env.VERCEL_ENV === "production") {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set for the Production environment. Connect a Postgres database with PostGIS first (see docs/DEPLOYMENT.md).");
    process.exit(1);
  }
  run("npm", ["run", "db:migrate"]);
  // There is no shell on Vercel, so the first admin comes from environment variables.
  // Remove ADMIN_PASSWORD afterwards: while it is set, each production build resets that password.
  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    run("npm", ["run", "admin:create", "--", process.env.ADMIN_EMAIL, "admin"]);
  }
} else {
  console.log(`Skipping migrations for a ${process.env.VERCEL_ENV ?? "non-Vercel"} build.`);
}
run("npx", ["next", "build"]);
