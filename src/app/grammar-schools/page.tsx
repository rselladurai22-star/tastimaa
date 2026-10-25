import type { Metadata } from "next";
import Link from "next/link";
import { defaultEntryYear } from "@/lib/academic-year";
import { areaIndex, selectiveA8 } from "@/server/insights";
import { searchSchools, siteStats } from "@/server/schools";
import { parseDirectoryParams } from "@/server/search-params";
import { Breadcrumbs } from "@/ui/breadcrumbs";
import { DirectoryDesk } from "@/ui/directory/directory";
import { IconSearch } from "@/ui/icons";
import { Hero, HeroFigures, HeroHead } from "@/ui/hero";
import { Page, SectionHead } from "@/ui/kit";

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }): Promise<Metadata> {
  const sp = await searchParams;
  const filtered = Object.keys(sp).length > 0;
  return {
    title: "All UK grammar schools — search, filter and map",
    description: "Search every state grammar school in England and Northern Ireland by name, town or postcode. Filter by entrance test, gender, sixth form and admissions rules.",
    alternates: { canonical: "/grammar-schools" },
    // Filter permutations are useful for people, not for search engines.
    robots: filtered ? { index: false, follow: true } : undefined,
  };
}

export default async function DirectoryPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const p = parseDirectoryParams(await searchParams);
  const entryYear = defaultEntryYear();
  const [result, index, stats, bench] = await Promise.all([searchSchools(p, { entryYear }), areaIndex(), siteStats(), selectiveA8()]);

  return (
    <>
      <Hero>
        <Breadcrumbs items={[{ href: "/grammar-schools", label: "Grammar schools" }]} />
        <HeroHead
          kicker={`Directory · ${stats.listed} schools`}
          title="Grammar schools in the UK"
          lede="Every state grammar school in England and Northern Ireland, from official records. Search by name, town or postcode, then narrow by test, gender and admission rules."
          aside={
            <HeroFigures
              items={[
                [stats.england, "grammar schools in England"],
                [stats.partial, "partially selective, England"],
                [stats.ni, "in Northern Ireland"],
              ]}
            />
          }
        >
          <form method="get" action="/grammar-schools" role="search" className="on-light mt-7 flex max-w-[42rem] gap-2 rounded-[14px] bg-card p-2 shadow-[0_20px_40px_-20px_rgb(0_0_0/0.6)]">
            {p.view ? <input type="hidden" name="view" value={p.view} /> : null}
            <label htmlFor="dir-q" className="sr-only">
              Search by school name, town or postcode
            </label>
            <span className="relative block min-w-0 flex-1">
              <IconSearch size={18} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-3" />
              <input id="dir-q" name="q" type="search" defaultValue={p.q} placeholder="School name, town or postcode" className="min-h-12 w-full rounded-[10px] bg-transparent pr-3 pl-11 text-[1.0625rem] text-ink placeholder:text-ink-3 focus:outline-2 focus:outline-green" />
            </span>
            <button type="submit" className="inline-flex min-h-12 shrink-0 items-center rounded-[10px] bg-green px-5 font-semibold text-white hover:bg-green-deep">
              Search
            </button>
          </form>
        </HeroHead>
      </Hero>

      <Page className="pt-4 pb-4">
        <DirectoryDesk p={p} result={result} basePath="/grammar-schools" entryYear={entryYear} bench={bench} />
      </Page>

      <Page as="section" className="pt-12 pb-6">
        <SectionHead id="by-area" kicker="Atlas index" title="Browse by area" lede="Each local authority with at least one grammar school, grouped by region. Numbers are schools listed." />
        <div className="mt-8 columns-1 gap-x-5 sm:columns-2 lg:columns-3">
          {index.map((g) => (
            <section key={g.slug} aria-labelledby={`ix-${g.slug}`} className="mb-5 break-inside-avoid rounded-[16px] bg-card p-5 shadow-[0_0_0_1px_var(--rule)]">
              <h3 id={`ix-${g.slug}`} className="flex items-baseline justify-between gap-3 text-[1.125rem] font-semibold">
                <Link href={`/grammar-schools/${g.slug}`} className="text-ink no-underline hover:text-green">
                  {g.name}
                </Link>
                <span className="rounded-full bg-green-wash px-2 py-0.5 font-mono text-[0.8rem] text-green">{g.n}</span>
              </h3>
              {g.slug !== "northern-ireland" ? (
                <ul className="mt-2 border-t border-rule pt-1">
                  {g.las.map((a) => (
                    <li key={a.slug}>
                      <Link href={`/grammar-schools/${a.slug}`} className="group/ix flex items-baseline gap-2 py-1 text-[0.98rem] text-ink-2 no-underline hover:text-ink">
                        <span className="group-hover/ix:underline">{a.name}</span>
                        <span aria-hidden className="mb-1 flex-1 border-b border-dotted border-rule-strong" />
                        <span className="font-mono text-[0.82rem]">{a.n}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 border-t border-rule pt-2 text-[0.98rem] text-ink-2">One Education Authority covers every school.</p>
              )}
            </section>
          ))}
        </div>
      </Page>
    </>
  );
}
