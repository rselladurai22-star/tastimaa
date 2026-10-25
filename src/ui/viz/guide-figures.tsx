import type { GuideFigure } from "@/content/guides";
import { Figure } from "../kit";
import { JourneyStepper } from "./admission-journey";
import { CatchmentModes } from "./catchment-modes";

/** Illustrative shape of an oversubscription order: a stacked deck, the Code's fixed card on top. */
function PriorityShape() {
  const examples = ["Pupil Premium or service premium", "Siblings", "Children of staff", "Medical or social need", "Catchment area", "Distance"];
  return (
    <ol className="relative grid gap-4">
      <li className="relative z-30 flex items-start gap-4 rounded-[14px] bg-[linear-gradient(135deg,#2a2f6b,#1a1f3d)] p-5 shadow-[0_0_0_1px_rgb(143_143_255/0.35),0_18px_40px_-16px_rgb(0_0_0/0.8),0_0_40px_-12px_#8f8fff]">
        <span className="grid size-12 shrink-0 place-items-center rounded-[12px] bg-[linear-gradient(145deg,#ffe17a,#ffb800)] text-[1.35rem] font-bold text-[#0d0f12] shadow-[0_0_18px_-2px_#ffd23f]">1</span>
        <div>
          <p className="text-[0.75rem] font-bold tracking-[0.1em] text-[#ffd23f] uppercase">Fixed by the Code</p>
          <p className="mt-1 font-semibold text-white">Looked after and previously looked after children</p>
          <p className="mt-0.5 text-[0.98rem] text-[#c8cdd6]">Always first — for children who meet the standard.</p>
        </div>
      </li>
      <li className="relative z-20 -mt-2 mx-2 flex items-start gap-4 rounded-[14px] bg-[#1d2230] p-5 shadow-[0_0_0_1px_rgb(255_255_255/0.08),0_14px_30px_-14px_rgb(0_0_0/0.8)]">
        <span className="grid size-12 shrink-0 place-items-center rounded-[12px] border border-dashed border-[#8f8fff]/70 text-[1.1rem] font-bold text-[#c9c9ff]">2…</span>
        <div className="min-w-0">
          <p className="font-semibold text-white">Then each school&apos;s own groups, in its own order — for example:</p>
          <ul className="mt-2.5 flex flex-wrap gap-1.5">
            {examples.map((e) => (
              <li key={e} className="rounded-full bg-white/[0.07] px-3 py-1 text-[0.92rem] text-[#dfe3ec] shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08)]">
                {e}
              </li>
            ))}
          </ul>
        </div>
      </li>
      <li className="relative z-10 -mt-2 mx-4 flex items-start gap-4 rounded-[14px] bg-[#191d27] p-5 shadow-[0_0_0_1px_rgb(255_255_255/0.06)]">
        <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-[12px] bg-[linear-gradient(145deg,#ff7aaa,#e60067)] shadow-[0_0_16px_-4px_#ff4d8f]">
          <svg width="26" height="26" viewBox="0 0 26 26">
            <rect x="3" y="3" width="20" height="20" rx="5" fill="#fff" />
            {[[8, 8], [18, 18], [13, 13], [18, 8], [8, 18]].map(([x, y]) => (
              <circle key={`${x}${y}`} cx={x} cy={y} r="2" fill="#e60067" />
            ))}
          </svg>
        </span>
        <div>
          <p className="font-semibold text-white">A tie-break inside every group</p>
          <p className="text-[0.98rem] text-[#c8cdd6]">Often straight-line distance to a fixed point at the school, with random allocation for exact ties.</p>
        </div>
      </li>
    </ol>
  );
}

/** The appeal deadlines in the guide, as a glowing route (not to scale). */
function AppealTimeline() {
  const steps = [
    { at: "Decision letter", gap: "≥ 20 school days to lodge" },
    { at: "Appeal deadline", gap: "heard within 40 school days · 10 days' notice" },
    { at: "Hearing", gap: "decision usually within 5 school days" },
    { at: "Decision", gap: null },
  ];
  return (
    <ol className="relative grid gap-0 md:grid-cols-4">
      <span aria-hidden className="absolute top-2 bottom-2 left-[9px] w-[4px] rounded-full bg-[linear-gradient(#8f8fff,#ff4d8f,#ffd23f)] md:top-[9px] md:right-[12%] md:bottom-auto md:left-[9px] md:h-[4px] md:w-auto md:bg-[linear-gradient(90deg,#8f8fff,#ff4d8f,#ffd23f)]" />
      {steps.map((s, i) => (
        <li key={s.at} className="relative grid grid-cols-[1.75rem_minmax(0,1fr)] gap-x-3 pb-6 md:block md:pb-0">
          <span aria-hidden className="relative z-10 block size-[22px] rounded-full border-[4px] border-white shadow-[0_0_16px_-2px_currentColor]" style={{ background: ["#8f8fff", "#c45cd8", "#ff4d8f", "#ffd23f"][i], color: ["#8f8fff", "#c45cd8", "#ff4d8f", "#ffd23f"][i] }} />
          <div className="md:mt-4 md:pr-5">
            <p className="font-semibold text-white">{s.at}</p>
            {s.gap ? <p className="mt-1.5 inline-block rounded-full bg-white/[0.08] px-2.5 py-1 text-[0.88rem] leading-snug text-[#dfe3ec]">{s.gap}</p> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Northern Ireland transfer path as a metro line: stages only, dates live on the SEAG page. */
function NiPath() {
  const stages = [
    ["P7, autumn", "Register for the SEAG Entrance Assessment"],
    ["P7, November", "Sit two papers, each English (or Gaeilge) and Mathematics"],
    ["P7, January", "Receive outcomes: band, standardised score and percentile"],
    ["P7, spring", "Apply through the Education Authority, schools in preference order"],
    ["Year 8", "Start post-primary school in September"],
  ];
  return (
    <ol className="relative grid gap-4 sm:grid-cols-5 sm:gap-3">
      <span aria-hidden className="absolute top-2 bottom-2 left-[9px] w-[6px] rounded-full bg-[linear-gradient(#00b386,#8f8fff)] sm:top-[8px] sm:right-[10%] sm:bottom-auto sm:left-[9px] sm:h-[6px] sm:w-auto sm:bg-[linear-gradient(90deg,#00b386,#8f8fff)]" />
      {stages.map(([when, what], i) => (
        <li key={when} className="relative flex gap-3 sm:block">
          <span aria-hidden className={i === stages.length - 1 ? "relative z-10 block size-[24px] shrink-0 rounded-full border-[5px] border-white bg-[#8f8fff] shadow-[0_0_16px_-2px_#8f8fff]" : "relative z-10 block size-[24px] shrink-0 rounded-full border-[5px] border-white bg-[#0d0f12]"} />
          <div className="sm:mt-3">
            <p className="text-[0.75rem] font-bold tracking-[0.08em] text-[#7fe0c4] uppercase">Stop {i + 1}</p>
            <p className="mt-0.5 font-semibold text-white">{when}</p>
            <p className="mt-0.5 text-[0.95rem] leading-snug text-[#c8cdd6]">{what}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

const FIGURES: Record<GuideFigure, { title: string; caption: string; node: () => React.ReactNode }> = {
  journey: { title: "From application to offer", caption: "An illustration with imaginary applicants. Step through it: qualifying makes a child eligible to be considered; the criteria and the number of places decide offers.", node: () => <JourneyStepper /> },
  catchment: { title: "Three ways a school can use where you live", caption: "Switch between them. Each school's policy says which applies — and the rule can change from one entry year to the next.", node: () => <CatchmentModes /> },
  "priority-shape": { title: "The shape of an oversubscription order", caption: "Illustrative. Only the first rung is fixed by the Code; the rest is each school's published order for that year.", node: () => <PriorityShape /> },
  "appeal-timeline": { title: "Appeal deadlines in sequence", caption: "Minimum periods from the School Admission Appeals Code, as listed below. Not to scale.", node: () => <AppealTimeline /> },
  "ni-path": { title: "The transfer path in Northern Ireland", caption: "Stages only. Exact dates are published each year by SEAG and the Education Authority.", node: () => <NiPath /> },
};

export function GuideFigureBlock({ figure, n }: { figure: GuideFigure; n: number }) {
  const f = FIGURES[figure];
  return (
    <Figure n={n} title={f.title} caption={f.caption} className="my-9" stage={figure !== "journey" && figure !== "catchment"}>
      {f.node()}
    </Figure>
  );
}
