import { gunzipSync } from "fflate";
import { fetchBuffer, fetchJson } from "./http";

/**
 * Client for the Explore Education Statistics public API
 * (https://api.education.gov.uk/statistics/v1). Filters and indicators are
 * resolved by their stable column names / labels rather than the opaque ids,
 * which can change between data set versions.
 */
const API = "https://api.education.gov.uk/statistics/v1";

export interface DataSetSummary {
  id: string;
  title: string;
  latestVersion: { version: string; published: string; timePeriods: { start: string; end: string }; geographicLevels: string[] };
}

export interface DataSetMeta {
  filters: { id: string; label: string; column?: string; options: { id: string; label: string }[] }[];
  indicators: { id: string; label: string; column?: string; unit?: string; decimalPlaces?: number }[];
  locations: { level: { code: string; label: string }; options: { id: string; label: string; code?: string; oldCode?: string; urn?: string; laEstab?: string }[] }[];
  timePeriods: { code: string; period: string; label: string }[];
}

export interface QueryResult {
  timePeriod: { code: string; period: string };
  geographicLevel: string;
  locations: Record<string, string>;
  filters: Record<string, string>;
  values: Record<string, string>;
}

export const getDataSet = (id: string) => fetchJson<DataSetSummary>(`${API}/data-sets/${id}`);
export const getMeta = (id: string) => fetchJson<DataSetMeta>(`${API}/data-sets/${id}/meta`);

export function csvUrl(id: string) {
  return `${API}/data-sets/${id}/csv`;
}

/** Download the full data set CSV (served gzip-compressed). */
export async function downloadCsv(id: string): Promise<Buffer> {
  const { body } = await fetchBuffer(csvUrl(id), { timeoutMs: 600_000 });
  if (body[0] === 0x1f && body[1] === 0x8b) return Buffer.from(gunzipSync(body));
  return body;
}

/** Resolve `{ filterColumnOrLabel: optionLabel }` into option ids. */
export function resolveFilterOptions(meta: DataSetMeta, wanted: Record<string, string[]>): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const [key, labels] of Object.entries(wanted)) {
    const filter = meta.filters.find((f) => f.column === key || f.label === key);
    if (!filter) throw new Error(`EES filter "${key}" not found`);
    out[filter.id] = labels.map((label) => {
      const opt = filter.options.find((o) => o.label === label);
      if (!opt) throw new Error(`EES filter option "${key}=${label}" not found`);
      return opt.id;
    });
  }
  return out;
}

export function resolveIndicators(meta: DataSetMeta, columns: string[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const c of columns) {
    const ind = meta.indicators.find((i) => i.column === c);
    if (ind) map.set(ind.id, c);
  }
  return map;
}

/**
 * Run a query. Every filter in `filterOptions` must match one of its options
 * (AND across filters, OR within one filter). Unlisted filters default to the
 * "Total" option where one exists, so breakdown rows are excluded.
 */
export async function query(
  id: string,
  meta: DataSetMeta,
  opts: { geographicLevel: string; filterOptions: Record<string, string[]>; indicatorIds: string[]; defaultTotals?: boolean },
): Promise<QueryResult[]> {
  const clauses: unknown[] = [{ geographicLevels: { eq: opts.geographicLevel } }];
  for (const [, options] of Object.entries(opts.filterOptions)) clauses.push({ filters: { in: options } });
  if (opts.defaultTotals !== false) {
    for (const f of meta.filters) {
      if (opts.filterOptions[f.id]) continue;
      const total = f.options.find((o) => o.label === "Total");
      if (total) clauses.push({ filters: { eq: total.id } });
    }
  }
  const results: QueryResult[] = [];
  for (let page = 1; page < 200; page++) {
    const { body } = await fetchBuffer(`${API}/data-sets/${id}/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ criteria: { and: clauses }, indicators: opts.indicatorIds, page, pageSize: 1000 }),
    });
    const json = JSON.parse(body.toString("utf8")) as { paging: { totalPages: number }; results: QueryResult[] };
    results.push(...json.results);
    if (page >= json.paging.totalPages) break;
  }
  return results;
}

/** "202425" or "2024/2025" → "2024/25" */
export function academicYearLabel(tp: string): string {
  const m = /^(\d{4})\/?(\d{2,4})$/.exec(tp.trim());
  if (!m) return tp;
  return `${m[1]}/${m[2]!.slice(-2)}`;
}

/** Parse an EES value, separating numbers from status symbols (z, c, x, low, …). */
export function parseValue(raw: string | undefined): { value: number | null; statusCode: string | null; text: string | null } {
  if (raw === undefined || raw === null) return { value: null, statusCode: "missing", text: null };
  const t = String(raw).trim();
  if (t === "") return { value: null, statusCode: "missing", text: null };
  const n = Number(t.replace(/,/g, ""));
  if (Number.isFinite(n)) return { value: n, statusCode: null, text: null };
  if (/^[a-z]{1,4}$/.test(t)) return { value: null, statusCode: t, text: null };
  return { value: null, statusCode: null, text: t };
}
