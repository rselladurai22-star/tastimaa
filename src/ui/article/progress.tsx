"use client";

import { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import { IconChevron } from "../icons";

/** Thin reading-position bar under the header. Scales with transform only. */
export function ReadingProgress({ target }: { target: string }) {
  const bar = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = document.getElementById(target);
    if (!el) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const total = r.height - window.innerHeight * 0.6;
      const p = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 1;
      if (bar.current) bar.current.style.transform = `scaleX(${p})`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [target]);
  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-[var(--header-h)] z-30 h-[3px]" data-no-print>
      <div ref={bar} className="h-full origin-left scale-x-0 bg-copper" />
    </div>
  );
}

/** Contents with scroll-spy. Sticky rail on wide screens; a disclosure on small ones. */
export function Toc({ items }: { items: { id: string; label: string }[] }) {
  const [active, setActive] = useState(items[0]?.id ?? "");
  useEffect(() => {
    const els = items.map((i) => document.getElementById(i.id)).filter((e): e is HTMLElement => !!e);
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (vis[0]) setActive(vis[0].target.id);
      },
      { rootMargin: "-15% 0px -70% 0px" },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [items]);
  const list = (
    <ol className="grid gap-0.5">
      {items.map((i, n) => (
        <li key={i.id}>
          <a
            href={`#${i.id}`}
            aria-current={i.id === active ? "location" : undefined}
            className={clsx(
              "grid grid-cols-[1.75rem_minmax(0,1fr)] gap-1 rounded-[3px] py-1.5 text-[0.95rem] leading-snug no-underline transition-colors duration-[var(--d-1)]",
              i.id === active ? "font-semibold text-ink" : "text-ink-2 hover:text-ink",
            )}
          >
            <span className={clsx("font-mono text-[0.75rem] leading-[1.6rem]", i.id === active ? "text-copper-ink" : "text-ink-3")}>{String(n + 1).padStart(2, "0")}</span>
            <span>{i.label}</span>
          </a>
        </li>
      ))}
    </ol>
  );
  return (
    <>
      <details className="group/toc rounded-[6px] border border-rule bg-card xl:hidden">
        <summary className="flex min-h-12 list-none items-center justify-between px-4 font-semibold text-ink">
          Contents
          <IconChevron size={18} className="text-ink-2 transition-transform duration-[var(--d-2)] group-open/toc:rotate-180" />
        </summary>
        <nav aria-label="Contents" className="border-t border-rule px-4 pt-2 pb-3">
          {list}
        </nav>
      </details>
      <nav aria-label="On this page" className="hidden xl:block">
        <p className="label mb-3">On this page</p>
        {list}
        <a href="#top" className="mt-4 inline-block text-small text-ink-2 no-underline hover:text-ink">
          ↑ Back to top
        </a>
      </nav>
    </>
  );
}
