import type { Metadata } from "next";
import Link from "next/link";
import { inArray, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { clampEntryYear, selectableEntryYears } from "@/lib/academic-year";
import { CatchmentCheck } from "@/components/school/catchment-check";
import { YearPicker } from "@/components/school/admissions";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Callout, Container, EmptyState, SectionHeading } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Grammar school catchment checker",
  description: "Check a postcode against verified grammar school catchment boundaries, and find out when distance or residence applies instead.",
  alternates: { canonical: "/tools/catchment-checker" },
};

export default async function CatchmentCheckerPage({ searchParams }: { searchParams: Promise<{ schools?: string; year?: string }> }) {
  const sp = await searchParams;
  const entryYear = clampEntryYear(sp.year);
  const slugs = (sp.schools ?? "").split(",").filter((s) => /^[a-z0-9-]{1,120}$/.test(s)).slice(0, 5);
  const picked = slugs.length ? await db().select({ slug: schema.schools.slug, name: schema.schools.name }).from(schema.schools).where(inArray(schema.schools.slug, slugs)) : [];
  const [counts] = await db().execute<{ boundaries: number; policies: number; defined: number }>(sql`
    SELECT (SELECT count(*)::int FROM catchment_boundaries WHERE verification_status = 'officially_verified' AND effective_entry_year = ${entryYear}) AS boundaries,
           (SELECT count(*)::int FROM admission_policies p JOIN admission_cycles c ON c.id = p.cycle_id WHERE c.entry_year = ${entryYear} AND p.status IN ('published','awaiting_verification')) AS policies,
           (SELECT count(*)::int FROM admission_policies p JOIN admission_cycles c ON c.id = p.cycle_id WHERE c.entry_year = ${entryYear} AND p.catchment_type = 'defined_area' AND p.status IN ('published','awaiting_verification')) AS defined
  `);
  return (
    <Container className="py-8">
      <Breadcrumbs items={[{ href: "/tools/catchment-checker", label: "Catchment checker" }]} />
      <header className="mt-4 mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-3xl">
          <h1 className="text-3xl font-semibold sm:text-4xl">Catchment checker</h1>
          <p className="mt-3 text-lg text-ink-2">Does where you live matter for a school — and if so, how? We check postcodes only against boundaries the admission authority has published in a verifiable form.</p>
        </div>
        <YearPicker years={selectableEntryYears()} selected={entryYear} basePath="/tools/catchment-checker" extraQuery={slugs.length ? `schools=${slugs.join(",")}` : undefined} />
      </header>
      <Callout className="mb-8" title="Coverage for this year">
        We hold {counts!.policies} admissions {counts!.policies === 1 ? "policy" : "policies"} for September {entryYear} entry, of which {counts!.defined} use a defined catchment area. We hold {counts!.boundaries} verified digital{" "}
        {counts!.boundaries === 1 ? "boundary" : "boundaries"}. Where no verified boundary exists we tell you, and point you to the official checker named in the school&apos;s policy.
      </Callout>
      {picked.length ? (
        <CatchmentCheck schools={picked} entryYear={entryYear} />
      ) : (
        <EmptyState title="Choose schools to check">
          Open a school&apos;s <strong>Catchment &amp; distance</strong> tab, or add schools to your shortlist and{" "}
          <Link className="link" href="/grammar-schools">
            find schools near a postcode
          </Link>
          .
        </EmptyState>
      )}
      <section className="mt-12" aria-labelledby="how">
        <SectionHeading id="how" title="How we handle location" />
        <ul className="grid gap-3 sm:grid-cols-3">
          {[
            ["Postcode centres, not addresses", "We use the published centre point of your postcode (ONS Postcode Directory via postcodes.io). It can be hundreds of metres from your door."],
            ["Verified boundaries only", "A boundary is drawn only when we hold the admission authority's official geometry for that entry year, with its licence recorded."],
            ["Never a circle", "We never draw a radius or a past year's last-offer distance as if it were a catchment area."],
          ].map(([t, d]) => (
            <li key={t} className="rounded-xl border border-line bg-surface p-4">
              <p className="font-semibold text-ink">{t}</p>
              <p className="mt-1 text-sm text-ink-2">{d}</p>
            </li>
          ))}
        </ul>
      </section>
    </Container>
  );
}
