import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { env } from "@/lib/env";

/**
 * UK postcode handling. Locations returned here are *postcode centroids*
 * from the ONS Postcode Directory (via postcodes.io): they approximate the
 * middle of a group of addresses and must never be presented as an exact
 * home location or used for official home-to-school distance measurement.
 */

// Standard UK format (BS 7666) plus the special case GIR 0AA.
const POSTCODE_RE = /^(GIR ?0AA|[A-PR-UWYZ](\d[\dA-HJKPS-UW]?|[A-HK-Y]\d[\dABEHMNPRV-Y]?) ?\d[ABD-HJLNP-UW-Z]{2})$/i;

export function normalisePostcode(input: string): string | null {
  const compact = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (compact.length < 5 || compact.length > 7) return null;
  const formatted = `${compact.slice(0, -3)} ${compact.slice(-3)}`;
  return POSTCODE_RE.test(formatted) ? formatted : null;
}

export function isNorthernIrelandPostcode(postcode: string): boolean {
  return /^BT/i.test(postcode.trim());
}

export interface PostcodeLocation {
  postcode: string;
  latitude: number;
  longitude: number;
  country: string;
  adminDistrict: string | null;
  adminCounty: string | null;
  region: string | null;
  laCode: string | null;
  precision: "postcode_centroid";
}

export type PostcodeLookupResult =
  | { ok: true; location: PostcodeLocation }
  | { ok: false; reason: "invalid_format" | "not_found" | "ni_disabled" | "service_unavailable"; message: string };

interface PostcodesIoResult {
  postcode: string;
  latitude: number | null;
  longitude: number | null;
  country: string;
  admin_district: string | null;
  admin_county: string | null;
  region: string | null;
  codes?: { admin_district?: string; admin_county?: string };
}

const CACHE_DAYS = 30;

function toLocation(r: PostcodesIoResult): PostcodeLocation | null {
  if (r.latitude == null || r.longitude == null) return null;
  return {
    postcode: r.postcode,
    latitude: r.latitude,
    longitude: r.longitude,
    country: r.country,
    adminDistrict: r.admin_district,
    adminCounty: r.admin_county,
    region: r.region,
    // Upper-tier code identifies the admissions local authority in two-tier areas.
    laCode: r.codes?.admin_county && !r.codes.admin_county.endsWith("99999999") ? r.codes.admin_county : (r.codes?.admin_district ?? null),
    precision: "postcode_centroid",
  };
}

export async function lookupPostcode(input: string, opts: { fetchImpl?: typeof fetch } = {}): Promise<PostcodeLookupResult> {
  const postcode = normalisePostcode(input);
  if (!postcode) return { ok: false, reason: "invalid_format", message: "That doesn't look like a valid UK postcode." };
  const ni = isNorthernIrelandPostcode(postcode);
  if (ni && !env().NI_POSTCODES_ENABLED) {
    return {
      ok: false,
      reason: "ni_disabled",
      message: "Northern Ireland postcode lookup is not enabled on this site because of licensing restrictions on NI postcode data. You can still browse Northern Ireland schools by area.",
    };
  }

  if (!ni) {
    const cached = await db().query.postcodeCache.findFirst({ where: eq(schema.postcodeCache.postcode, postcode) });
    if (cached && Date.now() - cached.fetchedAt.getTime() < CACHE_DAYS * 86_400_000) {
      return { ok: true, location: { ...cached, precision: "postcode_centroid" } };
    }
  }

  const fetchImpl = opts.fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await fetchImpl(`${env().POSTCODES_IO_BASE_URL}/postcodes/${encodeURIComponent(postcode)}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    return { ok: false, reason: "service_unavailable", message: "The postcode service is temporarily unavailable. Please try again shortly." };
  }
  if (res.status === 404) return { ok: false, reason: "not_found", message: `We couldn't find ${postcode}. It may be new or no longer in use.` };
  if (!res.ok) return { ok: false, reason: "service_unavailable", message: "The postcode service is temporarily unavailable. Please try again shortly." };
  const json = (await res.json()) as { result: PostcodesIoResult | null };
  const loc = json.result ? toLocation(json.result) : null;
  if (!loc) return { ok: false, reason: "not_found", message: `No location is published for ${postcode}.` };

  // Only GB (Open Government Licence) postcodes are cached.
  if (!ni) {
    const row = { ...loc, fetchedAt: new Date() };
    const { precision: _p, ...persist } = row;
    void _p;
    await db().insert(schema.postcodeCache).values(persist).onConflictDoUpdate({ target: schema.postcodeCache.postcode, set: persist });
  }
  return { ok: true, location: loc };
}

/** Bulk lookup (max 100 per request) used by ETL jobs to geocode school postcodes. */
export async function bulkLookup(postcodes: string[]): Promise<Map<string, PostcodeLocation>> {
  const out = new Map<string, PostcodeLocation>();
  for (let i = 0; i < postcodes.length; i += 100) {
    const batch = postcodes.slice(i, i + 100);
    const res = await fetch(`${env().POSTCODES_IO_BASE_URL}/postcodes`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ postcodes: batch }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new Error(`postcodes.io bulk lookup failed: HTTP ${res.status}`);
    const json = (await res.json()) as { result: { query: string; result: PostcodesIoResult | null }[] };
    for (const item of json.result) {
      const loc = item.result ? toLocation(item.result) : null;
      if (loc) out.set(normalisePostcode(item.query) ?? item.query, loc);
    }
  }
  return out;
}

/** Centroid of an outward code (e.g. "ME15") — an area, never an address. */
export async function lookupOutcode(input: string): Promise<{ ok: true; outcode: string; latitude: number; longitude: number } | { ok: false; message: string }> {
  const outcode = input.toUpperCase().replace(/\s+/g, "");
  if (!/^[A-Z]{1,2}\d[A-Z\d]?$/.test(outcode)) return { ok: false, message: "Not a valid postcode district." };
  if (/^BT/.test(outcode) && !env().NI_POSTCODES_ENABLED) return { ok: false, message: "Northern Ireland postcode lookup is not enabled on this site." };
  try {
    const res = await fetch(`${env().POSTCODES_IO_BASE_URL}/outcodes/${outcode}`, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(8000) });
    if (!res.ok) return { ok: false, message: `We couldn't find the postcode district ${outcode}.` };
    const json = (await res.json()) as { result: { outcode: string; latitude: number | null; longitude: number | null } | null };
    if (!json.result || json.result.latitude == null || json.result.longitude == null) return { ok: false, message: `No location is published for ${outcode}.` };
    return { ok: true, outcode: json.result.outcode, latitude: json.result.latitude, longitude: json.result.longitude };
  } catch {
    return { ok: false, message: "The postcode service is temporarily unavailable." };
  }
}
