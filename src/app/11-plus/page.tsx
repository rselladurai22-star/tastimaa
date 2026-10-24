import type { Metadata } from "next";
import Link from "next/link";
import { NATION_LABEL } from "@/domain/labels";
import { getTest, listTests } from "@/server/tests";
import { ArticleShell, DeepHeading } from "@/ui/article/article";
import { Figure } from "@/ui/kit";
import { Status } from "@/ui/status";
import { TestStructure } from "@/ui/viz/exam-viz";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "The 11+ explained: how grammar school entrance tests work",
  description: "How 11+ and grammar school entrance tests work in England and Northern Ireland: test providers, subjects, age standardisation, qualifying scores, reviews, access arrangements and common misconceptions.",
  alternates: { canonical: "/11-plus" },
};

const TOC = [
  { id: "who-sets", label: "Who sets the test?" },
  { id: "what-is-tested", label: "What is tested?" },
  { id: "standardisation", label: "Age standardisation" },
  { id: "qualifying", label: "Qualifying scores and ranking" },
  { id: "reviews", label: "Reviews, illness and access arrangements" },
  { id: "misconceptions", label: "Common misconceptions" },
  { id: "preparing", label: "Preparing" },
  { id: "tests-we-hold", label: "Tests we hold details for" },
];

export default async function ElevenPlusHub() {
  const tests = await listTests();
  const details = (await Promise.all(tests.map((t) => getTest(t.slug)))).filter((x): x is NonNullable<typeof x> => !!x);
  const structures = details.filter((d) => d.test.components?.length).map((d) => ({ slug: d.test.slug, name: d.test.name, components: d.test.components ?? [] }));

  return (
    <ArticleShell
      crumbs={[{ href: "/11-plus", label: "11+ exams" }]}
      kicker="Explore 11+ exams"
      title="The 11+ explained"
      lede={<p>There is no single 11+. Each area or school sets its own test, timetable and scoring. This guide explains what they have in common and where they differ.</p>}
      description="There is no single 11+. Each area or school sets its own test, timetable and scoring. This guide explains what they have in common and where they differ."
      updated="2026-10-24"
      path="/11-plus"
      sources={[
        { title: "The Secondary Transfer Test — The Buckinghamshire Grammar Schools", url: "https://www.thebucksgrammarschools.org/the-secondary-transfer-test" },
        { title: "CSSE 11+ Examination", url: "https://csse.org.uk/" },
        { title: "SEAG Assessment Guide", url: "https://seagni.co.uk/guidance/assessment-guide" },
        { title: "School Admissions Code", url: "https://www.gov.uk/government/publications/school-admissions-code--2" },
      ]}
      toc={TOC}
      next={{ href: "/11-plus/preparation", title: "Preparation: a plan and original practice questions", kicker: "Next" }}
      related={[
        { href: "/11-plus/exam-providers", title: "Tests and providers", text: "Who produces and administers each entrance test we hold.", kicker: "11+ exams" },
        { href: "/admissions/qualifying-is-not-an-offer", title: "Qualifying isn't an offer", text: "How a pass, the criteria and the places fit together.", kicker: "Before you apply" },
        { href: "/admissions/appeals", title: "Appeals", text: "What you can do if the answer is no.", kicker: "After offer day" },
      ]}
    >
      <section aria-labelledby="who-sets">
        <DeepHeading id="who-sets" n={1}>
          Who sets the test?
        </DeepHeading>
        <p>
          In some areas one test is used by every grammar school (for example, the Buckinghamshire Secondary Transfer Test, produced by GL Assessment for the thirteen Buckinghamshire grammar schools). Elsewhere a consortium runs a shared test (such as the
          CSSE 11+ in Essex and Southend), and some schools set their own. In Northern Ireland, schools that select academically use the SEAG Entrance Assessment.
        </p>
      </section>
      <section aria-labelledby="what-is-tested">
        <DeepHeading id="what-is-tested" n={2}>
          What is tested?
        </DeepHeading>
        <p>Tests are built from some combination of:</p>
        <ul>
          <li>
            <strong>English</strong> — reading comprehension, vocabulary, spelling, punctuation and sometimes writing.
          </li>
          <li>
            <strong>Mathematics</strong> — arithmetic, problem solving and reasoning, broadly from the primary curriculum.
          </li>
          <li>
            <strong>Verbal reasoning</strong> — word and letter patterns, codes and logic.
          </li>
          <li>
            <strong>Non-verbal and spatial reasoning</strong> — patterns, shapes and sequences.
          </li>
        </ul>
        <p>Which of these appear, in what format and for how long differs by test. Always use the official familiarisation materials for the test your child will sit.</p>
        <Figure n={1} title="The four kinds of question, and how each test combines them" caption="The example questions are original and illustrative — not taken from any real paper. The components listed for each test are as published by its administrator." className="my-10">
          <TestStructure tests={structures} />
        </Figure>
      </section>
      <section aria-labelledby="standardisation">
        <DeepHeading id="standardisation" n={3}>
          Age standardisation
        </DeepHeading>
        <p>
          Most tests convert raw marks into standardised scores that adjust for the child&apos;s age in months, so that younger children in the year group are not disadvantaged. Standardised scores are specific to each test and each year&apos;s cohort: a
          score in one test cannot be compared with, or used for, another test.
        </p>
      </section>
      <section aria-labelledby="qualifying">
        <DeepHeading id="qualifying" n={4}>
          Qualifying scores and ranking
        </DeepHeading>
        <p>
          Some schools set a qualifying score (for example, a score of 121 or above in the Buckinghamshire test qualifies a child for consideration). Others rank all candidates by score. Meeting a qualifying score is not an offer — see{" "}
          <Link href="/admissions/qualifying-is-not-an-offer">qualifying is not the same as getting a place</Link>.
        </p>
      </section>
      <section aria-labelledby="reviews">
        <DeepHeading id="reviews" n={5}>
          Reviews, illness and access arrangements
        </DeepHeading>
        <p>
          Many areas offer a review for children who narrowly miss the standard, or whose performance was affected by circumstances on the day. Test administrators can provide access arrangements for children with special educational needs or
          disabilities, usually only if requested before a deadline. Check the rules early.
        </p>
      </section>
      <section aria-labelledby="misconceptions">
        <DeepHeading id="misconceptions" n={6}>
          Common misconceptions
        </DeepHeading>
        <ul>
          <li>&ldquo;A pass is a pass everywhere.&rdquo; — Scores belong to one test and one year.</li>
          <li>&ldquo;Last year&apos;s cut-off is this year&apos;s pass mark.&rdquo; — Where schools rank by score, the lowest score offered changes every year.</li>
          <li>&ldquo;Registering for the test means we&apos;ve applied.&rdquo; — In England you must also name the school on your home council&apos;s application by 31 October.</li>
        </ul>
      </section>
      <section aria-labelledby="preparing">
        <DeepHeading id="preparing" n={7}>
          Preparing
        </DeepHeading>
        <p>
          Familiarity with the question formats helps most children feel calmer on the day. Our <Link href="/11-plus/preparation">preparation page</Link> has a planning checklist and original practice questions. You don&apos;t need to buy anything to use
          this site.
        </p>
      </section>
      <section aria-labelledby="tests-we-hold">
        <DeepHeading id="tests-we-hold" n={8}>
          Tests we hold details for
        </DeepHeading>
        <ul className="not-prose grid gap-px overflow-hidden rounded-[8px] border border-rule bg-rule">
          {tests.map((t) => (
            <li key={t.slug} className="bg-card">
              <Link href={`/11-plus/${t.slug}`} className="group/t flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-5 py-4 no-underline hover:bg-paper">
                <span>
                  <span className="block font-semibold text-ink group-hover/t:text-green">{t.name}</span>
                  <span className="text-small text-ink-2">
                    {NATION_LABEL[t.nation]} · {t.schools} {t.schools === 1 ? "school" : "schools"} linked
                  </span>
                </span>
                <Status status={t.verification_status} quiet />
              </Link>
            </li>
          ))}
        </ul>
        <p>
          <Link href="/11-plus/exam-providers">Test providers and the areas they cover</Link>.
        </p>
      </section>
    </ArticleShell>
  );
}
