import Link from "next/link";
import { clsx } from "clsx";
import { CRITERION_LABEL, EVENT_TYPE_LABEL, REPORT_CARD_SCALE } from "@/domain/labels";
import { formatWeekdayDate } from "@/lib/format";
import type { PolicyWithRules } from "@/server/profile";
import { IconChevron, IconExternal } from "../icons";
import { Status } from "../status";
import { Tag } from "../kit";

/* ───────────────── Priority ladder ───────────────── */

/**
 * The school's oversubscription order as a ladder: a qualification gate at the
 * top, numbered rungs filled in turn, and the tie-break as the base.
 * Every rung is the policy's own wording with its reference.
 */
export function PriorityLadder({ policy, testName }: { policy: PolicyWithRules; testName?: string | null }) {
  const gate = policy.scoreRules.find((r) => r.kind === "qualifying_threshold");
  if (!policy.criteria.length) {
    return <p className="text-ink-2">The oversubscription criteria for this year have not been recorded in structured form yet.</p>;
  }
  return (
    <div className="relative">
      {gate ? (
        <div className="mb-3 flex items-start gap-4 rounded-[6px] border border-copper/50 bg-copper-wash px-4 py-3.5">
          <span aria-hidden className="mt-0.5 grid h-9 w-11 shrink-0 place-items-center rounded-[4px] border border-copper bg-card font-mono text-[0.78rem] font-medium text-copper-ink">
            GATE
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-ink">
              Meet the qualifying standard{gate.scoreValue != null ? `: ${gate.scoreValue}` : ""}
              {testName ? <span className="font-normal text-ink-2"> in the {testName}</span> : null}
            </p>
            <p className="mt-0.5 text-[0.98rem] text-ink-2">{gate.description ?? "Only children who meet the standard are ranked below."}</p>
            {gate.sourceLocator ? <p className="mt-1 font-mono text-[0.8rem] text-ink-2">Policy reference: {gate.sourceLocator}</p> : null}
          </div>
        </div>
      ) : null}
      <ol className="relative">
        <span aria-hidden className="absolute top-3 bottom-3 left-[21px] w-[2px] bg-[linear-gradient(var(--green-bright),var(--rule-strong))]" />
        {policy.criteria.map((c) => (
          <li key={c.id} className="relative">
            <details className="group/rung">
              <summary className="relative flex min-h-14 list-none items-start gap-4 rounded-[5px] py-2.5 pr-2 transition-colors duration-[var(--d-1)] hover:bg-card">
                <span className="relative z-10 grid size-[44px] shrink-0 place-items-center rounded-[5px] border border-green/40 bg-card font-mono text-[0.95rem] font-medium text-green shadow-[0_0_0_4px_var(--paper)] transition-colors duration-[var(--d-2)] group-open/rung:border-green group-open/rung:bg-green group-open/rung:text-paper">
                  {c.rank}
                </span>
                <span className="min-w-0 flex-1 pt-1">
                  <span className="label block text-[0.75rem]">{CRITERION_LABEL[c.category] ?? c.category}</span>
                  <span className="mt-0.5 block text-[1.06rem] leading-snug font-semibold text-ink">{c.title}</span>
                  {c.placesReserved || c.requiresQualification === false ? (
                    <span className="mt-1.5 flex flex-wrap gap-1.5">
                      {c.placesReserved ? <Tag tone="green">Up to {c.placesReserved} places</Tag> : null}
                      {c.requiresQualification === false ? <Tag tone="copper">Different score rule</Tag> : null}
                    </span>
                  ) : null}
                </span>
                <IconChevron size={18} className="mt-3 shrink-0 text-ink-2 transition-transform duration-[var(--d-2)] group-open/rung:rotate-180" />
              </summary>
              <div className="anim-rise ml-[60px] border-l border-dashed border-rule-strong pb-3 pl-4 text-[1.02rem] leading-relaxed text-ink-2">
                {c.description ? <p>{c.description}</p> : <p>The policy gives no further detail for this criterion.</p>}
                <p className="mt-1.5 font-mono text-[0.8rem]">Policy reference: {c.sourceLocator ?? "—"}</p>
              </div>
            </details>
          </li>
        ))}
      </ol>
      {policy.tieBreak ? (
        <div className="mt-3 rounded-[6px] border border-rule bg-card px-4 py-3.5">
          <p className="label">Tie-break inside every rung</p>
          <p className="mt-1 text-[1.02rem] leading-relaxed text-ink">{policy.tieBreak}</p>
        </div>
      ) : null}
    </div>
  );
}

/* ───────────────── Inspection report card scale ───────────────── */

export function ReportCardScale({ grade }: { grade: string }) {
  const idx = REPORT_CARD_SCALE.indexOf(grade as (typeof REPORT_CARD_SCALE)[number]);
  return (
    <span className="inline-flex items-center gap-2.5">
      <span aria-hidden className="flex gap-[3px]">
        {[...REPORT_CARD_SCALE].reverse().map((g, i) => {
          const filled = idx >= 0 && REPORT_CARD_SCALE.length - 1 - i >= idx;
          return <span key={g} className={clsx("h-3 w-4 rounded-[1px]", filled ? "bg-green-bright" : "border border-rule-strong bg-card")} />;
        })}
      </span>
      <span className="font-semibold text-ink">{grade}</span>
    </span>
  );
}

/* ───────────────── Date timeline ───────────────── */

export interface DateRow {
  id: number;
  title: string;
  description?: string | null;
  event_type: string;
  starts_on: string;
  ends_on?: string | null;
  url?: string | null;
  verification_status: string;
  test_name?: string | null;
  context?: React.ReactNode;
}

/** Vertical timeline with a "today" marker between past and upcoming dates. */
export function DateLine({ events, today, emptyText }: { events: DateRow[]; today: string; emptyText?: string }) {
  if (!events.length) return emptyText ? <p className="text-ink-2">{emptyText}</p> : null;
  const firstFuture = events.findIndex((e) => (e.ends_on ?? e.starts_on) >= today);
  return (
    <ol className="relative">
      <span aria-hidden className="absolute top-2 bottom-2 left-[5.25rem] w-px bg-rule-strong sm:left-[6.5rem]" />
      {events.map((e, i) => {
        const past = (e.ends_on ?? e.starts_on) < today;
        const d = new Date(`${e.starts_on}T12:00:00Z`);
        return (
          <li key={e.id} className="relative">
            {i === firstFuture && firstFuture > 0 ? (
              <div className="relative my-3 flex items-center gap-3" aria-label="Today">
                <span className="w-[4.5rem] text-right font-mono text-[0.78rem] text-copper-ink sm:w-[5.75rem]">TODAY</span>
                <span className="relative z-10 size-3 rounded-full bg-copper ring-4 ring-paper" />
                <span className="h-px flex-1 bg-copper/50" />
              </div>
            ) : null}
            <div className={clsx("grid grid-cols-[4.5rem_1.5rem_minmax(0,1fr)] gap-x-3 py-3 sm:grid-cols-[5.75rem_1.5rem_minmax(0,1fr)]", past && "opacity-70")}>
              <p className="text-right leading-tight">
                <span className="block font-display text-[1.7rem] leading-none text-ink num [font-variation-settings:'opsz'_48]">{d.toLocaleDateString("en-GB", { day: "numeric", timeZone: "Europe/London" })}</span>
                <span className="mt-1 block font-mono text-[0.78rem] text-ink-2 uppercase">{d.toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "Europe/London" })}</span>
              </p>
              <span aria-hidden className="relative z-10 mt-2 grid size-3 place-self-center self-start rounded-full border-2 border-green bg-paper" />
              <div className="min-w-0 pb-1">
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="label text-[0.75rem]">{EVENT_TYPE_LABEL[e.event_type] ?? "Key date"}</span>
                  {past ? <span className="label text-[0.75rem]">· passed</span> : null}
                </p>
                <p className="mt-1 text-[1.05rem] leading-snug font-semibold text-ink">{e.title}</p>
                <p className="mt-1 text-small text-ink-2">
                  {formatWeekdayDate(e.starts_on)}
                  {e.ends_on ? ` – ${formatWeekdayDate(e.ends_on)}` : ""}
                  {e.test_name ? ` · ${e.test_name}` : ""}
                </p>
                {e.context ? <div className="mt-1 text-small text-ink-2">{e.context}</div> : null}
                {e.description ? <p className="mt-1 text-small text-ink-2">{e.description}</p> : null}
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <Status status={e.verification_status} />
                  {e.url ? (
                    <a href={e.url} target="_blank" rel="noopener noreferrer" className="a inline-flex items-center gap-1 text-small">
                      Source document <IconExternal size={13} />
                      <span className="sr-only">(opens in a new tab)</span>
                    </a>
                  ) : null}
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Compact link list for "more like this" rails. */
export function RouteList({ items }: { items: { href: string; title: string; text?: string }[] }) {
  return (
    <ul className="divide-y divide-rule border-y border-rule">
      {items.map((i) => (
        <li key={i.href}>
          <Link href={i.href} className="group/rl flex items-start justify-between gap-4 py-3 no-underline">
            <span>
              <span className="block font-semibold text-ink group-hover/rl:text-green">{i.title}</span>
              {i.text ? <span className="block text-small text-ink-2">{i.text}</span> : null}
            </span>
            <span aria-hidden className="mt-1 text-ink-3 transition-transform duration-[var(--d-2)] group-hover/rl:translate-x-1 group-hover/rl:text-green">
              →
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
