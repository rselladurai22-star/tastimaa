"use client";

import { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import { IconArrow, IconArrowLeft } from "../icons";

/**
 * Signature explainer: how 72 imaginary applicants move from application to
 * offer. Deliberately illustrative — the numbers are invented and labelled so.
 */

const N = 72;
const PLACES = 22;
const THRESHOLD = 0.5;
const BANDS = ["Looked after", "Pupil Premium", "Sibling", "In catchment", "Everyone else"] as const;
const BAND_WEIGHTS = [0.05, 0.14, 0.13, 0.33, 0.35];

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Applicant = { id: number; score: number; band: number; tie: number; jx: number; jy: number };

function makeApplicants(): Applicant[] {
  const r = rng(11);
  return Array.from({ length: N }, (_, id) => {
    const score = Math.min(0.98, Math.max(0.03, (r() + r() + r()) / 3 + (r() - 0.5) * 0.2));
    let x = r();
    let band = 0;
    while (band < BAND_WEIGHTS.length - 1 && x > BAND_WEIGHTS[band]!) {
      x -= BAND_WEIGHTS[band]!;
      band += 1;
    }
    return { id, score, band, tie: r(), jx: r(), jy: r() };
  });
}

const W = 720;
const H = 420;

export const STEPS = [
  {
    kicker: "Before",
    title: "Everyone who applies",
    body: "Families name the school on their council application, and children sit the school's entrance test. On national offer day, everyone here is still an applicant — nothing has been decided yet.",
  },
  {
    kicker: "Step 1",
    title: "Meet the qualifying standard",
    body: "Each school sets its own standard — often a minimum standardised score in its own test. Children below it aren't considered for this school's selective places. Passing makes a child eligible to be considered. Nothing more.",
  },
  {
    kicker: "Step 2",
    title: "Get ranked under the admission criteria",
    body: "If more qualified children apply than there are places, the school's published criteria decide the order: looked after children first, then groups such as Pupil Premium, siblings and catchment. A tie-break, often distance, orders children within each group.",
  },
  {
    kicker: "Step 3",
    title: "Receive an offer — if places remain",
    body: "Offers go down the ranked list until the published admission number is reached. The qualified children below the line receive no offer from this school, which is why every family should name more than one school.",
  },
] as const;

const PEOPLE = makeApplicants();

export function AdmissionJourneyDiagram({ step, className }: { step: number; className?: string }) {
  const people = PEOPLE;
  const qualified = people.filter((p) => p.score >= THRESHOLD);
  const ranked = [...qualified].sort((a, b) => a.band - b.band || a.tie - b.tie);
  const rankOf = new Map(ranked.map((p, i) => [p.id, i]));
  const bandCounts = BANDS.map((_, b) => ranked.filter((p) => p.band === b).length);

  const pos = (p: Applicant): { x: number; y: number } => {
    if (step === 0) return { x: 70 + p.jx * 600, y: 70 + p.jy * 300 };
    if (step === 1) return { x: 60 + p.score * 620, y: 80 + p.jy * 260 };
    // Steps 2 and 3: qualified children line up in criteria bands; the rest leave the race.
    const q = p.score >= THRESHOLD;
    if (!q) {
      const i = people.filter((x) => x.score < THRESHOLD).indexOf(p);
      return { x: 70 + (i % 10) * 14, y: 330 + Math.floor(i / 10) * 14 };
    }
    const inBand = ranked.filter((x) => x.band === p.band).indexOf(p);
    return { x: 282 + inBand * 17, y: 70 + p.band * 50 };
  };

  const fill = (p: Applicant) => {
    const q = p.score >= THRESHOLD;
    if (step === 0) return { fill: "var(--rule-strong)", stroke: "var(--rule-strong)", opacity: 1 };
    if (!q) return { fill: "var(--card)", stroke: "var(--rule-strong)", opacity: step >= 2 ? 0.55 : 1 };
    if (step === 3) return (rankOf.get(p.id) ?? 99) < PLACES ? { fill: "var(--copper)", stroke: "var(--copper-ink)", opacity: 1 } : { fill: "var(--card)", stroke: "var(--green-bright)", opacity: 1 };
    return { fill: "var(--green-bright)", stroke: "var(--green)", opacity: 1 };
  };

  // Where the line of places falls, band by band.
  const cut: number[] = [];
  for (let b = 0, remaining = PLACES; b < BANDS.length; b++) {
    const take = Math.min(remaining, bandCounts[b]!);
    remaining -= take;
    cut.push(take);
  }
  const cutBand = cut.findIndex((t, b) => t < bandCounts[b]!);

  const description = [
    `Illustration: ${N} imaginary applicants, not yet sorted.`,
    `Illustration: ${qualified.length} of ${N} imaginary applicants meet the qualifying standard.`,
    `Illustration: the ${qualified.length} qualified applicants are ranked in five example criteria groups.`,
    `Illustration: ${PLACES} places are offered down the ranked list; ${qualified.length - PLACES} qualified applicants receive no offer from this school.`,
  ][step];

  return (
    <div className={clsx("relative", className)}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={description} className="block h-auto w-full">
        <rect x="0" y="0" width={W} height={H} style={{ fill: "var(--card)" }} />
        {/* Score axis (step 1) */}
        <g className="transition-opacity duration-[var(--d-3)]" style={{ opacity: step === 1 ? 1 : 0 }}>
          <line x1="60" y1="372" x2="680" y2="372" style={{ stroke: "var(--chart-axis)" }} />
          <text x="60" y="396" className="fill-[var(--ink-2)] font-mono text-[13px]">
            lower test score
          </text>
          <text x="680" y="396" textAnchor="end" className="fill-[var(--ink-2)] font-mono text-[13px]">
            higher test score
          </text>
          <line x1={60 + THRESHOLD * 620} y1="44" x2={60 + THRESHOLD * 620} y2="380" strokeWidth="2" strokeDasharray="5 4" style={{ stroke: "var(--copper)" }} />
          <text x={60 + THRESHOLD * 620 + 8} y="40" className="fill-[var(--copper-ink)] text-[14px] font-semibold">
            qualifying standard
          </text>
        </g>
        {/* Criteria bands (steps 2–3) */}
        <g className="transition-opacity duration-[var(--d-3)]" style={{ opacity: step >= 2 ? 1 : 0 }}>
          {BANDS.map((b, i) => (
            <g key={b}>
              <line x1="24" x2="696" y1={95 + i * 50} y2={95 + i * 50} style={{ stroke: "var(--chart-grid)" }} />
              <text x="24" y={74 + i * 50} className="fill-[var(--ink-2)] font-mono text-[12.5px]">
                {i + 1}
              </text>
              <text x="44" y={74 + i * 50} className="fill-[var(--ink)] text-[14.5px] font-semibold">
                {b}
              </text>
            </g>
          ))}
          <text x="24" y="318" className="fill-[var(--ink-2)] text-[13.5px]">
            Not qualified — not considered for this school
          </text>
        </g>
        {/* The line of places (step 3) */}
        {cutBand >= 0 ? (
          <g className="transition-opacity duration-[var(--d-3)]" style={{ opacity: step === 3 ? 1 : 0 }}>
            <line x1={282 + cut[cutBand]! * 17 - 8.5} x2={282 + cut[cutBand]! * 17 - 8.5} y1={70 + cutBand * 50 - 18} y2={70 + cutBand * 50 + 18} strokeWidth="2.5" style={{ stroke: "var(--copper)" }} />
            <text x={282 + cut[cutBand]! * 17 - 2} y={70 + cutBand * 50 - 24} className="fill-[var(--copper-ink)] text-[14px] font-semibold">
              places run out
            </text>
          </g>
        ) : null}
        {people.map((p, i) => {
          const { x, y } = pos(p);
          const f = fill(p);
          return (
            <circle
              key={p.id}
              r={6.2}
              cx={0}
              cy={0}
              strokeWidth={1.6}
              style={{
                fill: f.fill,
                stroke: f.stroke,
                transform: `translate(${x}px, ${y}px)`,
                opacity: f.opacity,
                transition: `transform var(--d-4) var(--ease-spring) ${i * 6}ms, fill var(--d-3) var(--ease-out) ${120 + i * 4}ms, stroke var(--d-3) var(--ease-out), opacity var(--d-3)`,
              }}
            />
          );
        })}
      </svg>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-rule bg-card px-4 py-3 text-small text-ink-2" aria-hidden>
        <span className="inline-flex items-center gap-2">
          <span className="size-3 rounded-full border border-rule-strong bg-rule-strong" /> Applicant
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="size-3 rounded-full border border-green bg-green-bright" /> Qualified
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="size-3 rounded-full border border-copper-ink bg-copper" /> Offered a place
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="size-3 rounded-full border-[1.6px] border-green-bright bg-card" /> Qualified, no offer here
        </span>
      </div>
    </div>
  );
}

/** Scroll-linked explainer on wide screens; a stepper everywhere. */
export function AdmissionJourney() {
  const [step, setStep] = useState(0);
  const refs = useRef<(HTMLElement | null)[]>([]);
  const q = PEOPLE.filter((p) => p.score >= THRESHOLD).length;
  const counts = [`${N} applicants`, `${q} of ${N} qualify`, `${q} ranked in order`, `${PLACES} offers · ${q - PLACES} qualified, no offer`];

  useEffect(() => {
    if (!window.matchMedia("(min-width: 1024px)").matches) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setStep(Number((e.target as HTMLElement).dataset.step));
      },
      { rootMargin: "-48% 0px -48% 0px" },
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-14">
      {/* Steps: tall on desktop so scrolling advances the diagram */}
      <ol className="order-2 grid gap-4 lg:order-1 lg:gap-0">
        {STEPS.map((s, i) => (
          <li
            key={s.title}
            ref={(el) => {
              refs.current[i] = el;
            }}
            data-step={i}
            className={clsx("lg:flex lg:min-h-[64vh] lg:items-center", i !== step && "hidden lg:flex")}
          >
            <div className={clsx("border-l-2 pl-5 transition-[border-color,opacity] duration-[var(--d-3)] ease-[var(--ease-out)]", i === step ? "border-copper opacity-100" : "border-rule opacity-55")}>
              <p className="label text-copper-ink">{s.kicker}</p>
              <h3 className="mt-2 text-h3">{s.title}</h3>
              <p className="mt-3 text-body leading-relaxed text-ink-2">{s.body}</p>
              <p className="mt-3 font-mono text-[0.85rem] text-ink-2">{counts[i]}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="order-1 lg:order-2">
        <div className="lg:sticky lg:top-[calc(var(--header-h)+2rem)]">
          <div className="overflow-hidden rounded-[8px] border border-rule">
            <AdmissionJourneyDiagram step={step} />
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div role="group" aria-label="Choose a step" className="flex gap-1.5">
              {STEPS.map((s, i) => (
                <button
                  key={s.title}
                  type="button"
                  onClick={() => setStep(i)}
                  aria-pressed={i === step}
                  aria-label={`${s.kicker}: ${s.title}`}
                  className={clsx("grid h-10 min-w-10 place-items-center rounded-[4px] border px-2 font-mono text-[0.85rem] transition-colors duration-[var(--d-1)]", i === step ? "border-green bg-green text-paper" : "border-rule-strong bg-card text-ink hover:border-ink")}
                >
                  {i === 0 ? "Start" : i}
                </button>
              ))}
            </div>
            <div className="flex gap-1.5">
              <button type="button" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className="inline-flex min-h-10 items-center gap-1.5 rounded-[4px] border border-rule-strong bg-card px-3 text-[0.95rem] font-semibold disabled:opacity-40" aria-label="Previous step">
                <IconArrowLeft size={16} />
              </button>
              <button type="button" onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))} disabled={step === STEPS.length - 1} className="inline-flex min-h-10 items-center gap-1.5 rounded-[4px] border border-green bg-green px-3 text-[0.95rem] font-semibold text-paper disabled:opacity-40">
                Next <IconArrow size={16} />
              </button>
            </div>
          </div>
          <p className="mt-3 text-small text-ink-2">
            An illustration with {N} imaginary applicants and {PLACES} places — not data from any school. Every school publishes its own criteria, in its own order, for each entry year.
          </p>
        </div>
      </div>
    </div>
  );
}

/** Compact stepper version for articles. */
export function JourneyStepper() {
  const [step, setStep] = useState(1);
  const s = STEPS[step]!;
  return (
    <div className="overflow-hidden rounded-[8px] border border-rule bg-card">
      <AdmissionJourneyDiagram step={step} />
      <div className="grid gap-3 border-t border-rule bg-paper p-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-start">
        <div role="group" aria-label="Choose a step" className="flex gap-1.5">
          {STEPS.map((x, i) => (
            <button
              key={x.title}
              type="button"
              onClick={() => setStep(i)}
              aria-pressed={i === step}
              aria-label={`${x.kicker}: ${x.title}`}
              className={clsx("grid h-10 min-w-10 place-items-center rounded-[4px] border px-2 font-mono text-[0.85rem] transition-colors duration-[var(--d-1)]", i === step ? "border-green bg-green text-paper" : "border-rule-strong bg-card text-ink hover:border-ink")}
            >
              {i === 0 ? "Start" : i}
            </button>
          ))}
        </div>
        <div key={step} className="anim-rise" aria-live="polite">
          <p className="font-semibold text-ink">
            <span className="label mr-2 text-copper-ink">{s.kicker}</span>
            {s.title}
          </p>
          <p className="mt-1 text-[0.98rem] leading-relaxed text-ink-2">{s.body}</p>
        </div>
      </div>
    </div>
  );
}
