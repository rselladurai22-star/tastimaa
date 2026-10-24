import Link from "next/link";
import { clsx } from "clsx";
import { Info, TriangleAlert } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

export function Container({ className, ...props }: ComponentProps<"div">) {
  return <div className={clsx("mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8", className)} {...props} />;
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={clsx("rounded-xl border border-line bg-surface shadow-[var(--shadow-sm)]", className)} {...props} />;
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={clsx("text-xs font-semibold tracking-[0.08em] text-accent-ink uppercase", className)}>{children}</p>;
}

export function SectionHeading({ id, title, description, action }: { id?: string; title: string; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="max-w-3xl">
        <h2 id={id} className="scroll-mt-28 text-2xl font-semibold sm:text-[1.7rem]">
          {title}
        </h2>
        {description ? <p className="mt-1.5 text-ink-2">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function ButtonLink({ href, variant = "primary", className, children, ...rest }: { href: string; variant?: "primary" | "secondary" | "ghost"; className?: string; children: ReactNode } & Omit<ComponentProps<typeof Link>, "href">) {
  return (
    <Link
      href={href}
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors",
        variant === "primary" && "bg-accent text-white hover:bg-accent-hover dark:text-[#0f1112]",
        variant === "secondary" && "border border-line-strong bg-surface text-ink hover:bg-surface-2",
        variant === "ghost" && "text-accent-ink hover:bg-accent-soft",
        className,
      )}
      {...rest}
    >
      {children}
    </Link>
  );
}

export function Callout({ tone = "info", title, children, className }: { tone?: "info" | "warn"; title?: string; children: ReactNode; className?: string }) {
  const Icon = tone === "warn" ? TriangleAlert : Info;
  return (
    <div className={clsx("flex gap-3 rounded-lg border p-4 text-sm", tone === "warn" ? "border-warn/30 bg-warn-soft" : "border-info/25 bg-info-soft", className)}>
      <Icon aria-hidden className={clsx("mt-0.5 size-4 shrink-0", tone === "warn" ? "text-warn" : "text-info")} />
      <div className="text-ink-2 [&_a]:text-accent-ink [&_a]:underline">
        {title ? <p className="mb-0.5 font-semibold text-ink">{title}</p> : null}
        {children}
      </div>
    </div>
  );
}

export function EmptyState({ title, children, icon }: { title: string; children?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-line-strong bg-surface-2/60 px-6 py-10 text-center">
      {icon ? <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-surface text-ink-3">{icon}</div> : null}
      <p className="font-semibold text-ink">{title}</p>
      {children ? <div className="mx-auto mt-1.5 max-w-xl text-sm text-ink-2">{children}</div> : null}
    </div>
  );
}

export function Stat({ label, value, sub, className }: { label: string; value: ReactNode; sub?: ReactNode; className?: string }) {
  return (
    <div className={clsx("min-w-0", className)}>
      <dt className="text-xs font-medium text-ink-3">{label}</dt>
      <dd className="mt-0.5 text-lg font-semibold text-ink">{value}</dd>
      {sub ? <dd className="text-xs text-ink-3">{sub}</dd> : null}
    </div>
  );
}

export function Pill({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={clsx("inline-flex items-center rounded-md border border-line bg-surface-2 px-2 py-0.5 text-xs font-medium text-ink-2", className)}>{children}</span>;
}
