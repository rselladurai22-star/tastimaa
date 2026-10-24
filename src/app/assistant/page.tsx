import type { Metadata } from "next";
import { env } from "@/lib/env";
import { AssistantChat } from "@/components/tools/assistant-chat";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Container } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "School Intelligence Assistant",
  description: "Ask questions about grammar school admissions in plain English. Answers come from our verified database and official documents, with sources.",
  alternates: { canonical: "/assistant" },
};

export default function AssistantPage() {
  return (
    <Container className="max-w-4xl py-8">
      <Breadcrumbs items={[{ href: "/assistant", label: "Research assistant" }]} />
      <header className="mt-4 mb-8">
        <h1 className="text-3xl font-semibold sm:text-4xl">School Intelligence Assistant</h1>
        <p className="mt-3 text-lg text-ink-2">
          Ask in plain English. Answers are built only from our verified school data and official documents, with numbered sources. It won&apos;t guess, and it won&apos;t estimate your chances of a place.
        </p>
      </header>
      <AssistantChat llmEnabled={!!env().ANTHROPIC_API_KEY} />
    </Container>
  );
}
