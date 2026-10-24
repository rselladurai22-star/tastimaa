"use client";

import { useState } from "react";
import { ExternalLink, Send } from "lucide-react";
import type { AssistantAnswer } from "@/ai/assistant";

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
    <div className="grid gap-6">
      {!llmEnabled ? (
        <p className="rounded-lg border border-info/25 bg-info-soft p-3 text-sm text-ink-2">
          AI summaries are not configured on this site, so answers show the most relevant verified facts and official passages directly, with sources.
        </p>
      ) : null}
      {turns.length === 0 ? (
        <div>
          <p className="mb-2 text-sm font-semibold text-ink">Try asking</p>
          <ul className="flex flex-wrap gap-2">
            {EXAMPLES.map((e) => (
              <li key={e}>
                <button type="button" onClick={() => submit(e)} className="rounded-full border border-line-strong bg-surface px-3 py-1.5 text-left text-sm text-ink-2 hover:border-accent hover:text-ink">
                  {e}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <ol className="grid gap-6" aria-live="polite">
        {turns.map((t, i) => (
          <li key={i} className="grid gap-3">
            <p className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-accent px-4 py-2.5 text-sm text-white dark:text-[#0f1112]">{t.q}</p>
            <div className="max-w-[95%] rounded-2xl rounded-bl-sm border border-line bg-surface px-5 py-4">
              {t.error ? <p className="text-sm text-bad">{t.error}</p> : null}
              {!t.a && !t.error ? <p className="animate-pulse text-sm text-ink-3">Checking our sources…</p> : null}
              {t.a ? (
                <>
                  {t.a.notice ? <p className="mb-2 text-xs text-ink-3">{t.a.notice}</p> : null}
                  <div className="text-[15px] leading-relaxed whitespace-pre-wrap text-ink">
                    {t.a.mode === "retrieval_only" ? (
                      <ul className="grid list-disc gap-1.5 pl-5">
                        {t.a.segments.map((s, j) => (
                          <li key={j}>
                            {s.text}
                            {s.cites.map((c) => (
                              <sup key={c} className="ml-0.5 text-[11px] font-semibold text-accent-ink">
                                [{c + 1}]
                              </sup>
                            ))}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      t.a.segments.map((s, j) => (
                        <span key={j}>
                          {s.text}
                          {s.cites.map((c) => (
                            <sup key={c} className="ml-0.5 text-[11px] font-semibold text-accent-ink">
                              [{c + 1}]
                            </sup>
                          ))}
                        </span>
                      ))
                    )}
                  </div>
                  {t.a.sources.length ? (
                    <details className="mt-4 border-t border-line pt-3 text-sm" open={t.a.mode === "retrieval_only"}>
                      <summary className="cursor-pointer font-semibold text-ink">Sources ({t.a.sources.length})</summary>
                      <ol className="mt-2 grid gap-2">
                        {t.a.sources.map((s, k) => (
                          <li key={k} className="text-ink-2">
                            <span className="font-semibold text-accent-ink">[{k + 1}]</span>{" "}
                            <a href={s.url} className="link" target={s.url.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">
                              {s.title}
                              {s.url.startsWith("http") ? <ExternalLink aria-hidden className="ml-0.5 inline size-3" /> : null}
                            </a>{" "}
                            <span className="text-xs text-ink-3">({s.verification.replace(/_/g, " ")})</span>
                            {s.quotes.map((qt) => (
                              <blockquote key={qt} className="mt-1 border-l-2 border-line-strong pl-3 text-xs text-ink-3">
                                {qt}
                              </blockquote>
                            ))}
                          </li>
                        ))}
                      </ol>
                    </details>
                  ) : null}
                </>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(q);
        }}
        className="sticky bottom-4 flex gap-2 rounded-2xl border border-line-strong bg-surface p-2 shadow-[var(--shadow-md)]"
      >
        <label htmlFor="as-q" className="sr-only">
          Your question
        </label>
        <textarea
          id="as-q"
          rows={1}
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
          className="min-h-11 flex-1 resize-none bg-transparent px-3 py-2.5 text-sm outline-none"
        />
        <button type="submit" disabled={busy || !q.trim()} className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 text-sm font-semibold text-white disabled:opacity-50 dark:text-[#0f1112]">
          <Send aria-hidden className="size-4" /> Ask
        </button>
      </form>
      <p className="text-xs text-ink-3">Don&apos;t include your child&apos;s name or other personal details. Questions are stored without any identifying information to improve the service.</p>
    </div>
  );
}
