import Link from "next/link";
import type { ReactNode } from "react";
import { formatDate } from "@/lib/format";
import { absoluteUrl, SITE } from "@/lib/site";
import { Breadcrumbs, type Crumb } from "../breadcrumbs";
import { IconArrow, IconExternal } from "../icons";
import { JsonLd } from "../json-ld";
import { ReadingProgress, Toc } from "./progress";

/** Section heading with a deep link that appears on hover or focus. */
export function DeepHeading({ id, children, n }: { id: string; children: ReactNode; n?: number }) {
  return (
    <h2 id={id} className="group/dh relative mt-16 mb-5 scroll-mt-[calc(var(--header-h)+1.5rem)] text-h2 first:mt-0">
      {n !== undefined ? (
        <span aria-hidden className="mb-2 block font-mono text-[0.8rem] font-normal tracking-[0.06em] text-copper-ink">
          § {String(n).padStart(2, "0")}
        </span>
      ) : null}
      {children}
      <a href={`#${id}`} className="ml-2 inline-block align-middle font-mono text-[0.9rem] text-ink-3 no-underline opacity-0 transition-opacity duration-[var(--d-1)] group-hover/dh:opacity-100 hover:text-green focus-visible:opacity-100">
        #<span className="sr-only">Link to this section</span>
      </a>
    </h2>
  );
}

export interface RelatedLink {
  href: string;
  title: string;
  text?: string;
  kicker?: string;
}

/**
 * Long-form article: reading progress, a contents rail with scroll-spy, deep-linked
 * sections, numbered sources and related reading. Emits Article structured data.
 */
export function ArticleShell({
  crumbs,
  kicker,
  title,
  lede,
  description,
  updated,
  sources,
  path,
  toc,
  children,
  related = [],
  next,
}: {
  crumbs: Crumb[];
  kicker: ReactNode;
  title: string;
  lede: ReactNode;
  description: string;
  updated: string;
  sources: { title: string; url: string }[];
  path: string;
  toc: { id: string; label: string }[];
  children: ReactNode;
  related?: RelatedLink[];
  next?: RelatedLink | null;
}) {
  return (
    <>
      <ReadingProgress target="article-body" />
      <div className="container-page pt-6 pb-20" id="top">
        <Breadcrumbs items={crumbs} />
        <header className="mt-8 max-w-[52rem]">
          <p className="label text-copper-ink">{kicker}</p>
          <h1 className="mt-3 text-h1 leading-[1.05] [font-variation-settings:'opsz'_72] sm:text-display">{title}</h1>
          <div className="mt-6 max-w-[44rem] text-lede leading-[1.55] text-ink-2 [&_strong]:font-semibold [&_strong]:text-ink">{lede}</div>
          <p className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-rule pt-3 font-mono text-[0.8rem] text-ink-2">
            <span>Reviewed {formatDate(updated)}</span>
            <span aria-hidden>·</span>
            <span>
              {toc.length} {toc.length === 1 ? "section" : "sections"}
            </span>
            {sources.length ? (
              <>
                <span aria-hidden>·</span>
                <a href="#sources" className="text-ink-2 hover:text-ink">
                  {sources.length} official {sources.length === 1 ? "source" : "sources"}
                </a>
              </>
            ) : null}
          </p>
        </header>

        <div className="mt-10 grid grid-cols-[minmax(0,1fr)] gap-x-16 gap-y-8 xl:grid-cols-[minmax(0,1fr)_15rem]">
          <div className="xl:order-2">
            <div className="xl:sticky xl:top-[calc(var(--header-h)+2rem)]">
              <Toc items={toc} />
            </div>
          </div>
          <article id="article-body" className="min-w-0 xl:order-1">
            <div className="prose-atlas max-w-[var(--measure)]">{children}</div>

            {next ? (
              <Link href={next.href} className="group/nx mt-16 flex max-w-[var(--measure)] items-center justify-between gap-6 rounded-[8px] border border-green bg-green px-6 py-5 text-paper no-underline transition-colors hover:bg-green-deep">
                <span>
                  <span className="label block text-[0.75rem] text-paper/80">{next.kicker ?? "Next"}</span>
                  <span className="mt-1 block font-display text-[1.35rem] leading-snug">{next.title}</span>
                </span>
                <IconArrow size={22} className="shrink-0 transition-transform duration-[var(--d-2)] group-hover/nx:translate-x-1" />
              </Link>
            ) : null}

            {sources.length ? (
              <section aria-labelledby="sources" className="mt-16 max-w-[var(--measure)] border-t border-ink pt-5">
                <h2 id="sources" className="label scroll-mt-[calc(var(--header-h)+1.5rem)] text-ink">
                  Official sources
                </h2>
                <ol className="mt-4 grid gap-3">
                  {sources.map((s, i) => (
                    <li key={s.url} className="grid grid-cols-[2rem_minmax(0,1fr)] text-[1rem]">
                      <span className="font-mono text-[0.85rem] text-ink-2">[{i + 1}]</span>
                      <a href={s.url} rel="noopener noreferrer" target="_blank" className="a [overflow-wrap:anywhere]">
                        {s.title}
                        <IconExternal size={13} className="ml-1 inline-block align-[-1px]" />
                        <span className="sr-only"> (opens in a new tab)</span>
                      </a>
                    </li>
                  ))}
                </ol>
              </section>
            ) : null}

            {related.length ? (
              <section aria-labelledby="related" className="mt-14">
                <h2 id="related" className="label text-ink">
                  Read next
                </h2>
                <ul className="mt-4 grid gap-px overflow-hidden rounded-[8px] border border-rule bg-rule sm:grid-cols-2 lg:grid-cols-3">
                  {related.map((r) => (
                    <li key={r.href} className="bg-card">
                      <Link href={r.href} className="group/rel flex h-full flex-col p-5 no-underline transition-colors hover:bg-paper">
                        {r.kicker ? <span className="label text-[0.72rem]">{r.kicker}</span> : null}
                        <span className="mt-1.5 font-display text-[1.2rem] leading-snug text-ink group-hover/rel:text-green">{r.title}</span>
                        {r.text ? <span className="mt-2 text-[0.95rem] leading-relaxed text-ink-2">{r.text}</span> : null}
                        <IconArrow size={16} className="mt-auto pt-3 text-ink-3 transition-transform duration-[var(--d-2)] group-hover/rel:translate-x-1 group-hover/rel:text-green" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </article>
        </div>
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
    </>
  );
}
