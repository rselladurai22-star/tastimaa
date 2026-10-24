import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CATCHMENT_LABEL } from "@/domain/labels";
import { clampEntryYear, selectableEntryYears } from "@/lib/academic-year";
import { getCatchments, getPolicies, getSchoolCore, loadSources, policyForYear } from "@/server/profile";
import { CatchmentCheck } from "@/components/school/catchment-check";
import { YearPicker } from "@/components/school/admissions";
import { SchoolMap } from "@/components/map/school-map";
import { Callout, Card, SectionHeading } from "@/components/ui/primitives";
import { SourceNote } from "@/components/ui/source-note";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ year?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const core = await getSchoolCore(slug);
  if (!core) return {};
  return {
    title: `${core.school.name} catchment area and distance rules`,
    description: `Does ${core.school.name} have a catchment area? How residence and distance are used, how distance is measured, and how to check your postcode.`,
    alternates: { canonical: `/schools/${slug}/catchment` },
  };
}

export default async function CatchmentPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const core = await getSchoolCore(slug);
  if (!core) notFound();
  const { school, location } = core;
  const entryYear = clampEntryYear((await searchParams).year);
  const [policies, boundaries] = await Promise.all([getPolicies(school.id), getCatchments(school.id)]);
  const policy = policyForYear(policies, entryYear);
  const yearBoundaries = boundaries.filter((b) => b.effective_entry_year === entryYear && b.verification_status === "officially_verified");
  const sources = await loadSources([policy?.sourceDocumentId, ...yearBoundaries.map((b) => b.source_document_id)]);

  return (
    <div className="grid gap-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="max-w-3xl">
          <h2 className="text-2xl font-semibold sm:text-3xl">Catchment and distance</h2>
          <p className="mt-1 text-ink-2">Whether where you live matters, and how.</p>
        </div>
        <YearPicker years={selectableEntryYears()} selected={entryYear} basePath={`/schools/${slug}/catchment`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="grid content-start gap-4">
          <Card className="p-5">
            <h3 className="font-sans text-base font-semibold">September {entryYear} entry</h3>
            {policy ? (
              <>
                <p className="mt-2 text-lg font-semibold text-ink">{CATCHMENT_LABEL[policy.catchmentType]}</p>
                {policy.catchmentSummary ? <p className="mt-2 text-ink-2">{policy.catchmentSummary}</p> : null}
                {policy.distanceMethod ? (
                  <p className="mt-3 text-sm text-ink-2">
                    <strong className="text-ink">How distance is measured:</strong> {policy.distanceMethod}
                  </p>
                ) : null}
                <SourceNote source={policy.sourceDocumentId ? sources.get(policy.sourceDocumentId) : null} locator={policy.sourceLocator} status={policy.verificationStatus} />
              </>
            ) : (
              <p className="mt-2 text-ink-2">We don&apos;t hold this school&apos;s {entryYear} admissions rules yet, so we can&apos;t say whether a catchment area or distance applies.</p>
            )}
          </Card>
          {yearBoundaries.length === 0 ? (
            <Callout title="No verified boundary map">
              We only draw a catchment boundary when the admission authority has published it in a form we can verify and are permitted to reuse. We don&apos;t draw circles or estimate boundaries from past offers.
            </Callout>
          ) : null}
          <section aria-labelledby="check">
            <SectionHeading id="check" title="Check a postcode" />
            <CatchmentCheck schools={[{ slug, name: school.name }]} entryYear={entryYear} />
          </section>
        </div>
        <div>
          {location?.lat && location.lng ? (
            <SchoolMap
              height={420}
              points={[{ slug, name: school.name, lat: location.lat, lng: location.lng, sub: location.postcode ?? "" }]}
              center={{ lat: location.lat, lng: location.lng, zoom: 11 }}
              polygons={yearBoundaries.map((b) => ({ name: b.name, geojson: JSON.parse(b.geojson), note: `Verified boundary, ${b.effective_entry_year}. Licence: ${b.licence}` }))}
              label={`Map showing ${school.name}`}
            />
          ) : (
            <Callout>No location is recorded for this school.</Callout>
          )}
        </div>
      </div>

      <section aria-labelledby="misreadings">
        <SectionHeading id="misreadings" title="Three common misreadings" />
        <ul className="grid gap-3 sm:grid-cols-3">
          {[
            ["“Last year's furthest offer was 3 miles, so 3 miles is the catchment.”", "A last-offer distance is a one-year outcome that depends on who applied. It is not a boundary and it changes every year."],
            ["“The map shows I'm 2 miles away.”", "Online maps use straight lines or roads from a postcode centre. Schools measure from your exact address using the method in their policy."],
            ["“We're inside the catchment, so we'll get a place.”", "Catchment usually sets priority, not entitlement. Children still need to qualify, and higher-priority criteria are filled first."],
          ].map(([q, a]) => (
            <li key={q} className="rounded-xl border border-line bg-surface p-4">
              <p className="font-semibold text-ink">{q}</p>
              <p className="mt-1 text-sm text-ink-2">{a}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
