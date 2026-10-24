"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { clsx } from "clsx";
import { QUESTIONS, SKILL_LABEL, type Skill } from "@/content/practice";
import { useStoredJson } from "@/lib/use-stored-json";
import { IconArrow, IconArrowLeft, IconCheck, IconCross } from "../icons";

const KEY = "gsi.practice.v1";
interface Attempt {
  at: string;
  skill: Skill | "mixed";
  correct: number;
  total: number;
  seconds: number;
  byTopic: Record<string, [number, number]>;
}
const NO_HISTORY: Attempt[] = [];
const LETTERS = ["A", "B", "C", "D", "E"];

function shuffle<T>(a: T[]): T[] {
  const r = a.slice();
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j]!, r[i]!];
  }
  return r;
}

const SETS: { key: Skill | "mixed"; label: string; text: string }[] = [
  { key: "mixed", label: "Mixed", text: "A bit of everything" },
  { key: "maths", label: SKILL_LABEL.maths, text: "Arithmetic to algebra" },
  { key: "verbal", label: SKILL_LABEL.verbal, text: "Codes, series, logic" },
  { key: "english", label: SKILL_LABEL.english, text: "Words and meaning" },
];

/** Score as an arc: the share correct, with the count in words beside it. */
function ScoreArc({ correct, total }: { correct: number; total: number }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const p = total ? correct / total : 0;
  return (
    <svg viewBox="0 0 80 80" width="88" height="88" aria-hidden className="shrink-0 -rotate-90">
      <circle cx="40" cy="40" r={r} fill="none" strokeWidth="7" style={{ stroke: "var(--sage-deep)" }} />
      <circle cx="40" cy="40" r={r} fill="none" strokeWidth="7" strokeLinecap="round" strokeDasharray={`${c * p} ${c}`} style={{ stroke: "var(--green-bright)", transition: "stroke-dasharray var(--d-4) var(--ease-out)" }} />
    </svg>
  );
}

/** Timed practice with per-topic diagnostics. Progress stays in this browser only. */
export function PracticeTool() {
  const [skill, setSkill] = useState<Skill | "mixed">("mixed");
  const [running, setRunning] = useState(false);
  const [order, setOrder] = useState<string[]>([]);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [start, setStart] = useState(0);
  const [now, setNow] = useState(0);
  const [history, setHistory] = useStoredJson(KEY, NO_HISTORY);
  const [done, setDone] = useState<Attempt | null>(null);

  const finishRef = useRef<() => void>(() => {});

  const qs = useMemo(() => order.map((id) => QUESTIONS.find((q) => q.id === id)).filter((q): q is (typeof QUESTIONS)[number] => !!q), [order]);
  const q = qs[idx];
  const limit = qs.length * 60;
  const elapsed = running ? Math.floor((now - start) / 1000) : 0;
  const remaining = Math.max(0, limit - elapsed);

  function begin() {
    const pool = skill === "mixed" ? QUESTIONS : QUESTIONS.filter((x) => x.skill === skill);
    setOrder(shuffle(pool).slice(0, 10).map((x) => x.id));
    setIdx(0);
    setAnswers({});
    setStart(Date.now());
    setNow(Date.now());
    setDone(null);
    setRunning(true);
  }

  function finish() {
    const byTopic: Record<string, [number, number]> = {};
    let correct = 0;
    for (const x of qs) {
      const ok = answers[x.id] === x.answer;
      if (ok) correct++;
      const t = byTopic[x.topic] ?? [0, 0];
      byTopic[x.topic] = [t[0] + (ok ? 1 : 0), t[1] + 1];
    }
    const attempt: Attempt = { at: new Date().toISOString(), skill, correct, total: qs.length, seconds: Math.floor((Date.now() - start) / 1000), byTopic };
    setHistory([attempt, ...history].slice(0, 20));
    setDone(attempt);
    setRunning(false);
  }

  useEffect(() => {
    finishRef.current = finish;
  });
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (limit > 0 && (n - start) / 1000 >= limit) finishRef.current();
    }, 1000);
    return () => clearInterval(t);
  }, [running, start, limit]);

  if (!running && !done) {
    const counts = { mixed: QUESTIONS.length, maths: 0, verbal: 0, english: 0 } as Record<Skill | "mixed", number>;
    for (const x of QUESTIONS) counts[x.skill]++;
    return (
      <div className="overflow-hidden rounded-[8px] border border-rule bg-card">
        <fieldset className="p-5 sm:p-6">
          <legend className="float-left w-full font-display text-[1.35rem] text-ink">Choose a practice set</legend>
          <p className="clear-both pt-1 text-[0.98rem] text-ink-2">Up to 10 questions, one minute each.</p>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {SETS.map((s) => (
              <label key={s.key} className="cursor-pointer">
                <input type="radio" name="skill" value={s.key} checked={skill === s.key} onChange={() => setSkill(s.key)} className="peer sr-only" />
                <span className="flex items-center justify-between gap-3 rounded-[6px] border border-control bg-paper px-4 py-3.5 transition-colors duration-[var(--d-1)] peer-checked:border-green peer-checked:bg-green-wash peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-green hover:border-ink">
                  <span>
                    <span className="block font-semibold text-ink">{s.label}</span>
                    <span className="text-small text-ink-2">{s.text}</span>
                  </span>
                  <span className="font-mono text-[0.8rem] text-ink-2">{Math.min(10, counts[s.key])} Qs</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule bg-paper px-5 py-4 sm:px-6">
          <p className="text-small text-ink-2">The clock starts when you press start.</p>
          <button type="button" onClick={begin} className="group/st inline-flex min-h-11 items-center gap-2 rounded-[5px] bg-green px-5 font-semibold text-paper transition-colors hover:bg-green-deep active:scale-[0.98]">
            Start practice
            <IconArrow size={16} className="transition-transform duration-[var(--d-2)] group-hover/st:translate-x-0.5" />
          </button>
        </div>
        {history.length ? (
          <div className="border-t border-rule px-5 py-5 sm:px-6">
            <p className="label">Your recent sets · saved in this browser only</p>
            <ul className="mt-3 grid gap-1.5">
              {history.slice(0, 5).map((h) => (
                <li key={h.at} className="grid grid-cols-[6.5rem_minmax(0,1fr)_4rem] items-center gap-3 text-[0.95rem] text-ink-2">
                  <span className="font-mono text-[0.85rem]">{new Date(h.at).toLocaleDateString("en-GB")}</span>
                  <span className="flex items-center gap-2">
                    <span aria-hidden className="h-1.5 w-20 rounded-full bg-sage-deep">
                      <span className="block h-full rounded-full bg-green-bright" style={{ width: `${(h.correct / Math.max(1, h.total)) * 100}%` }} />
                    </span>
                    {h.skill === "mixed" ? "Mixed" : SKILL_LABEL[h.skill]}
                  </span>
                  <span className="text-right font-mono text-ink">
                    {h.correct}/{h.total}
                  </span>
                </li>
              ))}
            </ul>
            <button type="button" className="mt-3 text-small text-ink-2 underline underline-offset-2 hover:text-ink" onClick={() => setHistory(null)}>
              Clear history
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  if (done) {
    const weak = Object.entries(done.byTopic).filter(([, [c, t]]) => c < t);
    return (
      <div className="anim-rise overflow-hidden rounded-[8px] border border-rule bg-card" aria-live="polite">
        <div className="flex flex-wrap items-center gap-5 border-b border-rule bg-paper px-5 py-5 sm:px-6">
          <ScoreArc correct={done.correct} total={done.total} />
          <div>
            <p className="font-display text-[2rem] leading-none text-ink">
              {done.correct} out of {done.total}
            </p>
            <p className="mt-1.5 font-mono text-[0.85rem] text-ink-2">
              Time taken: {Math.floor(done.seconds / 60)} min {done.seconds % 60} s
            </p>
          </div>
        </div>
        <div className="grid gap-8 p-5 sm:p-6 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
          <div>
            <h3 className="label text-ink">By topic</h3>
            <ul className="mt-3 grid gap-2.5">
              {Object.entries(done.byTopic).map(([t, [c, n]]) => (
                <li key={t}>
                  <span className="flex justify-between text-[0.95rem]">
                    <span className="text-ink">{t}</span>
                    <span className="font-mono text-ink-2">
                      {c}/{n}
                    </span>
                  </span>
                  <span aria-hidden className="mt-1 block h-1.5 rounded-full bg-sage-deep">
                    <span className={clsx("block h-full rounded-full", c === n ? "bg-green-bright" : "bg-copper")} style={{ width: `${(c / n) * 100}%` }} />
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[0.95rem] leading-relaxed text-ink-2">{weak.length ? `Topics to revisit: ${weak.map(([t]) => t).join(", ")}.` : "All topics correct in this set."}</p>
          </div>
          <div>
            <h3 className="label text-ink">Answers</h3>
            <ol className="mt-3 grid gap-3">
              {qs.map((x, i) => {
                const ok = answers[x.id] === x.answer;
                return (
                  <li key={x.id} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-2 border-t border-rule pt-3">
                    <span className={clsx("grid size-6 place-items-center rounded-full", ok ? "bg-ok-wash text-ok" : "bg-bad-wash text-bad")}>{ok ? <IconCheck size={14} /> : <IconCross size={14} />}</span>
                    <div className="min-w-0">
                      <p className="font-semibold text-ink">
                        <span className="mr-2 font-mono text-[0.8rem] font-normal text-ink-2">{String(i + 1).padStart(2, "0")}</span>
                        {x.prompt}
                      </p>
                      <p className={clsx("mt-1 text-[0.95rem] font-semibold", ok ? "text-ok" : "text-bad")}>
                        {ok ? "Correct" : `Your answer: ${answers[x.id] !== undefined ? x.options[answers[x.id]!] : "none"} — correct answer: ${x.options[x.answer]}`}
                      </p>
                      <p className="mt-1 text-[0.95rem] leading-relaxed text-ink-2">{x.explanation}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
        <div className="border-t border-rule bg-paper px-5 py-4 sm:px-6">
          <button type="button" onClick={() => setDone(null)} className="inline-flex min-h-11 items-center rounded-[5px] border border-control bg-card px-4 font-semibold text-ink hover:border-ink">
            Try another set
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[8px] border border-rule bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule bg-paper px-5 py-3 sm:px-6">
        <ol aria-label={`Question ${idx + 1} of ${qs.length}`} className="flex gap-1">
          {qs.map((x, i) => (
            <li key={x.id} aria-hidden className={clsx("h-2 w-5 rounded-[1px] transition-colors duration-[var(--d-2)]", i === idx ? "bg-copper" : answers[x.id] !== undefined ? "bg-green-bright" : "bg-sage-deep")} />
          ))}
        </ol>
        <span className="flex items-center gap-2 font-mono text-[1rem] text-ink" role="timer" aria-label="Time remaining">
          <span aria-hidden className="h-1.5 w-16 overflow-hidden rounded-full bg-sage-deep">
            <span className="block h-full origin-left bg-green-bright transition-transform duration-1000 ease-linear" style={{ transform: `scaleX(${limit ? remaining / limit : 0})` }} />
          </span>
          {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}
        </span>
      </div>
      {q ? (
        <fieldset key={q.id} className="anim-rise px-5 pt-5 pb-2 sm:px-6">
          <p className="label">
            Question {idx + 1} of {qs.length} · {SKILL_LABEL[q.skill]} · {q.topic}
          </p>
          <legend className="sr-only">{q.prompt}</legend>
          <p aria-hidden className="mt-3 font-display text-[1.45rem] leading-snug text-ink">
            {q.prompt}
          </p>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {q.options.map((o, i) => (
              <label key={o} className="cursor-pointer">
                <input type="radio" name={q.id} checked={answers[q.id] === i} onChange={() => setAnswers((a) => ({ ...a, [q.id]: i }))} className="peer sr-only" />
                <span className="flex min-h-12 items-center gap-3 rounded-[6px] border border-control bg-paper px-3 py-2.5 text-[1.02rem] text-ink transition-colors duration-[var(--d-1)] peer-checked:border-green peer-checked:bg-green-wash peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-green hover:border-ink [&>b]:peer-checked:border-green [&>b]:peer-checked:bg-green [&>b]:peer-checked:text-paper">
                  <b className="grid size-7 shrink-0 place-items-center rounded-[4px] border border-control bg-card font-mono text-[0.85rem] font-medium text-ink-2">{LETTERS[i]}</b>
                  {o}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}
      <div className="mt-4 flex justify-between gap-2 border-t border-rule px-5 py-4 sm:px-6">
        <button type="button" disabled={idx === 0} onClick={() => setIdx((i) => i - 1)} className="inline-flex min-h-11 items-center gap-1.5 rounded-[5px] border border-control bg-card px-4 font-semibold text-ink hover:border-ink disabled:opacity-40">
          <IconArrowLeft size={16} /> Back
        </button>
        {idx < qs.length - 1 ? (
          <button type="button" onClick={() => setIdx((i) => i + 1)} className="inline-flex min-h-11 items-center gap-1.5 rounded-[5px] bg-green px-4 font-semibold text-paper hover:bg-green-deep">
            Next
          </button>
        ) : (
          <button type="button" onClick={finish} className="inline-flex min-h-11 items-center gap-1.5 rounded-[5px] bg-copper-ink px-4 font-semibold text-paper hover:bg-ink">
            Finish and see results
          </button>
        )}
      </div>
    </div>
  );
}
