import type { Metadata } from "next";
import Link from "next/link";
import { CalendarPlus } from "lucide-react";
import { EVENT_TYPE_LABEL } from "@/domain/labels";
import { formatWeekdayDate } from "@/lib/format";
import { allEvents } from "@/server/insights";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Callout, Container } from "@/components/ui/primitives";
import { VerificationBadge } from "@/components/ui/verification";

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
  const monthLabel = (k: string) => new Date(`${k}-01T12:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "Europe/London" });
  const link = (patch: Record<string, string | null>) => {
    const q = new URLSearchParams();
    const merged = { nation, past: showPast ? "1" : null, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) q.set(k, v);
    const s = q.toString();
    return `/calendar${s ? `?${s}` : ""}`;
  };
  return (
    <Container className="py-8">
      <Breadcrumbs items={[{ href: "/calendar", label: "Key dates" }]} />
      <header className="mt-4 mb-6 max-w-3xl">
        <h1 className="text-3xl font-semibold sm:text-4xl">Admissions calendar</h1>
        <p className="mt-3 text-lg text-ink-2">Dates from official sources only. Each school and test has its own timetable; your home council may set further deadlines.</p>
      </header>
      <div className="mb-6 flex flex-wrap items-center gap-2 text-sm">
        {(
          [
            [null, "All"],
            ["england", "England"],
            ["northern_ireland", "Northern Ireland"],
          ] as [string | null, string][]
        ).map(([v, l]) => (
          <Link key={l} href={link({ nation: v })} aria-current={nation === v ? "true" : undefined} className={nation === v ? "rounded-full bg-accent-soft px-3 py-1.5 font-semibold text-accent-ink" : "rounded-full border border-line-strong px-3 py-1.5 text-ink-2"}>
            {l}
          </Link>
        ))}
        <Link href={link({ past: showPast ? null : "1" })} className="ml-2 text-ink-2 underline">
          {showPast ? "Hide past dates" : "Show past dates"}
        </Link>
        <a href="/tools/planner" className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-3 py-1.5 font-medium">
          <CalendarPlus aria-hidden className="size-4" /> Personal planner
        </a>
      </div>
      {events.length === 0 ? <Callout>No verified dates match these filters.</Callout> : null}
      <div className="grid gap-8">
        {[...byMonth.entries()].map(([k, evs]) => (
          <section key={k} aria-labelledby={`m-${k}`}>
            <h2 id={`m-${k}`} className="mb-3 text-xl font-semibold">
              {monthLabel(k)}
            </h2>
            <ol className="divide-y divide-line rounded-xl border border-line bg-surface">
              {evs.map((e) => (
                <li key={e.id} className="grid gap-1 px-5 py-4 sm:grid-cols-[13rem_minmax(0,1fr)]">
                  <p className="font-semibold text-accent-ink tabular">
                    {formatWeekdayDate(e.starts_on)}
                    {e.ends_on ? <span className="block text-xs font-normal text-ink-3">to {formatWeekdayDate(e.ends_on)}</span> : null}
                  </p>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-ink">{e.title}</p>
                      <span className="text-xs text-ink-3">{EVENT_TYPE_LABEL[e.event_type]}</span>
                      <VerificationBadge status={e.verification_status} />
                    </div>
                    <p className="text-sm text-ink-2">
                      {e.nation === "northern_ireland" ? "Northern Ireland" : "England"} · September {e.entry_year} entry
                      {e.test_slug ? (
                        <>
                          {" "}
                          ·{" "}
                          <Link href={`/11-plus/${e.test_slug}`} className="link">
                            {e.test_name}
                          </Link>
                        </>
                      ) : null}
                      {e.school_slug ? (
                        <>
                          {" "}
                          ·{" "}
                          <Link href={`/schools/${e.school_slug}`} className="link">
                            {e.school_name}
                          </Link>
                        </>
                      ) : null}
                    </p>
                    {e.description ? <p className="mt-1 text-sm text-ink-3">{e.description}</p> : null}
                    {e.url ? (
                      <a href={e.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs link">
                        Official source{e.source_locator ? ` — ${e.source_locator}` : ""}
                      </a>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </Container>
  );
}
