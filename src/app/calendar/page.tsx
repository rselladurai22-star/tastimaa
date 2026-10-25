import type { Metadata } from "next";
import Link from "next/link";
import { clsx } from "clsx";
import { EVENT_TYPE_LABEL } from "@/domain/labels";
import { formatWeekdayDate } from "@/lib/format";
import { allEvents } from "@/server/insights";
import { Breadcrumbs } from "@/ui/breadcrumbs";
import { IconCalendarAdd, IconExternal } from "@/ui/icons";
import { Hero, HeroFigures, HeroHead } from "@/ui/hero";
import { Gap, Page } from "@/ui/kit";
import { Status } from "@/ui/status";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Grammar school admissions calendar: key dates",
  description: "Verified key dates for grammar school admissions in England and Northern Ireland: test registration, test dates, results, application deadlines and offer days.",
  alternates: { canonical: "/calendar" },
};

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ nation?: string; past?: string }> }) {
  const sp = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const nation = sp.nation === "northern_ireland" || sp.nation === "england" ? sp.nation : null;
  const showPast = sp.past === "1";
  const events = (await allEvents()).filter((e) => (!nation || e.nation === nation) && (showPast || (e.ends_on ?? e.starts_on) >= today));
  const byMonth = new Map<string, typeof events>();
  for (const e of events) {
    const k = e.starts_on.slice(0, 7);
    byMonth.set(k, [...(byMonth.get(k) ?? []), e]);
  }
  const months = [...byMonth.keys()];
  const max = Math.max(1, ...[...byMonth.values()].map((v) => v.length));
  const monthLabel = (k: string, style: "long" | "short" = "long") => new Date(`${k}-01T12:00:00Z`).toLocaleDateString("en-GB", { month: style, year: "numeric", timeZone: "Europe/London" });
  const link = (patch: Record<string, string | null>) => {
    const q = new URLSearchParams();
    const merged = { nation, past: showPast ? "1" : null, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) q.set(k, v);
    const s = q.toString();
    return `/calendar${s ? `?${s}` : ""}`;
  };
  const next = events.find((e) => (e.ends_on ?? e.starts_on) >= today) ?? null;

  return (
    <>
      <Hero>
        <Breadcrumbs items={[{ href: "/calendar", label: "Key dates" }]} />
        <HeroHead
          kicker="Dates & data"
          title="Admissions calendar"
          lede="Dates from official sources only. Each school and test has its own timetable, and your home council may set further deadlines."
          aside={
            <HeroFigures
              items={[[next ? formatWeekdayDate(next.starts_on) : "—", next ? `next: ${next.title}` : "no upcoming dates held"]]}
              footer={
                <Link href="/tools/planner" className="inline-flex min-h-11 items-center gap-2 rounded-[8px] bg-white px-4 font-semibold text-[#141a4d] no-underline hover:bg-[#e8ecff]">
                  <IconCalendarAdd size={17} /> Open your planner
                </Link>
              }
            />
          }
        />
      </Hero>
      <Page className="pb-16">
        <div className="mb-8 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-[14px] bg-card px-4 py-3 shadow-[0_0_0_1px_var(--rule)]">
          <nav aria-label="Nation" className="flex overflow-hidden rounded-[5px] border border-control">
            {(
              [
                [null, "All"],
                ["england", "England"],
                ["northern_ireland", "Northern Ireland"],
              ] as [string | null, string][]
            ).map(([v, l]) => (
              <Link
                key={l}
                href={link({ nation: v })}
                aria-current={nation === v ? "true" : undefined}
                className={clsx("inline-flex min-h-10 items-center border-r border-control px-3.5 text-[0.95rem] no-underline last:border-r-0", nation === v ? "bg-ink font-semibold text-paper" : "bg-card text-ink-2 hover:text-ink")}
              >
                {l}
              </Link>
            ))}
          </nav>
          <Link href={link({ past: showPast ? null : "1" })} className="a text-[0.95rem]">
            {showPast ? "Hide past dates" : "Show past dates"}
          </Link>
          <span className="ml-auto font-mono text-[0.85rem] text-ink-2">
            {events.length} {events.length === 1 ? "date" : "dates"}
          </span>
        </div>

        {months.length > 1 ? (
          <nav aria-label="Months" className="relative mb-12 overflow-x-auto">
            <ol className="flex min-w-max items-end gap-1">
              {months.map((k) => {
                const n = byMonth.get(k)!.length;
                return (
                  <li key={k}>
                    <a href={`#m-${k}`} className="group/mo flex w-[4.5rem] flex-col items-center gap-1.5 rounded-[4px] px-1 py-2 no-underline hover:bg-card">
                      <span aria-hidden className="flex h-14 items-end">
                        <span
                          className="w-3.5 rounded-t-[4px] bg-[linear-gradient(var(--green),var(--green-deep))] shadow-[0_2px_6px_-2px_rgb(44_11_142/0.45)] transition-colors group-hover/mo:bg-[linear-gradient(var(--copper),var(--copper-ink))]"
                          style={{ height: `${Math.max(10, (n / max) * 100)}%` }}
                        />
                      </span>
                      <span className="font-mono text-[0.75rem] text-ink-2 uppercase">{monthLabel(k, "short")}</span>
                      <span className="sr-only">
                        {n} {n === 1 ? "date" : "dates"}
                      </span>
                    </a>
                  </li>
                );
              })}
            </ol>
          </nav>
        ) : null}

        {events.length === 0 ? <Gap title="No verified dates match these filters." /> : null}
        <div className="grid gap-14">
          {[...byMonth.entries()].map(([k, evs]) => (
            <section key={k} id={`m-${k}`} aria-labelledby={`h-${k}`} className="grid scroll-mt-[calc(var(--header-h)+1.5rem)] gap-x-12 gap-y-4 lg:grid-cols-[13rem_minmax(0,1fr)]">
              <div>
                <h2 id={`h-${k}`} className="text-h2 lg:sticky lg:top-[calc(var(--header-h)+1.5rem)]">
                  {monthLabel(k)}
                </h2>
              </div>
              <ol className="border-t border-rule">
                {evs.map((e) => {
                  const d = new Date(`${e.starts_on}T12:00:00Z`);
                  const past = (e.ends_on ?? e.starts_on) < today;
                  return (
                    <li key={e.id} className={clsx("grid grid-cols-[4.25rem_minmax(0,1fr)] gap-x-5 border-b border-rule py-5 sm:grid-cols-[5.5rem_minmax(0,1fr)]", past && "[&_.num]:text-ink-3")}>
                      <p className={clsx("self-start overflow-hidden rounded-[10px] text-center leading-none", past ? "shadow-[0_0_0_1px_var(--rule)]" : "shadow-[0_0_0_1px_var(--rule),0_6px_12px_-6px_rgb(44_11_142/0.3)]")}>
                        <span className={clsx("block py-1 text-[0.6875rem] font-bold tracking-[0.08em] text-white uppercase", past ? "bg-ink-3" : "bg-[linear-gradient(var(--copper),color-mix(in_srgb,var(--copper)_75%,#000))]")}>
                          {d.toLocaleDateString("en-GB", { weekday: "short", timeZone: "Europe/London" })}
                        </span>
                        <span className="block py-2 text-[1.6rem] font-semibold text-ink num">{d.toLocaleDateString("en-GB", { day: "numeric", timeZone: "Europe/London" })}</span>
                      </p>
                      <div className="min-w-0">
                        <p className="label text-[0.72rem]">
                          {EVENT_TYPE_LABEL[e.event_type]}
                          {past ? " · passed" : ""}
                        </p>
                        <p className="mt-1 text-[1.12rem] leading-snug font-semibold text-ink">{e.title}</p>
                        <p className="mt-1 text-[0.98rem] text-ink-2">
                          {formatWeekdayDate(e.starts_on)}
                          {e.ends_on ? ` – ${formatWeekdayDate(e.ends_on)}` : ""}
                        </p>
                        <p className="mt-0.5 text-[0.98rem] text-ink-2">
                          {e.nation === "northern_ireland" ? "Northern Ireland" : "England"} · September {e.entry_year} entry
                          {e.test_slug ? (
                            <>
                              {" "}
                              ·{" "}
                              <Link href={`/11-plus/${e.test_slug}`} className="a">
                                {e.test_name}
                              </Link>
                            </>
                          ) : null}
                          {e.school_slug ? (
                            <>
                              {" "}
                              ·{" "}
                              <Link href={`/schools/${e.school_slug}`} className="a">
                                {e.school_name}
                              </Link>
                            </>
                          ) : null}
                        </p>
                        {e.description ? <p className="mt-1.5 max-w-[64ch] text-small leading-relaxed text-ink-2">{e.description}</p> : null}
                        <div className="mt-2.5 flex flex-wrap items-center gap-3">
                          <Status status={e.verification_status} />
                          {e.url ? (
                            <a href={e.url} target="_blank" rel="noopener noreferrer" className="a inline-flex items-center gap-1 text-small">
                              Source document{e.source_locator ? ` — ${e.source_locator}` : ""}
                              <IconExternal size={12} />
                              <span className="sr-only">(opens in a new tab)</span>
                            </a>
                          ) : null}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </div>
      </Page>
    </>
  );
}
