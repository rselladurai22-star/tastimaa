import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { slugify, uniqueSlug } from "@/lib/slug";
import type { JobContext } from "./runner";

type Nation = (typeof schema.nationEnum.enumValues)[number];
type AreaType = (typeof schema.areaTypeEnum.enumValues)[number];

export type SchoolCore = Omit<typeof schema.schools.$inferInsert, "id" | "slug" | "createdAt" | "updatedAt" | "searchDocument" | "searchText">;

/** Fields whose changes are recorded as change events (shown in admin and on profiles). */
const TRACKED_FIELDS = [
  "name",
  "status",
  "isOpen",
  "establishmentType",
  "gender",
  "ageLow",
  "ageHigh",
  "hasSixthForm",
  "boarding",
  "trustName",
  "selectivity",
  "closeDate",
] as const satisfies readonly (keyof SchoolCore)[];

const areaCache = new Map<string, number>();

export async function upsertArea(input: {
  name: string;
  type: AreaType;
  nation: Nation;
  code?: string | null;
  legacyCode?: string | null;
  parentId?: number | null;
  slug?: string;
}): Promise<number> {
  const cacheKey = `${input.nation}:${input.type}:${input.name}`;
  const hit = areaCache.get(cacheKey);
  if (hit) return hit;
  const existing = await db().query.geographicAreas.findFirst({
    where: and(eq(schema.geographicAreas.nation, input.nation), eq(schema.geographicAreas.type, input.type), eq(schema.geographicAreas.name, input.name)),
  });
  if (existing) {
    if ((input.code && existing.code !== input.code) || (input.parentId && existing.parentId !== input.parentId)) {
      await db()
        .update(schema.geographicAreas)
        .set({ code: input.code ?? existing.code, legacyCode: input.legacyCode ?? existing.legacyCode, parentId: input.parentId ?? existing.parentId, updatedAt: new Date() })
        .where(eq(schema.geographicAreas.id, existing.id));
    }
    areaCache.set(cacheKey, existing.id);
    return existing.id;
  }
  let slug = input.slug ?? slugify(input.name);
  const clash = await db().query.geographicAreas.findFirst({ where: eq(schema.geographicAreas.slug, slug), columns: { id: true } });
  if (clash) slug = `${slug}-${slugify(input.nation)}-${input.type.replace(/_/g, "-")}`;
  const [row] = await db()
    .insert(schema.geographicAreas)
    .values({ slug, name: input.name, type: input.type, nation: input.nation, code: input.code ?? null, legacyCode: input.legacyCode ?? null, parentId: input.parentId ?? null })
    .returning({ id: schema.geographicAreas.id });
  areaCache.set(cacheKey, row!.id);
  return row!.id;
}

export async function identifierMap(scheme: string, opts: { currentOnly?: boolean } = {}): Promise<Map<string, number>> {
  const rows = await db()
    .select({ value: schema.schoolIdentifiers.value, schoolId: schema.schoolIdentifiers.schoolId })
    .from(schema.schoolIdentifiers)
    .where(opts.currentOnly ? and(eq(schema.schoolIdentifiers.scheme, scheme), eq(schema.schoolIdentifiers.isCurrent, true)) : eq(schema.schoolIdentifiers.scheme, scheme));
  return new Map(rows.map((r) => [r.value, r.schoolId]));
}

export async function takenSlugs(): Promise<Set<string>> {
  const rows = await db().select({ slug: schema.schools.slug }).from(schema.schools);
  return new Set(rows.map((r) => r.slug));
}

function normaliseForCompare(v: unknown): unknown {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return v ?? null;
}

/**
 * Insert or update a school. On update, any change in a tracked field is
 * written to `change_events` so admins and parents can see what changed.
 */
export async function upsertSchool(
  ctx: JobContext,
  core: SchoolCore,
  existingId: number | undefined,
  slugCandidates: string[],
  taken: Set<string>,
): Promise<{ id: number; created: boolean; changed: boolean }> {
  if (existingId) {
    const current = await db().query.schools.findFirst({ where: eq(schema.schools.id, existingId) });
    if (!current) throw new Error(`School ${existingId} vanished`);
    const changes: { field: string; oldValue: unknown; newValue: unknown }[] = [];
    for (const f of TRACKED_FIELDS) {
      const before = normaliseForCompare(current[f]);
      const after = normaliseForCompare(core[f]);
      if (JSON.stringify(before) !== JSON.stringify(after)) changes.push({ field: f, oldValue: before, newValue: after });
    }
    await db()
      .update(schema.schools)
      .set({ ...core, updatedAt: new Date() })
      .where(eq(schema.schools.id, existingId));
    if (changes.length) {
      await db()
        .insert(schema.changeEvents)
        .values(changes.map((c) => ({ schoolId: existingId, runId: ctx.runId, entity: "school", field: c.field, oldValue: c.oldValue, newValue: c.newValue })));
      ctx.counters.rowsUpdated++;
    } else {
      ctx.counters.rowsUnchanged++;
    }
    return { id: existingId, created: false, changed: changes.length > 0 };
  }
  const slug = uniqueSlug(slugCandidates, taken);
  taken.add(slug);
  const [row] = await db()
    .insert(schema.schools)
    .values({ ...core, slug })
    .returning({ id: schema.schools.id });
  ctx.counters.rowsInserted++;
  return { id: row!.id, created: true, changed: true };
}

export async function upsertIdentifier(
  schoolId: number,
  scheme: string,
  value: string | null,
  prov: { sourceDocumentId: number; verificationStatus?: "officially_verified" },
  isCurrent = true,
) {
  if (!value) return;
  await db()
    .insert(schema.schoolIdentifiers)
    .values({ schoolId, scheme, value, isCurrent, sourceDocumentId: prov.sourceDocumentId, verificationStatus: "officially_verified", lastCheckedAt: new Date() })
    .onConflictDoUpdate({
      target: [schema.schoolIdentifiers.scheme, schema.schoolIdentifiers.value],
      set: { schoolId, isCurrent, sourceDocumentId: prov.sourceDocumentId, lastCheckedAt: new Date() },
    });
}

export async function upsertName(schoolId: number, name: string, isCurrent: boolean, context: string | null, sourceDocumentId: number, validTo?: string | null) {
  await db()
    .insert(schema.schoolNames)
    .values({ schoolId, name, isCurrent, context, validTo: validTo ?? null, sourceDocumentId, verificationStatus: isCurrent ? "officially_verified" : "historical", lastCheckedAt: new Date() })
    .onConflictDoUpdate({
      target: [schema.schoolNames.schoolId, schema.schoolNames.name],
      set: { isCurrent, context, validTo: validTo ?? null, lastCheckedAt: new Date(), verificationStatus: isCurrent ? "officially_verified" : "historical" },
    });
}

export async function upsertLocation(
  schoolId: number,
  loc: {
    street: string | null;
    locality: string | null;
    address3: string | null;
    town: string | null;
    county: string | null;
    postcode: string | null;
    easting: number | null;
    northing: number | null;
    latitude?: number | null;
    longitude?: number | null;
    method: string | null;
  },
  sourceDocumentId: number,
) {
  // British National Grid (EPSG:27700) → WGS84 is done by PostGIS; otherwise use lat/lng.
  const point =
    loc.easting && loc.northing
      ? sql`ST_Transform(ST_SetSRID(ST_MakePoint(${loc.easting}, ${loc.northing}), 27700), 4326)::geography`
      : loc.latitude != null && loc.longitude != null
        ? sql`ST_SetSRID(ST_MakePoint(${loc.longitude}, ${loc.latitude}), 4326)::geography`
        : sql`NULL`;
  const values = {
    street: loc.street,
    locality: loc.locality,
    address3: loc.address3,
    town: loc.town,
    county: loc.county,
    postcode: loc.postcode,
    easting: loc.easting,
    northing: loc.northing,
    locationMethod: loc.method,
    sourceDocumentId,
    verificationStatus: "officially_verified" as const,
    lastCheckedAt: new Date(),
  };
  await db()
    .insert(schema.schoolLocations)
    .values({ schoolId, ...values, location: point as unknown as string })
    .onConflictDoUpdate({
      target: schema.schoolLocations.schoolId,
      set: { ...values, location: point as unknown as string },
    });
}

/** Rebuild the denormalised search fields for every school. */
export async function refreshSearchIndex() {
  await db().execute(sql`
    WITH names AS (
      SELECT school_id, string_agg(name, ' ') AS former
      FROM school_names WHERE NOT is_current GROUP BY school_id
    ), base AS (
      SELECT s.id,
             s.name,
             coalesce(n.former, '') AS former,
             concat_ws(' ', l.town, l.locality, l.county, la.name, r.name) AS place,
             coalesce(l.postcode, '') AS postcode
      FROM schools s
      LEFT JOIN names n ON n.school_id = s.id
      LEFT JOIN school_locations l ON l.school_id = s.id
      LEFT JOIN geographic_areas la ON la.id = s.local_authority_id
      LEFT JOIN geographic_areas r ON r.id = s.region_id
    )
    UPDATE schools s SET
      search_text = lower(immutable_unaccent(concat_ws(' ', b.name, b.former, b.place, b.postcode))),
      search_document =
        setweight(to_tsvector('simple', immutable_unaccent(b.name)), 'A') ||
        setweight(to_tsvector('simple', immutable_unaccent(b.former)), 'B') ||
        setweight(to_tsvector('simple', immutable_unaccent(b.place)), 'C') ||
        setweight(to_tsvector('simple', b.postcode), 'D')
    FROM base b WHERE b.id = s.id
  `);
}
