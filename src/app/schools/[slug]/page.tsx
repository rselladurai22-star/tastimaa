import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CRITERION_LABEL, GENDER_LABEL, SELECTIVITY_LABEL } from "@/domain/labels";
import { formatMeasure, MEASURES } from "@/domain/measures";
import { defaultEntryYear } from "@/lib/academic-year";
import { formatDate, formatNumber, titleCaseName } from "@/lib/format";
import { absoluteUrl } from "@/lib/site";
import {
  getAllocations,
  getComparators,
  getEntranceTests,
  getInspections,
  getNearbySchools,
  getPolicies,
  getResults,
  getSchoolCore,
  getSchoolEvents,
  loadSources,
  policyForYear,
} from "@/server/profile";
import { latestByFramework, latestPublished, measureRows } from "@/server/profile-view";
import { IconArrow } from "@/ui/icons";
import { JsonLd } from "@/ui/json-ld";
import { Disclosure, Note, Source } from "@/ui/kit";
import { allocationSeries, DemandChart, InspectionEntry, NIInspectionNote } from "@/ui/report/evidence";
import { AdmissionsGlance, ChapterLink, FactsPanel, NoPolicy, ReportBody, RSection, StepsStrip } from "@/ui/report/parts";
import { DateLine } from "@/ui/viz/admissions-viz";
import { Sparkline } from "@/ui/viz/charts";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const core = await getSchoolCore(slug);
  if (!core) return { title: "School not found" };
  const { school, location } = core;
  const place = location?.town ? `, ${location.town}` : "";
  return {
    title: `${school.name}${place}: admissions, 11+ test and results`,
    description: `${school.name} — ${(SELECTIVITY_LABEL[school.selectivity] ?? "").toLowerCase()}. Entrance test, admissions criteria, catchment, official GCSE and A level results, Ofsted inspection and applications data, each with its source.`,
    alternates: { canonical: `/schools/${slug}` },
    openGraph: { title: `${school.name} — admissions and results`, url: `/schools/${slug}` },
  };
}

export default async function SchoolOverview({ params }: Props) {
  const { slug } = await params;
  const core = await getSchoolCore(slug);
  if (!core) notFound();
  const { school, location, contact, census, la, identifiers, formerNames } = core;
  const entryYear = defaultEntryYear();
  const [policies, tests, results, inspections, allocations, nearby] = await Promise.all([
    getPolicies(school.id),
    getEntranceTests(school.id, entryYear),
    getResults(school.id),
    getInspections(school.id),
    getAllocations(school.id),
    getNearbySchools(school.id),
  ]);
  const [events, comparators] = await Promise.all([getSchoolEvents(school.id, tests.map((t) => t.test.id), school.nation), getComparators(la?.code)]);
  const policy = policyForYear(policies, entryYear);
  const sources = await loadSources([
    school.sourceDocumentId,
    policy?.sourceDocumentId,
    census?.sourceDocumentId,
    ...inspections.map((i) => i.sourceDocumentId),
    ...results.map((r) => r.sourceDocumentId),
    allocations.at(-1)?.sourceDocumentId,
    ...tests.map((t) => t.link.sourceDocumentId),
  ]);
  const test = tests[0];
  const measures = (["ks4_attainment8", "ks4_engmath_95_pct", "ks5_alevel_aps_per_entry"] as const).map((m) => {
    const rows = measureRows(results, comparators, m, la?.code);
    return { m, rows, latest: latestPublished(rows) };
  });
  const latestInspection = latestByFramework(inspections)[0] ?? null;
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = events.filter((e) => (e.ends_on ?? e.starts_on) >= today && e.entry_year === entryYear).slice(0, 6);
  const { years: allocYears, get: alloc } = allocationSeries(allocations);
  const latestYear = allocYears.at(-1);
  const urn = identifiers.find((i) => i.scheme === "urn" && i.isCurrent)?.value;
  const deni = identifiers.find((i) => i.scheme === "deni")?.value;
  const schoolDoc = school.sourceDocumentId ? sources.get(school.sourceDocumentId) : null;
  const isNI = school.nation === "northern_ireland";
  const entryPointLabel = isNI ? "Year 8" : "Year 7";

  const faqs: { q: string; a: React.ReactNode }[] = [
    {
      q: `Does passing the entrance test guarantee a place at ${school.name}?`,
      a: (
        <>
          No. Meeting the test standard makes a child eligible to be considered. If more qualifying children apply than there are places, places are allocated using the school&apos;s published oversubscription criteria.
          {policy?.publishedAdmissionNumber ? ` For September ${entryYear} the school's published admission number is ${policy.publishedAdmissionNumber}.` : ""}
        </>
      ),
    },
    {
      q: `Which entrance test does ${school.name} use?`,
      a: test ? (
        <>
          Our records link the school to the <Link href={`/11-plus/${test.test.slug}`}>{test.test.name}</Link> for September {entryYear} entry ({test.link.verificationStatus === "officially_verified" ? "verified" : "awaiting editor verification"}).
        </>
      ) : (
        <>We don&apos;t yet hold verified test arrangements for this school. Check the school&apos;s admissions page.</>
      ),
    },
    {
      q: `Can children from outside the area apply to ${school.name}?`,
      a: policy ? (
        policy.outOfAreaRoute === "yes" ? (
          <>Yes — the {entryYear} policy we hold has a criterion that admits qualifying children from anywhere, but at a lower priority than children in the higher criteria.</>
        ) : policy.outOfAreaRoute === "no" ? (
          <>The {entryYear} policy we hold does not admit children from outside the defined area except under specific criteria.</>
        ) : (
          <>The {entryYear} policy we hold doesn&apos;t make this clear. Ask the school.</>
        )
      ) : (
        <>We don&apos;t hold this school&apos;s {entryYear} admissions policy yet.</>
      ),
    },
  ];
  if (latestYear && alloc(latestYear, "offers_to_other_la") !== null) {
    faqs.push({
      q: `How many offers went to families from other local authorities?`,
      a: (
        <>
          On national offer day for September {latestYear} entry, {formatNumber(alloc(latestYear, "offers_to_other_la"))} of {formatNumber(alloc(latestYear, "offers_made"))} offers went to families living in another local authority (DfE). Past outcomes
          don&apos;t predict future years.
        </>
      ),
    });
  }

  const contents = [
    { id: "at-a-glance", label: "Admissions at a glance" },
    ...(policy?.criteria.length ? [{ id: "priority", label: "Priority order" }] : []),
    { id: "results-summary", label: "Results" },
    { id: "inspection-summary", label: "Inspection" },
    ...(latestYear ? [{ id: "demand", label: "Applications & offers" }] : []),
    { id: "dates", label: "Key dates" },
    { id: "facts", label: "Facts & contact" },
    { id: "faqs", label: "Parent questions" },
    ...(nearby.length ? [{ id: "nearby", label: "Nearby schools" }] : []),
  ];
  const marks = Object.fromEntries(contents.map((c, i) => [c.id, String.fromCharCode(65 + i)]));

  return (
    <ReportBody contents={contents}>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": ["School", "EducationalOrganization"],
          name: school.name,
          url: absoluteUrl(`/schools/${slug}`),
          ...(contact?.website ? { sameAs: [contact.website] } : {}),
          ...(location?.postcode
            ? { address: { "@type": "PostalAddress", streetAddress: [location.street, location.locality].filter(Boolean).join(", ") || undefined, addressLocality: location.town ?? undefined, postalCode: location.postcode, addressCountry: "GB" } }
            : {}),
          ...(location?.lat ? { geo: { "@type": "GeoCoordinates", latitude: location.lat, longitude: location.lng } } : {}),
          ...(contact?.telephone ? { telephone: contact.telephone } : {}),
          ...(urn ? { identifier: { "@type": "PropertyValue", propertyID: "URN", value: urn } } : {}),
        }}
      />

      <RSection id="at-a-glance" mark={marks["at-a-glance"]} title="Admissions at a glance" lede={`${entryPointLabel} entry in September ${entryYear}.`} action={<ChapterLink href={`/schools/${slug}/admissions`}>Full admissions rules</ChapterLink>}>
        <div className="grid gap-4">
          {policy ? (
            <AdmissionsGlance policy={policy} sources={sources} testName={test?.test.name ?? null} testSlug={test?.test.slug ?? null} />
          ) : (
            <NoPolicy schoolName={school.name} entryYear={entryYear} website={contact?.website} otherYears={policies.filter((p) => p.status !== "superseded").map((p) => p.cycle.entryYear)} />
          )}
          <StepsStrip />
          <Link
            href={`/tools/eligibility-checker?schools=${slug}`}
            className="group/el flex items-center justify-between gap-4 rounded-[6px] border border-green bg-green px-5 py-4 font-semibold text-paper no-underline transition-colors hover:bg-green-deep"
          >
            Check how these rules apply to your child
            <IconArrow size={20} className="shrink-0 transition-transform duration-[var(--d-2)] group-hover/el:translate-x-1" />
          </Link>
        </div>
      </RSection>

      {policy?.criteria.length ? (
        <RSection id="priority" mark={marks.priority} title="Priority order" lede="If more qualified children apply than there are places, places go in this order. Each rung fills before the next.">
          <ol className="grid gap-px overflow-hidden rounded-[6px] border border-rule bg-rule">
            {policy.criteria.slice(0, 6).map((c) => (
              <li key={c.id} className="grid grid-cols-[3rem_minmax(0,1fr)] items-baseline bg-card px-4 py-3">
                <span className="font-mono text-[0.9rem] text-green">{String(c.rank).padStart(2, "0")}</span>
                <span>
                  <span className="block font-semibold text-ink">{c.title}</span>
                  <span className="label text-[0.72rem]">{CRITERION_LABEL[c.category] ?? c.category}</span>
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-[0.98rem] text-ink-2">
            {policy.criteria.length > 6 ? `${policy.criteria.length - 6} more ${policy.criteria.length - 6 === 1 ? "criterion" : "criteria"}, the tie-break and each rule's wording are in ` : "Each rule's wording, references and the tie-break are in "}
            <Link href={`/schools/${slug}/admissions`} className="a">
              the admissions chapter
            </Link>
            .
          </p>
        </RSection>
      ) : null}

      <RSection
        id="results-summary"
        mark={marks["results-summary"]}
        title="Results"
        lede="Latest published DfE figures, with the average for all selective schools in England alongside."
        action={!isNI ? <ChapterLink href={`/schools/${slug}/results`}>All results</ChapterLink> : null}
      >
        {isNI ? (
          <Note>School-level GCSE and A level results for Northern Ireland are not yet integrated. DE NI publishes them separately from DfE&apos;s performance tables.</Note>
        ) : (
          <div className="grid gap-px overflow-hidden rounded-[8px] border border-rule bg-rule sm:grid-cols-3">
            {measures.map(({ m, rows, latest }) => (
              <div key={m} className="bg-card p-5">
                <p className="label text-[0.72rem]">{MEASURES[m].label}</p>
                {latest ? (
                  <>
                    <p className="mt-2 font-display text-[2.3rem] leading-none text-ink num [font-variation-settings:'opsz'_60]">
                      {formatMeasure(MEASURES[m], latest.value)}
                      {latest.valueText ? <span className="ml-2 font-sans text-[1rem] font-semibold text-ink-2">{latest.valueText}</span> : null}
                    </p>
                    <p className="mt-2 text-small text-ink-2">
                      {latest.year} · {latest.dataVersion?.toLowerCase() ?? "official"}
                      {latest.nationalSelective !== null ? (
                        <>
                          <br />
                          All selective: {formatMeasure(MEASURES[m], latest.nationalSelective)}
                        </>
                      ) : null}
                    </p>
                    {rows.filter((r) => r.value !== null).length > 1 ? <Sparkline values={rows.map((r) => r.value)} className="mt-3" /> : null}
                  </>
                ) : (
                  <p className="mt-2 text-ink-2">Not published</p>
                )}
              </div>
            ))}
          </div>
        )}
      </RSection>

      <RSection id="inspection-summary" mark={marks["inspection-summary"]} title="Latest inspection" action={!isNI ? <ChapterLink href={`/schools/${slug}/inspection`}>Inspection history</ChapterLink> : null}>
        {isNI ? <NIInspectionNote /> : latestInspection ? <InspectionEntry i={latestInspection} sources={sources} lead /> : <Note>No inspection is recorded for this URN in Ofsted&apos;s latest management information.</Note>}
      </RSection>

      {latestYear ? (
        <RSection id="demand" mark={marks.demand} title="Applications and offers" action={<ChapterLink href={`/schools/${slug}/historical-admissions`}>Year by year</ChapterLink>}>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_16rem]">
            <div className="min-w-0 rounded-[8px] border border-rule bg-card p-4">
              <DemandChart rows={allocations} height={220} />
            </div>
            <div>
              <p className="text-[1.05rem] leading-relaxed text-ink-2">
                For September {latestYear} entry, families named the school as a first preference <strong className="text-ink">{formatNumber(alloc(latestYear, "times_first_preference"))}</strong> times; it made{" "}
                <strong className="text-ink">{formatNumber(alloc(latestYear, "offers_made"))}</strong> offers on national offer day.
              </p>
              <p className="mt-3 text-small text-ink-2">These are demand figures — not cut-off scores, distances or chances.</p>
            </div>
          </div>
        </RSection>
      ) : null}

      <RSection id="dates" mark={marks.dates} title="Key dates" lede="Only dates from official sources are shown. Deadlines set by your home council may also apply.">
        <DateLine events={upcoming} today={today} emptyText={`We don't hold upcoming verified dates for September ${entryYear} entry for this school yet. Dates are only shown once taken from an official source.`} />
      </RSection>

      <RSection id="facts" mark={marks.facts} title="Facts and contact">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_17rem]">
          <FactsPanel
            title="School record"
            rows={[
              ["Type", SELECTIVITY_LABEL[school.selectivity] ?? "—"],
              ["Pupils admitted", GENDER_LABEL[school.gender] ?? "—"],
              ["Ages", school.ageLow && school.ageHigh ? `${school.ageLow}–${school.ageHigh}` : "Not recorded"],
              ["Sixth form", school.hasSixthForm === null ? "Not recorded" : school.hasSixthForm ? "Yes" : "No"],
              ["Boarding", school.boarding === "boarding" ? "Yes" : school.boarding === "none" ? "No" : "Not recorded"],
              ["Establishment", school.establishmentType ?? "—"],
              ["Governance", school.governance ?? "—"],
              ...(school.trustName ? [["Trust", titleCaseName(school.trustName)] as [string, string]] : []),
              ["Pupils on roll", census?.pupils ? `${formatNumber(census.pupils)} (${formatDate(census.censusDate)})` : "Not recorded"],
              ["Capacity", census?.capacity ? formatNumber(census.capacity) : "Not recorded"],
              ...(contact?.headName ? [[contact.headJobTitle ?? "Headteacher", [contact.headTitle, contact.headName].filter(Boolean).join(" ")] as [string, string]] : []),
              ...(urn ? [["URN", urn] as [string, string]] : []),
              ...(deni ? [["DENI reference", deni] as [string, string]] : []),
            ]}
            footer={
              <>
                {formerNames.length ? <p className="mt-3 text-small text-ink-2">Formerly: {formerNames.map((n) => n.name).join("; ")}</p> : null}
                <Source source={schoolDoc} status={school.verificationStatus} checkedAt={school.lastCheckedAt} />
              </>
            }
          />
          {contact?.telephone || location?.postcode ? (
            <div className="self-start rounded-[8px] border border-rule p-5">
              <p className="label">Address</p>
              <address className="mt-2 text-[1rem] leading-relaxed text-ink not-italic">
                {[location?.street, location?.locality, location?.address3, location?.town, location?.county, location?.postcode].filter(Boolean).map((l) => (
                  <span key={l} className="block">
                    {l}
                  </span>
                ))}
              </address>
              {contact?.telephone ? (
                <>
                  <p className="label mt-4">Telephone</p>
                  <p className="mt-1 font-mono text-ink">{contact.telephone}</p>
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      </RSection>

      <RSection id="faqs" mark={marks.faqs} title="Questions parents ask" lede="Answered only from the facts in this report.">
        <div className="border-t border-rule">
          {faqs.map((f) => (
            <Disclosure key={f.q} summary={<h3 className="font-sans text-[1.06rem] font-semibold">{f.q}</h3>}>
              <p className="max-w-[68ch]">{f.a}</p>
            </Disclosure>
          ))}
        </div>
      </RSection>

      {nearby.length ? (
        <RSection id="nearby" mark={marks.nearby} title="Nearby selective schools" lede="Straight-line distance between school sites.">
          <ul className="grid gap-x-10 sm:grid-cols-2">
            {nearby.map((n) => (
              <li key={n.slug}>
                <Link href={`/schools/${n.slug}`} className="group/nb flex items-baseline gap-3 border-b border-rule py-3 no-underline">
                  <span className="min-w-0">
                    <span className="block font-semibold text-ink group-hover/nb:text-green">{n.name}</span>
                    <span className="text-small text-ink-2">
                      {n.town}
                      {n.gender !== "unknown" ? ` · ${GENDER_LABEL[n.gender]}` : ""}
                    </span>
                  </span>
                  <span aria-hidden className="mb-1 flex-1 border-b border-dotted border-rule-strong" />
                  <span className="font-mono text-[0.9rem] whitespace-nowrap text-ink">{n.miles.toFixed(1)} mi</span>
                </Link>
              </li>
            ))}
          </ul>
        </RSection>
      ) : null}
    </ReportBody>
  );
}
