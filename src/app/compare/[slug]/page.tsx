import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { selectableEntryYears } from "@/lib/academic-year";
import { COMPARE_GROUPS, loadComparison, loadSavedComparison, type CompareGroup } from "@/server/compare";
import { PageHero } from "@/ui/hero";
import { Page } from "@/ui/kit";
import { CompareView } from "@/ui/tools/compare";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const saved = await loadSavedComparison(slug);
  if (!saved) return { title: "Comparison not found" };
  const data = await loadComparison(saved.slugs, saved.entryYear ?? selectableEntryYears()[0]!);
  return {
    title: `Compare ${data.schools.map((s) => s.name).join(" vs ")}`,
    description: `Side-by-side comparison for September ${data.entryYear} entry: entrance tests, admissions rules, results, inspections and applications data.`,
    alternates: { canonical: `/compare/${slug}` },
    // Shared comparisons are for people, not search results.
    robots: { index: false, follow: true },
  };
}

export default async function SavedComparison({ params }: Props) {
  const { slug } = await params;
  const saved = await loadSavedComparison(slug);
  if (!saved) notFound();
  const data = await loadComparison(saved.slugs, saved.entryYear ?? selectableEntryYears()[0]!);
  return (
    <>
      <PageHero
        crumbs={[
          { href: "/compare", label: "Compare schools" },
          { href: `/compare/${slug}`, label: "Shared comparison" },
        ]}
        kicker="Shared comparison"
        title={data.schools.map((s) => s.name).join(" vs ")}
        lede={`A saved comparison for September ${data.entryYear} entry. Figures update as official data changes.`}
      />
      <Page className="pt-4 pb-16">
        <CompareView data={data} groups={Object.keys(COMPARE_GROUPS) as CompareGroup[]} diffOnly={false} years={selectableEntryYears()} savedSlug={slug} />
      </Page>
    </>
  );
}
