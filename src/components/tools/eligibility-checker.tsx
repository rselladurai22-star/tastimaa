"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, CircleHelp, Plus, X, XCircle } from "lucide-react";
import { clsx } from "clsx";
import { ACADEMIC_LABEL, MATCH_LABEL, OVERALL_LABEL, type Assessment } from "@/domain/eligibility";
import { useShortlist } from "@/components/school/shortlist";

type Question =
  | { kind: "childSex" }
  | { kind: "test"; testSlug: string; testName: string; schools: string[] }
  | { kind: "lookedAfter" }
  | { kind: "pupilPremium" }
  | { kind: "medicalSocial" }
  | { kind: "sibling"; school: string; schoolName: string }
  | { kind: "staffChild"; school: string; schoolName: string }
  | { kind: "catchment"; school: string; schoolName: string; hasVerifiedBoundary: boolean };

interface Answers {
  childSex?: "boy" | "girl" | null;
  tests?: Record<string, { status?: "not_registered" | "registered" | "sat_awaiting" | "have_result" | null; score?: number | null }>;
  lookedAfter?: "looked_after" | "previously_looked_after" | "no" | null;
  pupilPremium?: boolean | null;
  medicalSocial?: boolean | null;
  sibling?: Record<string, boolean | null>;
  staffChild?: Record<string, boolean | null>;
  catchment?: Record<string, boolean | null>;
  postcode?: string | null;
}

interface Response {
  schools: { slug: string; name: string; hasPolicy: boolean; policySource: { title: string; url: string } | null }[];
  questions: Question[];
  results: Assessment[];
  postcodeNote: string | null;
}

function YesNo({ name, value, onChange, labels = ["Yes", "No", "Not sure"] }: { name: string; value: boolean | null | undefined; onChange: (v: boolean | null) => void; labels?: [string, string, string] | string[] }) {
  const opts: [boolean | null, string][] = [
    [true, labels[0]!],
    [false, labels[1]!],
    [null, labels[2]!],
  ];
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {opts.map(([v, l]) => (
        <label key={l} className={clsx("cursor-pointer rounded-lg border px-3 py-1.5 text-sm has-[:focus-visible]:outline-2", value === v || (v === null && value === undefined) ? "border-accent bg-accent-soft text-accent-ink" : "border-line-strong text-ink-2")}>
          <input type="radio" name={name} className="sr-only" checked={value === v || (v === null && value === undefined)} onChange={() => onChange(v)} />
          {l}
        </label>
      ))}
    </div>
  );
}

const MATCH_ICON = { confirmed: CheckCircle2, possible: CircleHelp, no_match: XCircle, insufficient_information: CircleHelp } as const;

function ResultCard({ r, source }: { r: Assessment; source: { title: string; url: string } | null }) {
  return (
    <article className="rounded-xl border border-line bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-lg font-semibold">
          <Link href={`/schools/${r.schoolSlug}/admissions?year=${r.entryYear}`} className="hover:underline">
            {r.schoolName}
          </Link>
        </h3>
        <span className="text-xs text-ink-3">September {r.entryYear} entry</span>
      </div>
      <dl className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-line bg-surface-2/60 p-3">
          <dt className="text-xs text-ink-3">Step 1 · Academic test status</dt>
          <dd className="mt-0.5 font-semibold text-ink">{ACADEMIC_LABEL[r.academic.status]}</dd>
          <dd className="mt-1 text-xs text-ink-2">{r.academic.explanation}</dd>
        </div>
        <div className="rounded-lg border border-line bg-surface-2/60 p-3">
          <dt className="text-xs text-ink-3">Step 2 · Admission criteria</dt>
          <dd className="mt-0.5 font-semibold text-ink">{OVERALL_LABEL[r.overall]}</dd>
          {r.bestCriterion ? <dd className="mt-1 text-xs text-ink-2">Highest criterion: {r.bestCriterion.rank}. {r.bestCriterion.title}</dd> : null}
        </div>
      </dl>
      <div className="mt-3 rounded-lg border border-accent/25 bg-accent-soft/60 p-3">
        <p className="text-xs font-semibold text-accent-ink">Step 3 · Offer outlook (no probability given)</p>
        <p className="mt-1 text-sm text-ink">{r.outlook}</p>
      </div>
      {r.warnings.length ? (
        <ul className="mt-3 grid gap-1.5">
          {r.warnings.map((w) => (
            <li key={w.code} className="flex gap-2 text-sm text-warn">
              <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
              <span>{w.message}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {r.criteria.length ? (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-semibold text-ink">How each criterion applies</summary>
          <ol className="mt-2 grid gap-2">
            {r.criteria.map((c) => {
              const Icon = MATCH_ICON[c.match];
              return (
                <li key={c.rank} className="flex gap-3 rounded-lg border border-line p-3 text-sm">
                  <Icon aria-hidden className={clsx("mt-0.5 size-4 shrink-0", c.match === "confirmed" ? "text-ok" : c.match === "no_match" ? "text-ink-3" : "text-warn")} />
                  <div>
                    <p className="font-medium text-ink">
                      {c.rank}. {c.title} — <span className="font-normal">{MATCH_LABEL[c.match]}</span>
                    </p>
                    {c.reasons.map((x) => (
                      <p key={x} className="text-xs text-ink-3">
                        {x}
                      </p>
                    ))}
                    {c.locator ? <p className="text-xs text-ink-3">Policy reference: {c.locator}</p> : null}
                  </div>
                </li>
              );
            })}
          </ol>
        </details>
      ) : null}
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div>
          <p className="text-xs font-semibold text-ink">What you satisfy</p>
          <ul className="mt-1 grid gap-1 text-sm text-ink-2">{r.satisfied.length ? r.satisfied.map((s) => <li key={s}>{s}</li>) : <li className="text-ink-3">Nothing confirmed yet</li>}</ul>
        </div>
        <div>
          <p className="text-xs font-semibold text-ink">Still unknown</p>
          <ul className="mt-1 grid gap-1 text-sm text-ink-2">{r.unknown.length ? r.unknown.map((s) => <li key={s}>{s}</li>) : <li className="text-ink-3">—</li>}</ul>
        </div>
        <div>
          <p className="text-xs font-semibold text-ink">Next steps</p>
          <ul className="mt-1 grid gap-1 text-sm text-ink-2">
            {r.nextActions.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      </div>
      <p className="mt-4 border-t border-line pt-3 text-xs text-ink-3">
        Evidence:{" "}
        {source ? (
          <a href={source.url} className="link" target="_blank" rel="noopener noreferrer">
            {source.title}
          </a>
        ) : (
          "no admissions policy held for this year"
        )}
        . This is not an offer or a guarantee; the admission authority makes the decision.
      </p>
    </article>
  );
}

export function EligibilityChecker({ initialSchools, years, defaultYear }: { initialSchools: { slug: string; name: string }[]; years: number[]; defaultYear: number }) {
  const { list } = useShortlist();
  const [schools, setSchools] = useState(initialSchools);
  const [entryYear, setEntryYear] = useState(defaultYear);
  const [answers, setAnswers] = useState<Answers>({});
  const [data, setData] = useState<Response | null>(null);
  const [scenario, setScenario] = useState<{ testSlug: string; score: number } | null>(null);
  const [scenarioData, setScenarioData] = useState<Response | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [sugs, setSugs] = useState<{ label: string; href: string; sublabel: string; type: string }[]>([]);

  useEffect(() => {
    if (!initialSchools.length && list.length) setSchools(list.slice(0, 5));
    // only on first load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list.length]);

  const run = useCallback(
    async (a: Answers) => {
      if (!schools.length) {
        setData(null);
        return null;
      }
      const res = await fetch("/api/eligibility", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ schools: schools.map((s) => s.slug), entryYear, answers: a }) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Something went wrong");
      return (await res.json()) as Response;
    },
    [schools, entryYear],
  );

  useEffect(() => {
    let cancelled = false;
    setBusy(true);
    run(answers)
      .then((d) => !cancelled && setData(d))
      .catch((e: Error) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setBusy(false));
    return () => {
      cancelled = true;
    };
    // Re-run when answers change too, so results stay in sync with the form.
  }, [run, answers]);

  useEffect(() => {
    if (q.trim().length < 2) {
      setSugs([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/search/suggest?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((j) => setSugs(j.suggestions.filter((s: { type: string }) => s.type === "school")))
        .catch(() => {});
    }, 150);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  async function runScenario() {
    if (!scenario) return;
    const a: Answers = { ...answers, tests: { ...(answers.tests ?? {}), [scenario.testSlug]: { status: "have_result", score: scenario.score } } };
    try {
      setScenarioData(await run(a));
    } catch {
      setScenarioData(null);
    }
  }

  const set = (patch: Partial<Answers>) => setAnswers((a) => ({ ...a, ...patch }));
  const questions = data?.questions ?? [];
  const testQs = questions.filter((x): x is Extract<Question, { kind: "test" }> => x.kind === "test");
  const needsPostcode = questions.some((x) => x.kind === "catchment" && x.hasVerifiedBoundary);

  return (
    <div className="grid gap-8 lg:grid-cols-[24rem_minmax(0,1fr)]">
      <form className="grid content-start gap-6 rounded-xl border border-line bg-surface p-5" onSubmit={(e) => e.preventDefault()} aria-label="Your situation">
        <fieldset>
          <legend className="text-sm font-semibold text-ink">1. When will your child start secondary school?</legend>
          <label htmlFor="ec-year" className="sr-only">
            Entry year
          </label>
          <select id="ec-year" value={entryYear} onChange={(e) => setEntryYear(Number(e.target.value))} className="mt-2 w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm">
            {years.map((y) => (
              <option key={y} value={y}>
                September {y}
              </option>
            ))}
          </select>
        </fieldset>
        <fieldset>
          <legend className="text-sm font-semibold text-ink">2. Schools to check (up to five)</legend>
          <ul className="mt-2 grid gap-1.5">
            {schools.map((s) => (
              <li key={s.slug} className="flex items-center justify-between gap-2 rounded-lg border border-line bg-surface-2/60 px-3 py-2 text-sm">
                <span className="truncate">{s.name}</span>
                <button type="button" onClick={() => setSchools((x) => x.filter((y) => y.slug !== s.slug))} aria-label={`Remove ${s.name}`} className="rounded p-1 hover:bg-surface-3">
                  <X aria-hidden className="size-4" />
                </button>
              </li>
            ))}
          </ul>
          {schools.length < 5 ? (
            <div className="relative mt-2">
              <label htmlFor="ec-add" className="sr-only">
                Add a school
              </label>
              <Plus aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3" />
              <input id="ec-add" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Add a school" autoComplete="off" className="w-full rounded-lg border border-line-strong bg-surface py-2 pr-3 pl-9 text-sm" />
              {sugs.length ? (
                <ul className="absolute z-20 mt-1 w-full rounded-lg border border-line bg-surface p-1 shadow-[var(--shadow-md)]">
                  {sugs.map((s) => {
                    const slug = s.href.replace("/schools/", "");
                    return (
                      <li key={s.href}>
                        <button
                          type="button"
                          onClick={() => {
                            if (!schools.some((x) => x.slug === slug)) setSchools((x) => [...x, { slug, name: s.label }]);
                            setQ("");
                            setSugs([]);
                          }}
                          className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-surface-2"
                        >
                          {s.label}
                          <span className="block text-xs text-ink-3">{s.sublabel}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          ) : null}
        </fieldset>

        {questions.length ? <p className="text-sm font-semibold text-ink">3. Only the questions these schools&apos; rules depend on</p> : null}
        {questions.map((x) => {
          switch (x.kind) {
            case "childSex":
              return (
                <fieldset key="sex">
                  <legend className="text-sm text-ink">Some of these schools are single-sex. Is your child a boy or a girl?</legend>
                  <YesNo name="sex" value={answers.childSex === "boy" ? true : answers.childSex === "girl" ? false : null} onChange={(v) => set({ childSex: v === true ? "boy" : v === false ? "girl" : null })} labels={["Boy", "Girl", "Prefer not to say"]} />
                </fieldset>
              );
            case "test": {
              const t = answers.tests?.[x.testSlug] ?? {};
              return (
                <fieldset key={`t-${x.testSlug}`}>
                  <legend className="text-sm text-ink">{x.testName}</legend>
                  <p className="text-xs text-ink-3">Used by {x.schools.join(", ")}. Only enter a score from this test.</p>
                  <label htmlFor={`ts-${x.testSlug}`} className="sr-only">
                    Test status
                  </label>
                  <select
                    id={`ts-${x.testSlug}`}
                    value={t.status ?? ""}
                    onChange={(e) => set({ tests: { ...(answers.tests ?? {}), [x.testSlug]: { status: (e.target.value || null) as never, score: e.target.value === "have_result" ? t.score : null } } })}
                    className="mt-2 w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm"
                  >
                    <option value="">Not sure / prefer not to say</option>
                    <option value="not_registered">Not registered yet</option>
                    <option value="registered">Registered, not yet sat</option>
                    <option value="sat_awaiting">Sat it, waiting for the result</option>
                    <option value="have_result">We have the result</option>
                  </select>
                  {t.status === "have_result" ? (
                    <div className="mt-2">
                      <label htmlFor={`sc-${x.testSlug}`} className="text-xs text-ink-2">
                        Score
                      </label>
                      <input
                        id={`sc-${x.testSlug}`}
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={1000}
                        value={t.score ?? ""}
                        onChange={(e) => set({ tests: { ...(answers.tests ?? {}), [x.testSlug]: { status: "have_result", score: e.target.value === "" ? null : Number(e.target.value) } } })}
                        className="mt-1 w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm"
                      />
                    </div>
                  ) : null}
                </fieldset>
              );
            }
            case "lookedAfter":
              return (
                <fieldset key="la">
                  <legend className="text-sm text-ink">Is your child looked after by a local authority, or were they previously looked after (for example, adopted from care)?</legend>
                  <select value={answers.lookedAfter ?? ""} onChange={(e) => set({ lookedAfter: (e.target.value || null) as Answers["lookedAfter"] })} className="mt-2 w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm" aria-label="Looked after status">
                    <option value="">Not sure / prefer not to say</option>
                    <option value="looked_after">Currently looked after</option>
                    <option value="previously_looked_after">Previously looked after</option>
                    <option value="no">Neither</option>
                  </select>
                </fieldset>
              );
            case "pupilPremium":
              return (
                <fieldset key="pp">
                  <legend className="text-sm text-ink">Is your child eligible for the Pupil Premium?</legend>
                  <p className="text-xs text-ink-3">Often because they have received free school meals in the last six years. Each school&apos;s policy says how eligibility is evidenced and by when.</p>
                  <YesNo name="pp" value={answers.pupilPremium} onChange={(v) => set({ pupilPremium: v })} />
                </fieldset>
              );
            case "medicalSocial":
              return (
                <fieldset key="ms">
                  <legend className="text-sm text-ink">Do you have professional written evidence of an exceptional medical or social need for a particular school?</legend>
                  <YesNo name="ms" value={answers.medicalSocial} onChange={(v) => set({ medicalSocial: v })} />
                </fieldset>
              );
            case "sibling":
              return (
                <fieldset key={`sib-${x.school}`}>
                  <legend className="text-sm text-ink">Will a brother or sister be at {x.schoolName} when your child starts?</legend>
                  <YesNo name={`sib-${x.school}`} value={answers.sibling?.[x.school]} onChange={(v) => set({ sibling: { ...(answers.sibling ?? {}), [x.school]: v } })} />
                </fieldset>
              );
            case "staffChild":
              return (
                <fieldset key={`staff-${x.school}`}>
                  <legend className="text-sm text-ink">Does a parent work at {x.schoolName} and meet its staff criterion?</legend>
                  <YesNo name={`staff-${x.school}`} value={answers.staffChild?.[x.school]} onChange={(v) => set({ staffChild: { ...(answers.staffChild ?? {}), [x.school]: v } })} />
                </fieldset>
              );
            case "catchment":
              return x.hasVerifiedBoundary ? null : (
                <fieldset key={`c-${x.school}`}>
                  <legend className="text-sm text-ink">Have you confirmed with the official checker that your address is in {x.schoolName}&apos;s catchment area?</legend>
                  <p className="text-xs text-ink-3">We don&apos;t hold a verified boundary for this school, so we can&apos;t check it for you. Being near the school is not the same as being in its catchment.</p>
                  <YesNo name={`c-${x.school}`} value={answers.catchment?.[x.school]} onChange={(v) => set({ catchment: { ...(answers.catchment ?? {}), [x.school]: v } })} labels={["Yes, it's inside", "No, it's outside", "Not checked"]} />
                </fieldset>
              );
          }
        })}
        {needsPostcode ? (
          <div>
            <label htmlFor="ec-pc" className="text-sm text-ink">
              Home postcode (checked against verified boundaries, not stored)
            </label>
            <input id="ec-pc" value={answers.postcode ?? ""} onChange={(e) => set({ postcode: e.target.value || null })} className="mt-2 w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm uppercase" />
          </div>
        ) : null}
        <p className="text-xs text-ink-3">
          We never ask for your child&apos;s name or date of birth. Answers are used only to calculate this page and are not saved.
        </p>
      </form>

      <section aria-labelledby="ec-results" aria-busy={busy}>
        <h2 id="ec-results" className="sr-only">
          Results
        </h2>
        {error ? <p className="rounded-lg bg-bad-soft p-4 text-sm text-bad">{error}</p> : null}
        {!schools.length ? (
          <div className="rounded-xl border border-dashed border-line-strong p-10 text-center text-ink-2">Add a school to start. Your shortlist is added automatically.</div>
        ) : null}
        {data?.postcodeNote ? <p className="mb-3 rounded-lg bg-warn-soft p-3 text-sm text-warn">{data.postcodeNote}</p> : null}
        <div className="grid gap-4" aria-live="polite">
          {data?.results.map((r) => (
            <ResultCard key={r.schoolSlug} r={r} source={data.schools.find((s) => s.slug === r.schoolSlug)?.policySource ?? null} />
          ))}
        </div>
        {testQs.length ? (
          <div className="mt-8 rounded-xl border border-line bg-surface-2/60 p-5">
            <h3 className="font-sans text-base font-semibold">Illustrative scenario</h3>
            <p className="mt-1 text-sm text-ink-2">See how the rules would apply with a different score. This is a hypothetical illustration, not a prediction.</p>
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <select aria-label="Test" className="rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm" value={scenario?.testSlug ?? testQs[0]!.testSlug} onChange={(e) => setScenario({ testSlug: e.target.value, score: scenario?.score ?? 0 })}>
                {testQs.map((t) => (
                  <option key={t.testSlug} value={t.testSlug}>
                    {t.testName}
                  </option>
                ))}
              </select>
              <input aria-label="Hypothetical score" type="number" placeholder="Score" className="w-28 rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm" onChange={(e) => setScenario({ testSlug: scenario?.testSlug ?? testQs[0]!.testSlug, score: Number(e.target.value) })} />
              <button type="button" onClick={runScenario} className="rounded-lg border border-line-strong bg-surface px-4 py-2 text-sm font-medium hover:bg-surface-3">
                Show scenario
              </button>
            </div>
            {scenarioData ? (
              <div className="mt-4 grid gap-3">
                {scenarioData.results.map((r) => (
                  <div key={r.schoolSlug} className="rounded-lg border border-dashed border-line-strong bg-surface p-3 text-sm">
                    <p className="font-semibold text-ink">
                      Scenario · {r.schoolName}: {ACADEMIC_LABEL[r.academic.status]} · {OVERALL_LABEL[r.overall]}
                    </p>
                    <p className="text-ink-2">{r.outlook}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}
