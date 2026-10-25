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
        <div className="relative mb-4 flex items-stretch overflow-hidden rounded-[14px] bg-[linear-gradient(135deg,#fff0f6,#ffe1ee)] shadow-[0_1px_1px_rgb(230_0_103/0.08),0_10px_24px_-14px_rgb(230_0_103/0.45)]">
          <span aria-hidden className="relative grid w-[5.5rem] shrink-0 place-items-center border-r-2 border-dashed border-copper/40 bg-copper text-white">
            <span className="text-center leading-none">
              <span className="block text-[0.7rem] font-bold tracking-[0.12em]">CHECK-IN</span>
              <span className="mt-1 block text-[1.35rem] font-bold">GATE</span>
            </span>
            <span className="absolute -top-2 -right-2 size-4 rounded-full bg-paper" />
            <span className="absolute -right-2 -bottom-2 size-4 rounded-full bg-paper" />
          </span>
          <div className="min-w-0 px-5 py-4">
            <p className="font-semibold text-ink">
              Meet the qualifying standard{gate.scoreValue != null ? `: ${gate.scoreValue}` : ""}
              {testName ? <span className="font-normal text-ink-2"> in the {testName}</span> : null}
            </p>
            <p className="mt-0.5 text-[0.98rem] text-ink-2">{gate.description ?? "Only children who meet the standard are ranked below."}</p>
            {gate.sourceLocator ? <p className="mt-1 font-mono text-[0.8rem] text-ink-2">Policy reference: {gate.sourceLocator}</p> : null}
          </div>
        </div>
      ) : null}
      {/* Boarding passes: group 1 is offered places first, then group 2, and so on. */}
      <ol className="relative grid gap-3">
        {policy.criteria.map((c, i) => (
          <li key={c.id} className="relative">
            <details className="group/rung overflow-hidden rounded-[14px] bg-card shadow-[0_1px_1px_rgb(44_11_142/0.05),0_6px_14px_-6px_rgb(44_11_142/0.14),0_18px_36px_-20px_rgb(44_11_142/0.22)] transition-shadow open:shadow-[0_1px_1px_rgb(44_11_142/0.05),0_10px_24px_-8px_rgb(44_11_142/0.22)]">
              <summary className="relative flex min-h-16 list-none items-stretch gap-4 pr-3 transition-colors duration-[var(--d-1)] hover:bg-sage/50">
                <span
                  className="relative grid w-[5.5rem] shrink-0 place-items-center border-r-2 border-dashed border-white/50 text-white"
                  style={{ background: `linear-gradient(160deg, color-mix(in srgb, var(--green) ${100 - Math.min(i, 5) * 6}%, #8f8fff), color-mix(in srgb, var(--green-deep) ${100 - Math.min(i, 5) * 6}%, #8f8fff))` }}
                >
                  <span className="text-center leading-none">
                    <span className="block text-[0.7rem] font-bold tracking-[0.12em]">GROUP</span>
                    <span className="mt-1 block text-[1.6rem] font-bold">{c.rank}</span>
                  </span>
                  <span aria-hidden className="absolute -top-2 -right-2 size-4 rounded-full bg-paper" />
                  <span aria-hidden className="absolute -right-2 -bottom-2 size-4 rounded-full bg-paper" />
                </span>
                <span className="min-w-0 flex-1 py-3">
                  <span className="label block text-[0.75rem]">{CRITERION_LABEL[c.category] ?? c.category}</span>
                  <span className="mt-0.5 block text-[1.06rem] leading-snug font-semibold text-ink">{c.title}</span>
                  {c.placesReserved || c.requiresQualification === false ? (
                    <span className="mt-1.5 flex flex-wrap gap-1.5">
                      {c.placesReserved ? <Tag tone="green">Up to {c.placesReserved} places</Tag> : null}
                      {c.requiresQualification === false ? <Tag tone="copper">Different score rule</Tag> : null}
                    </span>
                  ) : null}
                </span>
                {i === 0 ? <span className="mt-3 hidden h-fit shrink-0 rounded-full bg-green-wash px-2.5 py-1 text-[0.8rem] font-semibold text-green sm:inline">Offered places first</span> : null}
                <IconChevron size={18} className="mt-4 shrink-0 text-ink-2 transition-transform duration-[var(--d-2)] group-open/rung:rotate-180" />
              </summary>
              <div className="anim-rise ml-[6.5rem] border-t border-dashed border-rule py-3 pr-4 text-[1.02rem] leading-relaxed text-ink-2">
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
          return <span key={g} className={clsx("h-3.5 w-4 rounded-[3px]", filled ? "bg-[linear-gradient(var(--green),var(--green-deep))] shadow-[0_1px_1px_rgb(10_12_16/0.18),0_2px_4px_-1px_rgb(44_11_142/0.3)]" : "bg-sage-deep shadow-[inset_0_1px_2px_rgb(10_12_16/0.12)]")} />;
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
            <div className={clsx("grid grid-cols-[4.5rem_1.5rem_minmax(0,1fr)] gap-x-3 py-3 sm:grid-cols-[5.75rem_1.5rem_minmax(0,1fr)]", past && "[&_.num]:text-ink-3")}>
              {/* A tear-off calendar page, with a countdown for dates still to come */}
              <div className="flex flex-col items-end gap-1.5">
                <p className={clsx("relative w-[4.25rem] overflow-hidden rounded-[10px] bg-card text-center leading-none sm:w-[4.75rem]", past ? "shadow-[0_0_0_1px_var(--rule)]" : "shadow-[0_1px_1px_rgb(44_11_142/0.06),0_6px_12px_-4px_rgb(44_11_142/0.18)]")}>
                  <span className={clsx("block py-1 text-[0.7rem] font-bold tracking-[0.08em] text-white uppercase", past ? "bg-ink-3" : "bg-[linear-gradient(var(--copper),color-mix(in_srgb,var(--copper)_75%,#000))]")}>{d.toLocaleDateString("en-GB", { month: "short", timeZone: "Europe/London" })}</span>
                  <span aria-hidden className="absolute top-[1.35rem] right-0 left-0 flex justify-center gap-5">
                    <span className="size-1.5 rounded-full bg-ink/25" />
                    <span className="size-1.5 rounded-full bg-ink/25" />
                  </span>
                  <span className="block pt-2.5 text-[1.75rem] font-semibold text-ink num">{d.toLocaleDateString("en-GB", { day: "numeric", timeZone: "Europe/London" })}</span>
                  <span className="block pb-1.5 font-mono text-[0.68rem] text-ink-2">{d.toLocaleDateString("en-GB", { year: "numeric", timeZone: "Europe/London" })}</span>
                </p>
                {!past ? (() => {
                  const days = Math.round((Date.parse(`${e.starts_on}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86_400_000);
                  return <span className="rounded-full bg-green-wash px-2 py-0.5 text-[0.75rem] font-semibold whitespace-nowrap text-green">{days <= 0 ? "Now" : days === 1 ? "Tomorrow" : `in ${days} days`}</span>;
                })() : null}
              </div>
              <span aria-hidden className="relative z-10 mt-5 grid size-3.5 place-self-center self-start rounded-full border-[3px] border-white bg-green shadow-[0_0_0_1px_var(--rule-strong)]" />
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
