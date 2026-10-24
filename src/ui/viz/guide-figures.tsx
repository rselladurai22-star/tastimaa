import type { GuideFigure } from "@/content/guides";
import { Figure } from "../kit";
import { JourneyStepper } from "./admission-journey";
import { CatchmentModes } from "./catchment-modes";

/** Illustrative shape of an oversubscription order: the Code's fixed first rung, then each school's own order. */
function PriorityShape() {
  const examples = ["Pupil Premium or service premium", "Siblings", "Children of staff", "Medical or social need", "Catchment area", "Distance"];
  return (
    <div className="rounded-[8px] border border-rule bg-card p-5">
      <ol className="grid gap-3">
        <li className="flex items-start gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-[5px] bg-green font-mono text-paper">1</span>
          <div>
            <p className="font-semibold text-ink">Looked after and previously looked after children</p>
            <p className="text-[0.98rem] text-ink-2">Required first by the School Admissions Code — for children who meet the standard.</p>
          </div>
        </li>
        <li className="flex items-start gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-[5px] border border-dashed border-green/60 font-mono text-green">2…</span>
          <div className="min-w-0">
            <p className="font-semibold text-ink">Then each school&apos;s own groups, in its own order — for example:</p>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {examples.map((e) => (
                <li key={e} className="rounded-[3px] border border-rule-strong bg-paper px-2 py-1 text-[0.92rem] text-ink-2">
                  {e}
                </li>
              ))}
            </ul>
          </div>
        </li>
        <li className="flex items-start gap-4 border-t border-dashed border-rule pt-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[5px] border border-copper bg-copper-wash font-mono text-[0.72rem] text-copper-ink">TIE</span>
          <div>
            <p className="font-semibold text-ink">A tie-break inside every group</p>
            <p className="text-[0.98rem] text-ink-2">Often straight-line distance to a fixed point at the school, with random allocation for exact ties.</p>
          </div>
        </li>
      </ol>
    </div>
  );
}

/** The appeal deadlines in the guide, as a sequence (not to scale). */
function AppealTimeline() {
  const steps = [
    { at: "Decision letter", gap: "at least 20 school days to lodge your appeal" },
    { at: "Appeal deadline", gap: "heard within 40 school days of the deadline — with at least 10 school days' notice" },
    { at: "Hearing", gap: "decision usually within 5 school days" },
    { at: "Decision", gap: null },
  ];
  return (
    <div className="rounded-[8px] border border-rule bg-card p-5">
      <ol className="grid gap-0 md:grid-cols-4">
        {steps.map((s, i) => (
          <li key={s.at} className="relative grid grid-cols-[1.5rem_minmax(0,1fr)] gap-x-3 pb-5 md:block md:pb-0">
            <span aria-hidden className="relative z-10 mt-1 block size-3.5 rounded-full border-2 border-green bg-card md:mt-0" />
            {i < steps.length - 1 ? <span aria-hidden className="absolute top-5 bottom-0 left-[6px] w-[2px] bg-green/30 md:top-[6px] md:right-0 md:bottom-auto md:left-4 md:h-[2px] md:w-auto" /> : null}
            <div className="md:mt-3 md:pr-5">
              <p className="font-semibold text-ink">{s.at}</p>
              {s.gap ? <p className="mt-1 text-[0.95rem] leading-snug text-ink-2">{s.gap}</p> : null}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Northern Ireland transfer path: stages only, dates live on the SEAG page. */
function NiPath() {
  const stages = [
    ["P7, autumn", "Register for the SEAG Entrance Assessment"],
    ["P7, November", "Sit two papers, each English (or Gaeilge) and Mathematics"],
    ["P7, January", "Receive outcomes: band, standardised score and percentile"],
    ["P7, spring", "Apply through the Education Authority, schools in preference order"],
    ["Year 8", "Start post-primary school in September"],
  ];
  return (
    <div className="rounded-[8px] border border-rule bg-card p-5">
      <ol className="grid gap-3 sm:grid-cols-5 sm:gap-2">
        {stages.map(([when, what], i) => (
          <li key={when} className="flex gap-3 sm:block">
            <span className="label block shrink-0 text-copper-ink sm:mb-2">{String(i + 1).padStart(2, "0")}</span>
            <div>
              <p className="font-semibold text-ink">{when}</p>
              <p className="mt-0.5 text-[0.95rem] leading-snug text-ink-2">{what}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
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
    <Figure n={n} title={f.title} caption={f.caption} className="my-12" stage={figure !== "journey" && figure !== "catchment"}>
      {f.node()}
    </Figure>
  );
}
