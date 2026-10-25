import type { Metadata } from "next";
import Link from "next/link";
import { NATION_LABEL } from "@/domain/labels";
import { listProviders, listTests } from "@/server/tests";
import { Breadcrumbs } from "@/ui/breadcrumbs";
import { Hero, HeroFigures, HeroHead } from "@/ui/hero";
import { ExternalLink, Page, SectionHead } from "@/ui/kit";
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
      <Hero>
        <Breadcrumbs items={[{ href: "/11-plus", label: "11+ exams" }, { href: "/11-plus/exam-providers", label: "Test providers" }]} />
        <HeroHead
          kicker="Explore 11+ exams"
          title="Test providers and tests"
          lede="Who produces and administers each entrance test we hold, with the schools linked to it. Tests are added area by area as we verify them — a missing test hasn't been verified yet."
          aside={
            <HeroFigures
              items={[
                [tests.length, "entrance tests held"],
                [providers.length, "providers"],
              ]}
            />
          }
        />
      </Hero>

      <Page as="section" className="pt-4 pb-6">
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
                    <span aria-hidden className="h-2 flex-1 rounded-full bg-sage-deep shadow-[inset_0_1px_2px_rgb(10_12_16/0.12)]">
                      <span className="block h-full rounded-full bg-[linear-gradient(90deg,var(--green-deep),var(--green))] shadow-[0_1px_2px_rgb(44_11_142/0.35)]" style={{ width: `${(t.schools / max) * 100}%` }} />
                    </span>
                    <span className="w-8 text-right font-mono text-[0.95rem] text-ink">{t.schools}</span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Page>

      <Page as="section" className="pt-10 pb-12">
        <SectionHead id="providers" kicker="Organisations" title="Providers" />
        <ul className="mt-6 grid gap-4 md:grid-cols-2">
          {providers.map((p) => (
            <li key={p.slug} className="rounded-[16px] bg-card p-5 shadow-[0_0_0_1px_var(--rule)]">
              <p className="text-[1.1875rem] font-semibold text-ink">{p.name}</p>
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
