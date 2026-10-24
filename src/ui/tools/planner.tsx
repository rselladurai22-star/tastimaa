"use client";

import { useEffect, useState } from "react";
import { clsx } from "clsx";
import { formatWeekdayDate } from "@/lib/format";
import { useStoredJson } from "@/lib/use-stored-json";
import { IconCalendarAdd, IconCheck, IconChevron } from "../icons";
import { controlClass } from "../kit";
import { useShortlist } from "../shortlist";
import { Status } from "../status";

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

  const total = data?.steps.reduce((n, g) => n + g.steps.length, 0) ?? 0;
  const completed = data?.steps.reduce((n, g) => n + g.steps.filter((s) => done.includes(`${g.nation}:${s.key}`)).length, 0) ?? 0;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="min-w-0">
        {notice ? <p className="mb-5 rounded-[5px] border border-info/25 bg-info-wash p-3 text-info">{notice}</p> : null}
        <div className="mb-6 flex flex-wrap items-end gap-3 border-b border-rule pb-5">
          <div>
            <label htmlFor="pl-year" className="label mb-1.5 block">
              Starting secondary school in
            </label>
            <span className="relative block">
              <select id="pl-year" value={year} onChange={(e) => setYear(Number(e.target.value))} className={`${controlClass} w-auto appearance-none pr-10`}>
                {years.map((y) => (
                  <option key={y} value={y}>
                    September {y}
                  </option>
                ))}
              </select>
              <IconChevron size={16} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-ink-2" />
            </span>
          </div>
          <a href={`/api/calendar.ics?schools=${slugs}&year=${year}`} className="inline-flex min-h-11 items-center gap-2 rounded-[5px] border border-control bg-card px-3.5 font-semibold text-ink no-underline hover:border-ink">
            <IconCalendarAdd size={17} /> Add verified dates to your calendar
          </a>
          {total ? (
            <div className="ml-auto min-w-[10rem]">
              <p className="label mb-1.5">Progress</p>
              <span className="flex items-center gap-3">
                <span aria-hidden className="h-1.5 flex-1 overflow-hidden rounded-full bg-sage-deep">
                  <span className="block h-full origin-left rounded-full bg-green-bright transition-transform duration-[var(--d-3)] ease-[var(--ease-out)]" style={{ transform: `scaleX(${completed / total})` }} />
                </span>
                <span className="font-mono text-[0.85rem] text-ink">
                  {completed}/{total}
                </span>
              </span>
            </div>
          ) : null}
        </div>
        <p className="mb-8 text-[1rem] text-ink-2">
          {list.length ? (
            <>Planning for your shortlist: {list.map((l) => l.name).join(", ")}.</>
          ) : (
            <>Shortlist schools (from any profile or the directory) to add their tests and school-specific dates. Showing national dates only.</>
          )}
        </p>
        {data?.steps.map((group) => (
          <section key={group.nation} aria-labelledby={`pl-${group.nation}`} className="mb-12">
            <h2 id={`pl-${group.nation}`} className="mb-5 text-h3">
              {group.nation === "northern_ireland" ? "Northern Ireland — Year 8 transfer" : "England — Year 7 entry"}
            </h2>
            <ol className="relative">
              {group.steps.map((s, i) => {
                const isDone = done.includes(`${group.nation}:${s.key}`);
                return (
                  <li key={s.key} className="grid grid-cols-[2.75rem_minmax(0,1fr)] gap-x-4">
                    <div className="flex flex-col items-center">
                      <button
                        type="button"
                        onClick={() => toggle(`${group.nation}:${s.key}`)}
                        aria-pressed={isDone}
                        aria-label={`Mark "${s.title}" as ${isDone ? "not done" : "done"}`}
                        className={clsx(
                          "grid size-11 place-items-center rounded-full border-2 transition-[background-color,border-color,transform] duration-[var(--d-2)] ease-[var(--ease-out)] active:scale-95",
                          isDone ? "border-green bg-green text-paper" : "border-rule-strong bg-card text-ink-2 hover:border-green",
                        )}
                      >
                        {isDone ? <IconCheck key="d" size={18} className="animate-[pop_var(--d-3)_var(--ease-out)]" /> : <span aria-hidden className="size-2 rounded-full bg-rule-strong" />}
                      </button>
                      {i < group.steps.length - 1 ? <span aria-hidden className={clsx("w-[2px] flex-1 transition-colors", isDone ? "bg-green" : "bg-rule-strong")} /> : null}
                    </div>
                    <div className="min-w-0 pt-2 pb-8">
                      <p className={clsx("text-[1.1rem] font-semibold transition-colors", isDone ? "text-ink-2 line-through decoration-1" : "text-ink")}>{s.title}</p>
                      <p className="mt-1 max-w-[62ch] text-[0.98rem] leading-relaxed text-ink-2">{s.detail}</p>
                      {s.events.length ? (
                        <ul className="mt-3 grid gap-px overflow-hidden rounded-[6px] border border-rule bg-rule">
                          {s.events.map((e) => (
                            <li key={e.id} className={clsx("grid gap-x-4 gap-y-1 bg-card px-4 py-2.5 sm:grid-cols-[11rem_minmax(0,1fr)]", (e.endsOn ?? e.startsOn) < today && "bg-paper")}>
                              <span className="font-mono text-[0.85rem] text-green">{formatWeekdayDate(e.startsOn)}</span>
                              <span className="text-[0.98rem] text-ink">
                                {e.title}
                                {e.testName ? <span className="text-ink-2"> · {e.testName}</span> : null}
                                <span className="mt-1 flex flex-wrap items-center gap-2">
                                  {e.verificationStatus !== "officially_verified" ? <Status status={e.verificationStatus} quiet /> : null}
                                  {e.url ? (
                                    <a href={e.url} className="a text-small" target="_blank" rel="noopener noreferrer">
                                      source
                                    </a>
                                  ) : null}
                                </span>
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-small text-ink-2">No verified date held — check the school, test administrator or council.</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>
      <aside className="grid content-start gap-5">
        <form onSubmit={subscribe} className="rounded-[8px] border border-rule bg-card p-5">
          <h2 className="font-display text-[1.25rem] text-ink">Email reminders</h2>
          <p className="mt-1 text-small leading-relaxed text-ink-2">Optional. A reminder a week before each verified date. Double opt-in; unsubscribe any time. We only store your email address.</p>
          <label htmlFor="pl-email" className="mt-4 block font-semibold text-ink">
            Email address
          </label>
          <input id="pl-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={`${controlClass} mt-1.5`} />
          <label className="mt-3 flex cursor-pointer items-start gap-2.5 text-small leading-snug text-ink-2">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} required className="mt-0.5 size-[18px] shrink-0 accent-[var(--green)]" />I agree to receive reminder emails about admissions dates. See the privacy notice.
          </label>
          <button type="submit" className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-[5px] bg-green px-4 font-semibold text-paper hover:bg-green-deep">
            Send me reminders
          </button>
          {msg ? (
            <p role="status" className="mt-3 text-small text-ink">
              {msg}
            </p>
          ) : null}
        </form>
        <p className="border-l-2 border-copper pl-4 text-small leading-relaxed text-ink-2">
          We don&apos;t submit applications. You apply through your home council (England) or the Education Authority (Northern Ireland). Ticks are saved in this browser only.
        </p>
      </aside>
    </div>
  );
}
