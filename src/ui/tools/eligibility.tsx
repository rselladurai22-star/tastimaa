"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { clsx } from "clsx";
import { ACADEMIC_LABEL, MATCH_LABEL, OVERALL_LABEL, type Assessment } from "@/domain/eligibility";
import { IconCheck, IconChevron, IconClose, IconCross, IconPlus, IconQuestion, IconWarning } from "../icons";
import { controlClass } from "../kit";
import { useShortlist } from "../shortlist";

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

const select = `${controlClass} appearance-none pr-10`;

/** Three-way choice drawn as a segmented key. "Not sure" is the honest default. */
function Choice({ name, value, onChange, labels = ["Yes", "No", "Not sure"] }: { name: string; value: boolean | null | undefined; onChange: (v: boolean | null) => void; labels?: string[] }) {
  const opts: [boolean | null, string][] = [
    [true, labels[0]!],
    [false, labels[1]!],
    [null, labels[2]!],
  ];
  return (
    <div className="mt-3 grid grid-cols-3 overflow-hidden rounded-[5px] border border-control">
      {opts.map(([v, l]) => {
        const on = value === v || (v === null && value === undefined);
        return (
          <label key={l} className="cursor-pointer border-r border-control last:border-r-0">
            <input type="radio" name={name} className="peer sr-only" checked={on} onChange={() => onChange(v)} />
            <span className="flex min-h-11 items-center justify-center bg-card px-2 text-center text-[0.95rem] leading-tight text-ink transition-colors peer-checked:bg-green peer-checked:font-semibold peer-checked:text-paper peer-focus-visible:outline-2 peer-focus-visible:-outline-offset-4 peer-focus-visible:outline-paper">
              {l}
            </span>
          </label>
        );
      })}
    </div>
  );
}

function SelectBox(props: React.ComponentProps<"select">) {
  return (
    <span className="relative mt-3 block">
      <select {...props} className={select} />
      <IconChevron size={16} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-ink-2" />
    </span>
  );
}

/** A question card: a check once answered, so the remaining questions stand out. */
function Q({ answered, children, hint, legend }: { answered: boolean; children: React.ReactNode; hint?: React.ReactNode; legend: React.ReactNode }) {
  return (
    <fieldset className={clsx("anim-rise rounded-[6px] border px-4 pt-3.5 pb-4 transition-colors duration-[var(--d-2)]", answered ? "border-rule bg-paper" : "border-control bg-card")}>
      <legend className="sr-only">{legend}</legend>
      <div className="flex items-start gap-3">
        <span aria-hidden className={clsx("mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border transition-colors", answered ? "border-green bg-green text-paper" : "border-control bg-card")}>
          {answered ? <IconCheck size={12} /> : null}
        </span>
        <div className="min-w-0 flex-1">
          <p aria-hidden className="text-[1rem] leading-snug font-semibold text-ink">
            {legend}
          </p>
          {hint ? <p className="mt-1 text-small leading-snug text-ink-2">{hint}</p> : null}
          {children}
        </div>
      </div>
    </fieldset>
  );
}

const ACADEMIC_TONE: Record<string, string> = {
  requirement_met: "text-ok",
  requirement_not_met: "text-bad",
  result_pending: "text-pend",
  may_register: "text-pend",
  not_assessed: "text-ink-2",
  cannot_determine: "text-ink-2",
};
const OVERALL_TONE: Record<string, string> = {
  confirmed_rule_match: "text-ok",
  possible_rule_match: "text-pend",
  rule_does_not_match: "text-bad",
  insufficient_information: "text-ink-2",
};
const MATCH_META = {
  confirmed: { Icon: IconCheck, tone: "bg-ok-wash text-ok" },
  possible: { Icon: IconQuestion, tone: "bg-pend-wash text-pend" },
  no_match: { Icon: IconCross, tone: "bg-none-wash text-none" },
  insufficient_information: { Icon: IconQuestion, tone: "bg-none-wash text-none" },
} as const;

function ResultCard({ r, source }: { r: Assessment; source: { title: string; url: string } | null }) {
  return (
    <article className="anim-rise overflow-hidden rounded-[8px] border border-rule bg-card">
      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-rule px-5 py-4">
        <h3 className="text-h4">
          <Link href={`/schools/${r.schoolSlug}/admissions?year=${r.entryYear}`} className="text-ink no-underline hover:text-green hover:underline">
            {r.schoolName}
          </Link>
        </h3>
        <span className="font-mono text-[0.8rem] text-ink-2">September {r.entryYear} entry</span>
      </header>
      <ol className="grid border-b border-rule md:grid-cols-[1fr_1fr_1.35fr]">
        <li className="border-b border-rule px-5 py-4 md:border-r md:border-b-0">
          <p className="label text-[0.72rem]">Step 1 · Academic test status</p>
          <p className={clsx("mt-1.5 font-semibold", ACADEMIC_TONE[r.academic.status])}>{ACADEMIC_LABEL[r.academic.status]}</p>
          <p className="mt-1 text-small leading-snug text-ink-2">{r.academic.explanation}</p>
        </li>
        <li className="border-b border-rule px-5 py-4 md:border-r md:border-b-0">
          <p className="label text-[0.72rem]">Step 2 · Admission criteria</p>
          <p className={clsx("mt-1.5 font-semibold", OVERALL_TONE[r.overall])}>{OVERALL_LABEL[r.overall]}</p>
          {r.bestCriterion ? (
            <p className="mt-1 text-small leading-snug text-ink-2">
              Highest criterion: {r.bestCriterion.rank}. {r.bestCriterion.title}
            </p>
          ) : null}
        </li>
        <li className="bg-green-wash/60 px-5 py-4">
          <p className="label text-[0.72rem] text-green">Step 3 · Offer outlook (no probability given)</p>
          <p className="mt-1.5 text-[0.98rem] leading-relaxed text-ink">{r.outlook}</p>
        </li>
      </ol>
      {r.warnings.length ? (
        <ul className="grid gap-1.5 border-b border-rule bg-pend-wash/60 px-5 py-3">
          {r.warnings.map((w) => (
            <li key={w.code} className="flex gap-2 text-[0.95rem] text-pend">
              <IconWarning size={16} className="mt-0.5 shrink-0" />
              <span>{w.message}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {r.criteria.length ? (
        <details className="group/cr border-b border-rule">
          <summary className="flex min-h-12 list-none items-center justify-between px-5 font-semibold text-ink hover:text-green">
            How each criterion applies
            <IconChevron size={18} className="text-ink-2 transition-transform duration-[var(--d-2)] group-open/cr:rotate-180" />
          </summary>
          <ol className="grid gap-px bg-rule">
            {r.criteria.map((c) => {
              const m = MATCH_META[c.match];
              return (
                <li key={c.rank} className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-3 bg-card px-5 py-3">
                  <span className="font-mono text-[0.85rem] text-ink-2">{String(c.rank).padStart(2, "0")}</span>
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-semibold text-ink">
                      {c.title}
                      <span className={clsx("inline-flex items-center gap-1 rounded-[3px] px-1.5 py-0.5 text-[0.8rem]", m.tone)}>
                        <m.Icon size={13} /> {MATCH_LABEL[c.match]}
                      </span>
                    </p>
                    {c.reasons.map((x) => (
                      <p key={x} className="mt-0.5 text-small text-ink-2">
                        {x}
                      </p>
                    ))}
                    {c.locator ? <p className="mt-0.5 font-mono text-[0.78rem] text-ink-2">Policy reference: {c.locator}</p> : null}
                  </div>
                </li>
              );
            })}
          </ol>
        </details>
      ) : null}
      <div className="grid gap-5 px-5 py-4 sm:grid-cols-3">
        {(
          [
            ["What you satisfy", r.satisfied, "Nothing confirmed yet"],
            ["Still unknown", r.unknown, "—"],
            ["Next steps", r.nextActions, "—"],
          ] as const
        ).map(([t, items, empty]) => (
          <div key={t}>
            <p className="label text-[0.72rem]">{t}</p>
            <ul className="mt-1.5 grid gap-1 text-[0.95rem] leading-snug text-ink">{items.length ? items.map((s) => <li key={s}>{s}</li>) : <li className="text-ink-2">{empty}</li>}</ul>
          </div>
        ))}
      </div>
      <p className="border-t border-dashed border-rule px-5 py-3 text-small text-ink-2">
        Evidence:{" "}
        {source ? (
          <a href={source.url} className="a" target="_blank" rel="noopener noreferrer">
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
  // null = not chosen yet, so follow the parent's shortlist (first five).
  const [chosen, setChosen] = useState<{ slug: string; name: string }[] | null>(initialSchools.length ? initialSchools : null);
  const fromShortlist = useMemo(() => list.slice(0, 5), [list]);
  const schools = chosen ?? fromShortlist;
  const setSchools = (update: (current: { slug: string; name: string }[]) => { slug: string; name: string }[]) => setChosen(update(schools));
  const [entryYear, setEntryYear] = useState(defaultYear);
  const [answers, setAnswers] = useState<Answers>({});
  const [scenario, setScenario] = useState<{ testSlug: string; score: number } | null>(null);
  const [scenarioData, setScenarioData] = useState<Response | null>(null);
  const [q, setQ] = useState("");
  const [sugResults, setSugs] = useState<{ label: string; href: string; sublabel: string; type: string }[]>([]);
  const sugs = q.trim().length < 2 ? [] : sugResults;
  // Results are keyed by the request that produced them, so "busy" is derived rather than toggled.
  const requestKey = JSON.stringify([schools.map((s) => s.slug), entryYear, answers]);
  const [result, setResult] = useState<{ key: string; data: Response | null; error: string | null } | null>(null);
  const data = result?.data ?? null;
  const error = result?.error ?? null;
  const busy = result?.key !== requestKey;

  const run = useCallback(
    async (a: Answers) => {
      if (!schools.length) return null;
      const res = await fetch("/api/eligibility", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ schools: schools.map((s) => s.slug), entryYear, answers: a }) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Something went wrong");
      return (await res.json()) as Response;
    },
    [schools, entryYear],
  );

  useEffect(() => {
    let cancelled = false;
    run(answers)
      .then((d) => {
        if (!cancelled) setResult({ key: requestKey, data: d, error: null });
      })
      .catch((e: Error) => {
        if (!cancelled) setResult((r) => ({ key: requestKey, data: r?.data ?? null, error: e.message }));
      });
    return () => {
      cancelled = true;
    };
    // Re-run when answers change too, so results stay in sync with the form.
  }, [run, answers, requestKey]);

  useEffect(() => {
    if (q.trim().length < 2) return;
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
  const isAnswered = (x: Question): boolean => {
    switch (x.kind) {
      case "childSex":
        return answers.childSex != null;
      case "test": {
        const t = answers.tests?.[x.testSlug];
        return !!t?.status && (t.status !== "have_result" || t.score != null);
      }
      case "lookedAfter":
        return answers.lookedAfter != null;
      case "pupilPremium":
        return answers.pupilPremium != null;
      case "medicalSocial":
        return answers.medicalSocial != null;
      case "sibling":
        return answers.sibling?.[x.school] != null;
      case "staffChild":
        return answers.staffChild?.[x.school] != null;
      case "catchment":
        return x.hasVerifiedBoundary || answers.catchment?.[x.school] != null;
    }
  };
  const asked = questions.filter((x) => !(x.kind === "catchment" && x.hasVerifiedBoundary));
  const answeredCount = asked.filter(isAnswered).length;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-x-8 gap-y-8 lg:grid-cols-[25rem_minmax(0,1fr)]">
      <form className="grid content-start gap-7" onSubmit={(e) => e.preventDefault()} aria-label="Your situation">
        <section className="grid gap-3">
          <p className="flex items-center gap-3">
            <span className="grid size-7 place-items-center rounded-full bg-ink font-mono text-[0.8rem] text-paper">1</span>
            <label htmlFor="ec-year" className="font-semibold text-ink">
              When will your child start secondary school?
            </label>
          </p>
          <span className="relative block">
            <select id="ec-year" value={entryYear} onChange={(e) => setEntryYear(Number(e.target.value))} className={select}>
              {years.map((y) => (
                <option key={y} value={y}>
                  September {y}
                </option>
              ))}
            </select>
            <IconChevron size={16} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-ink-2" />
          </span>
        </section>

        <fieldset className="grid gap-3">
          <legend className="mb-3 flex items-center gap-3 font-semibold text-ink">
            <span className="grid size-7 place-items-center rounded-full bg-ink font-mono text-[0.8rem] text-paper">2</span>
            Schools to check <span className="font-normal text-ink-2">· up to five</span>
          </legend>
          {schools.length ? (
            <ul className="grid gap-px overflow-hidden rounded-[6px] border border-rule bg-rule">
              {schools.map((s) => (
                <li key={s.slug} className="flex items-center justify-between gap-2 bg-card py-1.5 pr-1.5 pl-4">
                  <span className="truncate font-semibold text-ink">{s.name}</span>
                  <button type="button" onClick={() => setSchools((x) => x.filter((y) => y.slug !== s.slug))} aria-label={`Remove ${s.name}`} className="grid size-9 shrink-0 place-items-center rounded-[4px] text-ink-2 hover:bg-sage hover:text-ink">
                    <IconClose size={16} />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {schools.length < 5 ? (
            <div className="relative">
              <label htmlFor="ec-add" className="sr-only">
                Add a school
              </label>
              <IconPlus size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-3" />
              <input id="ec-add" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Add a school" autoComplete="off" className={clsx(controlClass, "pl-9")} />
              {sugs.length ? (
                <ul className="anim-fade absolute z-20 mt-1 w-full overflow-hidden rounded-[6px] border border-rule bg-card shadow-lift">
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
                          className="block w-full px-4 py-2.5 text-left hover:bg-green-wash"
                        >
                          <span className="block font-semibold text-ink">{s.label}</span>
                          <span className="block text-small text-ink-2">{s.sublabel}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          ) : null}
        </fieldset>

        {asked.length ? (
          <section className="grid gap-3" aria-labelledby="ec-q">
            <div className="flex items-center gap-3">
              <span className="grid size-7 place-items-center rounded-full bg-ink font-mono text-[0.8rem] text-paper">3</span>
              <p id="ec-q" className="font-semibold text-ink">
                Only the questions these schools&apos; rules depend on
              </p>
            </div>
            <div className="flex items-center gap-3 pl-10">
              <span aria-hidden className="h-1.5 flex-1 overflow-hidden rounded-full bg-sage-deep">
                <span className="block h-full origin-left rounded-full bg-green-bright transition-transform duration-[var(--d-3)] ease-[var(--ease-out)]" style={{ transform: `scaleX(${asked.length ? answeredCount / asked.length : 0})` }} />
              </span>
              <span className="font-mono text-[0.8rem] text-ink-2">
                {answeredCount}/{asked.length}
              </span>
            </div>
            {questions.map((x) => {
              switch (x.kind) {
                case "childSex":
                  return (
                    <Q key="sex" answered={isAnswered(x)} legend="Some of these schools are single-sex. Is your child a boy or a girl?">
                      <Choice name="sex" value={answers.childSex === "boy" ? true : answers.childSex === "girl" ? false : null} onChange={(v) => set({ childSex: v === true ? "boy" : v === false ? "girl" : null })} labels={["Boy", "Girl", "Prefer not to say"]} />
                    </Q>
                  );
                case "test": {
                  const t = answers.tests?.[x.testSlug] ?? {};
                  return (
                    <Q key={`t-${x.testSlug}`} answered={isAnswered(x)} legend={x.testName} hint={`Used by ${x.schools.join(", ")}. Only enter a score from this test.`}>
                      <label htmlFor={`ts-${x.testSlug}`} className="sr-only">
                        Test status
                      </label>
                      <SelectBox
                        id={`ts-${x.testSlug}`}
                        value={t.status ?? ""}
                        onChange={(e) => set({ tests: { ...(answers.tests ?? {}), [x.testSlug]: { status: (e.target.value || null) as never, score: e.target.value === "have_result" ? t.score : null } } })}
                      >
                        <option value="">Not sure / prefer not to say</option>
                        <option value="not_registered">Not registered yet</option>
                        <option value="registered">Registered, not yet sat</option>
                        <option value="sat_awaiting">Sat it, waiting for the result</option>
                        <option value="have_result">We have the result</option>
                      </SelectBox>
                      {t.status === "have_result" ? (
                        <div className="anim-rise mt-3">
                          <label htmlFor={`sc-${x.testSlug}`} className="text-small font-semibold text-ink">
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
                            className={clsx(controlClass, "mt-1 font-mono")}
                          />
                        </div>
                      ) : null}
                    </Q>
                  );
                }
                case "lookedAfter":
                  return (
                    <Q key="la" answered={isAnswered(x)} legend="Is your child looked after by a local authority, or were they previously looked after (for example, adopted from care)?">
                      <SelectBox value={answers.lookedAfter ?? ""} onChange={(e) => set({ lookedAfter: (e.target.value || null) as Answers["lookedAfter"] })} aria-label="Looked after status">
                        <option value="">Not sure / prefer not to say</option>
                        <option value="looked_after">Currently looked after</option>
                        <option value="previously_looked_after">Previously looked after</option>
                        <option value="no">Neither</option>
                      </SelectBox>
                    </Q>
                  );
                case "pupilPremium":
                  return (
                    <Q key="pp" answered={isAnswered(x)} legend="Is your child eligible for the Pupil Premium?" hint="Often because they have received free school meals in the last six years. Each school's policy says how eligibility is evidenced and by when.">
                      <Choice name="pp" value={answers.pupilPremium} onChange={(v) => set({ pupilPremium: v })} />
                    </Q>
                  );
                case "medicalSocial":
                  return (
                    <Q key="ms" answered={isAnswered(x)} legend="Do you have professional written evidence of an exceptional medical or social need for a particular school?">
                      <Choice name="ms" value={answers.medicalSocial} onChange={(v) => set({ medicalSocial: v })} />
                    </Q>
                  );
                case "sibling":
                  return (
                    <Q key={`sib-${x.school}`} answered={isAnswered(x)} legend={`Will a brother or sister be at ${x.schoolName} when your child starts?`}>
                      <Choice name={`sib-${x.school}`} value={answers.sibling?.[x.school]} onChange={(v) => set({ sibling: { ...(answers.sibling ?? {}), [x.school]: v } })} />
                    </Q>
                  );
                case "staffChild":
                  return (
                    <Q key={`staff-${x.school}`} answered={isAnswered(x)} legend={`Does a parent work at ${x.schoolName} and meet its staff criterion?`}>
                      <Choice name={`staff-${x.school}`} value={answers.staffChild?.[x.school]} onChange={(v) => set({ staffChild: { ...(answers.staffChild ?? {}), [x.school]: v } })} />
                    </Q>
                  );
                case "catchment":
                  return x.hasVerifiedBoundary ? null : (
                    <Q
                      key={`c-${x.school}`}
                      answered={isAnswered(x)}
                      legend={`Have you confirmed with the official checker that your address is in ${x.schoolName}'s catchment area?`}
                      hint="We don't hold a verified boundary for this school, so we can't check it for you. Being near the school is not the same as being in its catchment."
                    >
                      <Choice name={`c-${x.school}`} value={answers.catchment?.[x.school]} onChange={(v) => set({ catchment: { ...(answers.catchment ?? {}), [x.school]: v } })} labels={["Yes, it's inside", "No, it's outside", "Not checked"]} />
                    </Q>
                  );
              }
            })}
          </section>
        ) : null}
        {needsPostcode ? (
          <div>
            <label htmlFor="ec-pc" className="font-semibold text-ink">
              Home postcode <span className="font-normal text-ink-2">(checked against verified boundaries, not stored)</span>
            </label>
            <input id="ec-pc" value={answers.postcode ?? ""} onChange={(e) => set({ postcode: e.target.value || null })} className={clsx(controlClass, "mt-2 uppercase")} />
          </div>
        ) : null}
        <p className="text-small text-ink-2">We never ask for your child&apos;s name or date of birth. Answers are used only to calculate this page and are not saved.</p>
      </form>

      <section aria-labelledby="ec-results" aria-busy={busy} className="min-w-0">
        <div className="mb-4 flex items-center justify-between gap-3 border-b border-ink pb-2">
          <h2 id="ec-results" className="label text-ink">
            How the rules apply
          </h2>
          <span aria-hidden className={clsx("font-mono text-[0.78rem] text-ink-2 transition-opacity", busy && schools.length ? "opacity-100" : "opacity-0")}>
            updating…
          </span>
        </div>
        {error ? <p className="rounded-[5px] border border-bad/30 bg-bad-wash p-4 font-semibold text-bad">{error}</p> : null}
        {!schools.length ? (
          <div className="grid place-items-center rounded-[8px] border border-dashed border-rule-strong bg-card px-6 py-10 text-center">
            <p className="font-display text-[1.3rem] text-ink">Add a school to start.</p>
            <p className="mt-1 text-ink-2">Your shortlist is added automatically.</p>
          </div>
        ) : null}
        {data?.postcodeNote ? <p className="mb-3 rounded-[5px] bg-pend-wash p-3 text-[0.95rem] text-pend">{data.postcodeNote}</p> : null}
        <div className="grid gap-5" aria-live="polite">
          {data?.results.map((r) => (
            <ResultCard key={r.schoolSlug} r={r} source={data.schools.find((s) => s.slug === r.schoolSlug)?.policySource ?? null} />
          ))}
        </div>
        {testQs.length ? (
          <div className="mt-8 rounded-[8px] border border-dashed border-copper/60 bg-copper-wash/50 p-5">
            <p className="label text-copper-ink">Hypothetical</p>
            <h3 className="mt-1 text-h4">Illustrative scenario</h3>
            <p className="mt-1 text-[0.98rem] text-ink-2">See how the rules would apply with a different score. This is a hypothetical illustration, not a prediction.</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_8rem_auto] sm:items-end">
              <span className="relative block">
                <select aria-label="Test" className={select} value={scenario?.testSlug ?? testQs[0]!.testSlug} onChange={(e) => setScenario({ testSlug: e.target.value, score: scenario?.score ?? 0 })}>
                  {testQs.map((t) => (
                    <option key={t.testSlug} value={t.testSlug}>
                      {t.testName}
                    </option>
                  ))}
                </select>
                <IconChevron size={16} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-ink-2" />
              </span>
              <input aria-label="Hypothetical score" type="number" placeholder="Score" className={clsx(controlClass, "font-mono")} onChange={(e) => setScenario({ testSlug: scenario?.testSlug ?? testQs[0]!.testSlug, score: Number(e.target.value) })} />
              <button type="button" onClick={runScenario} className="inline-flex min-h-11 items-center justify-center rounded-[5px] border border-control bg-card px-4 font-semibold text-ink hover:border-ink">
                Show scenario
              </button>
            </div>
            {scenarioData ? (
              <div className="mt-4 grid gap-3">
                {scenarioData.results.map((r) => (
                  <div key={r.schoolSlug} className="anim-rise rounded-[6px] border border-dashed border-rule-strong bg-card p-4 text-[0.95rem]">
                    <p className="font-semibold text-ink">
                      Scenario · {r.schoolName}: {ACADEMIC_LABEL[r.academic.status]} · {OVERALL_LABEL[r.overall]}
                    </p>
                    <p className="mt-1 leading-relaxed text-ink-2">{r.outlook}</p>
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
