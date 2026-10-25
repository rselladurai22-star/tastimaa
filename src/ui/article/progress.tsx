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
      <div ref={bar} className="h-full origin-left scale-x-0 bg-green" />
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
    <ol className="grid gap-1">
      {items.map((i) => (
        <li key={i.id}>
          <a
            href={`#${i.id}`}
            aria-current={i.id === active ? "location" : undefined}
            className={clsx("block py-[6px] text-[1rem] leading-[1.5] no-underline transition-colors duration-[var(--d-2)]", i.id === active ? "text-green" : "text-ink-3 hover:text-green")}
          >
            {i.label}
          </a>
        </li>
      ))}
    </ol>
  );
  return (
    <>
      <details className="group/toc rounded-[4px] bg-sage xl:hidden">
        <summary className="flex min-h-12 list-none items-center justify-between px-4 font-semibold text-ink">
          Table of contents
          <IconChevron size={18} className="text-ink-2 transition-transform duration-[var(--d-2)] group-open/toc:rotate-180" />
        </summary>
        <nav aria-label="Contents" className="px-4 pb-3">
          {list}
        </nav>
      </details>
      <nav aria-label="On this page" className="hidden xl:block">
        <p className="mb-2 text-[1rem] font-medium tracking-[2px] text-ink-2 uppercase">Table of contents</p>
        {list}
        <a href="#top" className="mt-5 inline-block text-small font-semibold text-ink-2 no-underline hover:text-green">
          ↑ Back to top
        </a>
      </nav>
    </>
  );
}
