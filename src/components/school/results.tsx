import { formatMeasure, MEASURES, STATUS_CODES, type MeasureKey } from "@/domain/measures";
import type { MeasureRow } from "@/server/profile-view";
import type { SourceRef } from "@/server/profile";
import { TrendChart } from "@/components/charts/trend-chart";
import { Callout } from "@/components/ui/primitives";
import { SourceNote } from "@/components/ui/source-note";

function cell(def: (typeof MEASURES)[MeasureKey], v: number | null) {
  return v === null ? <span className="text-ink-3">—</span> : formatMeasure(def, v);
}

export function MeasureTable({ measure, rows, laName, sources }: { measure: MeasureKey; rows: MeasureRow[]; laName: string | null; sources: Map<number, SourceRef> }) {
  const def = MEASURES[measure];
  if (!rows.length) return null;
  const notes = rows.filter((r) => r.note);
  const latestSource = rows.at(-1)?.sourceDocumentId ? sources.get(rows.at(-1)!.sourceDocumentId!) : null;
  const showLa = rows.some((r) => r.la !== null);
  const showSel = rows.some((r) => r.nationalSelective !== null);
  return (
    <div className="rounded-xl border border-line bg-surface p-5">
      <h3 className="font-sans text-base font-semibold text-ink">{def.label}</h3>
      <p className="mt-1 text-sm text-ink-2">{def.description}</p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <caption className="sr-only">
            {def.label} by year, with comparisons
          </caption>
          <thead className="border-b border-line text-left text-xs text-ink-3">
            <tr>
              <th scope="col" className="py-2 pr-4 font-medium">
                Year
              </th>
              <th scope="col" className="py-2 pr-4 text-right font-medium">
                This school
              </th>
              {showSel ? (
                <th scope="col" className="py-2 pr-4 text-right font-medium">
                  All selective schools (England)
                </th>
              ) : null}
              {showLa ? (
                <th scope="col" className="py-2 pr-4 text-right font-medium">
                  {laName ?? "Local authority"} (all state-funded)
                </th>
              ) : null}
              <th scope="col" className="py-2 pr-4 text-right font-medium">
                England (all state-funded)
              </th>
              <th scope="col" className="py-2 font-medium">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/70 tabular">
            {rows.map((r) => (
              <tr key={r.year}>
                <th scope="row" className="py-2 pr-4 text-left font-medium text-ink-2">
                  {r.year}
                </th>
                <td className="py-2 pr-4 text-right font-semibold text-ink">
                  {r.value !== null ? (
                    <>
                      {formatMeasure(def, r.value)}
                      {r.valueText ? <span className="ml-1 font-normal text-ink-3">({r.valueText})</span> : null}
                    </>
                  ) : (
                    <span className="font-normal text-ink-3" title={r.statusCode ? STATUS_CODES[r.statusCode] : undefined}>
                      Not published{r.statusCode ? ` (${r.statusCode})` : ""}
                    </span>
                  )}
                </td>
                {showSel ? <td className="py-2 pr-4 text-right text-ink-2">{cell(def, r.nationalSelective)}</td> : null}
                {showLa ? <td className="py-2 pr-4 text-right text-ink-2">{cell(def, r.la)}</td> : null}
                <td className="py-2 pr-4 text-right text-ink-2">{cell(def, r.nationalAll)}</td>
                <td className="py-2 text-xs text-ink-3">{r.dataVersion ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {notes.map((n) => (
        <p key={n.year} className="mt-2 text-xs text-ink-3">
          <strong className="text-ink-2">{n.year}:</strong> {n.note}
        </p>
      ))}
      {rows.some((r) => r.statusCode && r.statusCode !== "z") ? (
        <p className="mt-2 text-xs text-ink-3">
          Codes: {Object.entries(STATUS_CODES)
            .filter(([k]) => rows.some((r) => r.statusCode === k))
            .map(([k, v]) => `${k} = ${v}`)
            .join(" ")}
        </p>
      ) : null}
      <SourceNote source={latestSource} locator={rows.at(-1)?.sourceLocator} status="officially_verified" />
    </div>
  );
}

export function MeasureChart({ measure, rows, laName }: { measure: MeasureKey; rows: MeasureRow[]; laName: string | null }) {
  const def = MEASURES[measure];
  const published = rows.filter((r) => r.value !== null);
  if (published.length < 2) return null; // a trend needs at least two comparable values
  const series = [
    { key: "school", label: "This school", color: "--series-1", points: rows.map((r) => ({ x: r.year, y: r.value, note: r.statusCode ? "Not published" : undefined })) },
    ...(rows.some((r) => r.nationalSelective !== null) ? [{ key: "sel", label: "All selective schools", color: "--series-2", points: rows.map((r) => ({ x: r.year, y: r.nationalSelective })) }] : []),
    ...(rows.some((r) => r.la !== null) ? [{ key: "la", label: `${laName ?? "LA"} average`, color: "--series-3", points: rows.map((r) => ({ x: r.year, y: r.la })) }] : []),
  ];
  return <TrendChart title={def.label} caption="Official DfE figures. Years without a published figure are left as gaps." series={series} xs={rows.map((r) => r.year)} unit={def.unit === "count" ? "count" : def.unit} decimals={def.decimals} />;
}

export function ResultsCaveat() {
  return (
    <Callout title="Reading these results fairly">
      Grammar schools admit pupils with high prior attainment, so raw results are expected to be well above all-school averages. The fairest comparison is with other selective schools; progress measures (where DfE publishes them) account for pupils&apos; starting points. We do not rank schools on raw results.
    </Callout>
  );
}
