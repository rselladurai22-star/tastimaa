import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { CorrectionForm } from "@/components/tools/correction-form";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Container } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Report a correction", description: "Tell us about incorrect or missing school information. Every correction is checked against the official source.", alternates: { canonical: "/corrections" } };

export default async function CorrectionsPage({ searchParams }: { searchParams: Promise<{ school?: string; page?: string }> }) {
  const sp = await searchParams;
  const school = sp.school && /^[a-z0-9-]{1,120}$/.test(sp.school) ? await db().query.schools.findFirst({ where: eq(schema.schools.slug, sp.school), columns: { slug: true, name: true } }) : null;
  return (
    <Container className="py-8">
      <Breadcrumbs items={[{ href: "/corrections", label: "Report a correction" }]} />
      <header className="mt-4 mb-8 max-w-3xl">
        <h1 className="text-3xl font-semibold sm:text-4xl">Report a correction</h1>
        <p className="mt-3 text-lg text-ink-2">Schools and parents help keep this accurate. A link to the official document lets us fix things fastest.</p>
      </header>
      <CorrectionForm school={school?.slug} schoolName={school?.name} page={sp.page} />
    </Container>
  );
}
