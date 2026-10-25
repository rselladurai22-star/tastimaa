import type { Metadata } from "next";
import { defaultEntryYear, selectableEntryYears } from "@/lib/academic-year";
import { PageHero } from "@/ui/hero";
import { Page } from "@/ui/kit";
import { Planner } from "@/ui/tools/planner";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Grammar school admissions planner",
  description: "A personal checklist and calendar of verified registration, test, application and offer dates for the grammar schools on your shortlist.",
  alternates: { canonical: "/tools/planner" },
};

const NOTICES: Record<string, string> = {
  confirmed: "Reminders confirmed. We'll email you a week before each verified date.",
  unsubscribed: "You've been unsubscribed and your email address has been deleted.",
  invalid: "That link has expired or was already used.",
};

export default async function PlannerPage({ searchParams }: { searchParams: Promise<{ reminders?: string }> }) {
  const sp = await searchParams;
  return (
    <>
      <PageHero crumbs={[{ href: "/tools/planner", label: "Admissions planner" }]} kicker="Research tools" title="Admissions planner" lede="Every step from research to offers, with the verified dates for your shortlisted schools and their tests." />
      <Page className="pt-4 pb-12">
        <Planner years={selectableEntryYears()} defaultYear={defaultEntryYear()} notice={sp.reminders ? (NOTICES[sp.reminders] ?? null) : null} />
      </Page>
    </>
  );
}
