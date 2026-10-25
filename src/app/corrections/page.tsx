import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { PageHero } from "@/ui/hero";
import { Page } from "@/ui/kit";
import { CorrectionForm } from "@/ui/tools/account";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Report a correction", description: "Tell us about incorrect or missing school information. Every correction is checked against the official source.", alternates: { canonical: "/corrections" } };

export default async function CorrectionsPage({ searchParams }: { searchParams: Promise<{ school?: string; page?: string }> }) {
  const sp = await searchParams;
  const school = sp.school && /^[a-z0-9-]{1,120}$/.test(sp.school) ? await db().query.schools.findFirst({ where: eq(schema.schools.slug, sp.school), columns: { slug: true, name: true } }) : null;
  return (
    <>
      <PageHero
        crumbs={[{ href: "/corrections", label: "Report a correction" }]}
        kicker="The atlas"
        title="Report a correction"
        lede="Schools and parents help keep this accurate. A link to the official document lets us fix things fastest."
        aside={
          <ol className="grid gap-3 lg:border-l lg:border-rule lg:pl-6">
            {["You tell us what's wrong, ideally with the official link.", "It joins the same review queue as automated extractions.", "An editor checks it against the source and records the outcome."].map((t, i) => (
              <li key={t} className="grid grid-cols-[2rem_minmax(0,1fr)] text-[0.98rem] text-ink-2">
                <span className="font-mono text-[0.8rem] text-copper-ink">{String(i + 1).padStart(2, "0")}</span>
                {t}
              </li>
            ))}
          </ol>
        }
      />
      <Page className="pt-4 pb-16">
        <CorrectionForm school={school?.slug} schoolName={school?.name} page={sp.page} />
      </Page>
    </>
  );
}
