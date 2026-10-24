"use client";

import { useState } from "react";
import { clsx } from "clsx";
import type { AssistantAnswer } from "@/ai/assistant";
import { IconArrow, IconExternal, IconSend } from "../icons";

const EXAMPLES = [
  "Does passing the test guarantee a place at Aylesbury Grammar School?",
  "Can my child apply to a grammar school in another county?",
  "What are the SEAG test dates for 2027 entry?",
  "How do I appeal if we are refused a place?",
  "How many offers did Latymer make to families from other councils?",
];

interface Turn {
  q: string;
  a: AssistantAnswer | null;
  error?: string;
}

function Cite({ n }: { n: number }) {
  return (
    <sup className="ml-0.5">
      <a href={`#src-${n}`} className="font-mono text-[0.72rem] font-medium text-copper-ink no-underline hover:underline">
        [{n}]
      </a>
    </sup>
  );
}

/** Research desk: each question becomes a short memo with numbered citations and its bibliography. */
export function AssistantChat({ llmEnabled }: { llmEnabled: boolean }) {
  const [q, setQ] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);

  async function submit(question: string) {
    if (!question.trim() || busy) return;
    setBusy(true);
    setQ("");
    setTurns((t) => [...t, { q: question, a: null }]);
    try {
      const res = await fetch("/api/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question }) });
      const json = await res.json();
      setTurns((t) => t.map((x, i) => (i === t.length - 1 ? (res.ok ? { ...x, a: json as AssistantAnswer } : { ...x, error: json.error ?? "Something went wrong." }) : x)));
    } catch {
      setTurns((t) => t.map((x, i) => (i === t.length - 1 ? { ...x, error: "The assistant couldn't be reached. Please try again." } : x)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8">
      {!llmEnabled ? (
        <p className="border-l-2 border-info pl-4 text-[0.98rem] text-ink-2">AI summaries are not configured on this site, so answers show the most relevant verified facts and official passages directly, with sources.</p>
      ) : null}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(q);
        }}
        className="sticky top-[calc(var(--header-h)+0.75rem)] z-20 rounded-[8px] border border-ink bg-card shadow-lift"
      >
        <label htmlFor="as-q" className="label block px-4 pt-3">
          Your question
        </label>
        <div className="flex items-end gap-2 px-2 pb-2">
          <textarea
            id="as-q"
            rows={2}
            value={q}
            maxLength={500}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit(q);
              }
            }}
            placeholder="Ask about a school, a test or the admissions process"
            className="min-h-12 min-w-0 flex-1 resize-none bg-transparent px-2 py-2 font-display text-[1.2rem] leading-snug text-ink outline-none placeholder:text-ink-3"
          />
          <button type="submit" disabled={busy || !q.trim()} className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-[5px] bg-green px-4 font-semibold text-paper hover:bg-green-deep disabled:opacity-50">
            <IconSend size={16} /> Ask
          </button>
        </div>
        <p className="border-t border-rule px-4 py-2 text-small text-ink-2">Don&apos;t include your child&apos;s name or other personal details. Questions are stored without any identifying information to improve the service.</p>
      </form>

      {turns.length === 0 ? (
        <section aria-labelledby="as-examples">
          <h2 id="as-examples" className="label mb-3">
            Questions parents ask
          </h2>
          <ol className="border-t border-rule">
            {EXAMPLES.map((e, i) => (
              <li key={e} className="border-b border-rule">
                <button type="button" onClick={() => submit(e)} className="group/ex grid w-full grid-cols-[2.5rem_minmax(0,1fr)_auto] items-baseline gap-2 py-3.5 text-left">
                  <span className="font-mono text-[0.8rem] text-copper-ink">{String(i + 1).padStart(2, "0")}</span>
                  <span className="font-display text-[1.15rem] leading-snug text-ink group-hover/ex:text-green">{e}</span>
                  <IconArrow size={16} className="self-center text-ink-3 transition-transform duration-[var(--d-2)] group-hover/ex:translate-x-1 group-hover/ex:text-green" />
                </button>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <ol className="grid gap-12" aria-live="polite">
        {turns.map((t, i) => (
          <li key={i} className="anim-rise grid gap-5">
            <div className="flex items-baseline gap-4 border-b border-ink pb-3">
              <span className="font-mono text-[0.8rem] text-copper-ink">Q.{String(i + 1).padStart(2, "0")}</span>
              <p className="font-display text-[1.45rem] leading-snug text-ink">{t.q}</p>
            </div>
            {t.error ? <p className="rounded-[5px] border border-bad/30 bg-bad-wash px-4 py-3 font-semibold text-bad">{t.error}</p> : null}
            {!t.a && !t.error ? (
              <div className="grid gap-2" aria-label="Checking our sources">
                {[92, 80, 64].map((w) => (
                  <span key={w} className="h-3 animate-pulse rounded-[2px] bg-sage-deep motion-reduce:animate-none" style={{ width: `${w}%` }} />
                ))}
                <p className="mt-1 font-mono text-[0.8rem] text-ink-2">Checking our sources…</p>
              </div>
            ) : null}
            {t.a ? (
              <div className={clsx("grid gap-8", t.a.sources.length ? "lg:grid-cols-[minmax(0,1fr)_19rem]" : "")}>
                <div className="min-w-0">
                  {t.a.notice ? <p className="mb-3 text-small text-ink-2">{t.a.notice}</p> : null}
                  <div className="max-w-[var(--measure)] text-body leading-[1.7] text-ink">
                    {t.a.mode === "retrieval_only" ? (
                      <ul className="grid gap-2.5">
                        {t.a.segments.map((s, j) => (
                          <li key={j} className="relative pl-5">
                            <span aria-hidden className="absolute top-[0.75em] left-0 h-[2px] w-2.5 bg-copper" />
                            {s.text}
                            {s.cites.map((c) => (
                              <Cite key={c} n={c + 1} />
                            ))}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="whitespace-pre-wrap">
                        {t.a.segments.map((s, j) => (
                          <span key={j}>
                            {s.text}
                            {s.cites.map((c) => (
                              <Cite key={c} n={c + 1} />
                            ))}
                          </span>
                        ))}
                      </p>
                    )}
                  </div>
                </div>
                {t.a.sources.length ? (
                  <aside aria-label="Sources" className="min-w-0 border-t border-rule pt-4 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
                    <h3 className="label text-ink">Sources ({t.a.sources.length})</h3>
                    <ol className="mt-3 grid gap-4">
                      {t.a.sources.map((s, k) => (
                        <li key={k} id={i === turns.length - 1 ? `src-${k + 1}` : undefined} className="grid grid-cols-[2rem_minmax(0,1fr)] text-[0.95rem]">
                          <span className="font-mono text-[0.8rem] text-copper-ink">[{k + 1}]</span>
                          <div className="min-w-0">
                            <a href={s.url} className="a [overflow-wrap:anywhere]" target={s.url.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">
                              {s.title}
                              {s.url.startsWith("http") ? <IconExternal size={12} className="ml-1 inline-block align-[-1px]" /> : null}
                            </a>
                            <span className="mt-0.5 block font-mono text-[0.72rem] tracking-[0.04em] text-ink-2 uppercase">{s.verification.replace(/_/g, " ")}</span>
                            {s.quotes.map((qt) => (
                              <blockquote key={qt} className="mt-2 border-l-2 border-rule-strong pl-3 text-small leading-relaxed text-ink-2 italic">
                                {qt}
                              </blockquote>
                            ))}
                          </div>
                        </li>
                      ))}
                    </ol>
                  </aside>
                ) : null}
              </div>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}
