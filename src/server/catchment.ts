import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { defaultEntryYear } from "@/lib/academic-year";
import { lookupPostcode } from "@/lib/postcode";

export interface CatchmentCheck {
  postcode: string;
  latitude: number;
  longitude: number;
  schools: {
    slug: string;
    name: string;
    straightLineMiles: number | null;
    catchmentType: string | null;
    policyStatus: string | null;
    boundary: { status: "inside" | "outside" | "no_verified_boundary"; name?: string; effectiveEntryYear?: number; verificationStatus?: string };
    explanation: string;
  }[];
}

/**
 * Compare a postcode centroid with schools' *verified* boundaries. Without a
 * verified official boundary we say so — we never infer one from distance.
 */
export async function checkCatchment(postcodeInput: string, slugs: string[], entryYear = defaultEntryYear()): Promise<{ ok: true; result: CatchmentCheck } | { ok: false; message: string }> {
  const pc = await lookupPostcode(postcodeInput);
  if (!pc.ok) return { ok: false, message: pc.message };
  const { latitude, longitude, postcode } = pc.location;
  return { ok: true, result: { postcode, latitude, longitude, schools: await checkPoint(latitude, longitude, postcode, slugs, entryYear) } };
}

/** Compare a point with verified boundaries for one entry year. Exported for tests. */
export async function checkPoint(latitude: number, longitude: number, label: string, slugs: string[], entryYear: number): Promise<CatchmentCheck["schools"]> {
  const postcode = label;
  const point = sql`ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography`;
  const slugList = slugs.slice(0, 5);
  if (!slugList.length) return [];
  const rows = await db().execute<{ slug: string; name: string; miles: number | null; catchment_type: string | null; policy_status: string | null; b_name: string | null; b_year: number | null; b_status: string | null; inside: boolean | null }>(sql`
    WITH pol AS (
      SELECT DISTINCT ON (p.school_id) p.school_id, p.catchment_type, p.status
      FROM admission_policies p JOIN admission_cycles c ON c.id = p.cycle_id
      WHERE c.entry_year = ${entryYear} AND p.status IN ('published', 'awaiting_verification')
      ORDER BY p.school_id, p.version DESC
    ), b AS (
      SELECT DISTINCT ON (cb.school_id) cb.school_id, cb.name, cb.effective_entry_year, cb.verification_status, ST_Covers(cb.geometry, ${point}) AS inside
      FROM catchment_boundaries cb
      WHERE cb.verification_status = 'officially_verified' AND cb.effective_entry_year = ${entryYear}
      ORDER BY cb.school_id, cb.updated_at DESC
    )
    SELECT s.slug, s.name, ST_Distance(l.location, ${point}) / 1609.344 AS miles,
           pol.catchment_type, pol.status AS policy_status,
           b.name AS b_name, b.effective_entry_year AS b_year, b.verification_status AS b_status, b.inside
    FROM schools s
    LEFT JOIN school_locations l ON l.school_id = s.id
    LEFT JOIN pol ON pol.school_id = s.id
    LEFT JOIN b ON b.school_id = s.id
    WHERE s.slug IN (${sql.join(slugList.map((s) => sql`${s}`), sql`, `)})
  `);
  return rows.map((r) => {
        const boundary: CatchmentCheck["schools"][number]["boundary"] =
          r.inside === null ? { status: "no_verified_boundary" } : { status: r.inside ? "inside" : "outside", name: r.b_name ?? undefined, effectiveEntryYear: r.b_year ?? undefined, verificationStatus: r.b_status ?? undefined };
        let explanation: string;
        if (boundary.status === "inside") explanation = `The centre of ${postcode} falls inside the verified ${r.b_name} boundary for ${entryYear}. Addresses near a boundary edge may fall on either side — confirm your exact address with the admission authority.`;
        else if (boundary.status === "outside") explanation = `The centre of ${postcode} falls outside the verified ${r.b_name} boundary for ${entryYear}. Confirm your exact address with the admission authority.`;
        else if (r.catchment_type === "defined_area") explanation = `${r.name} has a defined catchment area for ${entryYear}, but we don't hold a verified digital boundary, so we can't check your postcode. Use the official checker named in the school's policy.`;
        else if (r.catchment_type === "distance_only") explanation = `${r.name} ranks applicants by distance rather than using a fixed area. There is no boundary to be inside or outside.`;
        else if (r.catchment_type === "none") explanation = `${r.name} does not use a catchment area for ${entryYear}.`;
        else explanation = `We don't yet hold ${r.name}'s ${entryYear} admissions rules, so we can't say whether residence matters.`;
        return { slug: r.slug, name: r.name, straightLineMiles: r.miles === null ? null : Number(r.miles), catchmentType: r.catchment_type, policyStatus: r.policy_status, boundary, explanation };
      });
}
