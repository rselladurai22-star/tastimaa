import type { Metadata } from "next";
import { inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { clampEntryYear, selectableEntryYears } from "@/lib/academic-year";
import { EligibilityChecker } from "@/components/tools/eligibility-checker";
import { ThreeSteps } from "@/components/school/admissions";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Callout, Container } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Grammar school eligibility checker",
  description: "Check how each grammar school's published admission rules apply to your child — test status, admission criteria and what is still unknown — without sharing personal details.",
  alternates: { canonical: "/tools/eligibility-checker" },
};

export default async function EligibilityPage({ searchParams }: { searchParams: Promise<{ schools?: string; year?: string }> }) {
  const sp = await searchParams;
  const slugs = (sp.schools ?? "").split(",").filter((s) => /^[a-z0-9-]{1,120}$/.test(s)).slice(0, 5);
  const rows = slugs.length ? await db().select({ slug: schema.schools.slug, name: schema.schools.name }).from(schema.schools).where(inArray(schema.schools.slug, slugs)) : [];
  return (
    <Container className="py-8">
      <Breadcrumbs items={[{ href: "/tools/eligibility-checker", label: "Eligibility checker" }]} />
      <header className="mt-4 mb-6 max-w-3xl">
        <h1 className="text-3xl font-semibold sm:text-4xl">Eligibility checker</h1>
        <p className="mt-3 text-lg text-ink-2">See how each school&apos;s published rules for your child&apos;s entry year would apply — and what you still need to find out. No sign-in and no personal details.</p>
      </header>
      <div className="mb-6">
        <ThreeSteps compact />
      </div>
      <Callout className="mb-8" title="What this can and can't tell you">
        It applies the structured rules we hold for each school&apos;s selected entry year. It can&apos;t tell you whether a place will be offered — that depends on how many other children apply — and it never estimates a probability. Where we don&apos;t hold a school&apos;s rules for that year, it says so.
      </Callout>
      <EligibilityChecker initialSchools={slugs.map((s) => rows.find((r) => r.slug === s)).filter((r): r is { slug: string; name: string } => !!r)} years={selectableEntryYears()} defaultYear={clampEntryYear(sp.year)} />
    </Container>
  );
}
