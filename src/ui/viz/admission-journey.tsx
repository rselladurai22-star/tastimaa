"use client";

import { useEffect, useState } from "react";
import { clsx } from "clsx";

/**
 * Signature explainer: how 72 imaginary applicants move from application to
 * offer. Deliberately illustrative — the numbers are invented and labelled so.
 */

const N = 72;
const PLACES = 22;
const THRESHOLD = 0.5;
const BANDS = [
  "Looked after",
  "Pupil Premium",
  "Sibling",
  "In catchment",
  "Everyone else",
] as const;
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

type Applicant = {
  id: number;
  score: number;
  band: number;
  tie: number;
  jx: number;
  jy: number;
};

function makeApplicants(): Applicant[] {
  const r = rng(11);
  return Array.from({ length: N }, (_, id) => {
    const score = Math.min(
      0.98,
      Math.max(0.03, (r() + r() + r()) / 3 + (r() - 0.5) * 0.2),
    );
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

export function AdmissionJourneyDiagram({
  step,
  className,
}: {
  step: number;
  className?: string;
}) {
  const people = PEOPLE;
  const qualified = people.filter((p) => p.score >= THRESHOLD);
  const ranked = [...qualified].sort(
    (a, b) => a.band - b.band || a.tie - b.tie,
  );
  const rankOf = new Map(ranked.map((p, i) => [p.id, i]));
  const bandCounts = BANDS.map(
    (_, b) => ranked.filter((p) => p.band === b).length,
  );

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

  // Each applicant is a marble; its glaze says where it stands.
  const kind = (p: Applicant): { k: "applicant" | "qualified" | "offered" | "waiting" | "out"; opacity: number } => {
    const q = p.score >= THRESHOLD;
    if (step === 0) return { k: "applicant", opacity: 1 };
    if (!q) return { k: "out", opacity: step >= 2 ? 0.5 : 0.9 };
    if (step === 3) return (rankOf.get(p.id) ?? 99) < PLACES ? { k: "offered", opacity: 1 } : { k: "waiting", opacity: 1 };
    return { k: "qualified", opacity: 1 };
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
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={description}
        className="block h-auto w-full"
      >
        <defs>
          <radialGradient id="jm-stage" cx="50%" cy="35%" r="75%">
            <stop offset="0" style={{ stopColor: "#1f2733" }} />
            <stop offset="1" style={{ stopColor: "#0d0f12" }} />
          </radialGradient>
          {(
            [
              ["applicant", "#e6e9ef", "#7c8594"],
              ["qualified", "#c9c9ff", "#4242fa"],
              ["offered", "#ffb3d1", "#c20058"],
              ["out", "#5b6372", "#262c35"],
              ["waiting", "#2b3140", "#151922"],
            ] as const
          ).map(([k, hi, lo]) => (
            <radialGradient key={k} id={`jm-${k}`} cx="35%" cy="30%" r="70%">
              <stop offset="0" stopColor={hi} />
              <stop offset="1" stopColor={lo} />
            </radialGradient>
          ))}
          <filter id="jm-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <rect x="0" y="0" width={W} height={H} fill="url(#jm-stage)" />
        {/* Score axis (step 1) */}
        <g
          className="transition-opacity duration-[var(--d-3)]"
          style={{ opacity: step === 1 ? 1 : 0 }}
        >
          <line
            x1="60"
            y1="372"
            x2="680"
            y2="372"
            style={{ stroke: "var(--chart-axis)" }}
          />
          <text
            x="60"
            y="396"
            className="fill-[var(--ink-2)] font-mono text-[13px]"
          >
            lower test score
          </text>
          <text
            x="680"
            y="396"
            textAnchor="end"
            className="fill-[var(--ink-2)] font-mono text-[13px]"
          >
            higher test score
          </text>
          <rect x={60 + THRESHOLD * 620 - 3} y="44" width="6" height="336" rx="3" filter="url(#jm-glow)" style={{ fill: "var(--copper)" }} />
          <rect x={60 + THRESHOLD * 620 + 3} y="44" width={620 - THRESHOLD * 620} height="336" style={{ fill: "var(--copper)", opacity: 0.06 }} />
          <text
            x={60 + THRESHOLD * 620 + 8}
            y="40"
            className="fill-[var(--copper-ink)] text-[14px] font-semibold"
          >
            qualifying standard
          </text>
        </g>
        {/* Criteria bands (steps 2–3) */}
        <g
          className="transition-opacity duration-[var(--d-3)]"
          style={{ opacity: step >= 2 ? 1 : 0 }}
        >
          {BANDS.map((b, i) => (
            <g key={b}>
              <rect x="270" y={56 + i * 50} width="430" height="28" rx="14" style={{ fill: "#07090c", stroke: "#2a3138" }} />
              <line x1="284" x2="686" y1={57.5 + i * 50} y2={57.5 + i * 50} style={{ stroke: "#000", opacity: 0.6 }} />
              <text
                x="24"
                y={74 + i * 50}
                className="fill-[var(--ink-2)] font-mono text-[12.5px]"
              >
                {i + 1}
              </text>
              <text
                x="44"
                y={74 + i * 50}
                className="fill-[var(--ink)] text-[14.5px] font-semibold"
              >
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
          <g
            className="transition-opacity duration-[var(--d-3)]"
            style={{ opacity: step === 3 ? 1 : 0 }}
          >
            <rect x={282 + cut[cutBand]! * 17 - 10.5} y={70 + cutBand * 50 - 20} width="4" height="40" rx="2" filter="url(#jm-glow)" style={{ fill: "var(--copper)" }} />
            <text
              x={282 + cut[cutBand]! * 17 - 2}
              y={70 + cutBand * 50 - 24}
              className="fill-[var(--copper-ink)] text-[14px] font-semibold"
            >
              places run out
            </text>
          </g>
        ) : null}
        {people.map((p, i) => {
          const { x, y } = pos(p);
          const f = kind(p);
          return (
            <g
              key={p.id}
              style={{
                transform: `translate(${x}px, ${y}px)`,
                opacity: f.opacity,
                transition: `transform var(--d-4) var(--ease-spring) ${i * 6}ms, opacity var(--d-3)`,
              }}
            >
              <ellipse cx="1.5" cy="6.5" rx="6" ry="2" style={{ fill: "#000", opacity: 0.45 }} />
              <circle r={f.k === "offered" ? 7.4 : 6.6} fill={`url(#jm-${f.k})`} stroke={f.k === "waiting" ? "#8f8fff" : "none"} strokeWidth={f.k === "waiting" ? 1.6 : 0} filter={f.k === "offered" ? "url(#jm-glow)" : undefined} style={{ transition: "r var(--d-3) var(--ease-out)" }} />
              <circle cx="-2.2" cy="-2.4" r="1.8" style={{ fill: "#fff", opacity: f.k === "out" || f.k === "waiting" ? 0.25 : 0.7 }} />
            </g>
          );
        })}
      </svg>
      <div
        className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-rule bg-card px-4 py-3 text-small text-ink-2"
        aria-hidden
      >
        <span className="inline-flex items-center gap-2">
          <span className="size-3.5 rounded-full bg-[radial-gradient(circle_at_35%_30%,#e6e9ef,#7c8594)]" />{" "}
          Applicant
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="size-3.5 rounded-full bg-[radial-gradient(circle_at_35%_30%,#c9c9ff,#4242fa)]" />{" "}
          Qualified
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="size-3.5 rounded-full bg-[radial-gradient(circle_at_35%_30%,#ffb3d1,#c20058)] shadow-[0_0_8px_#ff4d8f]" />{" "}
          Offered a place
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="size-3.5 rounded-full border-[1.6px] border-[#8f8fff] bg-[radial-gradient(circle_at_35%_30%,#2b3140,#151922)]" />{" "}
          Qualified, no offer here
        </span>
      </div>
    </div>
  );
}

/** Runs the machine: advances one step at a time, then stops on the last. */
function usePlay(setStep: (f: (s: number) => number) => void) {
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => {
      setStep((s) => {
        if (s >= STEPS.length - 1) {
          setPlaying(false);
          return s;
        }
        return s + 1;
      });
    }, 2400);
    return () => clearInterval(t);
  }, [playing, setStep]);
  return [playing, setPlaying] as const;
}

function PlayButton({ playing, onClick }: { playing: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={playing} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-copper px-4 text-[0.95rem] font-semibold text-[#0d0f12] shadow-[0_0_16px_-2px_var(--copper)] transition-transform hover:scale-[1.03]">
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
        {playing ? <path d="M2 1h3v10H2zM7 1h3v10H7z" fill="currentColor" /> : <path d="M2 1l9 5-9 5z" fill="currentColor" />}
      </svg>
      {playing ? "Pause" : "Play"}
    </button>
  );
}

/** Compact stepper: the diagram, a Play control and the step buttons with their explanation. */
export function JourneyStepper() {
  const [step, setStep] = useState(1);
  const [playing, setPlaying] = usePlay(setStep);
  const s = STEPS[step]!;
  return (
    <div className="playground overflow-hidden">
      <AdmissionJourneyDiagram step={step} />
      <div className="grid gap-3 border-t border-rule bg-paper p-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-start">
        <div role="group" aria-label="Choose a step" className="flex flex-wrap gap-1.5">
          <PlayButton
            playing={playing}
            onClick={() => {
              if (!playing && step === STEPS.length - 1) setStep(0);
              setPlaying(!playing);
            }}
          />
          {STEPS.map((x, i) => (
            <button
              key={x.title}
              type="button"
              onClick={() => setStep(i)}
              aria-pressed={i === step}
              aria-label={
                i === 0 ? `Start: ${x.title}` : `Step ${i}: ${x.title}`
              }
              className={clsx(
                "grid h-10 min-w-10 place-items-center rounded-[4px] border px-2 font-mono text-[0.85rem] transition-colors duration-[var(--d-1)]",
                i === step
                  ? "border-green bg-green text-paper"
                  : "border-rule-strong bg-card text-ink hover:border-ink",
              )}
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
          <p className="mt-1 text-[0.98rem] leading-relaxed text-ink-2">
            {s.body}
          </p>
        </div>
      </div>
    </div>
  );
}
