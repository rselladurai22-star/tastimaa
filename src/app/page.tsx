import type { Metadata } from "next";
import Link from "next/link";
import { defaultEntryYear } from "@/lib/academic-year";
import { formatNumber, formatWeekdayDate, relativeAge } from "@/lib/format";
import { SITE } from "@/lib/site";
import { cycleEvents, dataFreshness, featuredSchools, nationalDemandTrend, regionProfiles, schoolPoints, topCouncilAreas, upcomingEvents } from "@/server/insights";
import { siteStats } from "@/server/schools";
import { HomeFinder } from "@/ui/home/finder";
import { IconArrow } from "@/ui/icons";
import { Kicker, Page } from "@/ui/kit";
import { Hero, HeroFigures } from "@/ui/hero";
import { Status } from "@/ui/status";
import { JourneyStepper } from "@/ui/viz/admission-journey";
import { AtlasMap } from "@/ui/viz/atlas-map";
import { GlyphCompare, GlyphCriteria, GlyphNearMe, GlyphWhen } from "@/ui/viz/glyphs";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    absolute: `${SITE.name} — find a grammar school and understand how it admits`,
  },
  description: "Official information on every grammar school in England and Northern Ireland: entrance tests, admission rules, catchment, results, inspections and past demand — each rule explained, each fact sourced.",
  alternates: { canonical: "/" },
};

/** A section heading in the house style: kicker, title, and an optional lede to the right on wide screens. */
function Head({ id, kicker, title, lede }: { id: string; kicker: string; title: React.ReactNode; lede?: React.ReactNode }) {
  return (
    <div className="grid gap-x-16 gap-y-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:items-end">
      <div>
        <Kicker>{kicker}</Kicker>
        <h2 id={id} className="mt-3 text-h2">
          {title}
        </h2>
      </div>
      {lede ? <p className="text-[1.0625rem] leading-relaxed text-ink-2">{lede}</p> : null}
    </div>
  );
}

const TILE = "grid size-14 place-items-center rounded-[16px] shadow-[inset_0_2px_1px_rgb(255_255_255/0.9),inset_0_-4px_8px_rgb(44_11_142/0.08),0_8px_16px_-8px_rgb(44_11_142/0.35)]";
const CHIP = "inline-flex min-h-9 items-center gap-1.5 rounded-full bg-card px-3.5 text-[0.9375rem] font-medium text-ink no-underline shadow-[0_0_0_1px_var(--rule)] transition-colors hover:text-green hover:shadow-[0_0_0_1px_var(--green)]";

export default async function HomePage() {
  const entryYear = defaultEntryYear();
  const [stats, points, regions, events, demand, freshness, england, featured, councils] = await Promise.all([
    siteStats(),
    schoolPoints(),
    regionProfiles(),
    upcomingEvents(4),
    nationalDemandTrend(),
    dataFreshness(),
    cycleEvents("england", entryYear),
    featuredSchools(3),
    topCouncilAreas(5),
  ]);
  const closing = england.find((e) => e.event_type === "application_deadline" && e.scope === "nation");
  const offerDay = england.find((e) => e.event_type === "national_offer_day" && e.scope === "nation");
  const groups = regions.map((r) => ({ slug: r.slug, name: r.name, n: r.n }));
  const lastDemand = demand.at(-1);
  const refreshed = freshness
    .map((f) => f.last_success)
    .filter((d): d is string => !!d)
    .sort()
    .at(-1);

  const tasks = [
    {
      n: "01",
      tag: "Find",
      title: "Find schools",
      text: "Search by name, town or postcode, then narrow by entrance test, gender, sixth form and admission rules.",
      href: "/grammar-schools",
      Glyph: GlyphNearMe,
      tint: "#e8ecff",
    },
    {
      n: "02",
      tag: "Eligibility",
      title: "Check the admission rules",
      text: "Answer only the questions a school's rules depend on, and see which priority groups could apply.",
      href: "/tools/eligibility-checker",
      Glyph: GlyphCriteria,
      tint: "#ffe6f0",
    },
    {
      n: "03",
      tag: "Compare",
      title: "Compare your shortlist",
      text: "Put up to five schools side by side: tests, rules, results and past offers.",
      href: "/compare",
      Glyph: GlyphCompare,
      tint: "#e6f4ff",
    },
    {
      n: "04",
      tag: "Plan",
      title: "Plan the application",
      text: closing ? `Applications for September ${entryYear} close on ${formatWeekdayDate(closing.starts_on)}. Keep every deadline in one plan.` : "Keep every registration, test and application deadline in one plan.",
      href: "/tools/planner",
      Glyph: GlyphWhen,
      tint: "#fff3dc",
    },
  ];

  const steps = [
    {
      n: "01",
      title: "Meet the standard",
      text: "Your child sits the test for that area and must reach the school's qualifying standard to be considered.",
      href: "/11-plus",
      link: "How 11+ tests work",
    },
    {
      n: "02",
      title: "Be ranked by the criteria",
      text: "If more qualified children apply than there are places, the school's published priority order ranks them.",
      href: "/admissions/oversubscription",
      link: "How the order works",
    },
    {
      n: "03",
      title: "Receive an offer — if places remain",
      text: offerDay ? `Offers go down the list until places run out, and arrive on ${formatWeekdayDate(offerDay.starts_on)}.` : "Offers go down the list until places run out, on national offer day.",
      href: "/admissions/qualifying-is-not-an-offer",
      link: "Why a pass isn't a place",
    },
  ];

  return (
    <>
      {/* 1 — One promise, the coverage behind it, and one place to start */}
      <Hero className="pt-8 sm:pt-12 lg:pt-8">
          <div className="grid gap-x-16 gap-y-8 lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-end">
            <div className="anim-rise max-w-[40rem]">
              <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[0.875rem] font-medium text-white shadow-[inset_0_0_0_1px_rgb(255_255_255/0.18)]">
                <span aria-hidden className="size-2 rounded-full bg-[#3ddc97] shadow-[0_0_8px_#3ddc97]" />
                Independent · every fact linked to its source
              </p>
              <h1 id="hero-title" className="mt-5 text-[clamp(2.25rem,1.6rem+2.6vw,3.25rem)] leading-[1.08] font-semibold tracking-[-0.025em] text-white">
                Find a grammar school.
                <span className="block text-[#9fb6ff]">See how it chooses.</span>
              </h1>
              <p className="mt-5 text-[1.1875rem] leading-[1.55] text-white/85">Entrance tests, admission rules and past offers for every grammar school in England and Northern Ireland — explained in plain English.</p>
            </div>
            <HeroFigures
              items={[
                [stats.listed, "schools listed"],
                [stats.england, "grammar schools in England"],
                [stats.ni, "in Northern Ireland"],
              ]}
              footer={
                <>
                  <Link href="/data-sources" className="text-[0.9375rem] font-semibold text-white underline decoration-white/40 underline-offset-4 hover:decoration-white">
                    Where our data comes from
                  </Link>
                  {refreshed ? <p className="mt-1 text-[0.8125rem]">Records refreshed {relativeAge(refreshed)}</p> : null}
                </>
              }
            />
          </div>
      </Hero>
      <section aria-label="Find a school" className="relative z-[2] -mt-14 sm:-mt-20">
        <Page>
          <HomeFinder />
          <nav aria-label="Popular areas" className="mt-5 flex flex-wrap items-center gap-2">
            <span className="mr-2 label text-ink-2">Popular areas</span>
            {councils.map((c) => (
              <Link key={c.slug} href={`/grammar-schools/${c.slug}`} className={CHIP}>
                {c.name} <span className="font-mono text-[0.8rem] text-ink-3">{c.n}</span>
              </Link>
            ))}
            <Link href="/grammar-schools/northern-ireland" className={CHIP}>
              Northern Ireland <span className="font-mono text-[0.8rem] text-ink-3">{stats.ni}</span>
            </Link>
          </nav>
        </Page>
      </section>

      {/* 2 — The four jobs parents come to do */}
      <section aria-labelledby="tasks" className="pt-20 sm:pt-24">
        <Page>
          <Head id="tasks" kicker="Your research, organised" title="Everything you need to make the choice." lede="Most families need the same four things, in roughly this order. Each one draws on the same official records." />
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {tasks.map((t) => (
              <li key={t.n}>
                <Link
                  href={t.href}
                  className="group/t flex h-full flex-col rounded-[16px] bg-card p-6 no-underline shadow-[0_0_0_1px_var(--rule),0_1px_2px_rgb(44_11_142/0.04)] transition-[box-shadow,transform] duration-[var(--d-2)] hover:-translate-y-0.5 hover:shadow-[0_0_0_1px_var(--green),0_16px_32px_-18px_rgb(44_11_142/0.35)]"
                >
                  <span className="flex items-center justify-between">
                    <span className="font-mono text-[0.8125rem] text-ink-2">
                      {t.n} / {t.tag.toUpperCase()}
                    </span>
                    <IconArrow size={16} className="text-ink-3 transition-transform duration-[var(--d-2)] group-hover/t:translate-x-0.5 group-hover/t:text-green" />
                  </span>
                  <span
                    className={`${TILE} mt-5`}
                    style={{
                      background: `linear-gradient(145deg,#ffffff,${t.tint})`,
                    }}
                  >
                    <t.Glyph />
                  </span>
                  <span className="mt-5 text-[1.25rem] font-semibold text-ink group-hover/t:text-green">{t.title}</span>
                  <span className="mt-2 text-[1rem] leading-relaxed text-ink-2">{t.text}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Page>
      </section>

      {/* 3 — Where the schools are */}
      <section aria-labelledby="regions" className="pt-20 sm:pt-28">
        <Page>
          <Head id="regions" kicker="Explore by region" title="Grammar schools cluster in a few places." lede="Each area runs its own test and timetable, so most families start with their region. Wales and Scotland have no state grammar schools." />
          <div className="mt-10 rounded-[20px] bg-[linear-gradient(160deg,#e9eefc,#f6f8fe)] p-5 shadow-[inset_0_0_0_1px_var(--rule)] sm:p-8">
            <AtlasMap points={points} groups={groups} />
          </div>
          <p className="mt-4 text-[1rem] text-ink-2">
            Each building stands for the schools in one neighbourhood; bigger buildings mean more schools. Point at a region to light it up, or{" "}
            <Link href="/grammar-schools?view=map" className="a">
              open the street map
            </Link>
            .
          </p>
        </Page>
      </section>

      {/* 4 — What a record holds, with real schools */}
      {featured.length ? (
        <section aria-labelledby="records" className="pt-20 sm:pt-28">
          <Page className="grid gap-x-16 gap-y-10 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
            <div>
              <Kicker>A research tool, not just a list</Kicker>
              <h2 id="records" className="mt-3 text-h2">
                Go beyond the school name.
              </h2>
              <p className="mt-4 text-[1.0625rem] leading-relaxed text-ink-2">
                Every school has its own test, its own admission rules for each year and its own record of past demand. Each profile brings them together, with the source document for every rule.
              </p>
              <p className="mt-6">
                <Link href="/grammar-schools" className="inline-flex min-h-11 items-center gap-2 rounded-[8px] bg-green px-5 font-semibold text-white no-underline hover:bg-green-deep">
                  Browse all {stats.listed} schools <IconArrow size={16} />
                </Link>
              </p>
              <p className="mt-8 border-t border-rule pt-4 text-[0.9375rem] leading-relaxed text-ink-2">
                A qualifying 11+ result is not a guaranteed place. When more qualified children apply than there are places, the school&apos;s priority order decides.
              </p>
            </div>
            <div className="self-start overflow-hidden rounded-[16px] bg-card shadow-[0_0_0_1px_var(--rule),0_20px_40px_-24px_rgb(44_11_142/0.3)]">
              <p className="label border-b border-rule px-5 py-3">School records · examples from the directory</p>
              <ul>
                {featured.map((f, i) => (
                  <li key={f.slug} className="border-b border-rule last:border-b-0">
                    <Link href={`/schools/${f.slug}`} className="group/r grid grid-cols-[2rem_minmax(0,1fr)_1rem] gap-x-4 gap-y-2 px-5 py-4 no-underline hover:bg-sage/60 xl:grid-cols-[2rem_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1.1fr)_1rem]">
                      <span className="pt-0.5 font-mono text-[0.8125rem] text-copper-ink">{String(i + 1).padStart(2, "0")}</span>
                      <span className="min-w-0">
                        <span className="block font-semibold text-ink group-hover/r:text-green">{f.name}</span>
                        <span className="block text-small text-ink-2">{[f.town, f.la].filter(Boolean).join(" · ")}</span>
                      </span>
                      <span className="col-start-2 min-w-0 xl:col-start-auto">
                        <span className="label block text-[0.6875rem]">Entrance test</span>
                        <span className="block text-[0.9375rem] text-ink">{f.test ?? "Not yet recorded"}</span>
                      </span>
                      <span className="col-start-2 min-w-0 xl:col-start-auto">
                        <span className="label block text-[0.6875rem]">Sept {f.entry_year ?? "—"} demand</span>
                        <span className="block text-[0.9375rem] text-ink num">{f.first_prefs != null && f.offers != null ? `${formatNumber(f.first_prefs)} first choices · ${formatNumber(f.offers)} offers` : "Not published"}</span>
                      </span>
                      <IconArrow size={16} className="col-start-3 row-start-1 mt-1 text-ink-3 group-hover/r:text-green xl:col-start-5" />
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-rule bg-paper px-5 py-3 text-small">
                <span className="text-ink-2">Figures from DfE and each school&apos;s determined policy.</span>
                <Link href="/grammar-schools?view=table" className="font-semibold text-green">
                  Open the full data table
                </Link>
              </div>
            </div>
          </Page>
        </section>
      ) : null}

      {/* 5 — How admission works, in three steps and one machine */}
      <section id="how-admission-works" aria-labelledby="process" className="pt-20 sm:pt-28">
        <Page>
          <Head
            id="process"
            kicker="Understand the process"
            title="From a test result to an offer."
            lede={
              lastDemand?.first && lastDemand.offers ? (
                <>
                  In {lastDemand.entry_year}, England&apos;s grammar schools were named as a first choice {formatNumber(lastDemand.first)} times, for {formatNumber(lastDemand.offers)} offers. Passing is only the first step.
                </>
              ) : (
                "Passing the test is only the first step. Places go to qualified children in each school's published order."
              )
            }
          />
          <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-start">
            <ol className="grid gap-3">
              {steps.map((s) => (
                <li key={s.n} className="rounded-[16px] bg-card p-5 shadow-[0_0_0_1px_var(--rule)]">
                  <p className="font-mono text-[0.8125rem] text-copper-ink">{s.n}</p>
                  <h3 className="mt-1 text-[1.1875rem] font-semibold text-ink">{s.title}</h3>
                  <p className="mt-1.5 text-[1rem] leading-relaxed text-ink-2">{s.text}</p>
                  <Link href={s.href} className="mt-3 inline-flex items-center gap-1.5 text-[0.9375rem] font-semibold text-green">
                    {s.link} <IconArrow size={14} />
                  </Link>
                </li>
              ))}
            </ol>
            <div>
              <JourneyStepper />
              <p className="mt-3 text-small text-ink-2">Seventy-two imaginary applicants and twenty-two places — an illustration, not data from any school. Press Play to run it.</p>
            </div>
          </div>
        </Page>
      </section>

      {/* 6 — Dates: what is coming up, and where to plan it */}
      <section aria-labelledby="dates" className="mt-24 bg-[linear-gradient(165deg,#0b1033_0%,#141a4d_45%,#1f2a78_100%)] py-16 text-white sm:mt-28 sm:py-20">
        <Page className="grid gap-x-16 gap-y-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-center">
          <div>
            <p className="label text-[#9fb6ff]">Keep moving forward</p>
            <h2 id="dates" className="mt-3 text-h2 text-white">
              A plan that&apos;s easier to follow.
            </h2>
            <p className="mt-4 max-w-[34rem] text-[1.0625rem] leading-relaxed text-white/80">Registration, test, application and offer dates from official sources, each marked as checked or awaiting checking.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/tools/planner" className="inline-flex min-h-11 items-center gap-2 rounded-[8px] bg-white px-5 font-semibold text-[#141a4d] no-underline hover:bg-[#e8ecff]">
                Open your planner <IconArrow size={16} />
              </Link>
              <Link href="/calendar" className="inline-flex min-h-11 items-center rounded-[8px] px-5 font-semibold text-white no-underline shadow-[inset_0_0_0_1.5px_rgb(255_255_255/0.6)] hover:bg-white/10">
                See every key date
              </Link>
            </div>
          </div>
          <div className="overflow-hidden rounded-[16px] bg-card text-ink shadow-[0_30px_60px_-30px_rgb(0_0_0/0.6)]">
            <div className="flex items-center justify-between border-b border-rule px-5 py-3">
              <p className="label">Coming up</p>
              <Link href="/calendar" className="text-small font-semibold text-green">
                Full calendar
              </Link>
            </div>
            {events.length ? (
              <ul>
                {events.map((e) => {
                  const d = new Date(`${e.starts_on}T12:00:00Z`);
                  return (
                    <li key={e.id} className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-4 border-b border-rule px-5 py-4 last:border-b-0">
                      <p className="self-start overflow-hidden rounded-[10px] text-center leading-none shadow-[0_0_0_1px_var(--rule)]">
                        <span className="block bg-[linear-gradient(var(--copper),color-mix(in_srgb,var(--copper)_75%,#000))] py-1 text-[0.6875rem] font-bold tracking-[0.08em] text-white uppercase">
                          {d.toLocaleDateString("en-GB", {
                            month: "short",
                            timeZone: "Europe/London",
                          })}
                        </span>
                        <span className="block py-1.5 text-[1.375rem] font-semibold text-ink num">
                          {d.toLocaleDateString("en-GB", {
                            day: "numeric",
                            timeZone: "Europe/London",
                          })}
                        </span>
                      </p>
                      <div className="min-w-0">
                        <p className="font-semibold text-ink">{e.title}</p>
                        <p className="text-small text-ink-2">
                          {formatWeekdayDate(e.starts_on)} · {e.nation === "northern_ireland" ? "Northern Ireland" : "England"}
                          {e.test_name ? ` · ${e.test_name}` : ""}
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

      {/* 7 — The promise behind the records */}
      <section aria-labelledby="promise" className="border-b border-rule py-12">
        <Page className="grid gap-6 md:grid-cols-[10rem_minmax(0,1fr)_auto] md:items-center">
          <h2 id="promise" className="label text-ink">
            Our promise
          </h2>
          <p className="max-w-[48rem] text-[1rem] leading-relaxed text-ink-2">
            Grammar Atlas is independent. We separate published facts, missing records and information awaiting checking, so you can research with confidence — and we never present an estimate as an admission decision. A school&apos;s determined
            policy is always the authority.
          </p>
          <div className="flex flex-col gap-1.5 text-[0.9375rem] font-semibold">
            <Link href="/methodology" className="text-green">
              Our methodology
            </Link>
            <Link href="/data-sources" className="text-green">
              Every source and licence
            </Link>
          </div>
        </Page>
      </section>
    </>
  );
}
