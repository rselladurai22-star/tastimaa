import type { Metadata } from "next";
import { clampEntryYear, selectableEntryYears } from "@/lib/academic-year";
import { loadComparison, parseGroups } from "@/server/compare";
import { CompareView } from "@/components/school/compare-view";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Container } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Compare grammar schools side by side",
  description: "Compare up to five grammar schools: entrance tests, qualifying scores, catchment and oversubscription rules, official results, inspections and applications data.",
  alternates: { canonical: "/compare" },
};

type SP = Promise<{ schools?: string; year?: string; dims?: string; diff?: string }>;

export default async function ComparePage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const slugs = (sp.schools ?? "").split(",").map((s) => s.trim()).filter((s) => /^[a-z0-9-]{1,120}$/.test(s));
  const entryYear = clampEntryYear(sp.year);
  const data = await loadComparison(slugs, entryYear);
  return (
    <Container className="py-8">
      <Breadcrumbs items={[{ href: "/compare", label: "Compare schools" }]} />
      <header className="mt-4 mb-8 max-w-3xl">
        <h1 className="text-3xl font-semibold sm:text-4xl">Compare schools</h1>
        <p className="mt-3 text-lg text-ink-2">Side-by-side facts for up to five schools, for one admission year. Differences are highlighted and explained.</p>
      </header>
      <CompareView data={data} groups={parseGroups(sp.dims)} diffOnly={sp.diff === "1"} years={selectableEntryYears()} />
    </Container>
  );
}
