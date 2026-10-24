import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CATCHMENT_LABEL } from "@/domain/labels";
import { clampEntryYear, selectableEntryYears } from "@/lib/academic-year";
import { tabIndexable } from "@/server/indexability";
import { getCatchments, getPolicies, getSchoolCore, loadSources, policyForYear } from "@/server/profile";
import { Gap, Note, Source } from "@/ui/kit";
import { CatchmentCheck } from "@/ui/report/catchment-check";
import { ChapterIntro, ReportBody, RSection, YearPicker } from "@/ui/report/parts";
import { CatchmentModes } from "@/ui/viz/catchment-modes";
import { SchoolMap } from "@/ui/viz/school-map";

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
    robots: (await tabIndexable(slug, "catchment")) ? undefined : { index: false, follow: true },
  };
}

const MODES = ["defined_area", "distance_only", "none"] as const;

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
  const mode = policy && (MODES as readonly string[]).includes(policy.catchmentType) ? (policy.catchmentType as (typeof MODES)[number]) : null;

  const contents = [
    { id: "rule", label: "This school's rule" },
    { id: "check", label: "Check a postcode" },
    { id: "kinds", label: "The three kinds of rule" },
    { id: "misreadings", label: "Common misreadings" },
  ];

  return (
    <ReportBody contents={contents}>
      <ChapterIntro
        kicker="Chapter 04 · Catchment & distance"
        title="Where you live, and whether it matters"
        lede="Some schools give priority to a defined area, some rank by distance, and some do neither. Here is what this school's rules say."
        aside={<YearPicker years={selectableEntryYears()} selected={entryYear} basePath={`/schools/${slug}/catchment`} />}
      />

      <RSection id="rule" mark="A" title={`September ${entryYear} entry`}>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="min-w-0">
            {policy ? (
              <>
                <p className="label">The policy says</p>
                <p className="mt-2 font-display text-[1.7rem] leading-tight text-ink">{CATCHMENT_LABEL[policy.catchmentType]}</p>
                {policy.catchmentSummary ? <p className="mt-3 text-[1.05rem] leading-relaxed text-ink-2">{policy.catchmentSummary}</p> : null}
                {policy.distanceMethod ? (
                  <div className="mt-4 border-l-2 border-copper pl-4">
                    <p className="label">How distance is measured</p>
                    <p className="mt-1 text-[1.02rem] leading-relaxed text-ink">{policy.distanceMethod}</p>
                  </div>
                ) : null}
                <Source source={policy.sourceDocumentId ? sources.get(policy.sourceDocumentId) : null} locator={policy.sourceLocator} status={policy.verificationStatus} />
              </>
            ) : (
              <Gap title={`We don't hold this school's ${entryYear} admissions rules yet`}>So we can&apos;t say whether a catchment area or distance applies.</Gap>
            )}
            {yearBoundaries.length === 0 ? (
              <Note className="mt-5" title="No verified boundary map">
                We only draw a catchment boundary when the admission authority has published it in a form we can verify and are permitted to reuse. We don&apos;t draw circles or estimate boundaries from past offers.
              </Note>
            ) : null}
          </div>
          <div className="min-w-0">
            {location?.lat && location.lng ? (
              <SchoolMap
                height={380}
                points={[{ slug, name: school.name, lat: location.lat, lng: location.lng, sub: location.postcode ?? "" }]}
                center={{ lat: location.lat, lng: location.lng, zoom: 11 }}
                polygons={yearBoundaries.map((b) => ({ name: b.name, geojson: JSON.parse(b.geojson), note: `Verified boundary, ${b.effective_entry_year}. Licence: ${b.licence}` }))}
                label={`Map showing ${school.name}`}
                note={yearBoundaries.length ? `Dashed line: verified ${entryYear} boundary, from the admission authority.` : "The school's site. No boundary is drawn because none is verified for this year."}
              />
            ) : (
              <Gap title="No location is recorded for this school" />
            )}
          </div>
        </div>
      </RSection>

      <RSection id="check" mark="B" title="Check a postcode" lede="Against verified boundaries only — never an estimate.">
        <div className="max-w-[44rem] rounded-[8px] border border-rule bg-card p-5">
          <CatchmentCheck schools={[{ slug, name: school.name }]} entryYear={entryYear} />
        </div>
      </RSection>

      <RSection id="kinds" mark="C" title="The three kinds of rule" lede={mode ? "This school's kind is marked. Switch between them to see how each one orders the same neighbourhood." : "Switch between them to see how each one orders the same neighbourhood."}>
        <CatchmentModes highlight={mode} highlightLabel={mode ? "This school" : undefined} />
      </RSection>

      <RSection id="misreadings" mark="D" title="Three common misreadings">
        <ul className="grid gap-px overflow-hidden rounded-[6px] border border-rule bg-rule md:grid-cols-3">
          {[
            ["“Last year's furthest offer was 3 miles, so 3 miles is the catchment.”", "A last-offer distance is a one-year outcome that depends on who applied. It is not a boundary and it changes every year."],
            ["“The map shows I'm 2 miles away.”", "Online maps use straight lines or roads from a postcode centre. Schools measure from your exact address using the method in their policy."],
            ["“We're inside the catchment, so we'll get a place.”", "Catchment usually sets priority, not entitlement. Children still need to qualify, and higher-priority criteria are filled first."],
          ].map(([q, a]) => (
            <li key={q} className="bg-card p-5">
              <p className="font-display text-[1.15rem] leading-snug text-ink italic">{q}</p>
              <p className="mt-3 text-[0.98rem] leading-relaxed text-ink-2">{a}</p>
            </li>
          ))}
        </ul>
      </RSection>
    </ReportBody>
  );
}
