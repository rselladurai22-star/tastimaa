import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ADMISSIONS_GUIDES, getGuide, READING_PATHS } from "@/content/guides";
import { ArticleShell, DeepHeading } from "@/ui/article/article";
import { GuideFigureBlock } from "@/ui/viz/guide-figures";

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
  const path = ADMISSIONS_GUIDES.filter((x) => x.path === g.path);
  const pos = path.findIndex((x) => x.slug === g.slug);
  const nextInPath = path[pos + 1] ?? null;
  const related = g.related
    .map((slug) => getGuide(slug))
    .filter((x): x is NonNullable<typeof x> => !!x && x.slug !== nextInPath?.slug)
    .map((x) => ({ href: `/admissions/${x.slug}`, title: x.short, text: x.description, kicker: READING_PATHS[x.path].title }));
  const figureNo = new Map<string, number>();
  for (const s of g.sections) if (s.figure) figureNo.set(s.id, figureNo.size + 1);

  return (
    <ArticleShell
      crumbs={[
        { href: "/admissions", label: "Admissions guide" },
        { href: `/admissions/${g.slug}`, label: g.short },
      ]}
      kicker={`${READING_PATHS[g.path].title} · ${pos + 1} of ${path.length}`}
      title={g.title}
      lede={g.lede}
      description={g.description}
      updated={g.updated}
      sources={g.sources}
      path={`/admissions/${g.slug}`}
      toc={g.sections.map((s) => ({ id: s.id, label: s.title }))}
      next={nextInPath ? { href: `/admissions/${nextInPath.slug}`, title: nextInPath.title, kicker: `Next in “${READING_PATHS[g.path].title}”` } : { href: "/admissions", title: "All admissions guides", kicker: "End of this reading path" }}
      related={related}
    >
      {g.sections.map((s, i) => (
        <section key={s.id} aria-labelledby={s.id}>
          <DeepHeading id={s.id} n={i + 1}>
            {s.title}
          </DeepHeading>
          {s.body}
          {s.figure ? <GuideFigureBlock figure={s.figure} n={figureNo.get(s.id)!} /> : null}
        </section>
      ))}
    </ArticleShell>
  );
}
