import type { Metadata } from "next";
import Link from "next/link";
import { ADMISSIONS_GUIDES, READING_PATHS, type Guide } from "@/content/guides";
import { KNOWLEDGE_EDGES, KNOWLEDGE_NODES } from "@/content/knowledge";
import { defaultEntryYear } from "@/lib/academic-year";
import { cycleEvents } from "@/server/insights";
import { Breadcrumbs } from "@/ui/breadcrumbs";
import { IconArrow } from "@/ui/icons";
import { Hero, HeroHead } from "@/ui/hero";
import { Page, SectionHead } from "@/ui/kit";
import { JourneyStepper } from "@/ui/viz/admission-journey";
import { ApplicationJourney } from "@/ui/viz/exam-viz";
import { KnowledgeMap } from "@/ui/viz/knowledge-map";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "How grammar school admissions work",
  description: "A plain-English guide to grammar school admissions in England and Northern Ireland: qualifying versus getting a place, catchment, oversubscription criteria, home address rules and appeals.",
  alternates: { canonical: "/admissions" },
};

export default async function AdmissionsHub() {
  const entryYear = defaultEntryYear();
  const events = await cycleEvents("england", entryYear);
  const paths = Object.keys(READING_PATHS) as Guide["path"][];

  return (
    <>
      <Hero>
        <Breadcrumbs items={[{ href: "/admissions", label: "Admissions guide" }]} />
        <HeroHead
          kicker="Understand admissions"
          title="How grammar school admissions work"
          lede="A test, published criteria and a national timetable. These guides explain each part in plain English, with links to the official rules."
          aside={
            <nav aria-label="Reading paths" className="lg:border-l lg:border-rule lg:pl-6">
              {paths.map((k) => {
                const list = ADMISSIONS_GUIDES.filter((g) => g.path === k);
                return (
                  <a key={k} href={`#path-${k}`} className="group/rp flex items-baseline justify-between gap-4 border-b border-rule py-3 no-underline first:pt-0">
                    <span>
                      <span className="block font-semibold text-ink group-hover/rp:underline">{READING_PATHS[k].title}</span>
                      <span className="text-small text-ink-3">{READING_PATHS[k].text}</span>
                    </span>
                    <span className="font-mono text-[0.85rem] whitespace-nowrap text-ink-3">
                      {list.length} {list.length === 1 ? "guide" : "guides"}
                    </span>
                  </a>
                );
              })}
            </nav>
          }
        />
      </Hero>

      <Page as="section" className="pt-6">
        <SectionHead id="guides" kicker="Reading paths" title="Every guide, in the order it helps most" />
        <div className="mt-10 grid gap-14">
          {paths.map((k) => (
            <div key={k} id={`path-${k}`} className="grid scroll-mt-[calc(var(--header-h)+2rem)] gap-x-12 gap-y-5 lg:grid-cols-[16rem_minmax(0,1fr)]">
              <div>
                <h3 className="text-h3">{READING_PATHS[k].title}</h3>
                <p className="mt-1.5 text-[1rem] text-ink-2">{READING_PATHS[k].text}</p>
              </div>
              <ol className="grid gap-4 md:grid-cols-2">
                {ADMISSIONS_GUIDES.filter((g) => g.path === k).map((g, i) => (
                  <li key={g.slug}>
                    <Link href={`/admissions/${g.slug}`} className="group/g flex h-full gap-4 rounded-[16px] bg-card p-5 no-underline shadow-[0_0_0_1px_var(--rule)] transition-[box-shadow,transform] duration-[var(--d-2)] hover:-translate-y-0.5 hover:shadow-[0_0_0_1px_var(--green),0_16px_32px_-18px_rgb(44_11_142/0.35)]">
                      <span className="font-mono text-[0.85rem] text-copper-ink">{String(i + 1).padStart(2, "0")}</span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="text-[1.1875rem] leading-snug font-semibold text-ink group-hover/g:text-green">{g.title}</span>
                        <span className="mt-2 text-[0.98rem] leading-relaxed text-ink-2">{g.description}</span>
                        <span className="mt-3 inline-flex items-center gap-1.5 text-small font-semibold text-green">
                          {g.sections.length} sections
                          <IconArrow size={14} className="transition-transform duration-[var(--d-2)] group-hover/g:translate-x-1" />
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </Page>

      <Page as="section" className="pt-20">
        <SectionHead id="timeline" kicker={`England · September ${entryYear} entry`} title="The application year, stage by stage" lede="Choose a stage. Dates appear only where we hold them from an official source, each with its verification status." />
        <div className="mt-8">
          <ApplicationJourney events={events.map((e) => ({ type: e.event_type, date: e.starts_on, status: e.verification_status, title: e.title }))} entryYear={entryYear} />
        </div>
      </Page>

      <Page as="section" className="pt-20">
        <SectionHead id="steps" kicker="The core idea" title="Qualifying, ranking, offering — in that order" lede="Seventy-two imaginary applicants and twenty-two places. Step through it, or press Play." />
        <div className="mt-8 max-w-[52rem]">
          <JourneyStepper />
        </div>
      </Page>

      <Page as="section" className="pt-20 pb-6">
        <SectionHead id="map" kicker="The knowledge atlas" title="How the ideas connect" lede="Trace a topic to see what it leads to — guides, exam pages and tools." />
        <div className="mt-8">
          <KnowledgeMap nodes={KNOWLEDGE_NODES} edges={KNOWLEDGE_EDGES} />
        </div>
      </Page>
    </>
  );
}
