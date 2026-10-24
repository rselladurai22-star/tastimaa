import { z } from "zod";

/**
 * Server-side environment, validated once at startup. Anything optional here
 * degrades gracefully (e.g. no ANTHROPIC_API_KEY → retrieval-only assistant).
 * Never import this module from client components.
 */
const boolish = z
  .enum(["true", "false", "1", "0", ""])
  .optional()
  .transform((v) => v === "true" || v === "1");

const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().url().default("postgres://gsi:gsi@localhost:5432/gsi"),
  DATABASE_POOL_MAX: z.coerce.number().int().positive().default(10),
  SITE_URL: z.string().url().default("http://localhost:3000"),
  SESSION_SECRET: z.string().min(32).optional(),
  CRON_SECRET: z.string().min(16).optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default("claude-sonnet-5-5"),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("Grammar Atlas <no-reply@example.com>"),
  STORAGE_DIR: z.string().default("./storage"),
  POSTCODES_IO_BASE_URL: z.string().url().default("https://api.postcodes.io"),
  /**
   * Northern Ireland postcode data distributed via ONSPD/postcodes.io is
   * subject to Land & Property Services licence terms. Leave disabled until
   * the operator has confirmed their use is permitted.
   */
  NI_POSTCODES_ENABLED: boolish,
  ETL_USER_AGENT: z.string().default("GrammarAtlasBot/0.1 (+https://example.com/methodology)"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

export type ServerEnv = z.infer<typeof serverSchema>;

let cached: ServerEnv | undefined;

export function env(): ServerEnv {
  if (cached) return cached;
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid environment configuration: ${issues}`);
  }
  if (parsed.data.NODE_ENV === "production" && !parsed.data.SESSION_SECRET) {
    throw new Error("SESSION_SECRET is required in production");
  }
  cached = parsed.data;
  return cached;
}

/** For tests only. */
export function resetEnvCache() {
  cached = undefined;
}
