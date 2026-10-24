import type { Metadata } from "next";
import Link from "next/link";
import { ADMISSIONS_GUIDES } from "@/content/guides";
import { ThreeSteps } from "@/components/school/admissions";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Container } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "How grammar school admissions work",
  description: "A plain-English guide to grammar school admissions in England and Northern Ireland: qualifying versus getting a place, catchment, oversubscription criteria, home address rules and appeals.",
  alternates: { canonical: "/admissions" },
};

export default function AdmissionsHub() {
  return (
    <Container className="py-8">
      <Breadcrumbs items={[{ href: "/admissions", label: "Admissions guide" }]} />
      <header className="mt-4 mb-10 max-w-3xl">
        <h1 className="text-3xl font-semibold sm:text-4xl">How grammar school admissions work</h1>
        <p className="mt-3 text-lg text-ink-2">Grammar school admissions combine a test, published criteria and a national timetable. These guides explain each part, with links to the official rules.</p>
      </header>
      <ThreeSteps />
      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ADMISSIONS_GUIDES.map((g) => (
          <li key={g.slug}>
            <Link href={`/admissions/${g.slug}`} className="flex h-full flex-col rounded-xl border border-line bg-surface p-5 hover:border-line-strong">
              <span className="font-serif text-lg font-semibold text-ink">{g.title}</span>
              <span className="mt-2 text-sm text-ink-2">{g.description}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Container>
  );
}
