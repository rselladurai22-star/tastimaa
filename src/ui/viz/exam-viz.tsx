"use client";

import Link from "next/link";
import { useState } from "react";
import { clsx } from "clsx";
import { formatWeekdayDate } from "@/lib/format";
import { Status } from "../status";

/* ───────────────── 11+ test structure ───────────────── */

type Domain = { key: string; name: string; what: string; example: { q: React.ReactNode; options?: string[]; answer: string; why: string }; Art: () => React.ReactNode };

function ArtEnglish() {
  return (
    <svg viewBox="0 0 120 80" className="h-20 w-auto" aria-hidden>
      <path d="M60 14C48 8 30 7 14 9v58c16-2 34-1 46 5 12-6 30-7 46-5V9C90 7 72 8 60 14Z" strokeWidth="1.6" style={{ fill: "var(--card)", stroke: "var(--green)" }} />
      <path d="M60 14v58" strokeWidth="1.6" style={{ stroke: "var(--copper)" }} />
      {[22, 30, 38, 46, 54].map((y) => (
        <g key={y}>
          <line x1="22" x2={y === 38 ? 40 : 52} y1={y} y2={y} strokeWidth="2" strokeLinecap="round" style={{ stroke: "var(--rule-strong)" }} />
          <line x1="68" x2={y === 30 ? 84 : 98} y1={y} y2={y} strokeWidth="2" strokeLinecap="round" style={{ stroke: "var(--rule-strong)" }} />
        </g>
      ))}
      <line x1="42" x2="54" y1="38" y2="38" strokeWidth="3" strokeLinecap="round" style={{ stroke: "var(--copper)" }} />
    </svg>
  );
}
function ArtMaths() {
  return (
    <svg viewBox="0 0 120 80" className="h-20 w-auto" aria-hidden>
      {[0, 1, 2, 3].map((c) =>
        [0, 1, 2].map((r) => <rect key={`${c}${r}`} x={14 + c * 24} y={10 + r * 22} width="22" height="20" rx="2" strokeWidth="1.2" style={{ fill: c === 3 && r === 2 ? "var(--copper-wash)" : "var(--card)", stroke: "var(--rule-strong)" }} />),
      )}
      <text x="25" y="25" textAnchor="middle" className="fill-[var(--ink)] font-mono text-[11px]">7</text>
      <text x="49" y="25" textAnchor="middle" className="fill-[var(--green)] font-mono text-[11px]">×</text>
      <text x="73" y="25" textAnchor="middle" className="fill-[var(--ink)] font-mono text-[11px]">8</text>
      <text x="97" y="69" textAnchor="middle" className="fill-[var(--copper-ink)] font-mono text-[11px]">?</text>
    </svg>
  );
}
function ArtVerbal() {
  return (
    <svg viewBox="0 0 120 80" className="h-20 w-auto" aria-hidden>
      {["C", "A", "T"].map((l, i) => (
        <g key={l}>
          <rect x={10 + i * 18} y="14" width="16" height="18" rx="2" strokeWidth="1.2" style={{ fill: "var(--card)", stroke: "var(--green)" }} />
          <text x={18 + i * 18} y="27" textAnchor="middle" className="fill-[var(--ink)] font-mono text-[11px]">{l}</text>
        </g>
      ))}
      <path d="M68 23h18M80 17l6 6-6 6" fill="none" strokeWidth="1.6" style={{ stroke: "var(--copper)" }} />
      {["D", "B", "U"].map((l, i) => (
        <g key={l}>
          <rect x={10 + i * 18} y="48" width="16" height="18" rx="2" strokeWidth="1.2" style={{ fill: "var(--green-wash)", stroke: "var(--green)" }} />
          <text x={18 + i * 18} y="61" textAnchor="middle" className="fill-[var(--green)] font-mono text-[11px]">{l}</text>
        </g>
      ))}
      <text x="96" y="27" className="fill-[var(--ink-2)] font-mono text-[10px]">+1</text>
    </svg>
  );
}
function ArtNonVerbal() {
  return (
    <svg viewBox="0 0 120 80" className="h-20 w-auto" aria-hidden>
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(${22 + i * 30} 40) rotate(${i * 45})`}>
          <rect x="-10" y="-10" width="20" height="20" strokeWidth="1.6" style={{ fill: "var(--card)", stroke: "var(--green)" }} />
          <circle cx="6" cy="-6" r="2.6" style={{ fill: "var(--copper)" }} />
        </g>
      ))}
      <rect x="92" y="28" width="22" height="24" rx="2" strokeWidth="1.2" strokeDasharray="3 3" style={{ fill: "none", stroke: "var(--ink-3)" }} />
      <text x="103" y="45" textAnchor="middle" className="fill-[var(--ink-2)] font-mono text-[11px]">?</text>
    </svg>
  );
}

const DOMAINS: Domain[] = [
  {
    key: "english",
    name: "English",
    what: "Reading comprehension, vocabulary, spelling, punctuation and sometimes writing.",
    example: { q: <>Which word is closest in meaning to <em>reluctant</em>?</>, options: ["eager", "unwilling", "quick", "curious"], answer: "unwilling", why: "Reluctant describes not wanting to do something." },
    Art: ArtEnglish,
  },
  {
    key: "maths",
    name: "Mathematics",
    what: "Arithmetic, problem solving and reasoning, broadly from the primary curriculum.",
    example: { q: "A train leaves at 09:47 and arrives at 11:12. How long is the journey?", answer: "1 hour 25 minutes", why: "09:47 to 10:47 is one hour; 10:47 to 11:12 is 25 minutes." },
    Art: ArtMaths,
  },
  {
    key: "verbal",
    name: "Verbal reasoning",
    what: "Word and letter patterns, codes and logic.",
    example: { q: "If CAT is written as DBU, how would DOG be written?", answer: "EPH", why: "Each letter moves one place forward in the alphabet." },
    Art: ArtVerbal,
  },
  {
    key: "nonverbal",
    name: "Non-verbal reasoning",
    what: "Patterns, shapes and sequences.",
    example: { q: "Each square turns 45° clockwise and the dot stays in the same corner of the square. What comes next?", answer: "The square turned 135° from the start, dot in the same corner", why: "Find the rule that changes and the rule that stays the same." },
    Art: ArtNonVerbal,
  },
];

/** One subject as a card that turns over to an example question. */
function FlipCard({ d, i }: { d: Domain; i: number }) {
  const [flipped, setFlipped] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const tint = ["#4242fa", "#e60067", "#7a3cff", "#00777f"][i % 4]!;
  return (
    <li className="[perspective:1200px]">
      <div className={clsx("grid h-full transition-transform duration-[700ms] ease-[var(--ease-out)] [transform-style:preserve-3d]", flipped && "[transform:rotateY(180deg)]")}>
        {/* Front */}
        <div inert={flipped} className="relative flex flex-col overflow-hidden rounded-[16px] bg-card p-5 shadow-[0_1px_1px_rgb(44_11_142/0.05),0_8px_16px_-6px_rgb(44_11_142/0.12),0_24px_48px_-20px_rgb(44_11_142/0.25)] [backface-visibility:hidden] [grid-area:1/1]">
          <span aria-hidden className="absolute -top-10 -right-10 size-32 rounded-full opacity-[0.12] blur-xl" style={{ background: tint }} />
          <div className="grid h-28 place-items-center rounded-[12px]" style={{ background: `linear-gradient(135deg, color-mix(in srgb, ${tint} 10%, #fff), color-mix(in srgb, ${tint} 22%, #fff))` }}>
            <d.Art />
          </div>
          <p className="mt-4 text-[1.25rem] font-semibold text-ink">{d.name}</p>
          <p className="mt-1.5 flex-1 text-[1rem] leading-relaxed text-ink-2">{d.what}</p>
          <button type="button" onClick={() => setFlipped(true)} className="mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-full text-[0.95rem] font-semibold text-white shadow-[0_6px_14px_-6px_currentColor] transition-transform hover:scale-[1.02]" style={{ background: tint }}>
            Try a question
            <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden>
              <path d="M3 8a5 5 0 0 1 9-3M13 8a5 5 0 0 1-9 3M12 2v3H9M4 14v-3h3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        {/* Back */}
        <div inert={!flipped} className="flex flex-col rounded-[16px] p-5 text-white shadow-[0_24px_48px_-20px_rgb(44_11_142/0.45)] [backface-visibility:hidden] [grid-area:1/1] [transform:rotateY(180deg)]" style={{ background: `linear-gradient(160deg, ${tint}, color-mix(in srgb, ${tint} 55%, #0a0c10))` }}>
          <p className="text-[0.8125rem] font-bold tracking-[0.08em] uppercase opacity-85">{d.name} · example</p>
          <p className="mt-3 text-[1.0625rem] leading-snug font-medium">{d.example.q}</p>
          {d.example.options ? (
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {d.example.options.map((o) => (
                <li key={o} className={clsx("rounded-full px-3 py-1 text-[0.9375rem]", revealed && o === d.example.answer ? "bg-white font-semibold text-ink" : "bg-white/15")}>
                  {o}
                </li>
              ))}
            </ul>
          ) : null}
          <div className="flex-1" aria-live="polite">
            {revealed ? (
              <p className="anim-rise mt-3 text-[0.98rem] leading-snug">
                <strong>{d.example.answer}.</strong> <span className="opacity-85">{d.example.why}</span>
              </p>
            ) : null}
          </div>
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={() => setRevealed((v) => !v)} aria-expanded={revealed} className="inline-flex min-h-10 flex-1 items-center justify-center rounded-full bg-white px-3 text-[0.95rem] font-semibold text-ink">
              {revealed ? "Hide answer" : "Show answer"}
            </button>
            <button type="button" onClick={() => setFlipped(false)} className="inline-flex min-h-10 items-center rounded-full bg-white/15 px-3 text-[0.95rem] font-semibold hover:bg-white/25">
              Back
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}

export function TestStructure({ tests }: { tests: { slug: string; name: string; components: { subject: string; detail?: string | null }[] }[] }) {
  return (
    <div>
      <ul className="grid gap-5 sm:grid-cols-2" aria-label="What 11+ tests can include">
        {DOMAINS.map((d, i) => (
          <FlipCard key={d.key} d={d} i={i} />
        ))}
      </ul>
      <p className="mt-3 text-small text-ink-2">Example questions are written for this site to show the type — they are not past papers.</p>
      <div className="mt-8 rounded-[12px] border border-rule bg-card p-5">
        <p className="label mb-3">What the tests we hold say they cover</p>
        <ul className="grid gap-4 sm:grid-cols-2">
          {tests.map((t) => (
            <li key={t.slug} className="border-l-2 border-green pl-3">
              <Link href={`/11-plus/${t.slug}`} className="font-semibold text-ink underline decoration-green/40 underline-offset-4 hover:text-green">
                {t.name}
              </Link>
              {t.components.length ? <p className="mt-1 text-[0.95rem] leading-snug text-ink-2">{t.components.map((c) => c.subject).join(" · ")}</p> : <p className="mt-1 text-[0.95rem] text-ink-2">Not yet verified.</p>}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-small text-ink-2">As published by each test administrator. Which subjects appear, and in what format, differs by test.</p>
      </div>
    </div>
  );
}

/* ───────────────── Application journey (England) ───────────────── */

export interface JourneyEvent {
  type: string;
  date: string;
  status: string;
  title: string;
}

const STAGES = [
  { key: "research", when: "Year 5", title: "Research schools", text: "Read each school's admissions policy for your entry year, and find out which test it uses. Open events are usually in the summer term of Year 5 or early autumn of Year 6.", types: [] as string[] },
  { key: "register", when: "Year 5, summer", title: "Register for the test", text: "Registration usually closes months before the test, and some areas register children at state primary schools automatically. Ask for access arrangements before the administrator's deadline.", types: ["registration_closes", "registration_opens"] },
  { key: "sit", when: "Year 6, September", title: "Sit the test", text: "Each test has its own date and venue. Children only sit the tests for the areas you are applying to.", types: ["test_date"] },
  { key: "results", when: "Year 6, October", title: "Receive results", text: "Results usually arrive before the application deadline. A qualifying result means your child can be considered — it is not an offer.", types: ["results_released"] },
  { key: "apply", when: "31 October", title: "Apply to your home council", text: "Name schools in order of preference on your home council's form, including schools in other areas. Include at least one school your child is very likely to be offered.", types: ["application_deadline"] },
  { key: "offers", when: "1 March", title: "National offer day", text: "Your council sends one offer. Accept it by the deadline — you can still join waiting lists and appeal for higher-preference schools.", types: ["national_offer_day"] },
  { key: "after", when: "From March", title: "Waiting lists and appeals", text: "You can appeal each refusal to an independent panel; you'll have at least 20 school days to lodge it.", types: ["appeal_deadline", "waiting_list"] },
];

export function ApplicationJourney({ events, entryYear }: { events: JourneyEvent[]; entryYear: number }) {
  const [sel, setSel] = useState("apply");
  const stage = STAGES.find((s) => s.key === sel)!;
  const stageEvents = events.filter((e) => stage.types.includes(e.type));
  return (
    <div className="playground overflow-hidden">
      <div className="relative flex overflow-x-auto border-b border-rule bg-paper [scrollbar-width:thin]" role="tablist" aria-label={`Application journey for September ${entryYear} entry`}>
        <span aria-hidden className="absolute top-[26px] right-10 left-10 h-[6px] rounded-full bg-[linear-gradient(90deg,#8f8fff,#ff4d8f_60%,#ffd23f)] shadow-[0_0_14px_-2px_#8f8fff]" />
        {STAGES.map((s, i) => {
          const has = events.some((e) => s.types.includes(e.type));
          return (
            <button
              key={s.key}
              type="button"
              role="tab"
              aria-selected={s.key === sel}
              aria-controls="aj-panel"
              id={`aj-tab-${s.key}`}
              tabIndex={s.key === sel ? 0 : -1}
              onClick={() => setSel(s.key)}
              onKeyDown={(e) => {
                if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
                e.preventDefault();
                const next = STAGES[(i + (e.key === "ArrowRight" ? 1 : STAGES.length - 1)) % STAGES.length]!;
                setSel(next.key);
                document.getElementById(`aj-tab-${next.key}`)?.focus();
              }}
              className={clsx("group/aj relative flex min-w-[8.5rem] flex-1 flex-col items-center gap-2 px-2 pt-[19px] pb-4 text-center transition-colors", s.key === sel && "bg-white/[0.04]")}
            >
              <span
                aria-hidden
                className={clsx(
                  "relative z-10 grid size-5 place-items-center rounded-full border-[4px] transition-[transform,box-shadow] duration-[var(--d-2)] ease-[var(--ease-out)]",
                  s.key === sel ? "scale-[1.45] border-white bg-copper shadow-[0_0_0_4px_rgb(255_77_143/0.35),0_0_18px_var(--copper)]" : has ? "border-white bg-[#8f8fff]" : "border-white bg-[#0d0f12] group-hover/aj:scale-110",
                )}
              />
              <span className="font-mono text-[0.78rem] text-ink-2">
                {String(i + 1).padStart(2, "0")} · {s.when}
              </span>
              <span className={clsx("text-[0.95rem] leading-tight font-semibold", s.key === sel ? "text-ink" : "text-ink-2")}>{s.title}</span>
            </button>
          );
        })}
      </div>
      <div id="aj-panel" role="tabpanel" aria-labelledby={`aj-tab-${sel}`} className="grid gap-5 p-6 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div key={sel} className="anim-rise">
          <p className="label text-copper-ink">{stage.when}</p>
          <p className="mt-1 font-display text-[1.45rem] text-ink">{stage.title}</p>
          <p className="mt-2 text-[1.05rem] leading-relaxed text-ink-2">{stage.text}</p>
        </div>
        <div>
          <p className="label mb-2">Dates we hold for September {entryYear}</p>
          {stageEvents.length ? (
            <ul className="grid gap-3">
              {stageEvents.map((e) => (
                <li key={e.title + e.date} className="border-l-2 border-copper pl-3">
                  <p className="font-semibold text-ink">{formatWeekdayDate(e.date)}</p>
                  <p className="text-[0.95rem] text-ink-2">{e.title}</p>
                  <Status status={e.status} className="mt-1.5" />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[0.98rem] text-ink-2">{stage.types.length ? "This date varies by test or school — see each school's profile and the calendar." : "No single date — this happens over several months."}</p>
          )}
        </div>
      </div>
    </div>
  );
}
