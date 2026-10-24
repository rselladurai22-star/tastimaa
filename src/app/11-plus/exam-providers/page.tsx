import type { Metadata } from "next";
import Link from "next/link";
import { NATION_LABEL } from "@/domain/labels";
import { listProviders, listTests } from "@/server/tests";
import { Breadcrumbs } from "@/ui/breadcrumbs";
import { ExternalLink, Kicker, Note, Page, SectionHead } from "@/ui/kit";
import { Status } from "@/ui/status";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "11+ test providers and the areas they cover",
  description: "Which organisations set and administer grammar school entrance tests, and which tests and schools they cover.",
  alternates: { canonical: "/11-plus/exam-providers" },
};

export default async function ProvidersPage() {
  const [providers, tests] = await Promise.all([listProviders(), listTests()]);
  const max = Math.max(1, ...tests.map((t) => t.schools));
  return (
    <>
      <Page className="pt-6 pb-10">
        <Breadcrumbs items={[{ href: "/11-plus", label: "11+ exams" }, { href: "/11-plus/exam-providers", label: "Test providers" }]} />
        <div className="mt-8 max-w-[48rem]">
          <Kicker>Explore 11+ exams</Kicker>
          <h1 className="mt-3 text-h1 [font-variation-settings:'opsz'_60]">Test providers and tests</h1>
          <p className="mt-4 text-lede leading-[1.5] text-ink">Who produces and administers each entrance test we hold, with the schools linked to it.</p>
        </div>
        <Note className="mt-8 max-w-[48rem]">We are adding test arrangements area by area as we verify them. If a test is missing, it means we haven&apos;t verified it yet — not that it doesn&apos;t exist.</Note>
      </Page>

      <Page as="section" className="pb-6">
        <SectionHead id="tests" kicker="Tests" title="Every test we hold" lede="Bars show how many schools we link to each test." />
        <table className="mt-6 w-full border-collapse text-left">
          <caption className="sr-only">Entrance tests, their providers and the number of schools linked</caption>
          <thead>
            <tr className="border-b border-ink font-mono text-[0.72rem] tracking-[0.06em] text-ink-2 uppercase">
              <th scope="col" className="py-2 pr-4 font-medium">
                Test
              </th>
              <th scope="col" className="hidden py-2 pr-4 font-medium md:table-cell">
                Set by
              </th>
              <th scope="col" className="py-2 font-medium">
                Schools
              </th>
            </tr>
          </thead>
          <tbody>
            {tests.map((t) => (
              <tr key={t.slug} className="border-b border-rule align-top">
                <th scope="row" className="py-4 pr-4 font-normal">
                  <Link href={`/11-plus/${t.slug}`} className="font-semibold text-ink no-underline hover:text-green hover:underline">
                    {t.name}
                  </Link>
                  <span className="mt-0.5 block text-small text-ink-2">
                    {NATION_LABEL[t.nation]}
                    {t.area_description ? ` · ${t.area_description}` : ""}
                  </span>
                  <span className="mt-1.5 block md:hidden">{t.provider_name ? `Set by ${t.provider_name}` : "Provider not recorded"}</span>
                  <Status status={t.verification_status} quiet className="mt-2" />
                </th>
                <td className="hidden py-4 pr-4 text-ink-2 md:table-cell">{t.provider_name ?? "Not recorded"}</td>
                <td className="w-[30%] py-4">
                  <span className="flex items-center gap-3">
                    <span aria-hidden className="h-1.5 flex-1 rounded-full bg-sage-deep">
                      <span className="block h-full rounded-full bg-green-bright" style={{ width: `${(t.schools / max) * 100}%` }} />
                    </span>
                    <span className="w-8 text-right font-mono text-[0.95rem] text-ink">{t.schools}</span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Page>

      <Page as="section" className="pt-14 pb-16">
        <SectionHead id="providers" kicker="Organisations" title="Providers" />
        <ul className="mt-6 grid gap-px overflow-hidden rounded-[8px] border border-rule bg-rule md:grid-cols-2">
          {providers.map((p) => (
            <li key={p.slug} className="bg-card p-5">
              <p className="font-display text-[1.25rem] text-ink">{p.name}</p>
              <p className="mt-1.5 text-[0.98rem] leading-relaxed text-ink-2">{p.description}</p>
              {p.website ? (
                <p className="mt-2">
                  <ExternalLink href={p.website}>Website</ExternalLink>
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </Page>
    </>
  );
}
