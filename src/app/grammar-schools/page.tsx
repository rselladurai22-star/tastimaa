import type { Metadata } from "next";
import Link from "next/link";
import { defaultEntryYear } from "@/lib/academic-year";
import { parseDirectoryParams } from "@/server/search-params";
import { listAreas, searchSchools } from "@/server/schools";
import { DirectoryView } from "@/components/search/directory-view";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Container } from "@/components/ui/primitives";

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
  const [result, las] = await Promise.all([searchSchools(p, { entryYear }), listAreas("local_authority")]);
  return (
    <Container className="py-8">
      <Breadcrumbs items={[{ href: "/grammar-schools", label: "Grammar schools" }]} />
      <header className="mt-4 mb-8 max-w-3xl">
        <h1 className="text-3xl font-semibold sm:text-4xl">Grammar schools in the UK</h1>
        <p className="mt-3 text-lg text-ink-2">
          Every state grammar school in England and Northern Ireland, from official records. Search by name, town or postcode, then narrow by test, gender and admissions rules.
        </p>
      </header>
      <DirectoryView p={p} result={result} basePath="/grammar-schools" entryYear={entryYear} />
      <section aria-labelledby="by-area" className="mt-16">
        <h2 id="by-area" className="text-2xl font-semibold">
          Browse by local authority
        </h2>
        <ul className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
          {las.map((a) => (
            <li key={a.slug}>
              <Link href={`/grammar-schools/${a.slug}`} className="link">
                {a.name}
              </Link>{" "}
              <span className="text-ink-3">({a.schools})</span>
            </li>
          ))}
        </ul>
      </section>
    </Container>
  );
}
