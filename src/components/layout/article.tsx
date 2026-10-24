import { formatDate } from "@/lib/format";
import { absoluteUrl, SITE } from "@/lib/site";
import { Breadcrumbs, type Crumb } from "@/components/ui/breadcrumbs";
import { Container } from "@/components/ui/primitives";
import { JsonLd } from "@/components/ui/json-ld";

export function ArticleLayout({ crumbs, title, description, updated, sources, path, children, aside }: { crumbs: Crumb[]; title: string; description: string; updated: string; sources: { title: string; url: string }[]; path: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <Container className="py-8">
      <Breadcrumbs items={crumbs} />
      <div className="mt-6 grid gap-12 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <article>
          <header className="max-w-3xl">
            <h1 className="text-3xl leading-tight font-semibold sm:text-4xl">{title}</h1>
            <p className="mt-3 text-lg text-ink-2">{description}</p>
            <p className="mt-3 text-xs text-ink-3">Last reviewed {formatDate(updated)}</p>
          </header>
          <div className="prose-gsi mt-8">{children}</div>
          {sources.length ? (
          <section aria-labelledby="sources" className="mt-12 max-w-3xl border-t border-line pt-6">
            <h2 id="sources" className="font-sans text-base font-semibold">
              Official sources
            </h2>
            <ul className="mt-2 grid gap-1 text-sm">
              {sources.map((s) => (
                <li key={s.url}>
                  <a href={s.url} className="link" rel="noopener noreferrer" target="_blank">
                    {s.title}
                  </a>
                </li>
              ))}
            </ul>
          </section>
          ) : null}
        </article>
        {aside ? <aside className="grid content-start gap-4">{aside}</aside> : null}
      </div>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: title,
          description,
          dateModified: updated,
          mainEntityOfPage: absoluteUrl(path),
          publisher: { "@type": "Organization", name: SITE.name, url: SITE.url },
          citation: sources.map((s) => s.url),
        }}
      />
    </Container>
  );
}
