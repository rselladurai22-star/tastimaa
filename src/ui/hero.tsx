import type { ReactNode } from "react";
import { clsx } from "clsx";
import { Breadcrumbs, type Crumb } from "./breadcrumbs";

/**
 * The navy band at the top of a page. It slides up behind the floating header
 * and ends in a soft cloud edge. Inside it the colour tokens switch to
 * light-on-navy (see `[data-hero]` in globals.css); wrap any white card placed
 * on it in `on-light`.
 */
export function Hero({ children, className, edge = true }: { children: ReactNode; className?: string; edge?: boolean }) {
  return (
    <section data-hero className="relative -mt-[var(--header-h)] overflow-hidden bg-[linear-gradient(165deg,#0b1033_0%,#141a4d_45%,#1f2a78_100%)] pt-[var(--header-h)]">
      <div className={clsx("relative z-[1] container-page pt-6", edge ? "pb-24 sm:pb-32" : "pb-14", className)}>{children}</div>
      {edge ? (
        <svg aria-hidden data-no-print className="pointer-events-none absolute bottom-0 left-1/2 h-[5rem] w-[1100px] max-w-none -translate-x-1/2 sm:h-[7rem] sm:w-[1440px] lg:left-0 lg:h-[9rem] lg:w-full lg:translate-x-0" viewBox="0 0 1440 200" preserveAspectRatio="none">
          <path d="M0 120 C 90 70 210 70 290 105 C 350 40 520 30 600 95 C 690 50 820 60 860 110 C 930 30 1110 10 1190 85 C 1260 40 1380 55 1440 95 L1440 200 L0 200 Z" fill="#26318a" />
          <path d="M0 165 C 120 125 260 130 330 160 C 420 105 600 100 690 150 C 760 120 860 125 900 150 C 990 95 1180 90 1260 140 C 1330 115 1400 120 1440 135 L1440 200 L0 200 Z" fill="#ffffff" />
        </svg>
      ) : null}
    </section>
  );
}

/** The heading block inside a Hero: label, title, one-sentence summary, and an optional column of key figures. */
export function HeroHead({ kicker, title, lede, meta, aside, children }: { kicker?: ReactNode; title: ReactNode; lede?: ReactNode; meta?: ReactNode; aside?: ReactNode; children?: ReactNode }) {
  return (
    <div className="mt-8 grid gap-x-16 gap-y-8 sm:mt-10 lg:grid-cols-[minmax(0,1fr)_minmax(15rem,19rem)] lg:items-end">
      <div className="anim-rise max-w-[44rem] min-w-0">
        {kicker ? <p className="label text-[#a9bcff]">{kicker}</p> : null}
        <h1 className="mt-3 text-[clamp(2.1rem,1.6rem+2vw,2.9rem)] leading-[1.1] font-medium tracking-[-0.015em] text-white">{title}</h1>
        {lede ? <p className="mt-4 text-[1.125rem] leading-[1.55] text-ink-2">{lede}</p> : null}
        {meta ? <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-small text-ink-3">{meta}</div> : null}
        {children}
      </div>
      {aside ? <div className="min-w-0">{aside}</div> : null}
    </div>
  );
}

/** Key figures beside a HeroHead: a ruled column on wide screens, a row on narrow ones. */
export function HeroFigures({ items, footer }: { items: [ReactNode, ReactNode][]; footer?: ReactNode }) {
  return (
    <div className="lg:border-l lg:border-white/15 lg:pl-6">
      <dl className={clsx("grid gap-4 lg:grid-cols-1 lg:gap-0", items.length >= 3 ? "grid-cols-3" : "grid-cols-2")}>
        {items.map(([v, l], i) => (
          <div key={i} className="flex flex-col lg:border-b lg:border-white/15 lg:py-3 lg:first:pt-0">
            <dt className="order-2 text-[0.875rem] text-ink-3">{l}</dt>
            <dd className="order-1 text-[1.6rem] leading-tight font-semibold text-white num">{v}</dd>
          </div>
        ))}
      </dl>
      {footer ? <div className="mt-4 text-[0.875rem] text-ink-3 lg:mt-0 lg:pt-3">{footer}</div> : null}
    </div>
  );
}

/** The standard page top: breadcrumbs and heading on the navy band. */
export function PageHero({ crumbs, kicker, title, lede, meta, aside, children }: { crumbs: Crumb[]; kicker?: ReactNode; title: ReactNode; lede?: ReactNode; meta?: ReactNode; aside?: ReactNode; children?: ReactNode }) {
  return (
    <Hero>
      <Breadcrumbs items={crumbs} />
      <HeroHead kicker={kicker} title={title} lede={lede} meta={meta} aside={aside}>
        {children}
      </HeroHead>
    </Hero>
  );
}
