import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { GENDER_LABEL, SELECTIVITY_LABEL } from "@/domain/labels";
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
import { AdmissionsSummary, KeyDates, NoPolicy, ThreeSteps } from "@/components/school/admissions";
import { InspectionCard } from "@/components/school/inspection-history";
import { Callout, Card, SectionHeading } from "@/components/ui/primitives";
import { JsonLd } from "@/components/ui/json-ld";
import { SourceNote } from "@/components/ui/source-note";

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
  const a8 = latestPublished(measureRows(results, comparators, "ks4_attainment8", la?.code));
  const em5 = latestPublished(measureRows(results, comparators, "ks4_engmath_95_pct", la?.code));
  const aps = latestPublished(measureRows(results, comparators, "ks5_alevel_aps_per_entry", la?.code));
  const latestInspections = latestByFramework(inspections).slice(0, 1);
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = events.filter((e) => (e.ends_on ?? e.starts_on) >= today);
  const latestYear = allocations.at(-1)?.entryYear;
  const alloc = (m: string) => allocations.find((a) => a.entryYear === latestYear && a.metric === m)?.value ?? null;
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
  if (latestYear && alloc("offers_to_other_la") !== null) {
    faqs.push({
      q: `How many offers went to families from other local authorities?`,
      a: (
        <>
          On national offer day for September {latestYear} entry, {formatNumber(alloc("offers_to_other_la"))} of {formatNumber(alloc("offers_made"))} offers went to families living in another local authority (DfE). Past outcomes don&apos;t predict future
          years.
        </>
      ),
    });
  }

  return (
    <div className="grid gap-12">
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

      <section aria-labelledby="key-admissions" className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="grid gap-4">
          <SectionHeading
            id="key-admissions"
            title="Key admissions information"
            description={`For ${entryPointLabel} entry in September ${entryYear}.`}
            action={
              <Link href={`/schools/${slug}/admissions`} className="inline-flex items-center gap-1 text-sm font-semibold link">
                Full admissions rules <ArrowRight aria-hidden className="size-4" />
              </Link>
            }
          />
          {policy ? (
            <AdmissionsSummary policy={policy} sources={sources} testName={test?.test.name ?? null} testSlug={test?.test.slug ?? null} />
          ) : (
            <NoPolicy schoolName={school.name} entryYear={entryYear} website={contact?.website} otherYears={policies.filter((p) => p.status !== "superseded").map((p) => p.cycle.entryYear)} />
          )}
          <ThreeSteps compact />
          <Link href={`/tools/eligibility-checker?schools=${slug}`} className="flex items-center justify-between rounded-xl border border-accent/30 bg-accent-soft px-5 py-4 font-semibold text-accent-ink hover:border-accent">
            Check how the admission rules apply to your child
            <ArrowRight aria-hidden className="size-5" />
          </Link>
        </div>
        <aside className="grid content-start gap-4">
          <Card className="p-5">
            <h2 className="font-sans text-sm font-semibold text-ink">School facts</h2>
            <dl className="mt-3 grid gap-2.5 text-sm">
              {[
                ["Type", SELECTIVITY_LABEL[school.selectivity]],
                ["Pupils admitted", GENDER_LABEL[school.gender]],
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
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-line/60 pb-2 last:border-0">
                  <dt className="text-ink-3">{k}</dt>
                  <dd className="text-right font-medium text-ink">{v}</dd>
                </div>
              ))}
            </dl>
            {formerNames.length ? <p className="mt-3 text-xs text-ink-3">Formerly: {formerNames.map((n) => n.name).join("; ")}</p> : null}
            <SourceNote source={schoolDoc} status={school.verificationStatus} checkedAt={school.lastCheckedAt} />
          </Card>
          {contact?.telephone || location?.postcode ? (
            <Card className="p-5 text-sm">
              <h2 className="font-sans text-sm font-semibold text-ink">Contact</h2>
              <address className="mt-2 text-ink-2 not-italic">
                {[location?.street, location?.locality, location?.address3, location?.town, location?.county, location?.postcode].filter(Boolean).map((l) => (
                  <span key={l} className="block">
                    {l}
                  </span>
                ))}
              </address>
              {contact?.telephone ? <p className="mt-2 text-ink-2">Telephone: {contact.telephone}</p> : null}
            </Card>
          ) : null}
        </aside>
      </section>

      <section aria-labelledby="dates">
        <SectionHeading id="dates" title="Upcoming key dates" description="Only dates from official sources are shown. Deadlines set by your home council may also apply." />
        <KeyDates events={upcoming.slice(0, 6)} entryYear={entryYear} today={today} />
      </section>

      <section aria-labelledby="results-summary">
        <SectionHeading
          id="results-summary"
          title="Results at a glance"
          description="Latest published DfE figures, with the average for all selective schools in England for comparison."
          action={
            <Link href={`/schools/${slug}/results`} className="inline-flex items-center gap-1 text-sm font-semibold link">
              All results <ArrowRight aria-hidden className="size-4" />
            </Link>
          }
        />
        {isNI ? (
          <Callout>School-level GCSE and A level results for Northern Ireland are not yet integrated. DE NI publishes them separately from DfE&apos;s performance tables.</Callout>
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            {(
              [
                ["ks4_attainment8", a8],
                ["ks4_engmath_95_pct", em5],
                ["ks5_alevel_aps_per_entry", aps],
              ] as const
            ).map(([m, row]) => (
              <Card key={m} className="p-5">
                <p className="text-sm text-ink-3">{MEASURES[m].label}</p>
                {row ? (
                  <>
                    <p className="mt-1 text-3xl font-semibold text-ink">
                      {formatMeasure(MEASURES[m], row.value)}
                      {row.valueText ? <span className="ml-2 text-lg font-medium text-ink-2">{row.valueText}</span> : null}
                    </p>
                    <p className="mt-1 text-xs text-ink-3">
                      {row.year} ({row.dataVersion?.toLowerCase() ?? "official"})
                      {row.nationalSelective !== null ? ` · all selective schools: ${formatMeasure(MEASURES[m], row.nationalSelective)}` : ""}
                    </p>
                  </>
                ) : (
                  <p className="mt-1 text-lg text-ink-3">Not published</p>
                )}
              </Card>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="inspection-summary">
        <SectionHeading
          id="inspection-summary"
          title="Latest inspection"
          action={
            <Link href={`/schools/${slug}/inspection`} className="inline-flex items-center gap-1 text-sm font-semibold link">
              Inspection history <ArrowRight aria-hidden className="size-4" />
            </Link>
          }
        />
        {isNI ? (
          <Callout>Northern Ireland schools are inspected by the Education and Training Inspectorate (ETI). ETI reports are not yet integrated.</Callout>
        ) : latestInspections[0] ? (
          <InspectionCard i={latestInspections[0]} sources={sources} />
        ) : (
          <Callout>No inspection is recorded for this URN in Ofsted&apos;s latest management information.</Callout>
        )}
      </section>

      {latestYear ? (
        <section aria-labelledby="demand">
          <SectionHeading
            id="demand"
            title="Applications and offers"
            action={
              <Link href={`/schools/${slug}/historical-admissions`} className="inline-flex items-center gap-1 text-sm font-semibold link">
                {allocations.length ? "History since 2014" : "History"} <ArrowRight aria-hidden className="size-4" />
              </Link>
            }
          />
          <p className="max-w-3xl text-ink-2">
            For September {latestYear} entry, the school was named as a first preference <strong className="text-ink">{formatNumber(alloc("times_first_preference"))}</strong> times and made{" "}
            <strong className="text-ink">{formatNumber(alloc("offers_made"))}</strong> offers on national offer day. These are demand figures, not cut-off scores or distances.
          </p>
        </section>
      ) : null}

      <section aria-labelledby="faqs">
        <SectionHeading id="faqs" title="Questions parents ask" description="Answers are generated only from the facts on this page." />
        <div className="divide-y divide-line rounded-xl border border-line bg-surface">
          {faqs.map((f) => (
            <details key={f.q} className="group px-5 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-ink [&::-webkit-details-marker]:hidden">
                <h3 className="font-sans text-base">{f.q}</h3>
                <span aria-hidden className="text-ink-3 transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-2 text-ink-2 [&_a]:text-accent-ink [&_a]:underline">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {nearby.length ? (
        <section aria-labelledby="nearby">
          <SectionHeading id="nearby" title="Nearby selective schools" description="Straight-line distance between school sites." />
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {nearby.map((n) => (
              <li key={n.slug}>
                <Link href={`/schools/${n.slug}`} className="block rounded-xl border border-line bg-surface p-4 hover:border-line-strong">
                  <span className="block font-semibold text-ink">{n.name}</span>
                  <span className="text-sm text-ink-3">
                    {n.town} · {GENDER_LABEL[n.gender]} · {n.miles.toFixed(1)} miles
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
