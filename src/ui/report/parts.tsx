import Link from "next/link";
import { clsx } from "clsx";
import type { ReactNode } from "react";
import { CATCHMENT_LABEL, OUT_OF_AREA_LABEL } from "@/domain/labels";
import { formatDate } from "@/lib/format";
import type { PolicyWithRules, SourceRef } from "@/server/profile";
import { IconArrow } from "../icons";
import { Disclosure, Gap, Source } from "../kit";
import { Status } from "../status";
import { ContentsRail } from "./chrome";

/** Chapter page frame: an "in this chapter" rail beside the report text. */
export function ReportBody({ contents, children }: { contents: { id: string; label: string }[]; children: ReactNode }) {
  return (
    <div className="container-page grid grid-cols-[minmax(0,1fr)] gap-x-10 pt-5 pb-10 sm:pt-8 sm:pb-12 lg:grid-cols-[12.5rem_minmax(0,1fr)]">
      <aside className="hidden lg:block" data-no-print>
        <div className="sticky top-[calc(var(--header-h)+4.5rem)]">
          <ContentsRail items={contents} />
        </div>
      </aside>
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-9 sm:gap-12">{children}</div>
    </div>
  );
}

/** Opening of a chapter: what it covers, and any controls (such as the year). */
export function ChapterIntro({ kicker, title, lede, aside }: { kicker: string; title: string; lede: ReactNode; aside?: ReactNode }) {
  return (
    <header className="grid gap-4 border-b border-rule pb-6 sm:gap-6 sm:pb-8 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
      <div className="max-w-[44rem]">
        <p className="label text-copper-ink">{kicker}</p>
        <h2 className="mt-2 text-h1">{title}</h2>
        <p className="mt-3 text-lede leading-[1.5] text-ink">{lede}</p>
      </div>
      {aside ? <div>{aside}</div> : null}
    </header>
  );
}

/** A lettered report section. */
export function RSection({ id, mark, title, lede, action, children, className }: { id: string; mark?: string; title: ReactNode; lede?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section aria-labelledby={id} className={clsx("scroll-mt-[calc(var(--header-h)+4rem)]", className)}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-t border-rule pt-4 sm:mb-6 sm:gap-y-3 sm:pt-5">
        <div className="max-w-[46rem] min-w-0">
          <h2 id={id} className="flex items-start gap-3 text-h3 sm:gap-4">
            {mark ? (
              <span aria-hidden className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-green-wash font-mono text-[0.8rem] font-medium text-green">
                {mark}
              </span>
            ) : null}
            <span className="min-w-0">{title}</span>
          </h2>
          {/* On phones the lede runs full width; from sm it aligns with the title. */}
          {lede ? <p className={clsx("mt-1.5 text-[1.02rem] leading-relaxed text-ink-2", mark && "sm:pl-11")}>{lede}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function ChapterLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="group/cl inline-flex items-center gap-1.5 text-[0.98rem] font-semibold text-green no-underline">
      <span className="underline decoration-green/40 underline-offset-4 group-hover/cl:decoration-current">{children}</span>
      <IconArrow size={15} className="transition-transform duration-[var(--d-2)] group-hover/cl:translate-x-1" />
    </Link>
  );
}

/** Entry-year switch. Rules belong to one September, so the year is always explicit. */
export function YearPicker({ years, selected, basePath, extraQuery }: { years: number[]; selected: number; basePath: string; extraQuery?: string }) {
  return (
    <nav aria-label="Admission year">
      <p className="label mb-2">Entry in September</p>
      <ul className="flex overflow-hidden rounded-[5px] border border-control bg-card">
        {years.map((y) => (
          <li key={y} className="border-r border-control last:border-r-0">
            <Link
              href={`${basePath}?${extraQuery ? `${extraQuery}&` : ""}year=${y}`}
              aria-current={y === selected ? "true" : undefined}
              className={clsx("grid h-11 min-w-[4.5rem] place-items-center px-3 font-mono text-[0.95rem] no-underline transition-colors", y === selected ? "bg-ink text-paper" : "text-ink-2 hover:bg-paper hover:text-ink")}
            >
              {y}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Qualify → ranked → offer, as a one-line reminder that links to the full explanation. */
export function StepsStrip() {
  const steps = ["Meet the test standard", "Ranked under the criteria", "Offer, if places remain"];
  return (
    <ol aria-label="Qualifying is not the same as getting a place" className="grid overflow-hidden rounded-[6px] border border-rule bg-card sm:grid-cols-3">
      {steps.map((s, i) => (
        <li key={s} className="relative flex items-center gap-3 border-b border-rule px-4 py-3 last:border-b-0 sm:border-r sm:border-b-0 sm:last:border-r-0">
          <span className="grid size-7 shrink-0 place-items-center rounded-full border border-green/40 font-mono text-[0.8rem] text-green">{i + 1}</span>
          <span className="text-[0.98rem] font-semibold text-ink">{s}</span>
        </li>
      ))}
    </ol>
  );
}

/** The year's admissions in four figures, with the policy summary and its source. */
export function AdmissionsGlance({ policy, sources, testName, testSlug }: { policy: PolicyWithRules; sources: Map<number, SourceRef>; testName: string | null; testSlug: string | null }) {
  const qual = policy.scoreRules.find((r) => r.kind === "qualifying_threshold");
  const doc = policy.sourceDocumentId ? sources.get(policy.sourceDocumentId) : null;
  const cells: { k: string; v: ReactNode; sub?: ReactNode }[] = [
    { k: "Qualifying score", v: qual?.scoreValue != null ? qual.scoreValue : "—", sub: qual?.scoreValue != null ? qual.scoreScale : "Not published in the policy" },
    { k: "Places", v: policy.publishedAdmissionNumber ?? "—", sub: policy.publishedAdmissionNumber ? "published admission number" : "Not recorded" },
    { k: "Criteria", v: policy.criteria.length || "—", sub: "ranked in order" },
    { k: "Catchment", v: <span className="font-sans text-[1.1rem] leading-snug font-semibold">{CATCHMENT_LABEL[policy.catchmentType]}</span> },
  ];
  return (
    <div className="overflow-hidden rounded-[8px] border border-rule bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule bg-paper px-5 py-3">
        <p className="font-semibold text-ink">{policy.cycle.label}</p>
        <Status status={policy.verificationStatus} />
      </div>
      <dl className="grid grid-cols-2 lg:grid-cols-4">
        {cells.map((c) => (
          <div key={c.k} className="border-r border-b border-rule px-5 py-4 even:border-r-0 lg:border-b-0 lg:even:border-r lg:last:border-r-0">
            <dt className="label">{c.k}</dt>
            <dd className="mt-2 font-display text-[2.1rem] leading-none text-ink num">{c.v}</dd>
            {c.sub ? <dd className="mt-1.5 text-small text-ink-2">{c.sub}</dd> : null}
          </div>
        ))}
      </dl>
      <div className="border-t border-rule px-5 py-4">
        <dl className="grid gap-x-8 gap-y-3 text-[1rem] sm:grid-cols-2">
          <div>
            <dt className="text-small text-ink-2">Entrance test</dt>
            <dd className="font-semibold text-ink">
              {testName ? (
                testSlug ? (
                  <Link className="a" href={`/11-plus/${testSlug}`}>
                    {testName}
                  </Link>
                ) : (
                  testName
                )
              ) : (
                "Not recorded"
              )}
            </dd>
          </div>
          <div>
            <dt className="text-small text-ink-2">Families outside the priority area</dt>
            <dd className="font-semibold text-ink">{OUT_OF_AREA_LABEL[policy.outOfAreaRoute]}</dd>
          </div>
          {policy.determinedOn ? (
            <div>
              <dt className="text-small text-ink-2">Policy determined</dt>
              <dd className="font-semibold text-ink">{formatDate(policy.determinedOn)}</dd>
            </div>
          ) : null}
        </dl>
        {policy.summary ? <p className="mt-4 max-w-[68ch] text-[1.02rem] leading-relaxed text-ink-2">{policy.summary}</p> : null}
        <Source source={doc} locator={policy.sourceLocator} checkedAt={policy.lastCheckedAt} />
      </div>
    </div>
  );
}

export function NoPolicy({ schoolName, entryYear, website, otherYears }: { schoolName: string; entryYear: number; website?: string | null; otherYears: number[] }) {
  return (
    <Gap title={`We don't hold verified admissions rules for September ${entryYear} entry yet`}>
      <p>Every admission authority must publish its determined arrangements. We add a school&apos;s rules only after reading the official document, and we never fill a gap with another year&apos;s rules.</p>
      {otherYears.length ? <p className="mt-2">We hold rules for {otherYears.map((y) => `September ${y}`).join(", ")} — use the year switch.</p> : null}
      <ul className="mt-3 grid gap-1">
        {website ? (
          <li>
            <a href={website} rel="noopener noreferrer" target="_blank">
              Read {schoolName}&apos;s admissions arrangements on its website
            </a>
          </li>
        ) : null}
        <li>
          <Link href="/corrections">Send us the policy link</Link> — an editor will review it.
        </li>
      </ul>
    </Gap>
  );
}

export function PolicyDetails({ policy }: { policy: PolicyWithRules }) {
  const rows: [string, string | null][] = [
    ["How the test is used", policy.qualificationSummary],
    ["Catchment and residence", policy.catchmentSummary],
    ["How distance is measured", policy.distanceMethod],
    ["Home address rules", policy.addressRules],
    ["Waiting list", policy.waitingList],
    ["Appeals", policy.appeals],
    ["Supplementary form", policy.supplementaryForm],
    ["Late applications", policy.lateApplications],
    ["Joining in other year groups", policy.inYearAdmissions],
  ];
  const shown = rows.filter(([, v]) => v);
  if (!shown.length) return <p className="text-ink-2">The policy&apos;s other rules have not been recorded in structured form yet.</p>;
  return (
    <div className="border-t border-rule">
      {shown.map(([k, v], i) => (
        <Disclosure key={k} summary={k} open={i === 0}>
          <p className="max-w-[68ch]">{v}</p>
        </Disclosure>
      ))}
    </div>
  );
}

/** Small "facts" ledger used in the report's side panel. */
export function FactsPanel({ title, rows, footer }: { title: string; rows: [string, ReactNode][]; footer?: ReactNode }) {
  return (
    <div className="rounded-[8px] border border-rule bg-card p-5">
      <p className="label">{title}</p>
      <dl className="mt-3 divide-y divide-rule">
        {rows.map(([k, v]) => (
          <div key={k} className="grid grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] gap-3 py-2">
            <dt className="text-[0.95rem] text-ink-2">{k}</dt>
            <dd className="text-[0.95rem] font-semibold text-ink">{v}</dd>
          </div>
        ))}
      </dl>
      {footer}
    </div>
  );
}
