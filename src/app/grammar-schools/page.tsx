import type { Metadata } from "next";
import Link from "next/link";
import { defaultEntryYear } from "@/lib/academic-year";
import { areaIndex, selectiveA8 } from "@/server/insights";
import { searchSchools, siteStats } from "@/server/schools";
import { parseDirectoryParams } from "@/server/search-params";
import { Breadcrumbs } from "@/ui/breadcrumbs";
import { DirectoryDesk } from "@/ui/directory/directory";
import { IconSearch } from "@/ui/icons";
import { controlClass, Kicker, Page, SectionHead } from "@/ui/kit";

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
      <div>
        <Page className="pt-6 pb-8 sm:pb-10">
          <Breadcrumbs items={[{ href: "/grammar-schools", label: "Grammar schools" }]} />
          <div className="mt-6 grid gap-x-12 gap-y-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-end">
            <div className="min-w-0">
              <Kicker>Directory · {stats.listed} schools</Kicker>
              <h1 className="mt-3 text-h1 [font-variation-settings:'opsz'_60]">Grammar schools in the UK</h1>
              <p className="mt-3 max-w-[44rem] text-lede leading-[1.5] text-ink-2">Every state grammar school in England and Northern Ireland, from official records. Search by name or town, then narrow by test, gender and admissions rules.</p>
              <form method="get" action="/grammar-schools" role="search" className="mt-6 flex max-w-[40rem] gap-2">
                {p.view ? <input type="hidden" name="view" value={p.view} /> : null}
                <label htmlFor="dir-q" className="sr-only">
                  Search by school name or town
                </label>
                <span className="relative block min-w-0 flex-1">
                  <IconSearch size={18} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-2" />
                  <input id="dir-q" name="q" type="search" defaultValue={p.q} placeholder="School name, town or postcode" className={`${controlClass} min-h-12 pl-10`} />
                </span>
                <button type="submit" className="inline-flex min-h-12 shrink-0 items-center rounded-[5px] bg-green px-4 font-semibold text-paper hover:bg-green-deep">
                  Search
                </button>
              </form>
            </div>
            <dl className="grid grid-cols-3 border-t border-ink pt-3 lg:grid-cols-1 lg:gap-0 lg:border-t-0 lg:pt-0">
              {[
                [stats.england, "grammar schools in England"],
                [stats.partial, "partially selective, England"],
                [stats.ni, "grammar schools in Northern Ireland"],
              ].map(([v, l]) => (
                <div key={l as string} className="lg:flex lg:items-baseline lg:gap-3 lg:border-b lg:border-rule lg:py-2">
                  <dt className="sr-only">{l}</dt>
                  <dd className="font-display text-[1.7rem] leading-none text-ink num lg:w-14 lg:text-right">{v}</dd>
                  <dd className="mt-1 text-small text-ink-2 lg:mt-0">{l}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Page>
      </div>

      <Page className="pt-8 pb-4">
        <DirectoryDesk p={p} result={result} basePath="/grammar-schools" entryYear={entryYear} bench={bench} />
      </Page>

      <Page as="section" className="pt-16 pb-6">
        <SectionHead id="by-area" kicker="Atlas index" title="Browse by area" lede="Each local authority with at least one grammar school, grouped by region. Numbers are schools listed." />
        <div className="mt-8 columns-1 gap-x-10 sm:columns-2 lg:columns-3">
          {index.map((g) => (
            <section key={g.slug} aria-labelledby={`ix-${g.slug}`} className="mb-8 break-inside-avoid">
              <h3 id={`ix-${g.slug}`} className="flex items-baseline justify-between border-b border-ink pb-1.5 text-[1.2rem]">
                <Link href={`/grammar-schools/${g.slug}`} className="text-ink no-underline hover:text-green hover:underline">
                  {g.name}
                </Link>
                <span className="font-mono text-[0.85rem] text-ink-2">{g.n}</span>
              </h3>
              {g.slug !== "northern-ireland" ? (
                <ul className="mt-1.5">
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
                <p className="mt-2 text-[0.98rem] text-ink-2">One Education Authority covers every school.</p>
              )}
            </section>
          ))}
        </div>
      </Page>
    </>
  );
}
