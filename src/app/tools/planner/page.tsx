import type { Metadata } from "next";
import { defaultEntryYear, selectableEntryYears } from "@/lib/academic-year";
import { Planner } from "@/components/tools/planner";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Container } from "@/components/ui/primitives";

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
    <Container className="py-8">
      <Breadcrumbs items={[{ href: "/tools/planner", label: "Admissions planner" }]} />
      <header className="mt-4 mb-8 max-w-3xl">
        <h1 className="text-3xl font-semibold sm:text-4xl">Admissions planner</h1>
        <p className="mt-3 text-lg text-ink-2">Every step from research to offers, with the verified dates for your shortlisted schools and their tests.</p>
      </header>
      <Planner years={selectableEntryYears()} defaultYear={defaultEntryYear()} notice={sp.reminders ? (NOTICES[sp.reminders] ?? null) : null} />
    </Container>
  );
}
