import type { Metadata } from "next";
import Link from "next/link";
import { NATION_LABEL } from "@/domain/labels";
import { listTests } from "@/server/tests";
import { ArticleLayout } from "@/components/layout/article";
import { Card } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "The 11+ explained: how grammar school entrance tests work",
  description: "How 11+ and grammar school entrance tests work in England and Northern Ireland: test providers, subjects, age standardisation, qualifying scores, reviews, access arrangements and common misconceptions.",
  alternates: { canonical: "/11-plus" },
};

export default async function ElevenPlusHub() {
  const tests = await listTests();
  return (
    <ArticleLayout
      crumbs={[{ href: "/11-plus", label: "11+ exams" }]}
      title="The 11+ explained"
      description="There is no single 11+. Each area or school sets its own test, timetable and scoring. This guide explains what they have in common and where they differ."
      updated="2026-10-24"
      path="/11-plus"
      sources={[
        { title: "The Secondary Transfer Test — The Buckinghamshire Grammar Schools", url: "https://www.thebucksgrammarschools.org/the-secondary-transfer-test" },
        { title: "CSSE 11+ Examination", url: "https://csse.org.uk/" },
        { title: "SEAG Assessment Guide", url: "https://seagni.co.uk/guidance/assessment-guide" },
        { title: "School Admissions Code", url: "https://www.gov.uk/government/publications/school-admissions-code--2" },
      ]}
      aside={
        <Card className="p-5">
          <p className="text-sm font-semibold text-ink">Tests we hold details for</p>
          <ul className="mt-2 grid gap-2 text-sm">
            {tests.map((t) => (
              <li key={t.slug}>
                <Link href={`/11-plus/${t.slug}`} className="font-medium text-ink hover:underline">
                  {t.name}
                </Link>
                <span className="block text-xs text-ink-3">
                  {NATION_LABEL[t.nation]} · {t.schools} schools linked
                </span>
              </li>
            ))}
          </ul>
          <Link href="/11-plus/exam-providers" className="mt-3 inline-block text-sm link">
            Test providers
          </Link>
        </Card>
      }
    >
      <h2>Who sets the test?</h2>
      <p>
        In some areas one test is used by every grammar school (for example, the Buckinghamshire Secondary Transfer Test, produced by GL Assessment for the thirteen Buckinghamshire grammar schools). Elsewhere a consortium runs a shared test (such as the CSSE
        11+ in Essex and Southend), and some schools set their own. In Northern Ireland, schools that select academically use the SEAG Entrance Assessment.
      </p>
      <h2>What is tested?</h2>
      <p>Tests are built from some combination of:</p>
      <ul>
        <li><strong>English</strong> — reading comprehension, vocabulary, spelling, punctuation and sometimes writing.</li>
        <li><strong>Mathematics</strong> — arithmetic, problem solving and reasoning, broadly from the primary curriculum.</li>
        <li><strong>Verbal reasoning</strong> — word and letter patterns, codes and logic.</li>
        <li><strong>Non-verbal and spatial reasoning</strong> — patterns, shapes and sequences.</li>
      </ul>
      <p>Which of these appear, in what format and for how long differs by test. Always use the official familiarisation materials for the test your child will sit.</p>
      <h2>Age standardisation</h2>
      <p>
        Most tests convert raw marks into standardised scores that adjust for the child&apos;s age in months, so that younger children in the year group are not disadvantaged. Standardised scores are specific to each test and each year&apos;s cohort: a score
        in one test cannot be compared with, or used for, another test.
      </p>
      <h2>Qualifying scores and ranking</h2>
      <p>
        Some schools set a qualifying score (for example, a score of 121 or above in the Buckinghamshire test qualifies a child for consideration). Others rank all candidates by score. Meeting a qualifying score is not an offer — see{" "}
        <Link href="/admissions/qualifying-is-not-an-offer">qualifying is not the same as getting a place</Link>.
      </p>
      <h2>Reviews, illness and access arrangements</h2>
      <p>
        Many areas offer a review for children who narrowly miss the standard, or whose performance was affected by circumstances on the day. Test administrators can provide access arrangements for children with special educational needs or disabilities,
        usually only if requested before a deadline. Check the rules early.
      </p>
      <h2>Common misconceptions</h2>
      <ul>
        <li>&ldquo;A pass is a pass everywhere.&rdquo; — Scores belong to one test and one year.</li>
        <li>&ldquo;Last year&apos;s cut-off is this year&apos;s pass mark.&rdquo; — Where schools rank by score, the lowest score offered changes every year.</li>
        <li>&ldquo;Registering for the test means we&apos;ve applied.&rdquo; — In England you must also name the school on your home council&apos;s application by 31 October.</li>
      </ul>
      <h2>Preparing</h2>
      <p>
        Familiarity with the question formats helps most children feel calmer on the day. Our <Link href="/11-plus/preparation">preparation page</Link> has a planning checklist and original practice questions. You don&apos;t need to buy anything to use this site.
      </p>
    </ArticleLayout>
  );
}
