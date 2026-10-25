import type { Metadata } from "next";
import Image from "next/image";
import type { ReactNode } from "react";
import { regionProfiles, nationalDemandTrend, schoolPoints } from "@/server/insights";
import { Kicker, Page } from "@/ui/kit";
import { DepthBars } from "@/ui/lab/depth-bars";
import { IsoCatchment } from "@/ui/lab/iso-catchment";
import { AtlasMap } from "@/ui/viz/atlas-map";
import { CatchmentModes } from "@/ui/viz/catchment-modes";
import { GroupedBars } from "@/ui/viz/charts";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Depth samples",
  description: "Four ways to give the site's visuals depth, side by side.",
  robots: { index: false, follow: false },
};

function Verdict({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="mt-6 grid gap-x-6 gap-y-3 rounded-[8px] border border-rule bg-card p-5 text-[0.98rem] sm:grid-cols-[9rem_minmax(0,1fr)]">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="font-semibold text-ink">{k}</dt>
          <dd className="text-ink-2">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function Section({ id, letter, title, lede, children }: { id: string; letter: string; title: string; lede: ReactNode; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="border-t border-rule pt-14">
      <Kicker>Approach {letter}</Kicker>
      <h2 id={id} className="mt-2 text-h2">
        {title}
      </h2>
      <p className="mt-3 max-w-[var(--measure)] text-body text-ink-2">{lede}</p>
      <div className="mt-8">{children}</div>
    </section>
  );
}

export default async function DepthSamplesPage() {
  const [points, regions, demand] = await Promise.all([schoolPoints(), regionProfiles(), nationalDemandTrend()]);
  const groups = regions.map((r) => ({ slug: r.slug, name: r.name, n: r.n }));
  const xs = demand.map((d) => String(d.entry_year));
  const chartLabel = `First preferences and offers made, England's fully selective schools, ${xs[0]}–${xs.at(-1)}`;

  return (
    <Page className="grid gap-16 pt-10 pb-24">
      <header className="max-w-[var(--measure)]">
        <Kicker>Design lab · not linked from the site</Kicker>
        <h1 className="mt-3 text-h1">Four ways to add depth</h1>
        <p className="mt-4 text-lede text-ink-2">
          Each approach is shown on a real visual from the site, with what it costs. Approach A uses live data; B and D show the imaginary catchment neighbourhood; C uses every school&apos;s official coordinates.
        </p>
      </header>

      <Section id="a" letter="A" title="Depth styling" lede="Today's charts, given a light source: layered soft shadows, a top-lit gradient, rounded bar ends, a rise-in animation and a lifted hover. The axis stays flat and zero-based, so every value still reads exactly.">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-[8px] border border-rule bg-card p-5">
            <p className="label mb-3 text-ink-3">Now</p>
            <GroupedBars
              label={chartLabel}
              xs={xs}
              series={[
                { key: "first", label: "Named as first preference", tone: "school", points: demand.map((d) => ({ x: String(d.entry_year), y: d.first })) },
                { key: "offers", label: "Offers made", tone: "benchmark", points: demand.map((d) => ({ x: String(d.entry_year), y: d.offers })) },
              ]}
            />
          </div>
          <div className="rounded-[12px] bg-card p-5 shadow-[0_1px_1px_rgb(44_11_142/0.06),0_4px_8px_-2px_rgb(44_11_142/0.08),0_16px_32px_-12px_rgb(44_11_142/0.18)]">
            <p className="label mb-3 text-green">With depth styling</p>
            <DepthBars
              label={chartLabel}
              xs={xs}
              series={[
                { key: "first", label: "Named as first preference", values: demand.map((d) => d.first) },
                { key: "offers", label: "Offers made", values: demand.map((d) => d.offers) },
              ]}
            />
          </div>
        </div>
        <Verdict
          rows={[
            ["Best for", "Every chart with real numbers: results, applications and offers, sparklines, timelines."],
            ["Accuracy", "Unchanged. Values sit on a flat axis."],
            ["Page weight", "Nothing extra to download."],
            ["Phones", "Works everywhere, including old phones."],
            ["Accessibility", "Same as today: text labels, table views and screen-reader descriptions stay."],
          ]}
        />
      </Section>

      <Section id="b" letter="B" title="2.5D isometric drawing" lede="The catchment diagram's imaginary neighbourhood, drawn at an angle so it looks 3D: little houses with roofs, a school with a flag and the catchment painted on the ground. Pick a rule to see the houses change.">
        <div className="max-w-[52rem]">
          <IsoCatchment />
        </div>
        <details className="mt-4 max-w-[52rem]">
          <summary className="cursor-pointer text-[0.98rem] font-semibold text-green">Compare with today&apos;s flat version</summary>
          <div className="mt-4">
            <CatchmentModes />
          </div>
        </details>
        <Verdict
          rows={[
            ["Best for", "Imaginary scenes: catchment, the admission journey, the six-question icons."],
            ["Accuracy", "Fine for illustrations; not for charts, because the angle distorts lengths."],
            ["Page weight", "Small: plain SVG, a few kilobytes."],
            ["Phones", "Works everywhere and stays sharp at any size."],
            ["Limits", "A fixed viewpoint: you can't rotate it."],
          ]}
        />
      </Section>

      <Section id="c" letter="C" title="Real-time 3D (WebGL)" lede="Every school as a column on a 3D board, placed from its official coordinates; columns rise where more grammar schools sit close together. With a mouse, drag to turn it; hover a column to see the school.">
        <div className="max-w-[44rem]">
          <AtlasMap points={points} groups={groups} legend={false} depth />
        </div>
        <Verdict
          rows={[
            ["Best for", "The school atlas: clusters such as Kent and Buckinghamshire read at a glance."],
            ["Accuracy", "Good for “where is it dense?”; poor for reading exact counts, which stay in the region list."],
            ["Page weight", "About 200 KB extra, loaded only where it's used, after the flat map has shown."],
            ["Phones", "Works on most phones; dragging is switched off on touch so the page still scrolls. Old devices keep the flat map."],
            ["Accessibility", "The flat map's description stays for screen readers; motion stops when “reduce motion” is on."],
          ]}
        />
      </Section>

      <Section id="d" letter="D" title="Pre-rendered 3D image" lede="The same neighbourhood built in 3D and rendered once, with soft shadows and studio lighting, then saved as an image. It's the most polished look, but it is a picture.">
        <div className="max-w-[52rem] overflow-hidden rounded-[8px] border border-rule">
          <Image src="/lab/neighbourhood.webp" alt="A 3D rendering of an imaginary neighbourhood: white houses on a green board, blue-roofed houses inside a shaded catchment area around a school with a magenta roof and a flag." width={1280} height={800} className="block h-auto w-full" />
        </div>
        <Verdict
          rows={[
            ["Best for", "Hero art and fixed illustrations that never change."],
            ["Accuracy", "Can't show live data or respond to a choice; each change means a new render."],
            ["Page weight", "One image: this one is 40 KB."],
            ["Phones", "Works everywhere."],
            ["Limits", "No interaction, and text can't be part of the picture."],
          ]}
        />
      </Section>
    </Page>
  );
}
