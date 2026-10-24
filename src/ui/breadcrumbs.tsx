import Link from "next/link";
import { clsx } from "clsx";
import { absoluteUrl } from "@/lib/site";
import { JsonLd } from "./json-ld";

export interface Crumb {
  href: string;
  label: string;
}

/** Trail set in mono with slashes, like a path through the atlas. */
export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  const all = [{ href: "/", label: "Atlas" }, ...items];
  return (
    <>
      <nav aria-label="Breadcrumb" className={clsx("font-mono text-[0.82rem] text-ink-2", className)}>
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {all.map((c, i) => (
            <li key={c.href} className="flex min-w-0 items-center gap-2">
              {i > 0 ? (
                <span aria-hidden className="text-rule-strong">
                  /
                </span>
              ) : null}
              {i === all.length - 1 ? (
                <span aria-current="page" className="truncate text-ink">
                  {c.label}
                </span>
              ) : (
                <Link href={c.href} className="truncate underline decoration-transparent underline-offset-4 transition-colors hover:text-ink hover:decoration-current">
                  {c.label}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [{ href: "/", label: "Home" }, ...items].map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.label, item: absoluteUrl(c.href) })),
        }}
      />
    </>
  );
}
