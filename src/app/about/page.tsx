import type { Metadata } from "next";
import Link from "next/link";
import { SITE } from "@/lib/site";
import { ArticleShell, DeepHeading } from "@/ui/article/article";

export const metadata: Metadata = { title: "About", description: `About ${SITE.name}: an independent, evidence-first guide to UK grammar schools.`, alternates: { canonical: "/about" } };

export default function AboutPage() {
  return (
    <ArticleShell
      crumbs={[{ href: "/about", label: "About" }]}
      kicker="The atlas"
      title={`About ${SITE.name}`}
      lede={<p>One platform, every grammar school, every important detail — with evidence for every decision.</p>}
      description="One platform, every grammar school, every important detail — with evidence for every decision."
      updated="2026-10-24"
      path="/about"
      sources={[]}
      toc={[
        { id: "why", label: "Why it exists" },
        { id: "independence", label: "Independence" },
      ]}
      related={[
        { href: "/methodology", title: "Methodology", text: "Where our data comes from and how we verify it.", kicker: "Trust" },
        { href: "/data-sources", title: "Data sources", text: "Every source, its licence and when it last refreshed.", kicker: "Trust" },
        { href: "/corrections", title: "Report a correction", text: "If something is wrong, tell us.", kicker: "Trust" },
      ]}
    >
      <section aria-labelledby="why">
        <DeepHeading id="why" n={1}>
          Why it exists
        </DeepHeading>
        <p>
          Grammar school admissions are complicated: each school or area sets its own test, timetable and criteria, and rules change every year. We bring the official information together, keep each fact tied to its source, and explain it in plain
          English.
        </p>
      </section>
      <section aria-labelledby="independence">
        <DeepHeading id="independence" n={2}>
          Independence
        </DeepHeading>
        <p>
          We are independent and free to use. We don&apos;t sell places, tutoring rankings or paid placements, and commercial arrangements will never change the facts or the order we show schools in. Read our <Link href="/methodology">methodology</Link>.
        </p>
      </section>
    </ArticleShell>
  );
}
