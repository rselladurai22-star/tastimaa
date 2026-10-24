import type { Metadata } from "next";
import Link from "next/link";
import { SITE } from "@/lib/site";
import { ArticleLayout } from "@/components/layout/article";

export const metadata: Metadata = { title: "About", description: `About ${SITE.name}: an independent, evidence-first guide to UK grammar schools.`, alternates: { canonical: "/about" } };

export default function AboutPage() {
  return (
    <ArticleLayout crumbs={[{ href: "/about", label: "About" }]} title={`About ${SITE.name}`} description="One platform, every grammar school, every important detail — with evidence for every decision." updated="2026-10-24" path="/about" sources={[]}>
      <p>Grammar school admissions are complicated: each school or area sets its own test, timetable and criteria, and rules change every year. We bring the official information together, keep each fact tied to its source, and explain it in plain English.</p>
      <p>
        We are independent and free to use. We don&apos;t sell places, tutoring rankings or paid placements, and commercial arrangements will never change the facts or the order we show schools in. Read our <Link href="/methodology">methodology</Link>.
      </p>
    </ArticleLayout>
  );
}
