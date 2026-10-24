import type { Metadata } from "next";
import { env } from "@/lib/env";
import { Breadcrumbs } from "@/ui/breadcrumbs";
import { Page, PageHead } from "@/ui/kit";
import { AssistantChat } from "@/ui/tools/assistant";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "School Intelligence Assistant",
  description: "Ask questions about grammar school admissions in plain English. Answers come from our verified database and official documents, with sources.",
  alternates: { canonical: "/assistant" },
};

export default function AssistantPage() {
  return (
    <Page className="pb-16">
      <div className="pt-6">
        <Breadcrumbs items={[{ href: "/assistant", label: "Research assistant" }]} />
      </div>
      <PageHead
        kicker="Research tools"
        title="School Intelligence Assistant"
        lede="Ask in plain English. Answers are built only from our verified school data and official documents, with numbered sources. It won't guess, and it won't estimate your chances of a place."
      />
      <AssistantChat llmEnabled={!!env().ANTHROPIC_API_KEY} />
    </Page>
  );
}
