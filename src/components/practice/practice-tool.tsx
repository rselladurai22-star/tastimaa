"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { clsx } from "clsx";
import { QUESTIONS, SKILL_LABEL, type Skill } from "@/content/practice";
import { useStoredJson } from "@/lib/use-stored-json";

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

function shuffle<T>(a: T[]): T[] {
  const r = a.slice();
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j]!, r[i]!];
  }
  return r;
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
    return (
      <div className="rounded-xl border border-line bg-surface p-6">
        <fieldset>
          <legend className="font-semibold text-ink">Choose a practice set (up to 10 questions, 1 minute each)</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {(["mixed", "maths", "verbal", "english"] as const).map((s) => (
              <label key={s} className={clsx("cursor-pointer rounded-full border px-4 py-2 text-sm font-medium has-[:focus-visible]:outline has-[:focus-visible]:outline-2", skill === s ? "border-accent bg-accent-soft text-accent-ink" : "border-line-strong text-ink-2")}>
                <input type="radio" name="skill" value={s} checked={skill === s} onChange={() => setSkill(s)} className="sr-only" />
                {s === "mixed" ? "Mixed" : SKILL_LABEL[s]}
              </label>
            ))}
          </div>
        </fieldset>
        <button type="button" onClick={begin} className="mt-5 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover dark:text-[#0f1112]">
          Start practice
        </button>
        {history.length ? (
          <div className="mt-6 border-t border-line pt-4">
            <p className="text-sm font-semibold text-ink">Your recent sets (saved in this browser only)</p>
            <ul className="mt-2 grid gap-1 text-sm text-ink-2 tabular">
              {history.slice(0, 5).map((h) => (
                <li key={h.at}>
                  {new Date(h.at).toLocaleDateString("en-GB")} · {h.skill === "mixed" ? "Mixed" : SKILL_LABEL[h.skill]} · {h.correct}/{h.total} · {Math.round(h.seconds / 60)} min
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="mt-2 text-xs text-ink-3 underline"
              onClick={() => {
                setHistory(null);
              }}
            >
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
      <div className="rounded-xl border border-line bg-surface p-6" aria-live="polite">
        <p className="text-2xl font-semibold text-ink">
          {done.correct} out of {done.total}
        </p>
        <p className="text-sm text-ink-3">
          Time taken: {Math.floor(done.seconds / 60)} min {done.seconds % 60} s
        </p>
        <h3 className="mt-5 font-sans text-sm font-semibold">By topic</h3>
        <ul className="mt-2 grid gap-1 text-sm">
          {Object.entries(done.byTopic).map(([t, [c, n]]) => (
            <li key={t} className="flex justify-between border-b border-line/60 py-1">
              <span>{t}</span>
              <span className="tabular">
                {c}/{n}
              </span>
            </li>
          ))}
        </ul>
        {weak.length ? <p className="mt-3 text-sm text-ink-2">Topics to revisit: {weak.map(([t]) => t).join(", ")}.</p> : <p className="mt-3 text-sm text-ink-2">All topics correct in this set.</p>}
        <h3 className="mt-5 font-sans text-sm font-semibold">Answers</h3>
        <ol className="mt-2 grid gap-3 text-sm">
          {qs.map((x) => (
            <li key={x.id} className="rounded-lg border border-line p-3">
              <p className="font-medium text-ink">{x.prompt}</p>
              <p className={answers[x.id] === x.answer ? "mt-1 text-ok" : "mt-1 text-bad"}>
                {answers[x.id] === x.answer ? "Correct" : `Your answer: ${answers[x.id] !== undefined ? x.options[answers[x.id]!] : "none"} — correct answer: ${x.options[x.answer]}`}
              </p>
              <p className="mt-1 text-ink-2">{x.explanation}</p>
            </li>
          ))}
        </ol>
        <button type="button" onClick={() => setDone(null)} className="mt-5 rounded-lg border border-line-strong px-4 py-2 text-sm font-medium">
          Try another set
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-line bg-surface p-6">
      <div className="flex items-center justify-between text-sm text-ink-3">
        <span>
          Question {idx + 1} of {qs.length} · {q ? SKILL_LABEL[q.skill] : ""} · {q?.topic}
        </span>
        <span className="tabular" role="timer" aria-label="Time remaining">
          {Math.max(0, Math.floor((limit - elapsed) / 60))}:{String(Math.max(0, (limit - elapsed) % 60)).padStart(2, "0")}
        </span>
      </div>
      {q ? (
        <fieldset className="mt-4">
          <legend className="text-lg font-semibold text-ink">{q.prompt}</legend>
          <div className="mt-4 grid gap-2">
            {q.options.map((o, i) => (
              <label key={o} className={clsx("flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm", answers[q.id] === i ? "border-accent bg-accent-soft" : "border-line hover:border-line-strong")}>
                <input type="radio" name={q.id} checked={answers[q.id] === i} onChange={() => setAnswers((a) => ({ ...a, [q.id]: i }))} className="size-4 accent-[var(--accent)]" />
                {o}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}
      <div className="mt-5 flex justify-between gap-2">
        <button type="button" disabled={idx === 0} onClick={() => setIdx((i) => i - 1)} className="rounded-lg border border-line-strong px-4 py-2 text-sm font-medium disabled:opacity-40">
          Back
        </button>
        {idx < qs.length - 1 ? (
          <button type="button" onClick={() => setIdx((i) => i + 1)} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white dark:text-[#0f1112]">
            Next
          </button>
        ) : (
          <button type="button" onClick={finish} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white dark:text-[#0f1112]">
            Finish and see results
          </button>
        )}
      </div>
    </div>
  );
}
