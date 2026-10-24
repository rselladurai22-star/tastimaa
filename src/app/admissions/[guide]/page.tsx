import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ADMISSIONS_GUIDES, getGuide } from "@/content/guides";
import { ArticleLayout } from "@/components/layout/article";
import { Card } from "@/components/ui/primitives";

type Props = { params: Promise<{ guide: string }> };

export function generateStaticParams() {
  return ADMISSIONS_GUIDES.map((g) => ({ guide: g.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const g = getGuide((await params).guide);
  if (!g) return {};
  return { title: g.title, description: g.description, alternates: { canonical: `/admissions/${g.slug}` }, openGraph: { type: "article", title: g.title, description: g.description } };
}

export default async function GuidePage({ params }: Props) {
  const g = getGuide((await params).guide);
  if (!g) notFound();
  return (
    <ArticleLayout
      crumbs={[{ href: "/admissions", label: "Admissions guide" }, { href: `/admissions/${g.slug}`, label: g.title }]}
      title={g.title}
      description={g.description}
      updated={g.updated}
      sources={g.sources}
      path={`/admissions/${g.slug}`}
      aside={
        <Card className="p-5">
          <p className="text-sm font-semibold text-ink">More guides</p>
          <ul className="mt-2 grid gap-1.5 text-sm">
            {ADMISSIONS_GUIDES.filter((x) => x.slug !== g.slug).map((x) => (
              <li key={x.slug}>
                <Link href={`/admissions/${x.slug}`} className="text-ink-2 hover:text-ink hover:underline">
                  {x.title}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      }
    >
      {g.body}
    </ArticleLayout>
  );
}
