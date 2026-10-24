import { z } from "zod";

/**
 * Directory filters, parsed from URL search params so every filter state is
 * deep-linkable and shareable. Each filter is backed by stored data.
 */
const csv = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((v) => (v === undefined ? [] : (Array.isArray(v) ? v : v.split(",")).map((s) => s.trim()).filter(Boolean)));

const bool = z
  .union([z.literal("1"), z.literal("true"), z.literal("0"), z.literal("false"), z.literal("")])
  .optional()
  .transform((v) => (v === "1" || v === "true" ? true : undefined));

export const directoryParamsSchema = z.object({
  q: z.string().trim().max(120).optional().default(""),
  nation: z.enum(["england", "northern_ireland"]).optional().catch(undefined),
  area: z.string().max(80).optional(),
  gender: csv.pipe(z.array(z.enum(["boys", "girls", "mixed"])).catch([])),
  selectivity: csv.pipe(z.array(z.enum(["fully_selective", "partially_selective"])).catch([])),
  test: z.string().max(80).optional(),
  sixthForm: bool,
  boarding: bool,
  outOfArea: bool,
  scoreRoute: bool,
  siblingPriority: bool,
  history: bool,
  postcode: z.string().max(10).optional(),
  radius: z.coerce.number().int().min(1).max(100).optional().catch(undefined),
  sort: z.enum(["relevance", "distance", "name", "gcse", "alevel"]).optional().catch(undefined),
  view: z.enum(["list", "map", "table"]).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(500).optional().default(1).catch(1),
});

export type DirectoryParams = z.infer<typeof directoryParamsSchema>;

export function parseDirectoryParams(sp: Record<string, string | string[] | undefined>): DirectoryParams {
  const flat: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(sp)) flat[k] = Array.isArray(v) && k !== "gender" && k !== "selectivity" ? v[0] : v;
  const parsed = directoryParamsSchema.safeParse(flat);
  return parsed.success ? parsed.data : directoryParamsSchema.parse({});
}

/** Serialise back to a query string, dropping defaults, for stable deep links. */
export function directoryQueryString(p: Partial<DirectoryParams>, overrides: Partial<DirectoryParams> = {}): string {
  const merged = { ...p, ...overrides };
  const out = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) {
    if (v === undefined || v === "" || (v as unknown) === false) continue;
    if (k === "page" && v === 1) continue;
    if (Array.isArray(v)) {
      if (v.length) out.set(k, v.join(","));
    } else if (v === true) out.set(k, "1");
    else out.set(k, String(v));
  }
  const s = out.toString();
  return s ? `?${s}` : "";
}

export const PAGE_SIZE = 24;
