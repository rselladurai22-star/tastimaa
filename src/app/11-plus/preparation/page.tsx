import type { Metadata } from "next";
import { Breadcrumbs } from "@/ui/breadcrumbs";
import { Hero, HeroHead } from "@/ui/hero";
import { ArrowLink, Note, Page } from "@/ui/kit";
import { PracticeTool } from "@/ui/tools/practice";

export const metadata: Metadata = {
  title: "11+ preparation: planning checklist and free practice questions",
  description: "A parent-friendly 11+ preparation checklist and timed practice with original questions in maths, verbal reasoning and English, with topic-by-topic feedback.",
  alternates: { canonical: "/11-plus/preparation" },
};

const PLAN = [
  ["Year 5, autumn", "Find out which test(s) your child would sit and read the official familiarisation materials."],
  ["Year 5, spring", "Attend open events and note each school's registration deadline and any supplementary form."],
  ["Year 5, summer", "Register for the test(s) before the deadline. Request access arrangements early if your child needs them."],
  ["Year 6, September", "Sit the test(s). Check the date for results and any review process."],
  ["Year 6, October", "Name schools in preference order on your home council's application by 31 October (England)."],
  ["Year 6, 1 March", "Offers arrive. Accept by the deadline, join waiting lists and consider appeals if needed."],
];

export default function PreparationPage() {
  return (
    <>
      <Hero>
        <Breadcrumbs items={[{ href: "/11-plus", label: "11+ exams" }, { href: "/11-plus/preparation", label: "Preparation" }]} />
        <HeroHead kicker="Explore 11+ exams" title="11+ preparation" lede="A simple plan and free timed practice. Exact dates differ by area — use the planner for your schools' verified dates." />
      </Hero>

      <Page className="grid grid-cols-[minmax(0,1fr)] gap-x-10 gap-y-10 pt-4 pb-12 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section aria-labelledby="practice" className="min-w-0">
          <p className="label mb-3 text-green">Free practice</p>
          <h2 id="practice" className="text-h2">
            Timed practice
          </h2>
          <Note className="mt-4 mb-6">
            These are original questions written for this site to illustrate common question types. They are not past papers and won&apos;t predict a score in any real test. Answers and timings stay in your browser.
          </Note>
          <PracticeTool />
        </section>

        <aside className="grid content-start gap-8">
          <section aria-labelledby="timeline">
            <h2 id="timeline" className="label text-ink">
              A typical timeline in England
            </h2>
            <ol className="relative mt-4 border-l border-rule-strong">
              {PLAN.map(([when, what]) => (
                <li key={when} className="relative pb-5 pl-5 last:pb-0">
                  <span aria-hidden className="absolute top-1.5 -left-[5px] size-[9px] rounded-full border-2 border-green bg-paper" />
                  <p className="font-mono text-[0.8rem] text-copper-ink">{when}</p>
                  <p className="mt-0.5 text-[0.98rem] leading-relaxed text-ink">{what}</p>
                </li>
              ))}
            </ol>
            <ArrowLink href="/tools/planner" className="mt-5">
              Build a plan with your schools&apos; dates
            </ArrowLink>
          </section>
          <section aria-labelledby="healthy" className="border-t border-rule pt-5">
            <h2 id="healthy" className="label text-ink">
              Keeping it healthy
            </h2>
            <p className="mt-3 text-[0.98rem] leading-relaxed text-ink-2">
              Short, regular practice usually works better than long sessions. Keep perspective: a grammar school is one good option among several, and every child should have a strong school on their list they are very likely to be offered.
            </p>
          </section>
        </aside>
      </Page>
    </>
  );
}
