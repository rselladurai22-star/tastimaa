import Link from "next/link";
import { ArrowDown, CalendarDays, CircleAlert } from "lucide-react";
import { CATCHMENT_LABEL, CRITERION_LABEL, EVENT_TYPE_LABEL, OUT_OF_AREA_LABEL } from "@/domain/labels";
import { formatDate, formatWeekdayDate } from "@/lib/format";
import type { PolicyWithRules, SourceRef } from "@/server/profile";
import { Callout, Card, Pill } from "@/components/ui/primitives";
import { SourceNote } from "@/components/ui/source-note";
import { VerificationBadge } from "@/components/ui/verification";

export function YearPicker({ years, selected, basePath, extraQuery }: { years: number[]; selected: number; basePath: string; extraQuery?: string }) {
  return (
    <nav aria-label="Admission year" className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-ink-3">Entry in September</span>
      <ul className="flex rounded-lg border border-line bg-surface p-0.5">
        {years.map((y) => (
          <li key={y}>
            <Link
              href={`${basePath}?${extraQuery ? `${extraQuery}&` : ""}year=${y}`}
              aria-current={y === selected ? "true" : undefined}
              className={y === selected ? "block rounded-md bg-accent-soft px-3 py-1.5 font-semibold text-accent-ink" : "block rounded-md px-3 py-1.5 text-ink-2 hover:text-ink"}
            >
              {y}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** The three-step distinction shown wherever admissions are discussed. */
export function ThreeSteps({ compact = false }: { compact?: boolean }) {
  const steps = [
    ["Meet the test standard", "Reaching the qualifying score (or equivalent) makes a child eligible to be considered."],
    ["Rank under the admission criteria", "If more qualified children apply than there are places, the published criteria decide the order."],
    ["Receive an offer", "Offers are made by the council on national offer day, working down the ranked list until places run out."],
  ];
  return (
    <ol className={compact ? "grid gap-2 sm:grid-cols-3" : "grid gap-3 sm:grid-cols-3"} aria-label="Qualifying is not the same as getting a place">
      {steps.map(([t, d], i) => (
        <li key={t} className="rounded-lg border border-line bg-surface-2/60 p-3">
          <p className="text-xs font-semibold text-accent-ink">Step {i + 1}</p>
          <p className="mt-0.5 text-sm font-semibold text-ink">{t}</p>
          {!compact ? <p className="mt-1 text-xs text-ink-2">{d}</p> : null}
        </li>
      ))}
    </ol>
  );
}

export function NoPolicy({ schoolName, entryYear, website, otherYears }: { schoolName: string; entryYear: number; website?: string | null; otherYears: number[] }) {
  return (
    <Card className="p-6">
      <div className="flex items-start gap-3">
        <CircleAlert aria-hidden className="mt-0.5 size-5 shrink-0 text-ink-3" />
        <div>
          <h3 className="font-sans text-base font-semibold">We don&apos;t hold verified admissions rules for September {entryYear} entry yet</h3>
          <p className="mt-1 text-sm text-ink-2">
            Every admission authority must publish its determined arrangements on its website. We add each school&apos;s rules only after reading the official document, and we never fill gaps with another year&apos;s rules.
          </p>
          {otherYears.length ? <p className="mt-2 text-sm text-ink-2">We hold rules for: {otherYears.map((y) => `September ${y}`).join(", ")}. Use the year selector above.</p> : null}
          <ul className="mt-3 grid gap-1 text-sm">
            {website ? (
              <li>
                <a className="link" href={website} rel="noopener noreferrer" target="_blank">
                  Read {schoolName}&apos;s admissions arrangements on its website
                </a>
              </li>
            ) : null}
            <li>
              <Link className="link" href="/corrections">
                Send us the policy link
              </Link>{" "}
              — an editor will review it.
            </li>
          </ul>
        </div>
      </div>
    </Card>
  );
}

export function AdmissionsSummary({ policy, sources, testName, testSlug }: { policy: PolicyWithRules; sources: Map<number, SourceRef>; testName: string | null; testSlug: string | null }) {
  const qual = policy.scoreRules.find((r) => r.kind === "qualifying_threshold");
  const doc = policy.sourceDocumentId ? sources.get(policy.sourceDocumentId) : null;
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-sans text-base font-semibold">Admissions at a glance — {policy.cycle.label}</h3>
        <VerificationBadge status={policy.verificationStatus} />
      </div>
      {policy.summary ? <p className="mt-3 text-ink-2">{policy.summary}</p> : null}
      <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 text-sm lg:grid-cols-4">
        <div>
          <dt className="text-xs text-ink-3">Entrance test</dt>
          <dd className="font-semibold text-ink">
            {testName ? (
              testSlug ? (
                <Link className="link" href={`/11-plus/${testSlug}`}>
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
          <dt className="text-xs text-ink-3">Qualifying score</dt>
          <dd className="font-semibold text-ink">{qual?.scoreValue != null ? qual.scoreValue : "Not published in the policy"}</dd>
          {qual?.scoreScale ? <dd className="text-xs text-ink-3">{qual.scoreScale}</dd> : null}
        </div>
        <div>
          <dt className="text-xs text-ink-3">Published admission number</dt>
          <dd className="font-semibold text-ink">{policy.publishedAdmissionNumber ?? "Not recorded"}</dd>
          <dd className="text-xs text-ink-3">Year 7 places</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-3">Catchment</dt>
          <dd className="font-semibold text-ink">{CATCHMENT_LABEL[policy.catchmentType]}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-xs text-ink-3">Can families outside the priority area apply?</dt>
          <dd className="font-semibold text-ink">{OUT_OF_AREA_LABEL[policy.outOfAreaRoute]}</dd>
        </div>
        {policy.determinedOn ? (
          <div className="col-span-2">
            <dt className="text-xs text-ink-3">Policy determined</dt>
            <dd className="font-semibold text-ink">{formatDate(policy.determinedOn)}</dd>
          </div>
        ) : null}
      </dl>
      <SourceNote source={doc} locator={policy.sourceLocator} checkedAt={policy.lastCheckedAt} />
    </Card>
  );
}

/** Oversubscription criteria as an ordered decision path. */
export function CriteriaList({ policy, sources }: { policy: PolicyWithRules; sources: Map<number, SourceRef> }) {
  const doc = policy.sourceDocumentId ? sources.get(policy.sourceDocumentId) : null;
  if (!policy.criteria.length) return <p className="text-sm text-ink-2">The oversubscription criteria have not been recorded in structured form yet.</p>;
  return (
    <div>
      <p className="mb-4 text-sm text-ink-2">
        If more children who meet the entry requirement apply than there are places, places are offered in this order. Each step is filled before the next is considered.
      </p>
      <ol className="relative grid gap-0">
        {policy.criteria.map((c, i) => (
          <li key={c.id} className="relative">
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-accent/30 bg-accent-soft text-sm font-semibold text-accent-ink">{c.rank}</span>
                {i < policy.criteria.length - 1 ? <span aria-hidden className="w-px flex-1 bg-line-strong" /> : null}
              </div>
              <div className="min-w-0 flex-1 pb-5">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-ink">{c.title}</p>
                  <Pill>{CRITERION_LABEL[c.category] ?? c.category}</Pill>
                  {c.placesReserved ? <Pill>Up to {c.placesReserved} places</Pill> : null}
                  {c.requiresQualification === false ? <Pill className="!border-warn/40 !bg-warn-soft !text-warn">Different score rule</Pill> : null}
                </div>
                {c.description ? <p className="mt-1 text-sm text-ink-2">{c.description}</p> : null}
                <p className="mt-1 text-xs text-ink-3">Policy reference: {c.sourceLocator ?? "—"}</p>
              </div>
            </div>
            {i < policy.criteria.length - 1 ? <ArrowDown aria-hidden className="sr-only" /> : null}
          </li>
        ))}
      </ol>
      {policy.tieBreak ? (
        <div className="mt-2 rounded-lg border border-line bg-surface-2/60 p-4 text-sm">
          <p className="font-semibold text-ink">Tie-break within each criterion</p>
          <p className="mt-1 text-ink-2">{policy.tieBreak}</p>
        </div>
      ) : null}
      <SourceNote source={doc} locator="Oversubscription criteria" status={policy.verificationStatus} />
    </div>
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
  return (
    <div className="divide-y divide-line rounded-xl border border-line bg-surface">
      {rows
        .filter(([, v]) => v)
        .map(([k, v]) => (
          <details key={k} className="group px-5 py-4" open={k === "How the test is used"}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-ink [&::-webkit-details-marker]:hidden">
              {k}
              <span aria-hidden className="text-ink-3 transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="mt-2 text-sm text-ink-2">{v}</p>
          </details>
        ))}
    </div>
  );
}

export interface EventRow {
  id: number;
  title: string;
  description: string | null;
  event_type: string;
  starts_on: string;
  ends_on: string | null;
  url: string | null;
  entry_year: number;
  verification_status: string;
  test_name: string | null;
}

export function KeyDates({ events, entryYear, today, emptyText }: { events: EventRow[]; entryYear: number; today: string; emptyText?: string }) {
  const rows = events.filter((e) => e.entry_year === entryYear);
  if (!rows.length) {
    return <Callout>{emptyText ?? `We don't hold verified dates for September ${entryYear} entry for this school yet. Dates are only shown once taken from an official source.`}</Callout>;
  }
  return (
    <ol className="divide-y divide-line rounded-xl border border-line bg-surface">
      {rows.map((e) => {
        const past = (e.ends_on ?? e.starts_on) < today;
        return (
          <li key={e.id} className={past ? "flex gap-4 bg-surface-2/60 px-5 py-4" : "flex gap-4 px-5 py-4"}>
            <CalendarDays aria-hidden className="mt-0.5 size-5 shrink-0 text-accent-ink" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-ink">{e.title}</p>
                <Pill>{EVENT_TYPE_LABEL[e.event_type] ?? "Key date"}</Pill>
                {past ? <Pill>Passed</Pill> : null}
                <VerificationBadge status={e.verification_status} />
              </div>
              <p className="mt-0.5 text-sm text-ink-2">
                {formatWeekdayDate(e.starts_on)}
                {e.ends_on ? ` – ${formatWeekdayDate(e.ends_on)}` : ""}
                {e.test_name ? ` · ${e.test_name}` : ""}
              </p>
              {e.description ? <p className="mt-1 text-sm text-ink-3">{e.description}</p> : null}
              {e.url ? (
                <a href={e.url} className="mt-1 inline-block text-xs link" rel="noopener noreferrer" target="_blank">
                  Official source
                </a>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
