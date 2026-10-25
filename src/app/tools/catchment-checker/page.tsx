import type { Metadata } from "next";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { CATCHMENT_LABEL } from "@/domain/labels";
import { clampEntryYear, selectableEntryYears } from "@/lib/academic-year";
import { PageHero } from "@/ui/hero";
import { Page, SectionHead } from "@/ui/kit";
import { YearPicker } from "@/ui/report/parts";
import { CatchmentDesk } from "@/ui/tools/catchment-desk";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Grammar school catchment checker",
  description: "Check a postcode against verified grammar school catchment boundaries, and find out when distance or residence applies instead.",
  alternates: { canonical: "/tools/catchment-checker" },
};

export default async function CatchmentCheckerPage({ searchParams }: { searchParams: Promise<{ schools?: string; year?: string }> }) {
  const sp = await searchParams;
  const entryYear = clampEntryYear(sp.year);
  const slugs = (sp.schools ?? "")
    .split(",")
    .filter((s) => /^[a-z0-9-]{1,120}$/.test(s))
    .slice(0, 5);
  const picked = slugs.length
    ? await db().execute<{ slug: string; name: string; lat: number | null; lng: number | null; catchment_type: string | null }>(sql`
        SELECT s.slug, s.name, ST_Y(l.location::geometry) AS lat, ST_X(l.location::geometry) AS lng,
          (SELECT p.catchment_type FROM admission_policies p JOIN admission_cycles c ON c.id = p.cycle_id
            WHERE p.school_id = s.id AND c.entry_year = ${entryYear} AND p.status IN ('published','awaiting_verification') ORDER BY p.version DESC LIMIT 1) AS catchment_type
        FROM schools s LEFT JOIN school_locations l ON l.school_id = s.id
        WHERE s.slug IN (${sql.join(
          slugs.map((x) => sql`${x}`),
          sql`, `,
        )})
      `)
    : [];
  const schools = slugs
    .map((s) => picked.find((r) => r.slug === s))
    .filter((r): r is NonNullable<typeof r> => !!r)
    .map((r) => ({ slug: r.slug, name: r.name, lat: r.lat === null ? null : Number(r.lat), lng: r.lng === null ? null : Number(r.lng), rule: r.catchment_type ? CATCHMENT_LABEL[r.catchment_type]! : `No ${entryYear} rules held` }));
  const [counts] = await db().execute<{ boundaries: number; policies: number; defined: number }>(sql`
    SELECT (SELECT count(*)::int FROM catchment_boundaries WHERE verification_status = 'officially_verified' AND effective_entry_year = ${entryYear}) AS boundaries,
           (SELECT count(*)::int FROM admission_policies p JOIN admission_cycles c ON c.id = p.cycle_id WHERE c.entry_year = ${entryYear} AND p.status IN ('published','awaiting_verification')) AS policies,
           (SELECT count(*)::int FROM admission_policies p JOIN admission_cycles c ON c.id = p.cycle_id WHERE c.entry_year = ${entryYear} AND p.catchment_type = 'defined_area' AND p.status IN ('published','awaiting_verification')) AS defined
  `);
  return (
    <>
      <PageHero
        crumbs={[{ href: "/tools/catchment-checker", label: "Catchment checker" }]}
        kicker="Research tools"
        title="Catchment checker"
        lede="Does where you live matter for a school — and if so, how? We check postcodes only against boundaries the admission authority has published in a verifiable form."
        meta={
          <span>
            September {entryYear}: {counts!.policies} admissions {counts!.policies === 1 ? "policy" : "policies"} held, {counts!.defined} with a defined catchment area, {counts!.boundaries} verified digital{" "}
            {counts!.boundaries === 1 ? "boundary" : "boundaries"}.
          </span>
        }
        aside={<YearPicker years={selectableEntryYears()} selected={entryYear} basePath="/tools/catchment-checker" extraQuery={slugs.length ? `schools=${slugs.join(",")}` : undefined} />}
      />
      <Page className="pt-4 pb-12">
        <CatchmentDesk schools={schools} entryYear={entryYear} />
        <p className="mt-4 text-small text-ink-2">Where no verified boundary exists we say so, and point you to the official checker named in the school&apos;s policy.</p>
        <section className="mt-12" aria-labelledby="how">
          <SectionHead id="how" kicker="Method" title="How we handle location" />
          <ul className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              ["Postcode centres, not addresses", "We use the published centre point of your postcode (ONS Postcode Directory via postcodes.io). It can be hundreds of metres from your door."],
              ["Verified boundaries only", "A boundary is drawn only when we hold the admission authority's official geometry for that entry year, with its licence recorded."],
              ["Never a circle", "We never draw a radius or a past year's last-offer distance as if it were a catchment area."],
            ].map(([t, d]) => (
              <li key={t} className="rounded-[16px] bg-card p-5 shadow-[0_0_0_1px_var(--rule)]">
                <p className="font-semibold text-ink">{t}</p>
                <p className="mt-1.5 text-[0.98rem] leading-relaxed text-ink-2">{d}</p>
              </li>
            ))}
          </ul>
        </section>
      </Page>
    </>
  );
}
