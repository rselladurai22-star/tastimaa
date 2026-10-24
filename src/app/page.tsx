import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpenCheck, CalendarDays, GitCompareArrows, ListChecks, MapPinned, MessagesSquare, Route, ScrollText, ShieldCheck } from "lucide-react";
import { EVENT_TYPE_LABEL, GENDER_LABEL } from "@/domain/labels";
import { formatDate, formatNumber, relativeAge } from "@/lib/format";
import { SITE } from "@/lib/site";
import { dataFreshness, featuredSchools, nationalDemandTrend, regionsWithCounts, upcomingEvents } from "@/server/insights";
import { siteStats } from "@/server/schools";
import { TrendChart } from "@/components/charts/trend-chart";
import { ThreeSteps } from "@/components/school/admissions";
import { SearchBox } from "@/components/search/search-box";
import { ButtonLink, Card, Container, Eyebrow, SectionHeading } from "@/components/ui/primitives";
import { VerificationBadge } from "@/components/ui/verification";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: `${SITE.name} — find the right grammar school and understand every admission rule` },
  description: "Verified information on every UK grammar school: entrance tests, catchment rules, admissions criteria, official results and Ofsted inspections — with a source for every fact.",
  alternates: { canonical: "/" },
};

const TOOLS = [
  { href: "/grammar-schools?view=map", title: "Schools near you", text: "Search by postcode and see every selective school on a map, with straight-line distances clearly labelled.", Icon: MapPinned },
  { href: "/tools/eligibility-checker", title: "Eligibility checker", text: "Answer only the questions that matter and see which admission criteria your child could meet.", Icon: ListChecks },
  { href: "/compare", title: "Compare schools", text: "Put up to five schools side by side: tests, rules, results, inspections and demand.", Icon: GitCompareArrows },
  { href: "/tools/catchment-checker", title: "Catchment checker", text: "Check a postcode against verified catchment boundaries, and learn when distance applies instead.", Icon: Route },
  { href: "/tools/planner", title: "Admissions planner", text: "A personal timeline of registration, test, application and offer dates for your shortlist.", Icon: CalendarDays },
  { href: "/assistant", title: "Research assistant", text: "Ask questions in plain English. Answers cite the official sources they come from.", Icon: MessagesSquare },
];

const FAQS: [string, string, string][] = [
  ["Does passing the 11+ guarantee a grammar school place?", "No. Passing (meeting the qualifying standard) makes a child eligible to be considered. If more qualified children apply than there are places, each school's oversubscription criteria decide who is offered a place.", "/admissions/qualifying-is-not-an-offer"],
  ["Can we apply to a grammar school outside our county?", "Usually yes — you apply through your home council, listing schools in any area. Whether a place is likely depends on that school's criteria, which may prioritise local children.", "/admissions/out-of-catchment"],
  ["Is a qualifying score from one test valid for another school?", "No. Tests differ in content and scoring, so a score from one area's test cannot be used for a school that uses a different test.", "/11-plus"],
  ["When do I apply for a September 2027 place in England?", "Applications to your home council close on 31 October 2026, and offers are sent on 1 March 2027. Test registration deadlines are usually earlier — check each test.", "/calendar"],
  ["How is Northern Ireland different?", "Children transfer to Year 8 after the SEAG Entrance Assessment in P7, and each school applies its own published criteria. The English Year 7 process does not apply.", "/admissions/northern-ireland"],
  ["What can I do if we don't get a place?", "You can join waiting lists and you have a right to appeal each refusal to an independent panel. You must be given at least 20 school days to lodge an appeal.", "/admissions/appeals"],
];

export default async function HomePage() {
  const [stats, regions, featured, demand, events, freshness] = await Promise.all([siteStats(), regionsWithCounts(), featuredSchools(3), nationalDemandTrend(), upcomingEvents(5), dataFreshness()]);
  const latestDemand = demand.at(-1);

  return (
    <>
      {/* 1. Primary search */}
      <section className="border-b border-line bg-surface">
        <Container className="grid gap-10 py-14 lg:grid-cols-[minmax(0,1fr)_24rem] lg:py-20">
          <div className="max-w-3xl">
            <Eyebrow>UK grammar schools · {stats.england + stats.ni} schools · every fact sourced</Eyebrow>
            <h1 className="mt-4 text-4xl leading-[1.08] font-semibold tracking-tight sm:text-5xl lg:text-[3.4rem]">Find the right grammar school. Understand every admission rule.</h1>
            <p className="mt-5 max-w-2xl text-lg text-ink-2">
              Explore verified school information, entrance tests, catchment rules, academic performance and admissions guidance — all in one place.
            </p>
            <div className="mt-8 max-w-2xl">
              <SearchBox size="lg" />
            </div>
            <ul className="mt-5 flex flex-wrap gap-2 text-sm">
              {[
                ["/grammar-schools?view=map", "Find grammar schools near me"],
                ["/tools/eligibility-checker", "Check admissions eligibility"],
                ["/compare", "Compare schools"],
                ["/11-plus", "Explore 11+ exams"],
              ].map(([href, label]) => (
                <li key={href}>
                  <Link href={href!} className="inline-flex items-center gap-1 rounded-full border border-line-strong bg-surface px-3.5 py-1.5 font-medium text-ink-2 hover:border-accent hover:text-ink">
                    {label} <ArrowRight aria-hidden className="size-3.5" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <Card className="self-end p-6">
            <p className="text-sm font-semibold text-ink">What we cover</p>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-5">
              <div>
                <dt className="text-xs text-ink-3">Grammar schools, England</dt>
                <dd className="text-2xl font-semibold">{stats.england}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-3">Grammar schools, NI</dt>
                <dd className="text-2xl font-semibold">{stats.ni}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-3">Official results figures</dt>
                <dd className="text-2xl font-semibold">{formatNumber(stats.results)}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-3">Inspection records</dt>
                <dd className="text-2xl font-semibold">{formatNumber(stats.inspections)}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs text-ink-3">Applications &amp; offers data points (2014–{latestDemand?.entry_year ?? "—"})</dt>
                <dd className="text-2xl font-semibold">{formatNumber(stats.allocations)}</dd>
              </div>
            </dl>
            <p className="mt-4 text-xs text-ink-3">
              From DfE, Ofsted and DE NI. Detailed admissions rules are held for {stats.policies} {stats.policies === 1 ? "school" : "schools"} so far and are added as each is checked.{" "}
              <Link href="/methodology#coverage" className="link">
                Coverage
              </Link>
            </p>
          </Card>
        </Container>
      </section>

      {/* 2. Research tools */}
      <Container className="py-16">
        <SectionHeading title="Research tools" description="Built for the questions parents actually ask, using official data." />
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map(({ href, title, text, Icon }) => (
            <li key={href}>
              <Link href={href} className="group flex h-full flex-col rounded-xl border border-line bg-surface p-5 transition-colors hover:border-accent/50">
                <Icon aria-hidden className="size-5 text-accent-ink" />
                <span className="mt-3 font-semibold text-ink group-hover:underline">{title}</span>
                <span className="mt-1 text-sm text-ink-2">{text}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>

      {/* 3. Explore by region */}
      <section className="border-y border-line bg-surface-2/50">
        <Container className="py-16">
          <SectionHeading
            title="Explore by region"
            description="Grammar schools are concentrated in a few areas. Each area runs its own test and timetable."
            action={<ButtonLink href="/grammar-schools" variant="secondary">All schools</ButtonLink>}
          />
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {regions.map((r) => (
              <li key={r.slug}>
                <Link href={`/grammar-schools/${r.slug}`} className="flex h-full flex-col rounded-xl border border-line bg-surface p-4 hover:border-line-strong">
                  <span className="font-semibold text-ink">{r.name}</span>
                  <span className="mt-1 text-sm text-ink-3">
                    {r.n} schools · {r.boys} boys, {r.girls} girls, {r.mixed} co-ed
                  </span>
                </Link>
              </li>
            ))}
            <li>
              <Link href="/grammar-schools/northern-ireland" className="flex h-full flex-col rounded-xl border border-accent/30 bg-accent-soft p-4 hover:border-accent">
                <span className="font-semibold text-ink">Northern Ireland</span>
                <span className="mt-1 text-sm text-ink-2">{stats.ni} grammar schools · Year 8 transfer · SEAG</span>
              </Link>
            </li>
          </ul>
          <p className="mt-4 text-sm text-ink-3">
            Wales and Scotland have no state grammar schools. <Link href="/admissions/wales-and-scotland" className="link">How school choice works there</Link>.
          </p>
        </Container>
      </section>

      {/* 4. Featured school intelligence + 6. comparison demo */}
      <Container className="py-16">
        <SectionHeading
          title="What a school profile tells you"
          description="Three real profiles, side by side. Every figure links to its official source on the profile."
          action={featured.length >= 2 ? <ButtonLink href={`/compare?schools=${featured.map((f) => f.slug).join(",")}`}>Compare these schools</ButtonLink> : null}
        />
        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full min-w-[640px] text-sm">
            <caption className="sr-only">Comparison of three school profiles</caption>
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className="w-48 px-5 py-4 text-left text-xs font-medium text-ink-3">
                  Profile
                </th>
                {featured.map((f) => (
                  <th key={f.slug} scope="col" className="px-5 py-4 text-left align-top">
                    <Link href={`/schools/${f.slug}`} className="font-serif text-base font-semibold text-ink hover:underline">
                      {f.name}
                    </Link>
                    <span className="block text-xs font-normal text-ink-3">
                      {[f.town, f.la].filter(Boolean).join(", ")} · {GENDER_LABEL[f.gender]}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {[
                ["Entrance test", (f: (typeof featured)[number]) => f.test ?? "Not yet recorded"],
                ["Admissions rules held", (f: (typeof featured)[number]) => (f.has_policy ? "Yes, structured and cited" : "Not yet")],
                ["Attainment 8", (f: (typeof featured)[number]) => (f.a8 !== null ? `${Number(f.a8).toFixed(1)} (${f.a8_year})` : "Not published")],
                ["A level average grade", (f: (typeof featured)[number]) => f.aps_grade ?? "Not published"],
                ["First preferences / offers", (f: (typeof featured)[number]) => (f.first_prefs !== null ? `${formatNumber(f.first_prefs)} / ${formatNumber(f.offers)} (${f.entry_year})` : "—")],
              ].map(([label, fn]) => (
                <tr key={label as string}>
                  <th scope="row" className="px-5 py-3 text-left text-xs font-medium text-ink-3">
                    {label as string}
                  </th>
                  {featured.map((f) => (
                    <td key={f.slug} className="px-5 py-3 font-medium text-ink tabular">
                      {(fn as (f: (typeof featured)[number]) => string)(f)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Container>

      {/* 5. Understanding admissions */}
      <section className="border-y border-line bg-surface">
        <Container className="grid gap-10 py-16 lg:grid-cols-[22rem_minmax(0,1fr)]">
          <div>
            <h2 className="text-2xl font-semibold sm:text-[1.7rem]">Qualifying is not the same as getting a place</h2>
            <p className="mt-3 text-ink-2">The most common misunderstanding in grammar school admissions. Every page on this site keeps the three steps apart.</p>
            <ButtonLink href="/admissions" variant="ghost" className="mt-4 !px-0">
              Read the admissions guide <ArrowRight aria-hidden className="size-4" />
            </ButtonLink>
          </div>
          <div className="grid gap-6">
            <ThreeSteps />
            <ul className="grid gap-3 sm:grid-cols-2">
              {[
                ["Catchment areas", "Some schools give priority to children living in a defined area. Others rank by distance with no fixed area. Some use neither.", "/admissions/out-of-catchment"],
                ["Oversubscription criteria", "The published order of priority — looked after children always first — used when qualified applicants exceed places.", "/admissions/oversubscription"],
                ["Pupil Premium priority", "Many grammar schools now prioritise disadvantaged children, sometimes with a lower qualifying score.", "/admissions/oversubscription#pupil-premium"],
                ["Appeals", "Every refusal can be appealed to an independent panel. Some areas also have a separate review of test results.", "/admissions/appeals"],
              ].map(([t, d, href]) => (
                <li key={t}>
                  <Link href={href!} className="block h-full rounded-xl border border-line p-4 hover:border-line-strong">
                    <span className="font-semibold text-ink">{t}</span>
                    <span className="mt-1 block text-sm text-ink-2">{d}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </section>

      {/* 7. Historical admissions and trends */}
      {demand.length > 1 ? (
        <Container className="py-16">
          <SectionHeading
            title="Demand for grammar school places in England"
            description={`Total first preferences and offers made on national offer day across England's fully selective schools, ${demand[0]!.entry_year}–${latestDemand!.entry_year}. Source: DfE applications and offers, school level.`}
          />
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <TrendChart
              title="First preferences and offers, England grammar schools"
              caption="Year of September entry. DfE's published figures for 2021 entry are unusually high for first preferences; they are shown as published. The number of schools reporting varies slightly by year."
              xs={demand.map((d) => String(d.entry_year))}
              unit="count"
              decimals={0}
              series={[
                { key: "first", label: "Named as first preference", color: "--series-1", points: demand.map((d) => ({ x: String(d.entry_year), y: d.first })) },
                { key: "offers", label: "Offers made", color: "--series-2", points: demand.map((d) => ({ x: String(d.entry_year), y: d.offers })) },
              ]}
            />
            <Card className="p-5 text-sm text-ink-2">
              <p className="font-semibold text-ink">Reading this chart</p>
              <p className="mt-2">
                In {latestDemand!.entry_year}, families named these {latestDemand!.schools} schools as a first preference {formatNumber(latestDemand!.first)} times; {formatNumber(latestDemand!.offers)} offers were made on national offer day.
              </p>
              <p className="mt-2">
                First preferences exceeding offers does not mean those children were refused: many had not qualified, and some received other offers. Use each school&apos;s profile for its own history.
              </p>
            </Card>
          </div>
        </Container>
      ) : null}

      {/* 8. 11+ knowledge centre + 9. Calendar */}
      <section className="border-y border-line bg-surface-2/50">
        <Container className="grid gap-10 py-16 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-semibold sm:text-[1.7rem]">11+ knowledge centre</h2>
            <p className="mt-2 text-ink-2">Each area sets its own test. Start with how tests differ, then go to the one your child will sit.</p>
            <ul className="mt-5 grid gap-2">
              {[
                ["/11-plus", "How 11+ entrance tests work", BookOpenCheck],
                ["/11-plus/exam-providers", "Test providers and the areas they cover", ScrollText],
                ["/11-plus/buckinghamshire-secondary-transfer-test", "Buckinghamshire Secondary Transfer Test", ScrollText],
                ["/11-plus/csse-11-plus", "CSSE 11+ (Essex and Southend)", ScrollText],
                ["/11-plus/seag-entrance-assessment", "SEAG Entrance Assessment (Northern Ireland)", ScrollText],
                ["/11-plus/preparation", "Preparation: original practice questions and planning", BookOpenCheck],
              ].map(([href, label, Icon]) => {
                const I = Icon as typeof ScrollText;
                return (
                  <li key={href as string}>
                    <Link href={href as string} className="flex items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3 hover:border-line-strong">
                      <I aria-hidden className="size-4 text-accent-ink" />
                      <span className="font-medium text-ink">{label as string}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
          <div>
            <div className="flex items-end justify-between gap-3">
              <h2 className="text-2xl font-semibold sm:text-[1.7rem]">Coming up</h2>
              <Link href="/calendar" className="text-sm font-semibold link">
                Full calendar
              </Link>
            </div>
            <p className="mt-2 text-ink-2">Verified dates for the current admission round. School-specific dates are on each profile.</p>
            <ol className="mt-5 grid gap-2">
              {events.map((e) => (
                <li key={e.id} className="rounded-lg border border-line bg-surface px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-accent-ink tabular">{formatDate(e.starts_on)}</span>
                    <span className="text-xs text-ink-3">{EVENT_TYPE_LABEL[e.event_type]}</span>
                    <VerificationBadge status={e.verification_status} />
                  </div>
                  <p className="mt-0.5 font-medium text-ink">{e.title}</p>
                  <p className="text-xs text-ink-3">
                    {e.nation === "northern_ireland" ? "Northern Ireland" : "England"} · September {e.entry_year} entry{e.test_name ? ` · ${e.test_name}` : ""}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </Container>
      </section>

      {/* 10. Trust and methodology */}
      <Container className="py-16">
        <SectionHeading title="Where our information comes from" description="Official sources first. Anything we can't verify is labelled — never guessed." action={<ButtonLink href="/methodology" variant="secondary">Read our methodology</ButtonLink>} />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="overflow-x-auto rounded-xl border border-line bg-surface">
            <table className="w-full min-w-[560px] text-sm">
              <caption className="sr-only">Data sources and when they were last refreshed</caption>
              <thead className="border-b border-line bg-surface-2 text-left text-xs text-ink-3">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-medium">Source</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Last refreshed</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {freshness.map((f) => (
                  <tr key={f.job}>
                    <td className="px-4 py-2.5">
                      <span className="font-medium text-ink">{f.source_name ?? f.job}</span>
                      <span className="block text-xs text-ink-3">{f.description}</span>
                    </td>
                    <td className="px-4 py-2.5 text-ink-2">{relativeAge(f.last_success)}</td>
                    <td className="px-4 py-2.5 text-xs">{f.last_status === "failed" ? <span className="text-bad">Last run failed — previous data retained</span> : <span className="text-ok">OK</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Card className="p-5 text-sm">
            <ShieldCheck aria-hidden className="size-5 text-accent-ink" />
            <p className="mt-3 font-semibold text-ink">What we can&apos;t guarantee</p>
            <ul className="mt-2 grid list-disc gap-1.5 pl-4 text-ink-2">
              <li>We can&apos;t promise a place or predict offers — no published data supports that.</li>
              <li>Schools can change arrangements; the school&apos;s determined policy is always the authority.</li>
              <li>Postcode distances are approximate and are not the method schools use.</li>
              <li>Facts awaiting editor verification are labelled as such.</li>
            </ul>
          </Card>
        </div>
      </Container>

      {/* 11. FAQs */}
      <section className="border-t border-line bg-surface">
        <Container className="py-16">
          <SectionHeading title="Questions parents ask" />
          <div className="grid gap-x-10 gap-y-6 md:grid-cols-2">
            {FAQS.map(([q, a, href]) => (
              <div key={q}>
                <h3 className="font-sans text-base font-semibold text-ink">{q}</h3>
                <p className="mt-1.5 text-ink-2">{a}</p>
                <Link href={href} className="mt-1.5 inline-block text-sm font-semibold link">
                  Read more
                </Link>
              </div>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
