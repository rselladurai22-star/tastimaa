import { existsSync } from "node:fs";

// Load .env for CLI scripts (Next.js loads it automatically for the app).
for (const file of [".env.local", ".env"]) {
  if (existsSync(file)) process.loadEnvFile(file);
}
