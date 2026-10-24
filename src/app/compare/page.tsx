import type { Metadata } from "next";
import { clampEntryYear, selectableEntryYears } from "@/lib/academic-year";
import { loadComparison, parseGroups } from "@/server/compare";
import { Breadcrumbs } from "@/ui/breadcrumbs";
import { Page, PageHead } from "@/ui/kit";
import { CompareView } from "@/ui/tools/compare";

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
    <Page className="pb-16">
      <div className="pt-6">
        <Breadcrumbs items={[{ href: "/compare", label: "Compare schools" }]} />
      </div>
      <PageHead kicker="Research tools" title="Compare schools" lede="Side-by-side facts for up to five schools, for one admission year. Differences are highlighted and explained." />
      <CompareView data={data} groups={parseGroups(sp.dims)} diffOnly={sp.diff === "1"} years={selectableEntryYears()} />
    </Page>
  );
}
