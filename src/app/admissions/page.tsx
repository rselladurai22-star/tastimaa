import type { Metadata } from "next";
import Link from "next/link";
import { ADMISSIONS_GUIDES, READING_PATHS, type Guide } from "@/content/guides";
import { KNOWLEDGE_EDGES, KNOWLEDGE_NODES } from "@/content/knowledge";
import { defaultEntryYear } from "@/lib/academic-year";
import { cycleEvents } from "@/server/insights";
import { Breadcrumbs } from "@/ui/breadcrumbs";
import { IconArrow } from "@/ui/icons";
import { Kicker, Page, SectionHead } from "@/ui/kit";
import { AdmissionJourney } from "@/ui/viz/admission-journey";
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
      <div>
        <Page className="pt-6 pb-12">
          <Breadcrumbs items={[{ href: "/admissions", label: "Admissions guide" }]} />
          <div className="mt-8 grid gap-x-16 gap-y-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-end">
            <div>
              <Kicker>Understand admissions</Kicker>
              <h1 className="mt-4 text-h1 leading-[1.04] [font-variation-settings:'opsz'_72] sm:text-display">How grammar school admissions work</h1>
              <p className="mt-5 max-w-[42rem] text-lede leading-[1.5] text-ink">
                Grammar school admissions combine a test, published criteria and a national timetable. These guides explain each part in plain English, with links to the official rules.
              </p>
            </div>
            <nav aria-label="Reading paths" className="border-t border-ink">
              {paths.map((k) => {
                const list = ADMISSIONS_GUIDES.filter((g) => g.path === k);
                return (
                  <a key={k} href={`#path-${k}`} className="group/rp flex items-baseline justify-between gap-4 border-b border-rule py-3 no-underline">
                    <span>
                      <span className="block font-semibold text-ink group-hover/rp:text-green">{READING_PATHS[k].title}</span>
                      <span className="text-small text-ink-2">{READING_PATHS[k].text}</span>
                    </span>
                    <span className="font-mono text-[0.85rem] whitespace-nowrap text-ink-2">
                      {list.length} {list.length === 1 ? "guide" : "guides"}
                    </span>
                  </a>
                );
              })}
            </nav>
          </div>
        </Page>
      </div>

      <section aria-labelledby="steps" className="py-16">
        <Page>
          <div className="max-w-[44rem]">
            <Kicker>The core idea</Kicker>
            <h2 id="steps" className="mt-4 text-h2">Qualifying, ranking, offering — in that order.</h2>
          </div>
          <div className="mt-8">
            <AdmissionJourney />
          </div>
        </Page>
      </section>

      <Page as="section" className="pt-16">
        <SectionHead id="timeline" kicker={`England · September ${entryYear} entry`} title="The application year, stage by stage" lede="Choose a stage. Dates appear only where we hold them from an official source, each with its verification status." />
        <div className="mt-8">
          <ApplicationJourney events={events.map((e) => ({ type: e.event_type, date: e.starts_on, status: e.verification_status, title: e.title }))} entryYear={entryYear} />
        </div>
      </Page>

      <Page as="section" className="pt-20">
        <SectionHead id="guides" kicker="Reading paths" title="Every guide, in the order it helps most" />
        <div className="mt-10 grid gap-14">
          {paths.map((k) => (
            <div key={k} id={`path-${k}`} className="grid scroll-mt-[calc(var(--header-h)+2rem)] gap-x-12 gap-y-5 lg:grid-cols-[16rem_minmax(0,1fr)]">
              <div>
                <h3 className="text-h3">{READING_PATHS[k].title}</h3>
                <p className="mt-1.5 text-[1rem] text-ink-2">{READING_PATHS[k].text}</p>
              </div>
              <ol className="grid gap-px overflow-hidden rounded-[8px] border border-rule bg-rule md:grid-cols-2">
                {ADMISSIONS_GUIDES.filter((g) => g.path === k).map((g, i) => (
                  <li key={g.slug} className="bg-card">
                    <Link href={`/admissions/${g.slug}`} className="group/g flex h-full gap-4 p-5 no-underline transition-colors hover:bg-paper">
                      <span className="font-mono text-[0.85rem] text-copper-ink">{String(i + 1).padStart(2, "0")}</span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="font-display text-[1.25rem] leading-snug text-ink group-hover/g:text-green">{g.title}</span>
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

      <Page as="section" className="pt-20 pb-6">
        <SectionHead id="map" kicker="The knowledge atlas" title="How the ideas connect" lede="Trace a topic to see what it leads to — guides, exam pages and tools." />
        <div className="mt-8">
          <KnowledgeMap nodes={KNOWLEDGE_NODES} edges={KNOWLEDGE_EDGES} />
        </div>
      </Page>
    </>
  );
}
