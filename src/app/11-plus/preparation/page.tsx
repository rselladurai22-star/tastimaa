import type { Metadata } from "next";
import Link from "next/link";
import { PracticeTool } from "@/components/practice/practice-tool";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Callout, Card, Container } from "@/components/ui/primitives";

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
    <Container className="py-8">
      <Breadcrumbs items={[{ href: "/11-plus", label: "11+ exams" }, { href: "/11-plus/preparation", label: "Preparation" }]} />
      <header className="mt-4 mb-8 max-w-3xl">
        <h1 className="text-3xl font-semibold sm:text-4xl">11+ preparation</h1>
        <p className="mt-3 text-lg text-ink-2">A simple plan and free practice. Exact dates differ by area — use the planner for your schools&apos; verified dates.</p>
      </header>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section aria-labelledby="practice">
          <h2 id="practice" className="mb-3 text-2xl font-semibold">
            Timed practice
          </h2>
          <Callout className="mb-4">
            These are original questions written for this site to illustrate common question types. They are not past papers and won&apos;t predict a score in any real test. Answers and timings stay in your browser.
          </Callout>
          <PracticeTool />
        </section>
        <aside className="grid content-start gap-4">
          <Card className="p-5">
            <h2 className="font-sans text-sm font-semibold">A typical timeline in England</h2>
            <ol className="mt-3 grid gap-3 text-sm">
              {PLAN.map(([when, what]) => (
                <li key={when}>
                  <p className="font-semibold text-ink">{when}</p>
                  <p className="text-ink-2">{what}</p>
                </li>
              ))}
            </ol>
            <Link href="/tools/planner" className="mt-4 inline-block text-sm font-semibold link">
              Build a plan with your schools&apos; dates
            </Link>
          </Card>
          <Card className="p-5 text-sm text-ink-2">
            <h2 className="font-sans text-sm font-semibold text-ink">Keeping it healthy</h2>
            <p className="mt-2">Short, regular practice usually works better than long sessions. Keep perspective: a grammar school is one good option among several, and every child should have a strong school on their list they are very likely to be offered.</p>
          </Card>
        </aside>
      </div>
    </Container>
  );
}
