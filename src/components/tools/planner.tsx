"use client";

import { useEffect, useState } from "react";
import { CalendarPlus, CheckCircle2, Circle } from "lucide-react";
import { clsx } from "clsx";
import { useShortlist } from "@/components/school/shortlist";
import { formatWeekdayDate } from "@/lib/format";
import { useStoredJson } from "@/lib/use-stored-json";

interface Ev {
  id: number;
  title: string;
  description: string | null;
  eventType: string;
  startsOn: string;
  endsOn: string | null;
  url: string | null;
  testName: string | null;
  schoolName: string | null;
  verificationStatus: string;
}
interface Data {
  entryYear: number;
  schools: { slug: string; name: string; nation: string }[];
  steps: { nation: "england" | "northern_ireland"; steps: { key: string; title: string; detail: string; events: Ev[] }[] }[];
}

const doneKey = (year: number) => `gsi.planner.done.${year}`;
const NONE_DONE: string[] = [];

export function Planner({ years, defaultYear, notice }: { years: number[]; defaultYear: number; notice?: string | null }) {
  const { list } = useShortlist();
  const [year, setYear] = useState(defaultYear);
  const [data, setData] = useState<Data | null>(null);
  const [done, setDone] = useStoredJson(doneKey(year), NONE_DONE);
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  const slugs = list.map((l) => l.slug).join(",");

  useEffect(() => {
    fetch(`/api/planner?schools=${slugs}&year=${year}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null));
  }, [slugs, year]);

  function toggle(key: string) {
    setDone(done.includes(key) ? done.filter((k) => k !== key) : [...done, key]);
  }

  async function subscribe(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const res = await fetch("/api/reminders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, school: list[0]?.slug ?? null, entryYear: year, consent }) });
    const json = await res.json().catch(() => ({}));
    setMsg(json.message ?? json.error ?? "Something went wrong.");
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div>
        {notice ? <p className="mb-4 rounded-lg bg-info-soft p-3 text-sm text-info">{notice}</p> : null}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <label htmlFor="pl-year" className="text-sm font-semibold">
            Starting secondary school in
          </label>
          <select id="pl-year" value={year} onChange={(e) => setYear(Number(e.target.value))} className="rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm">
            {years.map((y) => (
              <option key={y} value={y}>
                September {y}
              </option>
            ))}
          </select>
          <a href={`/api/calendar.ics?schools=${slugs}&year=${year}`} className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm font-medium hover:bg-surface-2">
            <CalendarPlus aria-hidden className="size-4" /> Add verified dates to your calendar
          </a>
        </div>
        <p className="mb-6 text-sm text-ink-2">
          {list.length ? (
            <>Planning for your shortlist: {list.map((l) => l.name).join(", ")}.</>
          ) : (
            <>Shortlist schools (from any profile or the directory) to add their tests and school-specific dates. Showing national dates only.</>
          )}
        </p>
        {data?.steps.map((group) => (
          <section key={group.nation} aria-labelledby={`pl-${group.nation}`} className="mb-10">
            <h2 id={`pl-${group.nation}`} className="mb-4 text-xl font-semibold">
              {group.nation === "northern_ireland" ? "Northern Ireland — Year 8 transfer" : "England — Year 7 entry"}
            </h2>
            <ol className="relative grid gap-0">
              {group.steps.map((s, i) => {
                const isDone = done.includes(`${group.nation}:${s.key}`);
                return (
                  <li key={s.key} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <button type="button" onClick={() => toggle(`${group.nation}:${s.key}`)} aria-pressed={isDone} aria-label={`Mark "${s.title}" as ${isDone ? "not done" : "done"}`} className="rounded-full">
                        {isDone ? <CheckCircle2 aria-hidden className="size-7 text-ok" /> : <Circle aria-hidden className="size-7 text-line-strong" />}
                      </button>
                      {i < group.steps.length - 1 ? <span aria-hidden className="w-px flex-1 bg-line-strong" /> : null}
                    </div>
                    <div className="min-w-0 flex-1 pb-6">
                      <p className={clsx("font-semibold", isDone ? "text-ink-3 line-through" : "text-ink")}>{s.title}</p>
                      <p className="text-sm text-ink-2">{s.detail}</p>
                      {s.events.length ? (
                        <ul className="mt-2 grid gap-1.5">
                          {s.events.map((e) => (
                            <li key={e.id} className={clsx("rounded-lg border border-line bg-surface px-3 py-2 text-sm", (e.endsOn ?? e.startsOn) < today && "bg-surface-2")}>
                              <span className="font-semibold text-accent-ink tabular">{formatWeekdayDate(e.startsOn)}</span> · {e.title}
                              {e.testName ? <span className="text-ink-3"> · {e.testName}</span> : null}
                              {e.verificationStatus !== "officially_verified" ? <span className="ml-1 text-xs text-warn">(awaiting verification)</span> : null}
                              {e.url ? (
                                <a href={e.url} className="ml-2 text-xs link" target="_blank" rel="noopener noreferrer">
                                  source
                                </a>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-1 text-xs text-ink-3">No verified date held — check the school, test administrator or council.</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>
      <aside className="grid content-start gap-4">
        <form onSubmit={subscribe} className="rounded-xl border border-line bg-surface p-5">
          <h2 className="font-sans text-sm font-semibold">Email reminders (optional)</h2>
          <p className="mt-1 text-xs text-ink-2">A reminder a week before each verified date. Double opt-in; unsubscribe any time. We only store your email address.</p>
          <label htmlFor="pl-email" className="mt-3 block text-xs font-medium">
            Email address
          </label>
          <input id="pl-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm" />
          <label className="mt-3 flex items-start gap-2 text-xs text-ink-2">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} required className="mt-0.5 size-4 accent-[var(--accent)]" />I agree to receive reminder emails about admissions dates. See the privacy notice.
          </label>
          <button type="submit" className="mt-3 w-full rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white dark:text-[#0f1112]">
            Send me reminders
          </button>
          {msg ? (
            <p role="status" className="mt-2 text-xs text-ink-2">
              {msg}
            </p>
          ) : null}
        </form>
        <div className="rounded-xl border border-line bg-surface-2/60 p-5 text-xs text-ink-2">
          We don&apos;t submit applications. You apply through your home council (England) or the Education Authority (Northern Ireland). Ticks are saved in this browser only.
        </div>
      </aside>
    </div>
  );
}
