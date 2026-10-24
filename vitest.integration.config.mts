import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/** Integration tests run against a disposable PostGIS database (TEST_DATABASE_URL). */
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    include: ["tests/integration/**/*.test.ts"],
    environment: "node",
    testTimeout: 60_000,
    hookTimeout: 120_000,
    fileParallelism: false,
    globalSetup: ["tests/integration/global-setup.ts"],
    setupFiles: ["tests/integration/env.ts"],
    alias: { "server-only": fileURLToPath(new URL("./tests/support/server-only-stub.ts", import.meta.url)) },
  },
});
