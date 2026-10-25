import type { Metadata } from "next";
import Link from "next/link";
import { defaultEntryYear } from "@/lib/academic-year";
import { formatWeekdayDate, relativeAge } from "@/lib/format";
import { SITE } from "@/lib/site";
import { cycleEvents, dataFreshness, featuredSchools, topCouncilAreas, upcomingEvents } from "@/server/insights";
import { siteStats } from "@/server/schools";
import { Hero } from "@/ui/hero";
import { HomeFinder } from "@/ui/home/finder";
import { IconInfo } from "@/ui/icons";
import { Kicker, Page } from "@/ui/kit";
import { Status } from "@/ui/status";
import { GlyphCompare, GlyphCriteria, GlyphNearMe, GlyphWhen } from "@/ui/viz/glyphs";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: `${SITE.name} — find a grammar school and understand how it admits` },
  description: "Official information on every grammar school in England and Northern Ireland: entrance tests, admission rules, catchment, results, inspections and past demand — each rule explained, each fact sourced.",
  alternates: { canonical: "/" },
};

/** "Go" arrow used on links and cards: points up and right. */
function Out({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden width="14" height="14" viewBox="0 0 14 14" className={`inline-block shrink-0 ${className}`}>
      <path d="M4 10 10 4M5 4h5v5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Section heading: label and serif title on the left, a short summary on the right. */
function Head({ id, kicker, title, lede }: { id: string; kicker: string; title: React.ReactNode; lede?: React.ReactNode }) {
  return (
    <div className="grid gap-x-16 gap-y-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-end">
      <div>
        <Kicker>{kicker}</Kicker>
        <h2 id={id} className="mt-3 max-w-[26ch] text-[clamp(1.9rem,1.5rem+1.4vw,2.5rem)] text-ink">
          {title}
        </h2>
      </div>
      {lede ? <p className="text-[1.0625rem] leading-relaxed text-ink-2">{lede}</p> : null}
    </div>
  );
}

const TEXT_LINK = "inline-flex items-center gap-1.5 border-b-2 pb-0.5 font-semibold no-underline transition-colors";

export default async function HomePage() {
  const entryYear = defaultEntryYear();
  const [stats, events, freshness, england, featured, councils] = await Promise.all([siteStats(), upcomingEvents(3), dataFreshness(), cycleEvents("england", entryYear), featuredSchools(3), topCouncilAreas(5)]);
  const closing = england.find((e) => e.event_type === "application_deadline" && e.scope === "nation");
  const offerDay = england.find((e) => e.event_type === "national_offer_day" && e.scope === "nation");
  const refreshed = freshness
    .map((f) => f.last_success)
    .filter((d): d is string => !!d)
    .sort()
    .at(-1);

  const tasks = [
    { n: "01", tag: "Find & filter", title: "Explore schools", text: "Find schools by name, town or postcode. Refine by entrance test and admission rules.", href: "/grammar-schools", Glyph: GlyphNearMe },
    { n: "02", tag: "Eligibility", title: "Check admission rules", text: "Understand priority groups, catchment policies and what qualifying really means.", href: "/tools/eligibility-checker", Glyph: GlyphCriteria },
    { n: "03", tag: "Compare", title: "Compare your shortlist", text: "Put schools side by side and understand the differences that matter.", href: "/compare", Glyph: GlyphCompare },
    {
      n: "04",
      tag: "Plan",
      title: "Plan the application",
      text: closing ? `Follow every date and next step. Applications close on ${formatWeekdayDate(closing.starts_on)}.` : "Follow important dates, tests and next steps without losing track.",
      href: "/tools/planner",
      Glyph: GlyphWhen,
    },
  ];

  const steps = [
    { n: "01", title: "Meet the standard", text: "A child takes the entrance test and must meet the school's qualifying standard to be considered.", href: "/11-plus", link: "How 11+ tests work" },
    { n: "02", title: "Check the priority order", text: "The published oversubscription rules rank eligible applicants when places are limited.", href: "/admissions/oversubscription", link: "Explore the criteria" },
    {
      n: "03",
      title: "Receive an offer",
      text: offerDay ? `Places are offered in the published order, through your home council, on ${formatWeekdayDate(offerDay.starts_on)}.` : "Places are offered in the published order, through your home council's coordinated process.",
      href: "/admissions/qualifying-is-not-an-offer",
      link: "What a pass means",
    },
  ];

  return (
    <>
      {/* 1 — Promise and coverage, on the navy band */}
      <Hero className="pt-6 sm:pt-10">
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.75rem] font-bold tracking-[0.12em] text-ink-3 uppercase">
          <span className="inline-flex items-center gap-2">
            <span aria-hidden className="size-2 rotate-45 bg-copper" />
            The UK grammar school research atlas
          </span>
          <span aria-hidden className="hidden h-px w-10 bg-white/25 sm:block" />
          <span>Independent · source-led</span>
        </p>
        <div className="mt-8 grid gap-x-16 gap-y-10 lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-end">
          <div className="anim-rise max-w-[40rem]">
            <h1 id="hero-title" className="text-[clamp(2.5rem,1.6rem+3.6vw,4rem)] leading-[1.04] font-normal tracking-[-0.025em] text-white">
              A clearer way to <em className="text-[#a9bcff]">choose</em> a grammar school.
            </h1>
            <p className="mt-6 max-w-[36rem] text-[1.1875rem] leading-[1.55] text-ink-2">Explore schools, understand the rules, compare your options and plan the next step — all in one research workspace.</p>
            <p className="mt-7 flex flex-wrap gap-x-7 gap-y-3 text-[1rem]">
              <Link href="/compare" className={`${TEXT_LINK} border-white/40 text-white hover:border-white`}>
                Compare schools <Out />
              </Link>
              <Link href="/admissions" className={`${TEXT_LINK} border-white/40 text-white hover:border-white`}>
                Understand admissions <Out />
              </Link>
            </p>
          </div>
          <div className="border-l-2 border-copper pl-6">
            <p className="text-[0.75rem] font-bold tracking-[0.12em] text-[#a9bcff] uppercase">The atlas / coverage</p>
            <dl className="mt-3">
              {[
                [stats.listed, "schools in the directory"],
                [stats.england, "fully selective in England"],
                [stats.ni, "schools in Northern Ireland"],
              ].map(([v, l]) => (
                <div key={l as string} className="flex items-baseline gap-3 border-b border-white/15 py-2.5">
                  <dd className="w-14 font-display text-[1.75rem] leading-none text-white num">{v}</dd>
                  <dt className="text-[0.9375rem] text-ink-2">{l}</dt>
                </div>
              ))}
            </dl>
            <Link href="/data-sources" className="mt-3 inline-flex items-center gap-1.5 text-[0.9375rem] font-semibold text-white no-underline hover:underline">
              Where our data comes from <Out />
            </Link>
            {refreshed ? <p className="mt-1 text-[0.8125rem] text-ink-3">Records refreshed {relativeAge(refreshed)}</p> : null}
          </div>
        </div>
      </Hero>

      {/* 2 — One place to start, then a region */}
      <section aria-label="Find a school" className="relative z-[2] -mt-14 sm:-mt-20">
        <Page>
          <HomeFinder />
          <nav aria-label="Explore by region" className="mt-6 flex flex-wrap items-center gap-2">
            <span className="mr-3 text-[0.75rem] font-bold tracking-[0.12em] text-ink-2 uppercase">Explore by region</span>
            {councils.map((c) => (
              <Link key={c.slug} href={`/grammar-schools/${c.slug}`} className="inline-flex min-h-9 items-center rounded-[6px] bg-card px-3 text-[0.9375rem] font-medium text-ink no-underline shadow-[0_0_0_1px_var(--rule-strong)] transition-colors hover:text-green hover:shadow-[0_0_0_1px_var(--green)]">
                {c.name}
              </Link>
            ))}
            <Link href="/grammar-schools/northern-ireland" className="inline-flex min-h-9 items-center rounded-[6px] bg-card px-3 text-[0.9375rem] font-medium text-ink no-underline shadow-[0_0_0_1px_var(--rule-strong)] transition-colors hover:text-green hover:shadow-[0_0_0_1px_var(--green)]">
              Northern Ireland
            </Link>
            <Link href="/grammar-schools#by-area" className="inline-flex min-h-9 items-center gap-1.5 rounded-[6px] bg-green-wash px-3 text-[0.9375rem] font-semibold text-green no-underline hover:shadow-[0_0_0_1px_var(--green)]">
              All areas <Out />
            </Link>
          </nav>
        </Page>
      </section>

      {/* 3 — The four jobs, as one connected grid */}
      <section aria-labelledby="tasks" className="mt-24 border-t border-rule pt-20 sm:mt-28">
        <Page>
          <Head id="tasks" kicker="Your research, organised" title="Everything you need to make sense of your choices." lede="Start with a school, an admissions question or a postcode. Move from finding options to making an informed decision." />
          <ul className="mt-12 grid overflow-hidden rounded-[4px] border border-rule-strong sm:grid-cols-2 lg:grid-cols-4">
            {tasks.map((t, i) => (
              <li key={t.n} className={`border-rule-strong ${i > 0 ? "border-t sm:border-t-0" : ""} ${i % 2 === 1 ? "sm:border-l" : ""} ${i >= 2 ? "sm:border-t lg:border-t-0" : ""} ${i > 0 ? "lg:border-l" : ""}`}>
                <Link href={t.href} className="group/t flex h-full flex-col bg-card p-6 no-underline transition-colors hover:bg-sage/70">
                  <span className="flex items-center justify-between text-[0.75rem] font-bold tracking-[0.1em] text-ink-2 uppercase">
                    {t.n} / {t.tag}
                    <Out className="text-ink transition-transform group-hover/t:translate-x-0.5 group-hover/t:-translate-y-0.5 group-hover/t:text-green" />
                  </span>
                  <span className="mt-6 grid size-11 place-items-center rounded-[6px] bg-sage shadow-[0_0_0_1px_var(--rule)] [&_svg]:size-7">
                    <t.Glyph />
                  </span>
                  <span className="mt-6 font-display text-[1.375rem] leading-snug text-ink group-hover/t:text-green">{t.title}</span>
                  <span className="mt-2 text-[0.9375rem] leading-relaxed text-ink-2">{t.text}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Page>
      </section>

      {/* 4 — What a record holds, with real schools */}
      {featured.length ? (
        <section aria-labelledby="records" className="mt-24 border-y border-rule bg-[#f3f5fb] py-20 sm:mt-28 sm:py-24">
          <Page className="grid gap-x-16 gap-y-12 lg:grid-cols-[minmax(0,21rem)_minmax(0,1fr)] lg:items-start">
            <div>
              <Kicker>A research tool, not just a directory</Kicker>
              <h2 id="records" className="mt-3 text-[clamp(1.9rem,1.5rem+1.4vw,2.5rem)] text-ink">
                Go beyond the school name.
              </h2>
              <p className="mt-4 text-[1.0625rem] leading-relaxed text-ink-2">Each school has its own entrance test, admissions policy and evidence. Explore the original records and see how those details fit together.</p>
              <p className="mt-7">
                <Link href="/grammar-schools" className={`${TEXT_LINK} border-ink text-ink hover:border-green hover:text-green`}>
                  Browse every school <Out />
                </Link>
              </p>
              <p className="mt-10 flex gap-3 border-t border-rule-strong pt-5 text-[0.9375rem] leading-relaxed text-ink-2">
                <IconInfo size={18} className="mt-0.5 shrink-0 text-copper-ink" />A qualifying 11+ result is not a guaranteed place. Oversubscription rules decide the order if more eligible children apply than places exist.
              </p>
            </div>
            <div className="overflow-hidden rounded-[4px] bg-card shadow-[0_0_0_1px_var(--rule-strong),0_20px_40px_-28px_rgb(11_16_51/0.45)]">
              <p className="flex items-center justify-between border-b border-rule px-5 py-3 text-[0.75rem] font-bold tracking-[0.1em] text-ink-2 uppercase">
                School directory / example records <span className="hidden sm:inline">Research view</span>
              </p>
              <ul>
                {featured.map((f, i) => (
                  <li key={f.slug} className="border-b border-rule last:border-b-0">
                    <Link href={`/schools/${f.slug}`} className="group/r grid grid-cols-[2rem_minmax(0,1fr)_1rem] items-start gap-x-4 gap-y-2 px-5 py-5 no-underline hover:bg-sage/60 sm:grid-cols-[2rem_minmax(0,1.3fr)_minmax(0,1fr)_1rem]">
                      <span className="pt-1 font-mono text-[0.8125rem] font-semibold text-copper-ink">{String(i + 1).padStart(2, "0")}</span>
                      <span className="min-w-0">
                        <span className="block text-[1.0625rem] font-semibold text-ink group-hover/r:text-green">{f.name}</span>
                        <span className="block text-small text-ink-2">{[f.town, f.la].filter(Boolean).join(" · ")}</span>
                      </span>
                      <span className="col-start-2 min-w-0 sm:col-start-auto">
                        <span className="block text-[0.6875rem] font-bold tracking-[0.1em] text-ink-2 uppercase">Entrance test</span>
                        <span className="block text-[0.9375rem] text-ink">{f.test ?? "See school profile"}</span>
                      </span>
                      <Out className="col-start-3 row-start-1 mt-1.5 text-ink group-hover/r:text-green sm:col-start-4" />
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="flex flex-wrap items-center justify-between gap-2 border-t border-rule bg-paper px-5 py-3 text-small">
                <span className="text-ink-2">Real records from the directory.</span>
                <Link href="/grammar-schools?view=table" className="inline-flex items-center gap-1 font-semibold text-ink no-underline hover:text-green">
                  Open full data table <Out />
                </Link>
              </p>
            </div>
          </Page>
        </section>
      ) : null}

      {/* 5 — From a test result to an offer */}
      <section id="how-admission-works" aria-labelledby="process" className="pt-20 sm:pt-24">
        <Page>
          <Head id="process" kicker="Understand the process" title="From a test result to an offer." lede="Grammar-school admission has several distinct decisions. Understand each step before comparing schools." />
          <ol className="mt-12 grid gap-4 lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:items-stretch lg:gap-3">
            {steps.flatMap((s, i) => [
              ...(i > 0
                ? [
                    <li key={`arrow-${s.n}`} aria-hidden className="hidden self-center text-copper lg:block">
                      →
                    </li>,
                  ]
                : []),
              <li key={s.n} className="flex flex-col rounded-[4px] border border-rule-strong border-t-[3px] border-t-[#141a4d] bg-card p-6">
                <p className="font-mono text-[0.8125rem] font-semibold text-copper-ink">{s.n}</p>
                <h3 className="mt-3 font-display text-[1.375rem] text-ink">{s.title}</h3>
                <p className="mt-2 flex-1 text-[0.9375rem] leading-relaxed text-ink-2">{s.text}</p>
                <Link href={s.href} className="mt-5 inline-flex items-center gap-1.5 text-[0.9375rem] font-semibold text-ink no-underline hover:text-green">
                  {s.link} <Out />
                </Link>
              </li>,
            ])}
          </ol>
        </Page>
      </section>

      {/* 6 — Keep moving forward: dates, on navy */}
      <section aria-labelledby="dates" className="mt-24 bg-[linear-gradient(165deg,#0b1033_0%,#141a4d_45%,#1f2a78_100%)] py-20 text-white sm:mt-28">
        <Page className="grid gap-x-16 gap-y-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-center">
          <div>
            <p className="label text-[#a9bcff]">Keep moving forward</p>
            <h2 id="dates" className="mt-3 text-[clamp(1.9rem,1.5rem+1.4vw,2.5rem)] text-white">
              A plan that&apos;s easier to follow.
            </h2>
            <p className="mt-4 max-w-[30rem] text-[1.0625rem] leading-relaxed text-white/80">Important dates, admissions policies and school research — connected instead of scattered across bookmarks.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/calendar" className="inline-flex min-h-11 items-center gap-2 rounded-[4px] bg-white px-5 font-semibold text-[#141a4d] no-underline hover:bg-[#e8ecff]">
                Explore admissions dates <Out />
              </Link>
              <Link href="/tools/planner" className="inline-flex min-h-11 items-center rounded-[4px] px-5 font-semibold text-white no-underline shadow-[inset_0_0_0_1.5px_rgb(255_255_255/0.7)] hover:bg-white/10">
                Open your planner
              </Link>
            </div>
          </div>
          <div className="overflow-hidden rounded-[4px] border-t-[3px] border-copper bg-card text-ink shadow-[0_30px_60px_-30px_rgb(0_0_0/0.6)]">
            <p className="flex items-center justify-between border-b border-rule px-5 py-3 text-[0.75rem] font-bold tracking-[0.1em] text-ink-2 uppercase">
              Admissions calendar
              <Link href="/calendar" className="inline-flex items-center gap-1 text-[0.8125rem] tracking-normal text-ink normal-case no-underline hover:text-green">
                Full calendar <Out />
              </Link>
            </p>
            {events.length ? (
              <ul>
                {events.map((e) => {
                  const d = new Date(`${e.starts_on}T12:00:00Z`);
                  return (
                    <li key={e.id} className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-4 border-b border-rule px-5 py-4 last:border-b-0">
                      <p>
                        <span className="block font-semibold text-ink">{d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/London" })}</span>
                        <span className="block text-[0.6875rem] font-bold tracking-[0.1em] text-ink-2 uppercase">{d.toLocaleDateString("en-GB", { weekday: "long", timeZone: "Europe/London" })}</span>
                      </p>
                      <div className="min-w-0">
                        <p className="font-semibold text-ink">{e.title}</p>
                        <p className="text-small text-ink-2">
                          {e.nation === "northern_ireland" ? "Northern Ireland" : "England"} · September {e.entry_year} entry{e.test_name ? ` · ${e.test_name}` : ""}
                        </p>
                        <Status status={e.verification_status} className="mt-2" />
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="px-5 py-6 text-ink-2">No upcoming dates are held yet.</p>
            )}
          </div>
        </Page>
      </section>

      {/* 7 — Our promise */}
      <section aria-labelledby="promise" className="border-b border-rule py-12">
        <Page className="grid gap-6 md:grid-cols-[9rem_minmax(0,1fr)_auto] md:items-center">
          <h2 id="promise" className="font-sans text-[0.75rem] font-bold tracking-[0.12em] text-ink uppercase">
            Our promise
          </h2>
          <p className="max-w-[50rem] text-[1rem] leading-relaxed text-ink-2">
            Grammar Atlas is independent. We distinguish published facts, missing records and information awaiting verification, so you can research confidently without mistaking an estimate for an admission decision.{" "}
            <Link href="/methodology" className="a">
              Our methodology
            </Link>
            .
          </p>
          <a href="#main" className="inline-flex items-center gap-1.5 text-[0.9375rem] font-semibold text-ink no-underline hover:text-green">
            Back to top <Out />
          </a>
        </Page>
      </section>
    </>
  );
}
