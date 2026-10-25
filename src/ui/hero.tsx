import type { ReactNode } from "react";
import { clsx } from "clsx";
import { Breadcrumbs, type Crumb } from "./breadcrumbs";

/**
 * The top band of a page: a soft peach-to-pink glow behind the title,
 * the summary and the key figures.
 */
export function Hero({ children, className, edge = true }: { children: ReactNode; className?: string; edge?: boolean }) {
  return (
    <section data-hero className="relative overflow-hidden bg-[radial-gradient(86%_80%_at_74%_31%,#fbddd5_8%,#fce4ec_38%,#fcfcfa_80%)]">
      <div className={clsx("relative z-[1] container-page pt-6", edge ? "pb-10 sm:pb-16" : "pb-8 sm:pb-10", className)}>{children}</div>
    </section>
  );
}

/** The heading block inside a Hero: label, title, one-sentence summary, and an optional column of key figures. */
export function HeroHead({ kicker, title, lede, meta, aside, children }: { kicker?: ReactNode; title: ReactNode; lede?: ReactNode; meta?: ReactNode; aside?: ReactNode; children?: ReactNode }) {
  return (
    <div className="mt-5 grid gap-x-12 gap-y-6 sm:mt-8 sm:gap-y-8 lg:grid-cols-[minmax(0,1fr)_minmax(15rem,19rem)] lg:items-end">
      <div className="anim-rise max-w-[44rem] min-w-0">
        {kicker ? <p className="label eyebrow">{kicker}</p> : null}
        <h1 className="mt-3 text-[clamp(1.875rem,1.45rem+1.8vw,2.5rem)] leading-[1.15] font-semibold tracking-[-0.02em] text-ink">{title}</h1>
        {lede ? <p className="mt-3 text-[1.0625rem] leading-[1.55] text-ink-2 sm:mt-4 sm:text-[1.125rem]">{lede}</p> : null}
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
    <div className="lg:border-l lg:border-rule lg:pl-6">
      <dl className={clsx("grid gap-4 lg:grid-cols-1 lg:gap-0", items.length >= 3 ? "grid-cols-3" : "grid-cols-2")}>
        {items.map(([v, l], i) => (
          <div key={i} className="flex flex-col lg:border-b lg:border-rule lg:py-3 lg:first:pt-0">
            <dt className="order-2 text-[0.8125rem] leading-snug text-ink-3 sm:text-[0.875rem]">{l}</dt>
            <dd className="order-1 font-display text-[1.625rem] leading-tight sm:text-[2rem] font-semibold text-ink num">{v}</dd>
          </div>
        ))}
      </dl>
      {footer ? <div className="mt-3 text-[0.8125rem] text-ink-3 sm:mt-4 sm:text-[0.875rem] lg:mt-0 lg:pt-3">{footer}</div> : null}
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
