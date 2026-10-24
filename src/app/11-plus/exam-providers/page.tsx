import type { Metadata } from "next";
import Link from "next/link";
import { NATION_LABEL } from "@/domain/labels";
import { listProviders, listTests } from "@/server/tests";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Callout, Card, Container } from "@/components/ui/primitives";
import { VerificationBadge } from "@/components/ui/verification";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "11+ test providers and the areas they cover",
  description: "Which organisations set and administer grammar school entrance tests, and which tests and schools they cover.",
  alternates: { canonical: "/11-plus/exam-providers" },
};

export default async function ProvidersPage() {
  const [providers, tests] = await Promise.all([listProviders(), listTests()]);
  return (
    <Container className="py-8">
      <Breadcrumbs items={[{ href: "/11-plus", label: "11+ exams" }, { href: "/11-plus/exam-providers", label: "Test providers" }]} />
      <header className="mt-4 mb-8 max-w-3xl">
        <h1 className="text-3xl font-semibold sm:text-4xl">Test providers and tests</h1>
        <p className="mt-3 text-lg text-ink-2">Who produces and administers each entrance test we hold, with the schools linked to it.</p>
      </header>
      <Callout className="mb-8">
        We are adding test arrangements area by area as we verify them. If a test is missing, it means we haven&apos;t verified it yet — not that it doesn&apos;t exist.
      </Callout>
      <div className="grid gap-4 md:grid-cols-2">
        {tests.map((t) => (
          <Card key={t.slug} className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">
                <Link href={`/11-plus/${t.slug}`} className="hover:underline">
                  {t.name}
                </Link>
              </h2>
              <VerificationBadge status={t.verification_status} />
            </div>
            <p className="mt-1 text-sm text-ink-3">
              {NATION_LABEL[t.nation]} · {t.provider_name ? `Set by ${t.provider_name}` : "Provider not recorded"} · {t.schools} schools linked
            </p>
            {t.area_description ? <p className="mt-2 text-sm text-ink-2">{t.area_description}</p> : null}
          </Card>
        ))}
      </div>
      <h2 className="mt-12 text-2xl font-semibold">Providers</h2>
      <ul className="mt-4 grid gap-3">
        {providers.map((p) => (
          <li key={p.slug} className="rounded-xl border border-line bg-surface p-4">
            <p className="font-semibold text-ink">{p.name}</p>
            <p className="text-sm text-ink-2">{p.description}</p>
            {p.website ? (
              <a href={p.website} className="mt-1 inline-block text-sm link" rel="noopener noreferrer" target="_blank">
                Website
              </a>
            ) : null}
          </li>
        ))}
      </ul>
    </Container>
  );
}
