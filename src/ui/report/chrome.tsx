"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { clsx } from "clsx";
import { IconPrint } from "../icons";

/** Numbered chapter bar for a school report; sticks under the site header. */
export function ChapterNav({ slug, chapters }: { slug: string; chapters: { href: string; label: string }[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="School report chapters" className="sticky top-[var(--header-h)] z-30 border-b border-rule bg-paper/95 backdrop-blur-md supports-[backdrop-filter]:bg-paper/85" data-no-print>
      <div className="relative container-page overflow-x-auto [scrollbar-width:none]">
        <ol className="flex min-w-max">
          {chapters.map((c, i) => {
            const href = `/schools/${slug}${c.href}`;
            const active = pathname === href;
            return (
              <li key={c.href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={clsx(
                    "relative flex min-h-12 items-center gap-2 px-3 text-[0.95rem] whitespace-nowrap no-underline transition-colors duration-[var(--d-1)] first:pl-0",
                    active ? "font-semibold text-ink" : "text-ink-2 hover:text-ink",
                  )}
                >
                  <span aria-hidden className={clsx("font-mono text-[0.75rem]", active ? "text-copper-ink" : "text-ink-3")}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {c.label}
                  <span aria-hidden className={clsx("absolute right-3 bottom-0 left-3 h-[2px] origin-left bg-copper transition-transform duration-[var(--d-3)] ease-[var(--ease-out)] [li:first-child_&]:left-0", active ? "scale-x-100" : "scale-x-0")} />
                </Link>
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}

/** "In this chapter" rail with a reading position marker. */
export function ContentsRail({ items }: { items: { id: string; label: string }[] }) {
  const [active, setActive] = useState(items[0]?.id ?? "");
  useEffect(() => {
    const els = items.map((i) => document.getElementById(i.id)).filter((e): e is HTMLElement => !!e);
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -65% 0px" },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [items]);
  const idx = Math.max(0, items.findIndex((i) => i.id === active));
  return (
    <nav aria-label="In this chapter" className="relative">
      <p className="label mb-4 text-[0.95rem] text-ink">In this chapter</p>
      <ol className="relative border-l border-rule">
        <span aria-hidden className="absolute -left-px w-[2px] bg-copper transition-transform duration-[var(--d-3)] ease-[var(--ease-out)]" style={{ height: "2.25rem", transform: `translateY(${idx * 2.25}rem)` }} />
        {items.map((i) => (
          <li key={i.id}>
            <a href={`#${i.id}`} aria-current={i.id === active ? "location" : undefined} className={clsx("flex h-9 items-center truncate pl-4 text-[0.95rem] no-underline transition-colors", i.id === active ? "font-semibold text-ink" : "text-ink-2 hover:text-ink")}>
              {i.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="inline-flex min-h-11 items-center gap-2 rounded-[5px] border border-control bg-card px-3.5 text-[0.95rem] font-semibold text-ink hover:border-ink">
      <IconPrint size={17} />
      Print
    </button>
  );
}
