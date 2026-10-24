import type { Metadata } from "next";
import Link from "next/link";
import { ADMISSIONS_GUIDES, READING_PATHS } from "@/content/guides";
import { KNOWLEDGE_EDGES, KNOWLEDGE_NODES } from "@/content/knowledge";
import { CATCHMENT_LABEL, GENDER_LABEL, SELECTIVITY_SHORT } from "@/domain/labels";
import { formatMeasure, MEASURES } from "@/domain/measures";
import { defaultEntryYear } from "@/lib/academic-year";
import { formatDate, formatNumber, formatWeekdayDate, relativeAge } from "@/lib/format";
import { SITE } from "@/lib/site";
import { cycleEvents, dataFreshness, featuredSchools, nationalDemandTrend, regionProfiles, schoolPoints, upcomingEvents } from "@/server/insights";
import { getAllocations, getComparators, getEntranceTests, getPolicies, getResults, getSchoolCore, loadSources, policyForYear } from "@/server/profile";
import { measureRows } from "@/server/profile-view";
import { siteStats } from "@/server/schools";
import { IconArrow, IconPin } from "@/ui/icons";
import { ArrowLink, ButtonLink, Kicker, Page, SectionHead, Source, Tag } from "@/ui/kit";
import { SearchField } from "@/ui/search";
import { Status } from "@/ui/status";
import { AdmissionJourney } from "@/ui/viz/admission-journey";
import { DateLine } from "@/ui/viz/admissions-viz";
import { AtlasMap } from "@/ui/viz/atlas-map";
import { GroupedBars, Sparkline } from "@/ui/viz/charts";
import { GlyphAfterPassing, GlyphCatchment, GlyphCriteria, GlyphExam, GlyphNearMe, GlyphWhen } from "@/ui/viz/glyphs";
import { KnowledgeMap } from "@/ui/viz/knowledge-map";
import { RegionExplorer } from "@/ui/viz/region-explorer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: `${SITE.name} — find a grammar school and understand how it admits` },
  description: "Official information on every grammar school in England and Northern Ireland: entrance tests, admission rules, catchment, results, inspections and past demand — each rule explained, each fact sourced.",
  alternates: { canonical: "/" },
};

async function specimen() {
  const [f] = await featuredSchools(1);
  if (!f) return null;
  const core = await getSchoolCore(f.slug);
  if (!core) return null;
  const entryYear = defaultEntryYear();
  const [policies, tests, results, comparators, allocations] = await Promise.all([getPolicies(core.school.id), getEntranceTests(core.school.id, entryYear), getResults(core.school.id), getComparators(core.la?.code), getAllocations(core.school.id)]);
  const policy = policyForYear(policies, entryYear);
  const sources = await loadSources([policy?.sourceDocumentId]);
  const a8 = measureRows(results, comparators, "ks4_attainment8", core.la?.code);
  const lastA8 = [...a8].reverse().find((r) => r.value !== null) ?? null;
  const years = [...new Set(allocations.map((a) => a.entryYear))].sort();
  const get = (y: number, m: string) => allocations.find((a) => a.entryYear === y && a.metric === m)?.value ?? null;
  const latest = years.at(-1);
  return { core, policy, test: tests[0] ?? null, entryYear, sources, a8, lastA8, years, get, latest };
}

const QUESTIONS = [
  { n: "01", q: "Which grammar schools are near me?", Glyph: GlyphNearMe },
  { n: "02", q: "Does my child meet the admission criteria?", Glyph: GlyphCriteria },
  { n: "03", q: "Can we apply outside our catchment?", Glyph: GlyphCatchment },
  { n: "04", q: "How does the 11+ examination work?", Glyph: GlyphExam },
  { n: "05", q: "What happens after passing the test?", Glyph: GlyphAfterPassing },
  { n: "06", q: "When must we apply?", Glyph: GlyphWhen },
] as const;

export default async function HomePage() {
  const entryYear = defaultEntryYear();
  const [stats, points, regions, events, demand, freshness, england, spec] = await Promise.all([
    siteStats(),
    schoolPoints(),
    regionProfiles(),
    upcomingEvents(5),
    nationalDemandTrend(),
    dataFreshness(),
    cycleEvents("england", entryYear),
    specimen(),
  ]);
  const closing = england.find((e) => e.event_type === "application_deadline" && e.scope === "nation");
  const offerDay = england.find((e) => e.event_type === "national_offer_day" && e.scope === "nation");
  const groups = regions.map((r) => ({ slug: r.slug, name: r.name, n: r.n }));
  const today = new Date().toISOString().slice(0, 10);
  const lastDemand = demand.at(-1);

  const answers: React.ReactNode[] = [
    <>
      Search by postcode to see every school by straight-line distance — labelled as an approximation, because schools measure from your exact address using their own method.
      <form action="/grammar-schools" method="get" className="mt-4 flex max-w-sm gap-2">
        <input type="hidden" name="sort" value="distance" />
        <label htmlFor="q1-pc" className="sr-only">
          Postcode
        </label>
        <input id="q1-pc" name="postcode" required placeholder="e.g. HP21 7RP" autoComplete="postal-code" className="min-h-11 w-full min-w-0 rounded-[5px] border border-control bg-card px-3 uppercase placeholder:normal-case focus:border-green focus:outline-none" />
        <button type="submit" className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-[5px] bg-green px-3.5 font-semibold text-paper hover:bg-green-deep">
          <IconPin size={16} /> Find
        </button>
      </form>
    </>,
    <>
      The <Link href="/tools/eligibility-checker">eligibility checker</Link> asks only the questions each school&apos;s rules depend on, then shows which criteria could apply — and what is still unknown. It never gives a probability.
    </>,
    <>
      Usually yes. In England you apply through your home council and can name schools anywhere. Whether a place is realistic depends on the school&apos;s criteria — <Link href="/admissions/out-of-catchment">how catchment and distance work</Link>.
    </>,
    <>
      There is no single 11+. Each area sets its own test, timetable and scoring, and a score only counts for its own test. <Link href="/11-plus">The 11+ explained</Link>.
    </>,
    <>
      Passing makes your child eligible to be <em>considered</em>. If more qualified children apply than there are places, the school&apos;s published criteria decide the order. <Link href="#how-admission-works">See it step by step</Link>.
    </>,
    closing && offerDay ? (
      <>
        For September {entryYear} entry in England, applications to your home council close on <strong className="text-ink">{formatWeekdayDate(closing.starts_on)}</strong> and offers are sent on{" "}
        <strong className="text-ink">{formatWeekdayDate(offerDay.starts_on)}</strong>. Test registration closes earlier. <Link href="/calendar">All verified dates</Link>.
        <span className="mt-2 block">
          <Status status={closing.verification_status} />
        </span>
      </>
    ) : (
      <>
        Each test and council publishes its own dates. <Link href="/calendar">See the verified dates we hold</Link>.
      </>
    ),
  ];

  return (
    <>
      {/* A — Editorial introduction */}
      <section aria-labelledby="hero-title" className="border-b border-rule">
        <Page className="grid gap-x-14 gap-y-10 pt-10 pb-14 sm:pt-16 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-center lg:pb-20">
          <div className="anim-rise">
            <Kicker>An atlas of UK grammar schools</Kicker>
            <h1 id="hero-title" className="mt-5 text-display leading-[1.02] [font-variation-settings:'opsz'_72]">
              Find a grammar school, and understand <em className="text-green italic">exactly</em> how it chooses.
            </h1>
            <p className="mt-6 max-w-[38rem] text-lede leading-[1.5] text-ink-2">
              Official records for every grammar school in England and Northern Ireland — entrance tests, admission rules, results, inspections and past demand — with each rule explained in plain English and every fact tied to its source.
            </p>
            <div className="mt-8 max-w-[40rem]">
              <SearchField size="lg" placeholder="School, town or postcode" />
            </div>
            <p className="mt-5">
              <ArrowLink href="#how-admission-works">New to this? See how admission works in three steps</ArrowLink>
            </p>
            <dl className="mt-10 grid max-w-[40rem] grid-cols-2 gap-x-6 gap-y-4 border-t border-rule pt-5 sm:grid-cols-4">
              {[
                [stats.listed, "schools listed"],
                [stats.england, "grammar schools, England"],
                [stats.partial, "partially selective"],
                [stats.ni, "Northern Ireland"],
              ].map(([v, l]) => (
                <div key={l as string}>
                  <dt className="sr-only">{l}</dt>
                  <dd>
                    <span className="block font-display text-[2rem] leading-none text-ink num [font-variation-settings:'opsz'_48]">{v}</span>
                    <span className="mt-1.5 block text-small text-ink-2">{l}</span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
          <figure className="min-w-0">
            <AtlasMap points={points} groups={groups} legend={false} />
            <figcaption className="mt-3 text-small leading-relaxed text-ink-2">
              <span className="label mr-2 text-copper-ink">Fig. 1</span>
              Each dot is a school, placed by its official coordinates. No coastline is drawn — the shape is the schools themselves.
            </figcaption>
          </figure>
        </Page>
      </section>

      {/* B — Start with a question */}
      <section aria-labelledby="questions" className="pt-20 sm:pt-24">
        <Page>
          <div className="grid gap-x-16 gap-y-6 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
            <div className="lg:sticky lg:top-[calc(var(--header-h)+2.5rem)] lg:self-start">
              <Kicker>Start with a question</Kicker>
              <h2 id="questions" className="mt-4 text-h2">The six questions parents ask first.</h2>
              <p className="mt-4 text-[1.06rem] leading-relaxed text-ink-2">Short, sourced answers — and a route to the full one.</p>
            </div>
            <ol className="grid gap-x-12 md:grid-cols-2">
              {QUESTIONS.map(({ n, q, Glyph }, i) => (
                <li key={n} className="group/q grid grid-cols-[3rem_minmax(0,1fr)] gap-x-4 border-t border-rule py-7">
                  <div className="pt-1 transition-transform duration-[var(--d-3)] ease-[var(--ease-out)] group-hover/q:-translate-y-0.5">
                    <Glyph />
                  </div>
                  <div>
                    <p className="font-mono text-[0.8rem] text-copper-ink">{n}</p>
                    <h3 className="mt-1 text-[1.32rem] leading-snug [font-variation-settings:'opsz'_30]">{q}</h3>
                    <div className="mt-2 text-[1.02rem] leading-relaxed text-ink-2 [&_a]:font-semibold [&_a]:text-green [&_a]:underline [&_a]:decoration-green/40 [&_a]:underline-offset-4 hover:[&_a]:decoration-current">{answers[i]}</div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </Page>
      </section>

      {/* C — How admission works */}
      <section id="how-admission-works" aria-labelledby="journey-title" className="mt-20 border-y border-rule bg-card/70 py-16 sm:mt-24 sm:py-20">
        <Page>
          <div className="max-w-[46rem]">
            <Kicker>Fig. 2 · How grammar school admission works</Kicker>
            <h2 id="journey-title" className="mt-4 text-h1 [font-variation-settings:'opsz'_60]">Qualifying is the first step, not the last.</h2>
            <p className="mt-4 text-lede leading-[1.5] text-ink-2">Most confusion comes from treating a pass as a place. Follow seventy-two imaginary applicants through the three steps every grammar school uses.</p>
          </div>
          <div className="mt-10">
            <AdmissionJourney />
          </div>
        </Page>
      </section>

      {/* D — Discover schools */}
      <section aria-labelledby="discover" className="pt-20 sm:pt-24">
        <Page>
          <SectionHead
            id="discover"
            kicker="Discover schools"
            title="Grammar schools cluster in a few places."
            lede="Each area runs its own test and timetable, so start with the region — then narrow by test, sixth form and admissions rules."
            action={
              <ButtonLink href="/grammar-schools" variant="secondary" arrow>
                All {stats.listed} schools
              </ButtonLink>
            }
          />
          <div className="mt-8">
            <RegionExplorer regions={regions} />
          </div>
          <p className="mt-4 text-[1rem] text-ink-2">
            Wales and Scotland have no state grammar schools — <Link href="/admissions/wales-and-scotland" className="a">how school choice works there</Link>.
          </p>
        </Page>
      </section>

      {/* E — Understand schools visually */}
      {spec ? (
        <section aria-labelledby="specimen" className="pt-20 sm:pt-24">
          <Page>
            <SectionHead id="specimen" kicker="What a profile tells you" title="A school, read like a research report." lede="An excerpt from a real profile. The notes in the margin explain how to read it." />
            <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_19rem]">
              <article className="sheet relative overflow-hidden" aria-label={`Excerpt from the ${spec.core.school.name} profile`}>
                <header className="border-b border-rule bg-paper px-6 py-5 sm:px-8">
                  <p className="label">School profile · excerpt</p>
                  <h3 className="mt-2 text-h3">
                    <Link href={`/schools/${spec.core.school.slug}`} className="no-underline hover:underline">
                      {spec.core.school.name}
                    </Link>
                  </h3>
                  <p className="mt-1 text-[1rem] text-ink-2">{[spec.core.location?.town, spec.core.la?.name].filter(Boolean).join(" · ")}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <Tag>{SELECTIVITY_SHORT[spec.core.school.selectivity]}</Tag>
                    <Tag>{GENDER_LABEL[spec.core.school.gender]}</Tag>
                    {spec.core.school.hasSixthForm ? <Tag>Sixth form</Tag> : null}
                  </div>
                </header>
                <div className="grid divide-y divide-rule sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                  <div className="relative p-6">
                    <Marker n={1} />
                    <p className="label">Admission · Sept {spec.entryYear}</p>
                    {spec.policy ? (
                      <>
                        <p className="mt-2 font-display text-[2.2rem] leading-none num">{spec.policy.scoreRules.find((r) => r.kind === "qualifying_threshold")?.scoreValue ?? "—"}</p>
                        <p className="mt-1 text-small text-ink-2">qualifying score{spec.test ? ` · ${spec.test.test.name}` : ""}</p>
                        <p className="mt-3 text-[0.98rem] text-ink">
                          {spec.policy.publishedAdmissionNumber ?? "—"} places · {spec.policy.criteria.length} ordered criteria
                        </p>
                        <p className="text-small text-ink-2">{CATCHMENT_LABEL[spec.policy.catchmentType]}</p>
                        <Status status={spec.policy.verificationStatus} className="mt-3" />
                      </>
                    ) : (
                      <p className="mt-2 text-ink-2">Admissions rules not yet held for this year.</p>
                    )}
                  </div>
                  <div className="relative p-6">
                    <Marker n={2} />
                    <p className="label">GCSE · Attainment 8</p>
                    {spec.lastA8 ? (
                      <>
                        <p className="mt-2 font-display text-[2.2rem] leading-none num">{formatMeasure(MEASURES.ks4_attainment8, spec.lastA8.value)}</p>
                        <p className="mt-1 text-small text-ink-2">
                          {spec.lastA8.year} · all selective schools {formatMeasure(MEASURES.ks4_attainment8, spec.lastA8.nationalSelective)}
                        </p>
                        <Sparkline values={spec.a8.map((r) => r.value)} className="mt-3" />
                      </>
                    ) : (
                      <p className="mt-2 text-ink-2">Not published.</p>
                    )}
                  </div>
                  <div className="relative p-6">
                    <Marker n={3} />
                    <p className="label">Demand · Sept {spec.latest ?? "—"}</p>
                    {spec.latest ? (
                      <>
                        <p className="mt-2 font-display text-[2.2rem] leading-none num">{formatNumber(spec.get(spec.latest, "times_first_preference"))}</p>
                        <p className="mt-1 text-small text-ink-2">first preferences · {formatNumber(spec.get(spec.latest, "offers_made"))} offers made</p>
                        <Sparkline values={spec.years.map((y) => spec.get(y, "offers_made"))} className="mt-3" />
                      </>
                    ) : (
                      <p className="mt-2 text-ink-2">No DfE data.</p>
                    )}
                  </div>
                </div>
                <div className="relative border-t border-rule px-6 pt-1 pb-5 sm:px-8">
                  <Marker n={4} />
                  <Source source={spec.policy?.sourceDocumentId ? spec.sources.get(spec.policy.sourceDocumentId) : null} locator={spec.policy?.sourceLocator} />
                </div>
              </article>
              <ol className="grid content-start gap-6">
                {[
                  ["The rules for one entry year", "Admissions rules change every year, so each one belongs to a single September. We never fill a gap with another year's rules."],
                  ["Results with a fair benchmark", "Grammar schools are compared with all selective schools, not every school — and the year is always shown."],
                  ["Demand, not chances", "First preferences and offers describe a past year. They are not a pass mark, a distance or a probability."],
                  ["A source on every fact", "Each figure names the document it came from, and when we retrieved it. Unchecked facts say so."],
                ].map(([t, d], i) => (
                  <li key={t} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3">
                    <span className="grid size-7 place-items-center rounded-full border border-copper bg-copper-wash font-mono text-[0.8rem] text-copper-ink">{i + 1}</span>
                    <div>
                      <p className="font-semibold text-ink">{t}</p>
                      <p className="mt-0.5 text-[0.98rem] leading-relaxed text-ink-2">{d}</p>
                    </div>
                  </li>
                ))}
                <li className="pl-11">
                  <ArrowLink href={`/schools/${spec.core.school.slug}`}>Read the full profile</ArrowLink>
                </li>
              </ol>
            </div>
          </Page>
        </section>
      ) : null}

      {/* F — The knowledge atlas */}
      <section aria-labelledby="knowledge" className="pt-20 sm:pt-24">
        <Page>
          <SectionHead id="knowledge" kicker="The knowledge atlas" title="Every guide connects to the next." lede="Admissions ideas depend on each other. Trace a topic to see what it leads to, or follow a reading path." />
          <div className="mt-8">
            <KnowledgeMap nodes={KNOWLEDGE_NODES} edges={KNOWLEDGE_EDGES} />
          </div>
          <div className="mt-10 grid gap-10 md:grid-cols-3">
            {(Object.keys(READING_PATHS) as (keyof typeof READING_PATHS)[]).map((k) => (
              <div key={k}>
                <p className="label text-copper-ink">Reading path</p>
                <h3 className="mt-1 text-h3">{READING_PATHS[k].title}</h3>
                <p className="mt-1 text-[0.98rem] text-ink-2">{READING_PATHS[k].text}</p>
                <ol className="mt-4 grid gap-0 border-t border-rule">
                  {ADMISSIONS_GUIDES.filter((g) => g.path === k).map((g, i) => (
                    <li key={g.slug} className="border-b border-rule">
                      <Link href={`/admissions/${g.slug}`} className="group/p flex items-baseline gap-3 py-3 no-underline">
                        <span className="font-mono text-[0.8rem] text-ink-2">{String(i + 1).padStart(2, "0")}</span>
                        <span className="font-semibold text-ink group-hover/p:text-green">{g.short}</span>
                        <IconArrow size={14} className="ml-auto shrink-0 self-center text-ink-3 transition-transform duration-[var(--d-2)] group-hover/p:translate-x-1 group-hover/p:text-green" />
                      </Link>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </Page>
      </section>

      {/* G — Dates and research */}
      <section aria-labelledby="dates" className="mt-20 border-y border-rule bg-sage/50 py-16 sm:mt-24 sm:py-20">
        <Page className="grid gap-14 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div>
            <Kicker>Dates</Kicker>
            <h2 id="dates" className="mt-4 text-h2">Coming up</h2>
            <p className="mt-2 text-[1.04rem] text-ink-2">Dates from official sources only — each one says whether an editor has checked it.</p>
            <div className="mt-6">
              <DateLine events={events.map((e) => ({ ...e, context: `${e.nation === "northern_ireland" ? "Northern Ireland" : "England"} · September ${e.entry_year} entry` }))} today={today} emptyText="No upcoming dates are held yet." />
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <ButtonLink href="/tools/planner" arrow>
                Plan your year
              </ButtonLink>
              <ButtonLink href="/calendar" variant="secondary">
                Full calendar
              </ButtonLink>
            </div>
          </div>
          {demand.length > 1 && lastDemand ? (
            <div className="min-w-0">
              <Kicker>Research</Kicker>
              <h2 className="mt-4 text-h2">Demand for places in England</h2>
              <p className="mt-2 text-[1.04rem] text-ink-2">
                In {lastDemand.entry_year}, families named England&apos;s {lastDemand.schools} grammar schools as a first preference {formatNumber(lastDemand.first)} times; {formatNumber(lastDemand.offers)} offers were made on national offer day.
              </p>
              <div className="mt-6 rounded-[8px] border border-rule bg-card p-5">
                <GroupedBars
                  label={`First preferences and offers made, England's fully selective schools, ${demand[0]!.entry_year}–${lastDemand.entry_year}`}
                  xs={demand.map((d) => String(d.entry_year))}
                  series={[
                    { key: "first", label: "Named as first preference", tone: "school", points: demand.map((d) => ({ x: String(d.entry_year), y: d.first })) },
                    { key: "offers", label: "Offers made", tone: "benchmark", points: demand.map((d) => ({ x: String(d.entry_year), y: d.offers })) },
                  ]}
                />
                <p className="mt-3 text-small leading-relaxed text-ink-2">
                  Year of September entry. Source: DfE school-level applications and offers. DfE&apos;s figures for 2021 entry are unusually high for first preferences and are shown as published. More first preferences than offers doesn&apos;t mean
                  children were refused — many had not qualified, and some had other offers.
                </p>
              </div>
            </div>
          ) : null}
        </Page>
      </section>

      {/* H — Data credibility */}
      <section aria-labelledby="provenance" className="pt-20 sm:pt-24">
        <Page className="grid gap-12 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
          <div>
            <Kicker>Provenance</Kicker>
            <h2 id="provenance" className="mt-4 text-h2">Where every fact comes from.</h2>
            <p className="mt-3 text-[1.04rem] leading-relaxed text-ink-2">Official publishers first. Anything we haven&apos;t checked is labelled, never guessed — and if a refresh fails, the previous data stays in place.</p>
            <ul className="mt-6 grid gap-2 text-[1rem] text-ink-2">
              <li>— We can&apos;t promise a place or predict offers.</li>
              <li>— A school&apos;s determined policy is always the authority.</li>
              <li>— Postcode distances are approximate.</li>
            </ul>
            <div className="mt-6 flex flex-col gap-2">
              <ArrowLink href="/methodology">Our methodology</ArrowLink>
              <ArrowLink href="/data-sources">Every source, with licences</ArrowLink>
            </div>
          </div>
          <div className="min-w-0">
            <table className="w-full border-collapse text-left">
              <caption className="sr-only">Data sources and when each was last refreshed</caption>
              <thead>
                <tr className="border-b border-ink">
                  <th scope="col" className="label pb-2 font-medium">
                    Source
                  </th>
                  <th scope="col" className="label hidden pb-2 font-medium sm:table-cell">
                    Refreshed
                  </th>
                  <th scope="col" className="label pb-2 text-right font-medium">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {freshness.map((f) => (
                  <tr key={f.job} className="border-b border-rule align-top">
                    <td className="py-3.5 pr-4">
                      <span className="block font-semibold text-ink">{f.source_name ?? f.job}</span>
                      <span className="block text-small text-ink-2">{f.description}</span>
                      <span className="block text-small text-ink-2 sm:hidden">Refreshed {relativeAge(f.last_success)}</span>
                    </td>
                    <td className="hidden py-3.5 pr-4 text-[0.98rem] whitespace-nowrap text-ink-2 sm:table-cell">{f.last_success ? `${relativeAge(f.last_success)} · ${formatDate(f.last_success)}` : "Never"}</td>
                    <td className="py-3.5 text-right">
                      {f.last_status === "failed" ? (
                        <span className="text-small font-semibold text-bad">Last run failed — previous data kept</span>
                      ) : f.last_status === "partial" ? (
                        <span className="text-small font-semibold text-pend">Completed with warnings</span>
                      ) : (
                        <span className="text-small font-semibold text-ok">Up to date</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Page>
      </section>
    </>
  );
}

function Marker({ n }: { n: number }) {
  return (
    <span aria-hidden className="absolute top-3 right-3 grid size-6 place-items-center rounded-full border border-copper bg-copper-wash font-mono text-[0.75rem] text-copper-ink">
      {n}
    </span>
  );
}
